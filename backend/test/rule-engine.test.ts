import "dotenv/config";
import assert from "node:assert/strict";
import { after, test } from "node:test";
import type { SalaryRule } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { computeLines, evaluateFormula, workingDays } from "../src/lib/payroll";
import { prisma } from "../src/lib/prisma";

// The engine claim from AGENT.md §7: every number on a payslip traces to a rule,
// and a FORMULA rule reads a prior rule's stored amount by code — never a constant.

const D = Prisma.Decimal;

/** Minimal SalaryRule stand-in; only the fields the engine reads are populated. */
function rule(partial: Partial<SalaryRule> & Pick<SalaryRule, "code" | "sequence">): SalaryRule {
  return {
    id: partial.sequence,
    structure_id: 1,
    name: partial.name ?? partial.code,
    category: null,
    amount_select: null,
    amount_fixed: null,
    amount_percent: null,
    percent_base_code: null,
    formula: null,
    ...partial,
  } as SalaryRule;
}

/** The seeded chain from prisma/seed.ts: BASIC -> HRA -> GROSS -> PT -> PF -> NET. */
const STANDARD_CHAIN: SalaryRule[] = [
  rule({ code: "BASIC", name: "Basic Salary", sequence: 10, category: "BASIC", amount_select: "PERCENT", amount_percent: new D(50), percent_base_code: "WAGE" }),
  rule({ code: "HRA", name: "House Rent Allowance", sequence: 20, category: "ALLOWANCE", amount_select: "PERCENT", amount_percent: new D(40), percent_base_code: "BASIC" }),
  rule({ code: "GROSS", name: "Gross Salary", sequence: 30, category: "GROSS", amount_select: "FORMULA", formula: "BASIC + HRA" }),
  rule({ code: "PT", name: "Professional Tax", sequence: 40, category: "DEDUCTION", amount_select: "FIXED", amount_fixed: new D(200) }),
  rule({ code: "PF", name: "Provident Fund", sequence: 50, category: "DEDUCTION", amount_select: "PERCENT", amount_percent: new D(12), percent_base_code: "BASIC" }),
  rule({ code: "NET", name: "Net Salary", sequence: 60, category: "NET", amount_select: "FORMULA", formula: "GROSS - PT - PF" }),
];

const amountOf = (lines: { rule_code: string; amount: Prisma.Decimal }[], code: string) =>
  lines.find((l) => l.rule_code === code)!.amount.toString();

/**
 * RuleError puts the reason in details[0].issue and keeps message generic, so assert
 * against the detail — that is the text the frontend actually shows.
 */
function assertRuleError(fn: () => unknown, pattern: RegExp) {
  try {
    fn();
  } catch (err) {
    const issue = (err as { details?: { issue: string }[] }).details?.[0]?.issue ?? String(err);
    assert.match(issue, pattern);
    return;
  }
  assert.fail("expected the engine to reject this rule, but it computed a value");
}

after(() => prisma.$disconnect());

test("the seeded chain computes every line from the contract wage", () => {
  const { lines, gross_amount, net_amount } = computeLines(STANDARD_CHAIN, 100000);

  // BASIC 50% of 100000 = 50000; HRA 40% of BASIC = 20000; GROSS = 70000
  // PT fixed 200; PF 12% of BASIC = 6000; NET = 70000 - 200 - 6000 = 63800
  assert.equal(amountOf(lines, "BASIC"), "50000");
  assert.equal(amountOf(lines, "HRA"), "20000");
  assert.equal(amountOf(lines, "GROSS"), "70000");
  assert.equal(amountOf(lines, "PT"), "200");
  assert.equal(amountOf(lines, "PF"), "6000");
  assert.equal(amountOf(lines, "NET"), "63800");

  assert.equal(gross_amount.toString(), "70000");
  assert.equal(net_amount.toString(), "63800");
});

test("lines come back in sequence order, which is what the payslip screen renders", () => {
  const { lines } = computeLines(STANDARD_CHAIN, 100000);
  assert.deepEqual(
    lines.map((l) => l.rule_code),
    ["BASIC", "HRA", "GROSS", "PT", "PF", "NET"]
  );
  assert.deepEqual(
    lines.map((l) => l.sequence),
    [10, 20, 30, 40, 50, 60]
  );
});

test("rules are sorted by sequence, not by the order they arrive in", () => {
  const shuffled = [...STANDARD_CHAIN].reverse();
  const { lines, net_amount } = computeLines(shuffled, 100000);

  assert.deepEqual(
    lines.map((l) => l.rule_code),
    ["BASIC", "HRA", "GROSS", "PT", "PF", "NET"]
  );
  assert.equal(net_amount.toString(), "63800");
});

