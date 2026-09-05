import "dotenv/config";
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import type { Server } from "node:http";
import { app } from "../src/index";
import { prisma } from "../src/lib/prisma";

// Two additions found during role testing:
//   compute may be narrowed to selected employees (wizard step 2)
//   an employee may clock themselves in and out
//
// Both are written to fail loudly rather than silently: an unknown employee_ids entry
// is a 400, and a second clock-in without a clock-out is a 409.

let server: Server;
let base: string;
let payrollToken: string;
let managerToken: string;
let employeeToken: string;
let rohitId: number;
let payrun_id: number;

async function call(method: string, path: string, token: string, body?: unknown) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: res.status, body: (await res.json()) as any };
}
const post = (p: string, t: string, b?: unknown) => call("POST", p, t, b);
const patch = (p: string, t: string, b?: unknown) => call("PATCH", p, t, b);

async function login(email: string) {
  const res = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ login: email, password: "password123" }),
  });
  assert.equal(res.status, 200, `${email} should log in — run npm run seed`);
  return ((await res.json()) as any).data.token as string;
}

async function cleanup() {
  await prisma.payslipRun.deleteMany({ where: { name: { startsWith: "TEST-SELECT" } } });
  if (rohitId) {
    await prisma.attendance.deleteMany({
      where: { employee_id: rohitId, notes: "TEST-CLOCK" },
    });
    await prisma.attendance.deleteMany({ where: { employee_id: rohitId, check_out: null } });
  }
}

before(async () => {
  server = app.listen(0);
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("server did not bind a port");
  base = `http://127.0.0.1:${address.port}`;

  payrollToken = await login("priya@peoplepay360.test");
  managerToken = await login("asha@peoplepay360.test");
  employeeToken = await login("rohit@peoplepay360.test");

  rohitId = (
    await prisma.employee.findUniqueOrThrow({ where: { work_email: "rohit@peoplepay360.test" } })
  ).id;

  await cleanup();
  const run = await post("/api/payruns", payrollToken, {
    name: "TEST-SELECT April 2026",
    structure_id: 1,
    date_start: "2026-04-01",
    date_end: "2026-04-30",
  });
  payrun_id = run.body.data.id;
});

after(async () => {
  await cleanup();
  await prisma.$disconnect();
  server.close();
});

test("compute with no employee_ids covers every eligible employee", async () => {
  const eligible = await prisma.contract.count({
    where: {
      state: "RUNNING",
      start_date: { lte: new Date("2026-04-30") },
      OR: [{ end_date: null }, { end_date: { gte: new Date("2026-04-01") } }],
    },
  });

  const res = await post(`/api/payruns/${payrun_id}/compute`, payrollToken);
  assert.equal(res.status, 200);
  assert.equal(res.body.data.payslip_count, eligible);
});

