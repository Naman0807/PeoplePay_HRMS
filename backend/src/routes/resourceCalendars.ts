import { Router } from "express";
import { ah } from "../lib/async";
import { prisma } from "../lib/prisma";
import { badRequest, notFound, ok, okList, paging } from "../lib/response";
import { parseId, parseOneOf, requireFields } from "../lib/validate";
import { requireAuth, requireRole } from "../middleware/auth";

export const resourceCalendarRoutes = Router();

resourceCalendarRoutes.use(requireAuth);

// Same territory as employees/contracts — one HR_MANAGER write gate, not per-handler.
const WRITE_ROLES = ["HR_MANAGER"] as const;
const WEEKDAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

function parseTime(value: unknown, field: string): string {
  const str = String(value ?? "");
  if (!TIME_RE.test(str)) {
    throw badRequest(`Invalid ${field}.`, [{ field, issue: "Expected HH:MM in 24-hour time." }]);
  }
  return str;
}

resourceCalendarRoutes.get(
  "/",
  ah(async (req, res) => {
    const { page, limit, skip, take } = paging(req);
    const [rows, total_records] = await Promise.all([
      prisma.resourceCalendar.findMany({ skip, take, orderBy: { id: "asc" } }),
      prisma.resourceCalendar.count(),
    ]);
    return okList(res, rows, { page, limit, total_records });
  })
);

resourceCalendarRoutes.get(
  "/:id",
  ah(async (req, res) => {
    const calendar = await prisma.resourceCalendar.findUnique({
      where: { id: parseId(req.params.id) },
      include: { days: { orderBy: { day: "asc" } } },
    });
    if (!calendar) throw notFound("Resource calendar");
    return ok(res, calendar);
  })
);

resourceCalendarRoutes.post(
  "/",
  requireRole(...WRITE_ROLES),
  ah(async (req, res) => {
    requireFields(req.body, ["name"]);
    const calendar = await prisma.resourceCalendar.create({
      data: {
        name: String(req.body.name),
        hours_per_week: req.body.hours_per_week != null ? Number(req.body.hours_per_week) : undefined,
        days_per_week: req.body.days_per_week != null ? parseId(req.body.days_per_week, "days_per_week") : undefined,
        timezone: req.body.timezone ? String(req.body.timezone) : undefined,
      },
    });
    return ok(res, calendar, 201);
  })
);

resourceCalendarRoutes.patch(
  "/:id",
  requireRole(...WRITE_ROLES),
  ah(async (req, res) => {
    const id = parseId(req.params.id);
    const existing = await prisma.resourceCalendar.findUnique({ where: { id } });
    if (!existing) throw notFound("Resource calendar");

    const data: Record<string, unknown> = {};
    if (req.body.name !== undefined) data.name = String(req.body.name);
    if (req.body.hours_per_week !== undefined) data.hours_per_week = Number(req.body.hours_per_week);
    if (req.body.days_per_week !== undefined) data.days_per_week = parseId(req.body.days_per_week, "days_per_week");
    if (req.body.timezone !== undefined) data.timezone = req.body.timezone ? String(req.body.timezone) : null;

    const calendar = await prisma.resourceCalendar.update({ where: { id }, data });
    return ok(res, calendar);
  })
);

/**
 * Replaces the whole weekly breakdown in one call, matching the wizard's "edit the
 * rows, hit save once" UX rather than a separate create/update/delete per row. Wipes
 * and rewrites in a transaction — same idempotent pattern as payrun compute.
 */
resourceCalendarRoutes.patch(
  "/:id/days",
  requireRole(...WRITE_ROLES),
  ah(async (req, res) => {
    const id = parseId(req.params.id);
    const calendar = await prisma.resourceCalendar.findUnique({ where: { id } });
    if (!calendar) throw notFound("Resource calendar");

    if (!Array.isArray(req.body.days)) {
      throw badRequest("days must be an array.", [
        { field: "days", issue: "Expected an array of {day, start_time, end_time, break_minutes}." },
      ]);
    }

    const seen = new Set<string>();
    const rows = req.body.days.map((row: Record<string, unknown>, i: number) => {
      const day = parseOneOf(row.day, WEEKDAYS, `days[${i}].day`);
      if (seen.has(day)) {
        throw badRequest("Duplicate day.", [{ field: `days[${i}].day`, issue: `${day} appears more than once.` }]);
      }
      seen.add(day);

      const start_time = parseTime(row.start_time, `days[${i}].start_time`);
      const end_time = parseTime(row.end_time, `days[${i}].end_time`);
      if (end_time <= start_time) {
        throw badRequest("End time must be after start time.", [
          { field: `days[${i}].end_time`, issue: "Must be later than start_time." },
        ]);
      }
      const break_minutes = row.break_minutes != null ? Number(row.break_minutes) : 0;
      if (!Number.isFinite(break_minutes) || break_minutes < 0) {
        throw badRequest("Invalid break_minutes.", [{ field: `days[${i}].break_minutes`, issue: "Must be zero or greater." }]);
      }

      return { resource_calendar_id: id, day, start_time, end_time, break_minutes };
    });

    const days = await prisma.$transaction(async (tx) => {
      await tx.resourceCalendarDay.deleteMany({ where: { resource_calendar_id: id } });
      if (rows.length) await tx.resourceCalendarDay.createMany({ data: rows });
      return tx.resourceCalendarDay.findMany({ where: { resource_calendar_id: id }, orderBy: { day: "asc" } });
    });

    return ok(res, days);
  })
);
