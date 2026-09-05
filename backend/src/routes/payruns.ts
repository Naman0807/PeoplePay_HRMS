import { Router } from "express";
import { Prisma } from "@prisma/client";
import { ah } from "../lib/async";
import { prisma } from "../lib/prisma";
import { badRequest, conflict, notFound, ok, okList, paging } from "../lib/response";
import { computeLines, DEFAULT_DAYS_PER_WEEK, workingDays } from "../lib/payroll";
import { parseDate, parseId, requireFields } from "../lib/validate";
import { requireAuth, requireRole } from "../middleware/auth";
import { PAYROLL_VIEW_ROLES } from "../lib/rbac";

export const payrunRoutes = Router();

payrunRoutes.use(requireAuth);
// A payrun exposes the whole organisation's payroll, so no route here is readable
// by a plain EMPLOYEE — not only the ones that change state.
payrunRoutes.use(requireRole(...PAYROLL_VIEW_ROLES));

const PAYROLL_ROLES = ["HR_PAYROLL_USER", "HR_PAYROLL_MANAGER"] as const;
/** Confirming and paying a run is a manager action; computing is not. */
const PAYROLL_MANAGER = ["HR_PAYROLL_MANAGER"] as const;

/** Contracts eligible for a period: RUNNING and overlapping the payrun dates. */
const eligibleContractWhere = (date_start: Date, date_end: Date): Prisma.ContractWhereInput => ({
  state: "RUNNING",
  start_date: { lte: date_end },
  OR: [{ end_date: null }, { end_date: { gte: date_start } }],
});

/**
 * Optional employee_ids on compute. Absent means every eligible employee; present
 * means exactly those. An empty array is rejected rather than treated as "all",
 * since a payrun over nobody is far more likely to be a mistake than an intent.
 */
function parseEmployeeIds(raw: unknown): Set<number> | null {
  if (raw === undefined || raw === null) return null;
  if (!Array.isArray(raw)) {
    throw badRequest("employee_ids must be an array.", [
      { field: "employee_ids", issue: "Expected an array of employee ids." },
    ]);
  }
  if (!raw.length) {
    throw badRequest("No employees selected.", [
      { field: "employee_ids", issue: "Select at least one employee, or omit the field for all." },
    ]);
  }

  const ids = raw.map((value) => {
    const id = Number(value);
    if (!Number.isInteger(id) || id < 1) {
      throw badRequest("Invalid employee id.", [
        { field: "employee_ids", issue: `Not a valid employee id: ${String(value)}` },
      ]);
    }
    return id;
  });
  return new Set(ids);
}

function assertState(actual: string, expected: string[], action: string) {
  if (!expected.includes(actual)) {
    throw badRequest(`A payrun in ${actual} cannot be ${action}.`, [
      { field: "state", issue: `Expected the payrun to be ${expected.join(" or ")}.` },
    ]);
  }
}

payrunRoutes.get(
  "/",
  ah(async (req, res) => {
    const { page, limit, skip, take } = paging(req);
    const where: Prisma.PayslipRunWhereInput = req.query.state
      ? { state: String(req.query.state) as Prisma.PayslipRunWhereInput["state"] }
      : {};

    const [rows, total_records] = await Promise.all([
      prisma.payslipRun.findMany({ where, skip, take, orderBy: { id: "desc" } }),
      prisma.payslipRun.count({ where }),
    ]);

    return okList(res, rows, { page, limit, total_records });
  })
);

payrunRoutes.get(
  "/:id",
  ah(async (req, res) => {
    const payrun = await prisma.payslipRun.findUnique({
      where: { id: parseId(req.params.id) },
      include: { payslips: true },
    });
    if (!payrun) throw notFound("Payrun");
    return ok(res, payrun);
  })
);

payrunRoutes.post(
  "/",
  requireRole(...PAYROLL_ROLES),
  ah(async (req, res) => {
    requireFields(req.body, ["name", "structure_id", "date_start", "date_end"]);

    const date_start = parseDate(req.body.date_start, "date_start");
    const date_end = parseDate(req.body.date_end, "date_end");
    if (date_end < date_start) {
      throw badRequest("End date is before the start date.", [
        { field: "date_end", issue: "Must be on or after date_start." },
      ]);
    }

    const structure_id = parseId(req.body.structure_id, "structure_id");
    const structure = await prisma.payrollStructure.findUnique({ where: { id: structure_id } });
    if (!structure) throw notFound("Payroll structure");

    const payrun = await prisma.payslipRun.create({
      data: { name: String(req.body.name), structure_id, date_start, date_end },
    });

    return ok(res, payrun, 201);
  })
);

// Step 1 of the wizard: who this run would cover, before anything is written.
payrunRoutes.get(
  "/:id/eligible-employees",
  ah(async (req, res) => {
    const payrun = await prisma.payslipRun.findUnique({ where: { id: parseId(req.params.id) } });
    if (!payrun) throw notFound("Payrun");

    const contracts = await prisma.contract.findMany({
      where: eligibleContractWhere(payrun.date_start, payrun.date_end),
      include: { employee: true },
      orderBy: { employee_id: "asc" },
    });

    const rows = contracts.map((c) => ({
      employee_id: c.employee_id,
      name: c.employee.name,
      department: c.employee.department,
      job_title: c.employee.job_title,
      contract_id: c.id,
      contract_reference: c.reference,
      wage: c.wage,
    }));

    return ok(res, rows);
  })
);