test("a FORMULA rule reads a prior rule's amount by code, not a constant", () => {
  // Change only BASIC's percentage. NET is a formula over GROSS/PT/PF and must move
  // with it — if NET were hardcoded, this assertion is the one that breaks.
  const halved = STANDARD_CHAIN.map((r) =>
    r.code === "BASIC" ? { ...r, amount_percent: new D(25) } : r
  );
  const { lines, net_amount } = computeLines(halved, 100000);

  assert.equal(amountOf(lines, "BASIC"), "25000");
  assert.equal(amountOf(lines, "HRA"), "10000");
  assert.equal(amountOf(lines, "GROSS"), "35000");
  assert.equal(amountOf(lines, "PF"), "3000");
  assert.equal(net_amount.toString(), "31800"); // 35000 - 200 - 3000
});

test("a rule referencing a code that has not been computed yet is rejected", () => {
  const outOfOrder = [
    rule({ code: "NET", sequence: 10, amount_select: "FORMULA", formula: "GROSS - PT" }),
    rule({ code: "GROSS", sequence: 20, amount_select: "FIXED", amount_fixed: new D(1000) }),
  ];

  assertRuleError(() => computeLines(outOfOrder, 100000), /computed earlier in the sequence/);
});

test("a PERCENT rule with a base code that does not exist is rejected", () => {
  const broken = [
    rule({ code: "BASIC", sequence: 10, amount_select: "PERCENT", amount_percent: new D(50), percent_base_code: "NOPE" }),
  ];

  assertRuleError(() => computeLines(broken, 100000), /NOPE/);
});

test("money keeps two decimal places without floating point drift", () => {
  // 0.1 + 0.2 is 0.30000000000000004 in float; Decimal must give exactly 0.30.
  const chain = [
    rule({ code: "A", sequence: 10, amount_select: "FIXED", amount_fixed: new D("0.1") }),
    rule({ code: "B", sequence: 20, amount_select: "FIXED", amount_fixed: new D("0.2") }),
    rule({ code: "C", sequence: 30, amount_select: "FORMULA", formula: "A + B" }),
  ];

  assert.equal(amountOf(computeLines(chain, 0).lines, "C"), "0.3");
});

test("a rounded amount is what later rules read", () => {
  // BASIC = 33.333...% of 1000 rounds to 333.33, so GROSS must be exactly 666.66,
  // not 666.67 — later rules read the stored value, not an unrounded intermediate.
  const chain = [
    rule({ code: "BASIC", sequence: 10, amount_select: "PERCENT", amount_percent: new D("33.33"), percent_base_code: "WAGE" }),
    rule({ code: "GROSS", sequence: 20, amount_select: "FORMULA", formula: "BASIC * 2" }),
  ];

  const { lines } = computeLines(chain, 1000);
  assert.equal(amountOf(lines, "BASIC"), "333.3");
  assert.equal(amountOf(lines, "GROSS"), "666.6");
});

test("formulas support brackets and unary minus", () => {
  const context = { A: new D(10), B: new D(4) };
  assert.equal(evaluateFormula("(A + B) * 2", context, "T").toString(), "28");
  assert.equal(evaluateFormula("-A + B", context, "T").toString(), "-6");
  assert.equal(evaluateFormula("A / B", context, "T").toString(), "2.5");
});

test("a formula cannot execute code or divide by zero", () => {
  const context = { A: new D(10) };
  assertRuleError(() => evaluateFormula("process.exit(1)", context, "T"), /no value yet|Unexpected/);
  assertRuleError(() => evaluateFormula("A / 0", context, "T"), /Division by zero/);
  assertRuleError(() => evaluateFormula("A +", context, "T"), /ends unexpectedly/);
  assertRuleError(() => evaluateFormula("(A + 1", context, "T"), /Missing closing bracket/);
});

test("worked_days counts calendar working days, not attendance", () => {
  // April 2026: 1st is a Wednesday, 30 days, 22 weekdays.
  const from = new Date("2026-04-01");
  const to = new Date("2026-04-30");

  assert.equal(workingDays(from, to, 5), 22);
  assert.equal(workingDays(from, to, 7), 30);
  assert.equal(workingDays(from, to, 0), 0);
  assert.equal(workingDays(from, from, 5), 1);
});

test("the seeded structure in the database computes the same numbers", async () => {
  const rules = await prisma.salaryRule.findMany({ where: { structure_id: 1 } });
  assert.equal(rules.length, 6, "run npm run seed first");

  const { net_amount } = computeLines(rules, 100000);
  assert.equal(net_amount.toString(), "63800");
});
