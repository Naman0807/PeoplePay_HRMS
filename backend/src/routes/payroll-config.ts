import { Router } from "express";
import { Prisma } from "@prisma/client";
import { ah } from "../lib/async";
import { prisma } from "../lib/prisma";
import { badRequest, conflict, notFound, ok, okList, paging } from "../lib/response";
import { parseId, parseOneOf, requireFields } from "../lib/validate";
import { requireAuth, requireRole } from "../middleware/auth";
import { PAYROLL_CONFIG_ROLES, PAYROLL_ROLES } from "../lib/rbac";
import { evaluateFormula } from "../lib/payroll";

/**
 * Salary Structures and Salary Rules (problem statement A5 and A6).
 *
 * Read is open to both payroll roles; writing is HR_PAYROLL_MANAGER only, which is
 * the line the spec actually draws between them — "read-only access to Salary
 * Structures and Salary Rules" for the user, "full CRUD" for the manager.
 */

export const structureRoutes = Router();
export const salaryRuleRoutes = Router();

structureRoutes.use(requireAuth, requireRole(...PAYROLL_ROLES));
salaryRuleRoutes.use(requireAuth, requireRole(...PAYROLL_ROLES));

const CATEGORIES = ["BASIC", "ALLOWANCE", "GROSS", "DEDUCTION", "NET"] as const;
const AMOUNT_SELECTS = ["FIXED", "PERCENT", "FORMULA"] as const;

/** A rule whose structure is already used by a confirmed payrun must not shift under it. */
async function assertStructureEditable(structure_id: number) {
  const locked = await prisma.payslipRun.findFirst({
    where: { structure_id, state: { in: ["CONFIRMED", "PAID"] } },
  });
  if (locked) {
    throw conflict(
      "STRUCTURE_IN_USE",
      "This structure is used by a confirmed payrun and cannot be changed.",
      [{ field: "structure_id", issue: `Locked by payrun ${locked.name}.` }]
    );
  }
}

// ---------------------------------------------------------------------------
// Structures
// ---------------------------------------------------------------------------

structureRoutes.get(
  "/",
  ah(async (req, res) => {
    const { page, limit, skip, take } = paging(req);
    const where: Prisma.PayrollStructureWhereInput =
      req.query.active === undefined ? {} : { active: req.query.active !== "false" };

    const [rows, total_records] = await Promise.all([
      prisma.payrollStructure.findMany({
        where,
        skip,
        take,
        orderBy: { id: "asc" },
        // The list view shows rule and employee counts (A5).
        include: { _count: { select: { salary_rules: true, contracts: true } } },
      }),
      prisma.payrollStructure.count({ where }),
    ]);

    return okList(res, rows, { page, limit, total_records });
  })
);

structureRoutes.get(
  "/:id",
  ah(async (req, res) => {
    const structure = await prisma.payrollStructure.findUnique({
      where: { id: parseId(req.params.id) },
      include: { salary_rules: { orderBy: { sequence: "asc" } } },
    });
    if (!structure) throw notFound("Salary structure");
    return ok(res, structure);
  })
);

structureRoutes.post(
  "/",
  requireRole(...PAYROLL_CONFIG_ROLES),
  ah(async (req, res) => {
    requireFields(req.body, ["name"]);
    const structure = await prisma.payrollStructure.create({
      data: {
        name: String(req.body.name),
        ...(req.body.active === undefined ? {} : { active: Boolean(req.body.active) }),
      },
    });
    return ok(res, structure, 201);
  })
);

structureRoutes.patch(
  "/:id",
  requireRole(...PAYROLL_CONFIG_ROLES),
  ah(async (req, res) => {
    const id = parseId(req.params.id);
    const existing = await prisma.payrollStructure.findUnique({ where: { id } });
    if (!existing) throw notFound("Salary structure");

    const data: Prisma.PayrollStructureUpdateInput = {};
    if (req.body.name !== undefined) data.name = String(req.body.name);
    if (req.body.active !== undefined) data.active = Boolean(req.body.active);

    return ok(res, await prisma.payrollStructure.update({ where: { id }, data }));
  })
);