test("compute honours a selected subset of employees", async () => {
  const contracts = await prisma.contract.findMany({
    where: {
      state: "RUNNING",
      start_date: { lte: new Date("2026-04-30") },
      OR: [{ end_date: null }, { end_date: { gte: new Date("2026-04-01") } }],
    },
    take: 3,
    orderBy: { employee_id: "asc" },
  });
  const picked = contracts.map((c) => c.employee_id);

  const res = await post(`/api/payruns/${payrun_id}/compute`, payrollToken, {
    employee_ids: picked,
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.data.payslip_count, picked.length, "only the selected employees");

  const stored = await prisma.payslip.findMany({ where: { payrun_id } });
  assert.deepEqual(
    stored.map((p) => p.employee_id).sort((a, b) => a - b),
    [...picked].sort((a, b) => a - b)
  );
});

test("recomputing with a different selection replaces the previous payslips", async () => {
  const contract = await prisma.contract.findFirstOrThrow({
    where: {
      state: "RUNNING",
      start_date: { lte: new Date("2026-04-30") },
      OR: [{ end_date: null }, { end_date: { gte: new Date("2026-04-01") } }],
    },
    orderBy: { employee_id: "asc" },
  });

  const res = await post(`/api/payruns/${payrun_id}/compute`, payrollToken, {
    employee_ids: [contract.employee_id],
  });

  assert.equal(res.body.data.payslip_count, 1);
  const stored = await prisma.payslip.findMany({ where: { payrun_id } });
  assert.equal(stored.length, 1, "the wider previous run must not linger");
});

test("an employee with no eligible contract is rejected, not silently skipped", async () => {
  const outsider = await prisma.employee.create({
    data: { name: "No Contract", work_email: `nocontract.${Date.now()}@peoplepay360.test` },
  });

  const res = await post(`/api/payruns/${payrun_id}/compute`, payrollToken, {
    employee_ids: [outsider.id],
  });

  assert.equal(res.status, 400);
  assert.match(res.body.details[0].issue, new RegExp(String(outsider.id)));

  await prisma.employee.delete({ where: { id: outsider.id } });
});

test("an empty or malformed selection is rejected", async () => {
  const empty = await post(`/api/payruns/${payrun_id}/compute`, payrollToken, {
    employee_ids: [],
  });
  assert.equal(empty.status, 400);
  assert.match(empty.body.details[0].issue, /at least one/);

  const wrong = await post(`/api/payruns/${payrun_id}/compute`, payrollToken, {
    employee_ids: "1,2,3",
  });
  assert.equal(wrong.status, 400);
  assert.match(wrong.body.details[0].issue, /array/);
});

test("an employee can clock themselves in and out", async () => {
  const clockIn = await post("/api/attendances", employeeToken, {
    employee_id: rohitId,
    check_in: "2026-04-10T09:00:00Z",
    notes: "TEST-CLOCK",
  });

  assert.equal(clockIn.status, 201);
  assert.equal(clockIn.body.data.worked_hours, null, "an open entry has no hours yet");

  const clockOut = await patch(
    `/api/attendances/${clockIn.body.data.id}/check-out`,
    employeeToken,
    { check_out: "2026-04-10T17:30:00Z" }
  );

  assert.equal(clockOut.status, 200);
  assert.equal(Number(clockOut.body.data.worked_hours), 8.5);
});

test("clocking in twice without clocking out is refused", async () => {
  const first = await post("/api/attendances", employeeToken, {
    employee_id: rohitId,
    check_in: "2026-04-11T09:00:00Z",
    notes: "TEST-CLOCK",
  });
  assert.equal(first.status, 201);

  const second = await post("/api/attendances", employeeToken, {
    employee_id: rohitId,
    check_in: "2026-04-11T10:00:00Z",
    notes: "TEST-CLOCK",
  });
  assert.equal(second.status, 409);
  assert.equal(second.body.error, "ALREADY_CHECKED_IN");

  const closed = await patch(`/api/attendances/${first.body.data.id}/check-out`, employeeToken, {
    check_out: "2026-04-11T12:00:00Z",
  });
  assert.equal(closed.status, 200);

  const again = await patch(`/api/attendances/${first.body.data.id}/check-out`, employeeToken, {
    check_out: "2026-04-11T13:00:00Z",
  });
  assert.equal(again.status, 409, "an entry cannot be closed twice");
});

test("an employee still cannot clock in for someone else", async () => {
  const res = await post("/api/attendances", employeeToken, {
    employee_id: 1,
    check_in: "2026-04-12T09:00:00Z",
    notes: "TEST-CLOCK",
  });

  assert.equal(res.status, 403);
});

test("an employee cannot close someone else's entry", async () => {
  const hrEntry = await post("/api/attendances", managerToken, {
    employee_id: 1,
    check_in: "2026-04-13T09:00:00Z",
    notes: "TEST-CLOCK",
  });
  assert.equal(hrEntry.status, 201);

  const res = await patch(
    `/api/attendances/${hrEntry.body.data.id}/check-out`,
    employeeToken,
    { check_out: "2026-04-13T17:00:00Z" }
  );
  assert.equal(res.status, 403);

  await prisma.attendance.delete({ where: { id: hrEntry.body.data.id } });
});

test("an employee still cannot edit attendance through PATCH /:id", async () => {
  const entry = await post("/api/attendances", employeeToken, {
    employee_id: rohitId,
    check_in: "2026-04-14T09:00:00Z",
    check_out: "2026-04-14T17:00:00Z",
    notes: "TEST-CLOCK",
  });
  assert.equal(entry.status, 201);

  const res = await patch(`/api/attendances/${entry.body.data.id}`, employeeToken, {
    check_out: "2026-04-14T23:00:00Z",
  });
  assert.equal(res.status, 403, "recorded times are not theirs to rewrite");
});
