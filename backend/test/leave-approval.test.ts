import "dotenv/config";
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import type { Server } from "node:http";
import { app } from "../src/index";
import { prisma } from "../src/lib/prisma";

// Flow B: request leave -> manager approves -> the balance visibly drops.
// Rule 4's deduction is server-side and atomic; these tests prove the balance
// actually moves and cannot be overdrawn, including under concurrent approvals.

let server: Server;
let base: string;
let managerToken: string;
let employeeToken: string;
let employee_id: number;
let leave_type_id: number;

const FIXTURE_EMAIL = "leave.fixture@peoplepay360.test";
const FIXTURE_TYPE = "TEST-LEAVE-TYPE";

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
const get = (p: string, t: string) => call("GET", p, t);

async function login(email: string) {
  const res = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ login: email, password: "password123" }),
  });
  const payload = (await res.json()) as any;
  assert.equal(res.status, 200, `${email} should log in — run npm run seed`);
  return payload.data.token as string;
}

/**
 * Files a request for the fixture employee and returns its id.
 *
 * Filed with the manager token: an HR_MANAGER may file on behalf of anyone, while an
 * EMPLOYEE may only file for themselves. Using the employee token here would be
 * testing against the ownership hole rather than around it.
 */
async function request(days: number, from: string, to: string) {
  const res = await post("/api/leave-requests", managerToken, {
    employee_id,
    leave_type_id,
    date_from: from,
    date_to: to,
    number_of_days: days,
  });
  assert.equal(res.status, 201);
  return res.body.data.id as number;
}

const balance = async () => {
  const rows = await prisma.leaveAllocation.findMany({ where: { employee_id, leave_type_id } });
  return rows.reduce((sum, r) => sum + Number(r.number_of_days), 0);
};

async function cleanup() {
  const employee = await prisma.employee.findUnique({ where: { work_email: FIXTURE_EMAIL } });
  if (employee) {
    await prisma.leaveRequest.deleteMany({ where: { employee_id: employee.id } });
    await prisma.leaveAllocation.deleteMany({ where: { employee_id: employee.id } });
    await prisma.employee.delete({ where: { id: employee.id } });
  }
  await prisma.leaveType.deleteMany({ where: { name: FIXTURE_TYPE } });
}

/** Fresh employee with a 10-day allocation, so each test starts from a known balance. */
async function resetFixture() {
  await cleanup();
  const employee = await prisma.employee.create({
    data: { name: "Leave Fixture", work_email: FIXTURE_EMAIL },
  });
  const type = await prisma.leaveType.create({
    data: { name: FIXTURE_TYPE, request_unit: "DAYS", requires_allocation: true },
  });
  await prisma.leaveAllocation.create({
    data: {
      employee_id: employee.id,
      leave_type_id: type.id,
      number_of_days: 10,
      validity_start: new Date("2026-01-01"),
      validity_end: new Date("2026-12-31"),
      state: "APPROVED",
    },
  });
  employee_id = employee.id;
  leave_type_id = type.id;
}

before(async () => {
  server = app.listen(0);
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("server did not bind a port");
  base = `http://127.0.0.1:${address.port}`;

  managerToken = await login("asha@peoplepay360.test"); // HR_MANAGER
  employeeToken = await login("rohit@peoplepay360.test"); // EMPLOYEE
  await resetFixture();
});

after(async () => {
  await cleanup();
  await prisma.$disconnect();
  server.close();
});

test("a leave request is filed in TO_APPROVE", async () => {
  const res = await post("/api/leave-requests", managerToken, {
    employee_id,
    leave_type_id,
    date_from: "2026-05-04",
    date_to: "2026-05-06",
  });

  assert.equal(res.status, 201);
  assert.equal(res.body.data.state, "TO_APPROVE");
  // 4th to 6th inclusive is 3 days, derived server-side when not supplied.
  assert.equal(Number(res.body.data.number_of_days), 3);
});

test("an EMPLOYEE cannot approve a request", async () => {
  const id = await request(2, "2026-05-11", "2026-05-12");
  const res = await patch(`/api/leave-requests/${id}/approve`, employeeToken);

  assert.equal(res.status, 403);
  assert.equal(res.body.error, "FORBIDDEN");
});