/**
 * Compute is bulk and idempotent: it wipes this run's previous payslips and rebuilds
 * them, so recomputing never doubles anything. A problem with one employee is flagged
 * on that employee's payslip via warning_code and never fails the whole run
 * (AGENT.md §4) — 409 is reserved for contract overlap.
 */
payrunRoutes.post(
  "/:id/compute",
  requireRole(...PAYROLL_ROLES),
  ah(async (req, res) => {
    const id = parseId(req.params.id);
    const payrun = await prisma.payslipRun.findUnique({ where: { id } });
    if (!payrun) throw notFound("Payrun");
    assertState(payrun.state, ["DRAFT", "COMPUTED"], "computed");

    const rules = await prisma.salaryRule.findMany({
      where: { structure_id: payrun.structure_id },
      orderBy: { sequence: "asc" },
    });
    if (!rules.length) {
      throw badRequest("This payroll structure has no salary rules.", [
        { field: "structure_id", issue: "Add rules to the structure before computing." },
      ]);
    }

    const contracts = await prisma.contract.findMany({
      where: eligibleContractWhere(payrun.date_start, payrun.date_end),
      include: { employee: { include: { resource_calendar: true } }, resource_calendar: true },
      orderBy: { employee_id: "asc" },
    });

    // Step 2 of the wizard may narrow the run to a subset of the eligible employees.
    // Omitted means every eligible employee, which is the common case. An id that is
    // not eligible for this period is rejected rather than silently dropped — a
    // caller that names an employee and gets no payslip must be told why.
    const selected = parseEmployeeIds(req.body?.employee_ids);
    if (selected) {
      const eligible = new Set(contracts.map((c) => c.employee_id));
      const unknown = [...selected].filter((id) => !eligible.has(id));
      if (unknown.length) {
        throw badRequest("Some selected employees are not eligible for this period.", [
          {
            field: "employee_ids",
            issue: `No running contract covering ${payrun.date_start.toISOString().slice(0, 10)} to ${payrun.date_end.toISOString().slice(0, 10)}: ${unknown.join(", ")}`,
          },
        ]);
      }
    }

    const included = selected
      ? contracts.filter((c) => selected.has(c.employee_id))
      : contracts;

    const seen = new Set<number>();

    const payslips = await prisma.$transaction(async (tx) => {
      await tx.payslip.deleteMany({ where: { payrun_id: id } });

      const created = [];
      for (const contract of included) {
        // A second RUNNING contract for one employee in one period is flagged, not fatal.
        const duplicate = seen.has(contract.employee_id);
        seen.add(contract.employee_id);

        // Contract calendar wins, else the employee's, else the schema default.
        const calendar = contract.resource_calendar ?? contract.employee.resource_calendar;
        const worked_days = workingDays(
          payrun.date_start,
          payrun.date_end,
          calendar?.days_per_week ?? DEFAULT_DAYS_PER_WEEK
        );

        const { lines, gross_amount, net_amount } = computeLines(rules, contract.wage);

        let warning_code: string | null = null;
        if (duplicate) warning_code = "DUPLICATE_PAYSLIP";
        else if (net_amount.isNegative()) warning_code = "NEGATIVE_NET";

        const payslip = await tx.payslip.create({
          data: {
            employee_id: contract.employee_id,
            payrun_id: id,
            contract_id: contract.id,
            structure_id: payrun.structure_id,
            date_from: payrun.date_start,
            date_to: payrun.date_end,
            worked_days,
            gross_amount,
            net_amount,
            warning_code,
            line_ids: { create: lines },
          },
          include: { line_ids: { orderBy: { sequence: "asc" } }, employee: true },
        });
        created.push(payslip);
      }

      await tx.payslipRun.update({ where: { id }, data: { state: "COMPUTED" } });
      return created;
    });

    return ok(res, {
      payrun_id: id,
      state: "COMPUTED",
      payslip_count: payslips.length,
      warnings: payslips.filter((p) => p.warning_code).length,
      payslips,
    });
  })
);

payrunRoutes.post(
  "/:id/confirm",
  requireRole(...PAYROLL_MANAGER),
  ah(async (req, res) => {
    const id = parseId(req.params.id);
    const payrun = await prisma.payslipRun.findUnique({
      where: { id },
      include: { payslips: true },
    });
    if (!payrun) throw notFound("Payrun");
    assertState(payrun.state, ["COMPUTED"], "confirmed");
    if (!payrun.payslips.length) {
      throw conflict("EMPTY_PAYRUN", "This payrun has no payslips to confirm.", [
        { field: "state", issue: "Compute the payrun before confirming it." },
      ]);
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.payslip.updateMany({ where: { payrun_id: id }, data: { state: "DONE" } });
      return tx.payslipRun.update({ where: { id }, data: { state: "CONFIRMED" } });
    });

    return ok(res, updated);
  })
);

payrunRoutes.post(
  "/:id/mark-paid",
  requireRole(...PAYROLL_MANAGER),
  ah(async (req, res) => {
    const id = parseId(req.params.id);
    const payrun = await prisma.payslipRun.findUnique({ where: { id } });
    if (!payrun) throw notFound("Payrun");
    assertState(payrun.state, ["CONFIRMED"], "marked paid");

    const updated = await prisma.$transaction(async (tx) => {
      await tx.payslip.updateMany({ where: { payrun_id: id }, data: { state: "PAID" } });
      return tx.payslipRun.update({ where: { id }, data: { state: "PAID" } });
    });

    // "Real email send is cut for v1 — logging 'sent' is fine" (AGENT.md §1).
    console.log(`[payrun ${id}] payslips marked paid; payslip emails logged as sent`);

    return ok(res, updated);
  })
);
