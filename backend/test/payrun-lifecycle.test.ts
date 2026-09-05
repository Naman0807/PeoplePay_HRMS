import "dotenv/config";
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import type { Server } from "node:http";
import { app } from "../src/index";
import { prisma } from "../src/lib/prisma";

// Flow A's spine: Payrun -> Compute -> Confirm -> Mark Paid, and the state machine
// that refuses to skip a step. Runs against the seeded structure and cleans up after.
//
// These suites share one database, so npm test runs test files serially
// (--test-concurrency=1). In parallel, the overlap suite's fixture contracts span
// April 2026 and change the eligible-employee count this suite asserts on.

let server: Server;
let base: string;
let payrollToken: string;
let employeeToken: string;
let payrun_id: number;
/** Employees with a RUNNING contract covering April 2026, counted from the database. */
let eligible_count: number;

/**
 * Counts eligible employees the way the endpoint does. Assertions compare against
 * this rather than a fixed number, so demo or fixture data added to the shared
 * database cannot turn these tests red without a real regression.
 */
async function countEligible() {
  return prisma.contract.count({
    where: {
      state: "RUNNING",
      start_date: { lte: new Date("2026-04-30") },
      OR: [{ end_date: null }, { end_date: { gte: new Date("2026-04-01") } }],
    },
  });
}

async function call(method: string, path: string, token: string, body?: unknown) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: res.status, body: (await res.json()) as any };
}

const post = (p: string, t: string, b?: unknown) => call("POST", p, t, b);
const get = (p: string, t: string) => call("GET", p, t);

async function login(email: string) {
  const res = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ login: email, password: "password123" }),
  });
  const payload = (await res.json()) as any;
  assert.equal(res.status, 200, `${email} should be able to log in — run npm run seed`);
  return payload.data.token as string;
}

before(async () => {
  server = app.listen(0);
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("server did not bind a port");
  base = `http://127.0.0.1:${address.port}`;

  payrollToken = await login("priya@peoplepay360.test"); // HR_PAYROLL_MANAGER
  employeeToken = await login("rohit@peoplepay360.test"); // EMPLOYEE

  await prisma.payslipRun.deleteMany({ where: { name: { startsWith: "TEST-RUN" } } });
});

after(async () => {
  await prisma.payslipRun.deleteMany({ where: { name: { startsWith: "TEST-RUN" } } });
  await prisma.$disconnect();
  server.close();
});

test("an EMPLOYEE cannot create a payrun", async () => {
  const res = await post("/api/payruns", employeeToken, {
    name: "TEST-RUN blocked",
    structure_id: 1,
    date_start: "2026-04-01",
    date_end: "2026-04-30",
  });

  assert.equal(res.status, 403);
  assert.equal(res.body.error, "FORBIDDEN");
});

test("a payrun is created in DRAFT", async () => {
  const res = await post("/api/payruns", payrollToken, {
    name: "TEST-RUN April 2026",
    structure_id: 1,
    date_start: "2026-04-01",
    date_end: "2026-04-30",
  });

  assert.equal(res.status, 201);
  assert.equal(res.body.data.state, "DRAFT");
  payrun_id = res.body.data.id;
});

test("a DRAFT payrun cannot be confirmed before it is computed", async () => {
  const res = await post(`/api/payruns/${payrun_id}/confirm`, payrollToken);

  assert.equal(res.status, 400);
  assert.match(res.body.message, /DRAFT cannot be confirmed/);
});

test("eligible employees are the ones with a RUNNING contract in the period", async () => {
  const res = await get(`/api/payruns/${payrun_id}/eligible-employees`, payrollToken);

  assert.equal(res.status, 200);
  eligible_count = await countEligible();
  assert.ok(eligible_count > 0, "run npm run seed — there must be running contracts");
  assert.equal(res.body.data.length, eligible_count);
  assert.ok(res.body.data.every((r: any) => r.contract_reference && r.employee_id));
});