structureRoutes.delete(
  "/:id",
  requireRole(...PAYROLL_CONFIG_ROLES),
  ah(async (req, res) => {
    const id = parseId(req.params.id);
    const existing = await prisma.payrollStructure.findUnique({
      where: { id },
      include: { _count: { select: { contracts: true, payslip_runs: true } } },
    });
    if (!existing) throw notFound("Salary structure");

    // Deleting a structure a contract or payrun points at would orphan payroll history.
    if (existing._count.contracts || existing._count.payslip_runs) {
      throw conflict("STRUCTURE_IN_USE", "This structure is in use and cannot be deleted.", [
        {
          field: "id",
          issue: `${existing._count.contracts} contracts and ${existing._count.payslip_runs} payruns reference it. Deactivate it instead.`,
        },
      ]);
    }

    await prisma.payrollStructure.delete({ where: { id } });
    return ok(res, { id, deleted: true });
  })
);

// ---------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------

salaryRuleRoutes.get(
  "/",
  ah(async (req, res) => {
    const { page, limit, skip, take } = paging(req);
    const where: Prisma.SalaryRuleWhereInput = req.query.structure_id
      ? { structure_id: parseId(req.query.structure_id, "structure_id") }
      : {};

    const [rows, total_records] = await Promise.all([
      prisma.salaryRule.findMany({
        where,
        skip,
        take,
        orderBy: [{ structure_id: "asc" }, { sequence: "asc" }],
      }),
      prisma.salaryRule.count({ where }),
    ]);

    return okList(res, rows, { page, limit, total_records });
  })
);

/**
 * Validates a rule against its computation method, and checks a formula parses and
 * only reads codes that run earlier in the sequence. Catching that here means a
 * broken rule is rejected when it is saved rather than halfway through a payrun.
 */
async function validateRule(body: Record<string, unknown>, structure_id: number, code: string, sequence: number) {
  const amount_select = parseOneOf(body.amount_select, AMOUNT_SELECTS, "amount_select");

  if (amount_select === "FIXED" && body.amount_fixed === undefined) {
    throw badRequest("A fixed rule needs an amount.", [
      { field: "amount_fixed", issue: "Required when amount_select is FIXED." },
    ]);
  }
  if (amount_select === "PERCENT" && (body.amount_percent === undefined || !body.percent_base_code)) {
    throw badRequest("A percentage rule needs a percentage and a base code.", [
      { field: "amount_percent", issue: "Required when amount_select is PERCENT." },
    ]);
  }
  if (amount_select === "FORMULA" && !body.formula) {
    throw badRequest("A formula rule needs a formula.", [
      { field: "formula", issue: "Required when amount_select is FORMULA." },
    ]);
  }

  // Codes available to this rule: WAGE plus anything computed before it.
  const earlier = await prisma.salaryRule.findMany({
    where: { structure_id, sequence: { lt: sequence }, code: { not: code } },
    select: { code: true },
  });
  const available: Record<string, Prisma.Decimal> = { WAGE: new Prisma.Decimal(1) };
  for (const rule of earlier) available[rule.code] = new Prisma.Decimal(1);

  if (amount_select === "PERCENT" && !(String(body.percent_base_code) in available)) {
    throw badRequest("Unknown base code.", [
      {
        field: "percent_base_code",
        issue: `${String(body.percent_base_code)} is not computed before sequence ${sequence}. Available: ${Object.keys(available).join(", ")}`,
      },
    ]);
  }
  if (amount_select === "FORMULA") {
    // Throws a 400 naming the rule if the formula is malformed or reads an unknown code.
    evaluateFormula(String(body.formula), available, code);
  }

  return amount_select;
}

