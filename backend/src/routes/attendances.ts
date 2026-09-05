import { Router } from "express";
import { Prisma } from "@prisma/client";
import { ah } from "../lib/async";
import { prisma } from "../lib/prisma";
import { badRequest, conflict, notFound, ok, okList, paging } from "../lib/response";
import { parseDate, parseId, parseOneOf, parseOptionalDate, requireFields } from "../lib/validate";
import { requireAuth, requireRole } from "../middleware/auth";
import { assertSelfOrPrivileged, HR_ADMIN_ROLES, scopeToSelf } from "../lib/rbac";

export const attendanceRoutes = Router();

attendanceRoutes.use(requireAuth);

// An EMPLOYEE may record their own attendance; assertSelfOrPrivileged below stops
// them recording anyone else's. HR_MANAGER records on anyone's behalf. Payroll roles
// are deliberately absent — they run payroll, they do not keep the time book.
const WRITE_ROLES = [...HR_ADMIN_ROLES, "EMPLOYEE"] as const;
const EDIT_ROLES = HR_ADMIN_ROLES;
const STATUSES = ["PRESENT", "ABSENT"] as const;

/**
 * worked_hours is computed here rather than by a Postgres generated column — the
 * documented deviation in the design spec, since Prisma has no clean equivalent.
 * Null check_out means the person has not checked out yet, so hours are unknown.
 */
function workedHours(check_in: Date, check_out: Date | null): Prisma.Decimal | null {
  if (!check_out) return null;
  const hours = (check_out.getTime() - check_in.getTime()) / 3_600_000;
  return new Prisma.Decimal(hours).toDecimalPlaces(2);
}

attendanceRoutes.get(
  "/",
  ah(async (req, res) => {
    const { page, limit, skip, take } = paging(req);

    // An EMPLOYEE only ever sees their own attendance, whatever they ask for.
    const where: Prisma.AttendanceWhereInput = scopeToSelf(req, {
      ...(req.query.employee_id
        ? { employee_id: parseId(req.query.employee_id, "employee_id") }
        : {}),
      ...(req.query.status ? { status: parseOneOf(req.query.status, STATUSES, "status") } : {}),
      ...(req.query.date_from || req.query.date_to
        ? {
            check_in: {
              ...(req.query.date_from
                ? { gte: parseDate(req.query.date_from, "date_from") }
                : {}),
              ...(req.query.date_to ? { lte: parseDate(req.query.date_to, "date_to") } : {}),
            },
          }
        : {}),
    });

    const [rows, total_records] = await Promise.all([
      prisma.attendance.findMany({
        where,
        skip,
        take,
        orderBy: { check_in: "desc" },
        include: { employee: true },
      }),
      prisma.attendance.count({ where }),
    ]);

    return okList(res, rows, { page, limit, total_records });
  })
);

attendanceRoutes.post(
  "/",
  requireRole(...WRITE_ROLES),
  ah(async (req, res) => {
    requireFields(req.body, ["employee_id", "check_in"]);

    const employee_id = parseId(req.body.employee_id, "employee_id");
    assertSelfOrPrivileged(req, employee_id);
    const check_in = parseDate(req.body.check_in, "check_in");
    const check_out = parseOptionalDate(req.body.check_out, "check_out");

    if (check_out && check_out < check_in) {
      throw badRequest("Check-out is before check-in.", [
        { field: "check_out", issue: "Must be at or after check_in." },
      ]);
    }

    const employee = await prisma.employee.findUnique({ where: { id: employee_id } });
    if (!employee) throw notFound("Employee");

    // One open entry at a time. Without this, clocking in twice leaves two rows with
    // no check_out and no way to tell which one the next clock-out belongs to.
    if (!check_out) {
      const open = await prisma.attendance.findFirst({
        where: { employee_id, check_out: null },
        orderBy: { check_in: "desc" },
      });
      if (open) {
        throw conflict("ALREADY_CHECKED_IN", "This employee is already checked in.", [
          {
            field: "check_in",
            issue: `Open entry since ${open.check_in.toISOString()}. Check out first.`,
          },
        ]);
      }
    }

    const attendance = await prisma.attendance.create({
      data: {
        employee_id,
        check_in,
        check_out,
        worked_hours: workedHours(check_in, check_out),
        notes: req.body.notes ? String(req.body.notes) : null,
        ...(req.body.status ? { status: parseOneOf(req.body.status, STATUSES, "status") } : {}),
      },
      include: { employee: true },
    });

    return ok(res, attendance, 201);
  })
);

attendanceRoutes.patch(
  "/:id",
  requireRole(...EDIT_ROLES),
  ah(async (req, res) => {
    const id = parseId(req.params.id);
    const existing = await prisma.attendance.findUnique({ where: { id } });
    if (!existing) throw notFound("Attendance");
    assertSelfOrPrivileged(req, existing.employee_id);

    const check_in =
      req.body.check_in !== undefined ? parseDate(req.body.check_in, "check_in") : existing.check_in;
    const check_out =
      req.body.check_out !== undefined
        ? parseOptionalDate(req.body.check_out, "check_out")
        : existing.check_out;

    if (check_out && check_out < check_in) {
      throw badRequest("Check-out is before check-in.", [
        { field: "check_out", issue: "Must be at or after check_in." },
      ]);
    }

    // Recomputed on every edit, so worked_hours can never drift from the timestamps.
    const attendance = await prisma.attendance.update({
      where: { id },
      data: {
        check_in,
        check_out,
        worked_hours: workedHours(check_in, check_out),
        ...(req.body.notes !== undefined
          ? { notes: req.body.notes ? String(req.body.notes) : null }
          : {}),
        ...(req.body.status ? { status: parseOneOf(req.body.status, STATUSES, "status") } : {}),
      },
      include: { employee: true },
    });

    return ok(res, attendance);
  })
);

/**
 * Clock out of the open entry. Separate from PATCH /:id because an employee may close
 * their own entry but may not edit attendance generally — the times they already
 * recorded are not theirs to rewrite.
 */
attendanceRoutes.patch(
  "/:id/check-out",
  ah(async (req, res) => {
    const id = parseId(req.params.id);
    const existing = await prisma.attendance.findUnique({ where: { id } });
    if (!existing) throw notFound("Attendance");
    assertSelfOrPrivileged(req, existing.employee_id);

    if (existing.check_out) {
      throw conflict("ALREADY_CHECKED_OUT", "This entry is already closed.", [
        { field: "check_out", issue: `Checked out at ${existing.check_out.toISOString()}.` },
      ]);
    }

    const check_out = req.body?.check_out
      ? parseDate(req.body.check_out, "check_out")
      : new Date();

    if (check_out < existing.check_in) {
      throw badRequest("Check-out is before check-in.", [
        { field: "check_out", issue: "Must be at or after check_in." },
      ]);
    }

    const attendance = await prisma.attendance.update({
      where: { id },
      data: { check_out, worked_hours: workedHours(existing.check_in, check_out) },
      include: { employee: true },
    });

    return ok(res, attendance);
  })
);