test("compute writes a payslip per employee with its rule breakdown", async () => {
  const res = await post(`/api/payruns/${payrun_id}/compute`, payrollToken);

  assert.equal(res.status, 200);
  assert.equal(res.body.data.state, "COMPUTED");
  assert.equal(res.body.data.payslip_count, eligible_count, "one payslip per eligible contract");

  // Asha's wage is 120000: BASIC 60000, HRA 24000, GROSS 84000,
  // PT 200, PF 7200, NET 76600.
  const asha = res.body.data.payslips.find((p: any) => p.employee.name === "Asha Menon");
  assert.equal(Number(asha.gross_amount), 84000);
  assert.equal(Number(asha.net_amount), 76600);
  assert.deepEqual(
    asha.line_ids.map((l: any) => l.rule_code),
    ["BASIC", "HRA", "GROSS", "PT", "PF", "NET"]
  );
  // Decimal columns serialize as JSON strings, so worked_days arrives as "22".
  assert.equal(Number(asha.worked_days), 22, "April 2026 has 22 weekdays");
});

test("recomputing does not duplicate payslips", async () => {
  const before_count = await prisma.payslip.count({ where: { payrun_id } });
  const res = await post(`/api/payruns/${payrun_id}/compute`, payrollToken);

  assert.equal(res.status, 200);
  const after_count = await prisma.payslip.count({ where: { payrun_id } });
  assert.equal(after_count, before_count, "compute must be idempotent, not additive");

  const lines = await prisma.payslipLine.count({
    where: { payslip: { payrun_id } },
  });
  assert.equal(
    lines,
    after_count * 6,
    "six rule lines per payslip, with no orphans left by the first run"
  );
});

test("a payslip serves its breakdown and a PDF", async () => {
  const payslip = await prisma.payslip.findFirstOrThrow({ where: { payrun_id } });

  const detail = await get(`/api/payslips/${payslip.id}`, payrollToken);
  assert.equal(detail.status, 200);
  assert.equal(detail.body.data.line_ids.length, 6);
  assert.deepEqual(
    detail.body.data.line_ids.map((l: any) => l.sequence),
    [10, 20, 30, 40, 50, 60]
  );

  const pdf = await fetch(`${base}/api/payslips/${payslip.id}/pdf`, {
    headers: { authorization: `Bearer ${payrollToken}` },
  });
  assert.equal(pdf.status, 200);
  assert.equal(pdf.headers.get("content-type"), "application/pdf");

  const bytes = Buffer.from(await pdf.arrayBuffer());
  assert.equal(bytes.subarray(0, 4).toString(), "%PDF", "must be a real PDF, not an error page");
  assert.ok(bytes.length > 1000, "a payslip PDF with six rule rows should not be near-empty");
});

test("a payrun cannot be marked paid before it is confirmed", async () => {
  const res = await post(`/api/payruns/${payrun_id}/mark-paid`, payrollToken);

  assert.equal(res.status, 400);
  assert.match(res.body.message, /COMPUTED cannot be marked paid/);
});

test("confirm moves the run and every payslip to DONE", async () => {
  const res = await post(`/api/payruns/${payrun_id}/confirm`, payrollToken);

  assert.equal(res.status, 200);
  assert.equal(res.body.data.state, "CONFIRMED");

  const draft = await prisma.payslip.count({ where: { payrun_id, state: "DRAFT" } });
  const done = await prisma.payslip.count({ where: { payrun_id, state: "DONE" } });
  assert.equal(draft, 0);
  assert.equal(done, eligible_count);
});

test("a CONFIRMED payrun cannot be computed again", async () => {
  const res = await post(`/api/payruns/${payrun_id}/compute`, payrollToken);

  assert.equal(res.status, 400);
  assert.match(res.body.message, /CONFIRMED cannot be computed/);
});

test("mark-paid moves the run and every payslip to PAID", async () => {
  const res = await post(`/api/payruns/${payrun_id}/mark-paid`, payrollToken);

  assert.equal(res.status, 200);
  assert.equal(res.body.data.state, "PAID");

  const paid = await prisma.payslip.count({ where: { payrun_id, state: "PAID" } });
  assert.equal(paid, eligible_count);
});

test("a PAID payrun cannot be paid twice", async () => {
  const res = await post(`/api/payruns/${payrun_id}/mark-paid`, payrollToken);

  assert.equal(res.status, 400);
  assert.match(res.body.message, /PAID cannot be marked paid/);
});