salaryRuleRoutes.post(
  "/",
  requireRole(...PAYROLL_CONFIG_ROLES),
  ah(async (req, res) => {
    requireFields(req.body, ["structure_id", "code", "name", "sequence", "amount_select"]);

    const structure_id = parseId(req.body.structure_id, "structure_id");
    const structure = await prisma.payrollStructure.findUnique({ where: { id: structure_id } });
    if (!structure) throw notFound("Salary structure");
    await assertStructureEditable(structure_id);

    const code = String(req.body.code).toUpperCase();
    const sequence = Number(req.body.sequence);
    if (!Number.isInteger(sequence)) {
      throw badRequest("Invalid sequence.", [{ field: "sequence", issue: "Expected a whole number." }]);
    }

    const amount_select = await validateRule(req.body, structure_id, code, sequence);

    const rule = await prisma.salaryRule
      .create({
        data: {
          structure_id,
          code,
          name: String(req.body.name),
          sequence,
          amount_select,
          category: req.body.category
            ? parseOneOf(req.body.category, CATEGORIES, "category")
            : null,
          amount_fixed: req.body.amount_fixed !== undefined ? Number(req.body.amount_fixed) : null,
          amount_percent:
            req.body.amount_percent !== undefined ? Number(req.body.amount_percent) : null,
          percent_base_code: req.body.percent_base_code
            ? String(req.body.percent_base_code).toUpperCase()
            : null,
          formula: req.body.formula ? String(req.body.formula) : null,
        },
      })
      .catch((err) => {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
          throw conflict("DUPLICATE_RULE_CODE", "This structure already has a rule with that code.", [
            { field: "code", issue: `${code} is already used in this structure.` },
          ]);
        }
        throw err;
      });

    return ok(res, rule, 201);
  })
);

salaryRuleRoutes.patch(
  "/:id",
  requireRole(...PAYROLL_CONFIG_ROLES),
  ah(async (req, res) => {
    const id = parseId(req.params.id);
    const existing = await prisma.salaryRule.findUnique({ where: { id } });
    if (!existing) throw notFound("Salary rule");
    await assertStructureEditable(existing.structure_id);

    const merged = {
      amount_select: req.body.amount_select ?? existing.amount_select,
      amount_fixed: req.body.amount_fixed ?? existing.amount_fixed,
      amount_percent: req.body.amount_percent ?? existing.amount_percent,
      percent_base_code: req.body.percent_base_code ?? existing.percent_base_code,
      formula: req.body.formula ?? existing.formula,
    };
    const sequence = req.body.sequence !== undefined ? Number(req.body.sequence) : existing.sequence;
    const amount_select = await validateRule(merged, existing.structure_id, existing.code, sequence);

    const rule = await prisma.salaryRule.update({
      where: { id },
      data: {
        sequence,
        amount_select,
        ...(req.body.name !== undefined ? { name: String(req.body.name) } : {}),
        ...(req.body.category !== undefined
          ? { category: parseOneOf(req.body.category, CATEGORIES, "category") }
          : {}),
        amount_fixed: merged.amount_fixed === null ? null : Number(merged.amount_fixed),
        amount_percent: merged.amount_percent === null ? null : Number(merged.amount_percent),
        percent_base_code: merged.percent_base_code
          ? String(merged.percent_base_code).toUpperCase()
          : null,
        formula: merged.formula ? String(merged.formula) : null,
      },
    });

    return ok(res, rule);
  })
);

salaryRuleRoutes.delete(
  "/:id",
  requireRole(...PAYROLL_CONFIG_ROLES),
  ah(async (req, res) => {
    const id = parseId(req.params.id);
    const existing = await prisma.salaryRule.findUnique({ where: { id } });
    if (!existing) throw notFound("Salary rule");
    await assertStructureEditable(existing.structure_id);

    // Removing a rule another rule reads by code would break the chain at compute time.
    const later = await prisma.salaryRule.findMany({
      where: { structure_id: existing.structure_id, sequence: { gt: existing.sequence } },
    });
    const dependent = later.filter(
      (r) =>
        r.percent_base_code === existing.code ||
        (r.formula ? new RegExp(`\\b${existing.code}\\b`).test(r.formula) : false)
    );
    if (dependent.length) {
      throw conflict("RULE_IN_USE", "Another rule depends on this one.", [
        {
          field: "code",
          issue: `${dependent.map((r) => r.code).join(", ")} reads ${existing.code}.`,
        },
      ]);
    }

    await prisma.salaryRule.delete({ where: { id } });
    return ok(res, { id, deleted: true });
  })
);
