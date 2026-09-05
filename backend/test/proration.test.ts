import "dotenv/config";
import assert from "node:assert/strict";
import { after, test } from "node:test";
import { Prisma } from "@prisma/client";
import { computeLines } from "../src/lib/payroll";
import { prisma } from "../src/lib/prisma";

// Pay must follow the days actually worked: a mid-period joiner and unpaid leave
// both reduce it, and a full period leaves the number unchanged.

const full = { PERIOD_DAYS: 22, CONTRACT_DAYS: 22, UNPAID_DAYS: 0, WORKED_DAYS: 22 };

after(() => prisma.$disconnect());

async function seededRules() {
  const rules = await prisma.salaryRule.findMany({ where: { structure_id: 1 } });
  assert.equal(rules.length, 6, "run npm run seed");
  return rules;
}

test("a full period pays exactly what it did before proration", async () => {
  const { gross_amount, net_amount } = computeLines(await seededRules(), 100000, full);
  assert.equal(gross_amount.toString(), "70000");
  assert.equal(net_amount.toString(), "63800");
});

test("half a period of unpaid leave roughly halves the pay", async () => {
  const half = { PERIOD_DAYS: 22, CONTRACT_DAYS: 22, UNPAID_DAYS: 11, WORKED_DAYS: 11 };
  const { lines, gross_amount } = computeLines(await seededRules(), 100000, half);

  assert.equal(lines.find((l) => l.rule_code === "BASIC")!.amount.toString(), "25000");
  assert.equal(gross_amount.toString(), "35000");
});

test("joining mid-period pays only for the days covered", async () => {
  // Contract covers 5 of 22 working days.
  const joiner = { PERIOD_DAYS: 22, CONTRACT_DAYS: 5, UNPAID_DAYS: 0, WORKED_DAYS: 5 };
  const { gross_amount } = computeLines(await seededRules(), 100000, joiner);

  const fullRun = computeLines(await seededRules(), 100000, full);
  assert.ok(
    gross_amount.lessThan(fullRun.gross_amount),
    "a joiner must not receive a whole period's pay"
  );
  assert.equal(gross_amount.toString(), "15909.1");
});

test("professional tax stays fixed while everything else prorates", async () => {
  const half = { PERIOD_DAYS: 22, CONTRACT_DAYS: 11, UNPAID_DAYS: 0, WORKED_DAYS: 11 };
  const { lines } = computeLines(await seededRules(), 100000, half);

  // PT is a fixed statutory amount, so it does not scale with days worked.
  assert.equal(lines.find((l) => l.rule_code === "PT")!.amount.toString(), "200");
  assert.equal(lines.find((l) => l.rule_code === "PF")!.amount.toString(), "3000");
});

test("omitting day counts computes an ordinary full period", async () => {
  const { net_amount } = computeLines(await seededRules(), 100000);
  assert.equal(net_amount.toString(), "63800", "the factor must default to 1");
});
