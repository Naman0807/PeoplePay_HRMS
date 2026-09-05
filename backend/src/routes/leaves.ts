import { Router } from "express";
import { Prisma } from "@prisma/client";
import { ah } from "../lib/async";
import { prisma } from "../lib/prisma";
import { badRequest, conflict, notFound, ok, okList, paging } from "../lib/response";
import { parseDate, parseId, parseOneOf, requireFields } from "../lib/validate";
import { requireAuth, requireRole } from "../middleware/auth";
import { assertSelfOrPrivileged, scopeToSelf } from "../lib/rbac";

export const leaveRoutes = Router();

leaveRoutes.use(requireAuth);

const APPROVER_ROLES = ["HR_MANAGER"] as const;
const STATES = ["TO_APPROVE", "APPROVED", "REFUSED"] as const;

/** Whole days inclusive of both ends — a one-day leave is 1, not 0. */
const inclusiveDays = (from: Date, to: Date) =>
  Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1;

leaveRoutes.get(
  "/",
  ah(async (req, res) => {
    const { page, limit, skip, take } = paging(req);

    // An EMPLOYEE is narrowed to their own requests regardless of the query string.
    const where: Prisma.LeaveRequestWhereInput = scopeToSelf(req, {
      ...(req.query.employee_id
        ? { employee_id: parseId(req.query.employee_id, "employee_id") }
        : {}),
      ...(req.query.state ? { state: parseOneOf(req.query.state, STATES, "state") } : {}),
    });

    const [rows, total_records] = await Promise.all([
      prisma.leaveRequest.findMany({
        where,
        skip,
        take,
        orderBy: { id: "desc" },
        include: { employee: true, leave_type: true },
      }),
      prisma.leaveRequest.count({ where }),
    ]);

    return okList(res, rows, { page, limit, total_records });
  })
);

leaveRoutes.get(
  "/:id",
  ah(async (req, res) => {
    const request = await prisma.leaveRequest.findUnique({
      where: { id: parseId(req.params.id) },
      include: { employee: true, leave_type: true, approver: true },
    });
    if (!request) throw notFound("Leave request");
    assertSelfOrPrivileged(req, request.employee_id);
    return ok(res, request);
  })
);

leaveRoutes.post(
  "/",
  ah(async (req, res) => {
    requireFields(req.body, ["employee_id", "leave_type_id", "date_from", "date_to"]);

    const employee_id = parseId(req.body.employee_id, "employee_id");
    // employee_id arrives in the body, so it must be checked against the token —
    // otherwise anyone can file leave in someone else's name.
    assertSelfOrPrivileged(req, employee_id);
    const leave_type_id = parseId(req.body.leave_type_id, "leave_type_id");
    const date_from = parseDate(req.body.date_from, "date_from");
    const date_to = parseDate(req.body.date_to, "date_to");

    if (date_to < date_from) {
      throw badRequest("End date is before the start date.", [
        { field: "date_to", issue: "Must be on or after date_from." },
      ]);
    }

    const [employee, leave_type] = await Promise.all([
      prisma.employee.findUnique({ where: { id: employee_id } }),
      prisma.leaveType.findUnique({ where: { id: leave_type_id } }),
    ]);
    if (!employee) throw notFound("Employee");
    if (!leave_type) throw notFound("Leave type");

    const number_of_days = req.body.number_of_days
      ? Number(req.body.number_of_days)
      : inclusiveDays(date_from, date_to);

    if (!Number.isFinite(number_of_days) || number_of_days <= 0) {
      throw badRequest("Invalid number of days.", [
        { field: "number_of_days", issue: "Must be greater than zero." },
      ]);
    }

    const request = await prisma.leaveRequest.create({
      data: {
        employee_id,
        leave_type_id,
        date_from,
        date_to,
        number_of_days,
        reason: req.body.reason ? String(req.body.reason) : null,
      },
      include: { employee: true, leave_type: true },
    });

    return ok(res, request, 201);
  })
);

/**
 * Rule 4 (AGENT.md §3): approving deducts the days from the employee's allocation.
 *
 * The read, the balance check and both writes happen in one transaction, and the
 * allocation row is locked with SELECT ... FOR UPDATE first. Without the lock, two
 * approvals racing on the same allocation can both read the old balance and both
 * succeed, overdrawing it — the classic lost update.
 *
 * The frontend never computes the balance: it re-reads it from the response.
 */