test("approving deducts the days and reports the new balance", async () => {
  await resetFixture();
  const before_days = await balance();
  assert.equal(before_days, 10);

  const id = await request(3, "2026-05-04", "2026-05-06");
  const res = await patch(`/api/leave-requests/${id}/approve`, managerToken);

  assert.equal(res.status, 200);
  assert.equal(res.body.data.state, "APPROVED");
  assert.equal(Number(res.body.data.remaining_days), 7, "the response carries the dropped balance");
  assert.equal(await balance(), 7, "and the database agrees");
});

test("the balances endpoint shows the same number the screen renders", async () => {
  const res = await get(`/api/leave-requests/balances/${employee_id}`, managerToken);

  assert.equal(res.status, 200);
  const entry = res.body.data.find((b: any) => b.leave_type_id === leave_type_id);
  assert.equal(Number(entry.remaining_days), 7);
});

test("refusing does not touch the balance", async () => {
  const before_days = await balance();
  const id = await request(2, "2026-06-01", "2026-06-02");
  const res = await patch(`/api/leave-requests/${id}/refuse`, managerToken);

  assert.equal(res.status, 200);
  assert.equal(res.body.data.state, "REFUSED");
  assert.equal(await balance(), before_days);
});

test("a request cannot be approved twice", async () => {
  await resetFixture();
  const id = await request(2, "2026-05-04", "2026-05-05");

  const first = await patch(`/api/leave-requests/${id}/approve`, managerToken);
  assert.equal(first.status, 200);
  assert.equal(await balance(), 8);

  const second = await patch(`/api/leave-requests/${id}/approve`, managerToken);
  assert.equal(second.status, 409);
  assert.equal(second.body.error, "LEAVE_ALREADY_DECIDED");
  assert.equal(await balance(), 8, "a rejected second approval must not deduct again");
});

test("approving more days than remain is refused", async () => {
  await resetFixture();
  const id = await request(15, "2026-05-04", "2026-05-22");
  const res = await patch(`/api/leave-requests/${id}/approve`, managerToken);

  assert.equal(res.status, 409);
  assert.equal(res.body.error, "INSUFFICIENT_BALANCE");
  assert.match(res.body.details[0].issue, /Requested 15, 10 remaining/);
  assert.equal(await balance(), 10, "a refused approval must leave the balance untouched");
});

test("concurrent approvals cannot overdraw the allocation", async () => {
  await resetFixture(); // 10 days available
  const ids = await Promise.all([
    request(6, "2026-05-04", "2026-05-11"),
    request(6, "2026-06-01", "2026-06-08"),
  ]);

  // Both are valid alone but not together. Without SELECT ... FOR UPDATE both would
  // read a balance of 10, both would pass the check, and the allocation would go to -2.
  const results = await Promise.all(ids.map((id) => patch(`/api/leave-requests/${id}/approve`, managerToken)));

  const approved = results.filter((r) => r.status === 200);
  const rejected = results.filter((r) => r.status === 409);
  assert.equal(approved.length, 1, "exactly one approval should win");
  assert.equal(rejected.length, 1);
  assert.equal(rejected[0].body.error, "INSUFFICIENT_BALANCE");

  const remaining = await balance();
  assert.equal(remaining, 4, "10 - 6, never overdrawn");
  assert.ok(remaining >= 0);
});

test("a leave type that needs no allocation approves without a balance", async () => {
  const type = await prisma.leaveType.create({
    data: { name: FIXTURE_TYPE, request_unit: "DAYS", requires_allocation: false },
  });
  const filed = await post("/api/leave-requests", managerToken, {
    employee_id,
    leave_type_id: type.id,
    date_from: "2026-07-01",
    date_to: "2026-07-02",
  });
  assert.equal(filed.status, 201);

  const res = await patch(`/api/leave-requests/${filed.body.data.id}/approve`, managerToken);
  assert.equal(res.status, 200);
  assert.equal(res.body.data.state, "APPROVED");
  assert.equal(res.body.data.remaining_days, null);
});
