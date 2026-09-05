import { Router } from "express";
import { Prisma } from "@prisma/client";
import { ah } from "../lib/async";
import { prisma } from "../lib/prisma";
import { badRequest, ok } from "../lib/response";
import { requireAuth } from "../middleware/auth";

export const dashboardRoutes = Router();

dashboardRoutes.use(requireAuth);

/**
 * Payslips counted by the KPIs: DONE and PAID only, never DRAFT. A draft payslip is
 * not finalized, so counting it would double-count on recompute and show unconfirmed
 * numbers as a live figure — the rule the manager pinned in AGENT.md §4.
 */
const COUNTED_STATES: Prisma.PayslipWhereInput["state"] = { in: ["DONE", "PAID"] };

/** period is YYYY-MM (AGENT.md §4). Returns that calendar month's bounds. */
function parsePeriod(value: unknown): { date_from: Date; date_to: Date } | null {
  if (value === undefined || value === null || value === "") return null;

  const match = /^(\d{4})-(\d{2})$/.exec(String(value));
  if (!match) {
    throw badRequest("Invalid period.", [{ field: "period", issue: "Expected YYYY-MM, e.g. 2026-04." }]);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) {
    throw badRequest("Invalid period.", [{ field: "period", issue: "Month must be between 01 and 12." }]);
  }

  return {
    date_from: new Date(Date.UTC(year, month - 1, 1)),
    date_to: new Date(Date.UTC(year, month, 0)), // day 0 of the next month is the last of this one
  };
}

/** Payslips whose period sits inside the requested month, optionally by department. */
function payslipWhere(
  period: { date_from: Date; date_to: Date } | null,
  department: string | null
): Prisma.PayslipWhereInput {
  return {
    state: COUNTED_STATES,
    ...(period ? { date_from: { gte: period.date_from }, date_to: { lte: period.date_to } } : {}),
    ...(department ? { employee: { department } } : {}),
  };
}

const departmentOf = (req: { query: Record<string, unknown> }) =>
  req.query.department ? String(req.query.department) : null;

dashboardRoutes.get(
  "/kpis",
  ah(async (req, res) => {
    const period = parsePeriod(req.query.period);
    const department = departmentOf(req);
    const where = payslipWhere(period, department);

    const [headcount, totals, pending_leave_requests] = await Promise.all([
      prisma.employee.count({
        where: { status: "ACTIVE", ...(department ? { department } : {}) },
      }),
      prisma.payslip.aggregate({
        where,
        _sum: { gross_amount: true, net_amount: true },
      }),
      prisma.leaveRequest.count({
        where: {
          state: "TO_APPROVE",
          ...(department ? { employee: { department } } : {}),
        },
      }),
    ]);

    return ok(res, {
      headcount,
      total_gross: totals._sum.gross_amount ?? new Prisma.Decimal(0),
      total_net: totals._sum.net_amount ?? new Prisma.Decimal(0),
      pending_leave_requests,
    });
  })
);

dashboardRoutes.get(
  "/salary-by-department",
  ah(async (req, res) => {
    const period = parsePeriod(req.query.period);
    const department = departmentOf(req);

    const payslips = await prisma.payslip.findMany({
      where: payslipWhere(period, department),
      select: {
        gross_amount: true,
        net_amount: true,
        employee: { select: { department: true } },
      },
    });

    // Grouped in code rather than groupBy: the department lives on the employee, and
    // a Prisma groupBy cannot reach through the relation.
    const byDepartment = new Map<string, { department: string; total_gross: Prisma.Decimal; total_net: Prisma.Decimal; employee_count: number }>();

    for (const p of payslips) {
      const name = p.employee.department ?? "Unassigned";
      const entry = byDepartment.get(name) ?? {
        department: name,
        total_gross: new Prisma.Decimal(0),
        total_net: new Prisma.Decimal(0),
        employee_count: 0,
      };
      entry.total_gross = entry.total_gross.plus(p.gross_amount ?? 0);
      entry.total_net = entry.total_net.plus(p.net_amount ?? 0);
      entry.employee_count += 1;
      byDepartment.set(name, entry);
    }

    const rows = [...byDepartment.values()].sort((a, b) =>
      b.total_gross.comparedTo(a.total_gross)
    );

    return ok(res, rows);
  })
);