leaveRoutes.patch(
  "/:id/approve",
  requireRole(...APPROVER_ROLES),
  ah(async (req, res) => {
    const id = parseId(req.params.id);

    const result = await prisma.$transaction(async (tx) => {
      const request = await tx.leaveRequest.findUnique({
        where: { id },
        include: { leave_type: true },
      });
      if (!request) throw notFound("Leave request");
      if (request.state !== "TO_APPROVE") {
        throw conflict(
          "LEAVE_ALREADY_DECIDED",
          `This request is already ${request.state}.`,
          [{ field: "state", issue: "Only a TO_APPROVE request can be approved." }]
        );
      }

      let allocation = null;
      if (request.leave_type.requires_allocation) {
        // Lock the allocation row for the life of the transaction before reading its balance.
        const locked = await tx.$queryRaw<{ id: number; number_of_days: Prisma.Decimal }[]>`
          SELECT id, number_of_days
          FROM leave_allocations
          WHERE employee_id = ${request.employee_id}
            AND leave_type_id = ${request.leave_type_id}
            AND state = 'APPROVED'
            AND (validity_start IS NULL OR validity_start <= ${request.date_from})
            AND (validity_end IS NULL OR validity_end >= ${request.date_to})
          ORDER BY id
          FOR UPDATE
        `;

        const balance = locked.reduce((sum, row) => sum.plus(row.number_of_days), new Prisma.Decimal(0));
        if (!locked.length) {
          throw conflict(
            "NO_ALLOCATION",
            "This employee has no allocation covering these dates.",
            [{ field: "leave_type_id", issue: "Allocate days before approving." }]
          );
        }
        if (balance.lessThan(request.number_of_days)) {
          throw conflict(
            "INSUFFICIENT_BALANCE",
            "This employee does not have enough days left.",
            [
              {
                field: "number_of_days",
                issue: `Requested ${request.number_of_days}, ${balance.toString()} remaining.`,
              },
            ]
          );
        }

        // Deduct from the oldest covering allocation, spilling into later ones if needed.
        let remaining = new Prisma.Decimal(request.number_of_days);
        for (const row of locked) {
          if (remaining.isZero()) break;
          const take = Prisma.Decimal.min(remaining, row.number_of_days);
          allocation = await tx.leaveAllocation.update({
            where: { id: row.id },
            data: { number_of_days: { decrement: take } },
          });
          remaining = remaining.minus(take);
        }
      }

      const approver_id = req.user?.employee_id ?? null;
      const updated = await tx.leaveRequest.update({
        where: { id },
        data: { state: "APPROVED", approver_id },
        include: { employee: true, leave_type: true },
      });

      return { updated, allocation };
    });

    // Balance comes back with the request so the screen can show it dropping
    // without a second round trip or any client-side arithmetic.
    return ok(res, {
      ...result.updated,
      remaining_days: result.allocation ? result.allocation.number_of_days : null,
    });
  })
);

leaveRoutes.patch(
  "/:id/refuse",
  requireRole(...APPROVER_ROLES),
  ah(async (req, res) => {
    const id = parseId(req.params.id);
    const request = await prisma.leaveRequest.findUnique({ where: { id } });
    if (!request) throw notFound("Leave request");

    // Refusing an approved request would need the days handed back; out of scope for v1.
    if (request.state !== "TO_APPROVE") {
      throw conflict("LEAVE_ALREADY_DECIDED", `This request is already ${request.state}.`, [
        { field: "state", issue: "Only a TO_APPROVE request can be refused." },
      ]);
    }

    const updated = await prisma.leaveRequest.update({
      where: { id },
      data: { state: "REFUSED", approver_id: req.user?.employee_id ?? null },
      include: { employee: true, leave_type: true },
    });

    return ok(res, updated);
  })
);

/** Remaining balance per leave type — what the Time Off screen shows next to the form. */
leaveRoutes.get(
  "/balances/:employee_id",
  ah(async (req, res) => {
    const employee_id = parseId(req.params.employee_id, "employee_id");
    assertSelfOrPrivileged(req, employee_id);
    const employee = await prisma.employee.findUnique({ where: { id: employee_id } });
    if (!employee) throw notFound("Employee");

    const allocations = await prisma.leaveAllocation.findMany({
      where: { employee_id, state: "APPROVED" },
      include: { leave_type: true },
      orderBy: { leave_type_id: "asc" },
    });

    const byType = new Map<number, { leave_type_id: number; leave_type_name: string; remaining_days: Prisma.Decimal }>();
    for (const a of allocations) {
      const entry = byType.get(a.leave_type_id) ?? {
        leave_type_id: a.leave_type_id,
        leave_type_name: a.leave_type.name,
        remaining_days: new Prisma.Decimal(0),
      };
      entry.remaining_days = entry.remaining_days.plus(a.number_of_days);
      byType.set(a.leave_type_id, entry);
    }

    return ok(res, [...byType.values()]);
  })
);
