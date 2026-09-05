import "dotenv/config";
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import type { Server } from "node:http";
import { app } from "../src/index";
import { prisma } from "../src/lib/prisma";

// Record-level access control. requireRole decides which actions a role may perform;
// these tests cover whose records it may perform them on. Every case here was
// reachable before the rbac helpers existed: an EMPLOYEE could read any colleague's
// payslip and wage, and file leave in someone else's name.

let server: Server;
let base: string;
let employeeToken: string; // rohit, EMPLOYEE, employee_id 2
let managerToken: string; // asha, HR_MANAGER, employee_id 1
let otherEmployeeId: number;
let ownPayslipId: number;
let otherPayslipId: number;

async function call(method: string, path: string, token: string, body?: unknown) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await res.text();
  return { status: res.status, body: text.startsWith("{") ? JSON.parse(text) : text };
}

const get = (p: string, t: string) => call("GET", p, t);
const post = (p: string, t: string, b?: unknown) => call("POST", p, t, b);

async function login(email: string) {
  const res = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ login: email, password: "password123" }),
  });
  assert.equal(res.status, 200, `${email} should log in — run npm run seed`);
  return ((await res.json()) as any).data.token as string;
}

before(async () => {
  server = app.listen(0);
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("server did not bind a port");
  base = `http://127.0.0.1:${address.port}`;

  employeeToken = await login("rohit@peoplepay360.test");
  managerToken = await login("asha@peoplepay360.test");

  const rohit = await prisma.employee.findUniqueOrThrow({
    where: { work_email: "rohit@peoplepay360.test" },
  });
  const asha = await prisma.employee.findUniqueOrThrow({
    where: { work_email: "asha@peoplepay360.test" },
  });
  otherEmployeeId = asha.id;

  const own = await prisma.payslip.findFirst({ where: { employee_id: rohit.id } });
  const other = await prisma.payslip.findFirst({ where: { employee_id: asha.id } });
  assert.ok(own && other, "run npm run seed && npm run demo — payslips are needed");
  ownPayslipId = own.id;
  otherPayslipId = other.id;
});

after(async () => {
  await prisma.leaveRequest.deleteMany({ where: { reason: "RBAC probe" } });
  await prisma.$disconnect();
  server.close();
});

test("an employee cannot read another employee's payslip", async () => {
  const mine = await get(`/api/payslips/${ownPayslipId}`, employeeToken);
  assert.equal(mine.status, 200, "their own payslip stays readable");

  const theirs = await get(`/api/payslips/${otherPayslipId}`, employeeToken);
  assert.equal(theirs.status, 403);
  assert.equal(theirs.body.error, "FORBIDDEN");
});

test("an employee cannot download another employee's payslip PDF", async () => {
  const res = await get(`/api/payslips/${otherPayslipId}/pdf`, employeeToken);
  assert.equal(res.status, 403);
});

test("a manager can read any payslip", async () => {
  const res = await get(`/api/payslips/${otherPayslipId}`, managerToken);
  assert.equal(res.status, 200);
});

test("an employee cannot read another employee's contracts or wage", async () => {
  const theirs = await get(`/api/employees/${otherEmployeeId}/contracts`, employeeToken);
  assert.equal(theirs.status, 403);

  const contract = await prisma.contract.findFirstOrThrow({
    where: { employee_id: otherEmployeeId },
  });
  const direct = await get(`/api/contracts/${contract.id}`, employeeToken);
  assert.equal(direct.status, 403, "a contract carries the wage");
});

test("an employee cannot file leave in someone else's name", async () => {
  const res = await post("/api/leave-requests", employeeToken, {
    employee_id: otherEmployeeId,
    leave_type_id: 1,
    date_from: "2026-09-01",
    date_to: "2026-09-02",
    reason: "RBAC probe",
  });

  assert.equal(res.status, 403);
  const leaked = await prisma.leaveRequest.findFirst({ where: { reason: "RBAC probe" } });
  assert.equal(leaked, null, "nothing may be written when the check fails");
});

test("an employee can still file leave for themselves", async () => {
  const rohit = await prisma.employee.findUniqueOrThrow({
    where: { work_email: "rohit@peoplepay360.test" },
  });
  const res = await post("/api/leave-requests", employeeToken, {
    employee_id: rohit.id,
    leave_type_id: 1,
    date_from: "2026-09-01",
    date_to: "2026-09-02",
    reason: "RBAC probe",
  });

  assert.equal(res.status, 201);
  assert.equal(res.body.data.employee_id, rohit.id);
});

test("leave and attendance lists are narrowed to the caller's own rows", async () => {
  // Asking for someone else's rows explicitly must not widen the result.
  const leaves = await get(`/api/leave-requests?employee_id=${otherEmployeeId}`, employeeToken);
  assert.equal(leaves.status, 200);
  assert.ok(
    leaves.body.data.every((r: any) => r.employee_id !== otherEmployeeId),
    "the query parameter must not override the token"
  );

  const attendance = await get(`/api/attendances?employee_id=${otherEmployeeId}`, employeeToken);
  assert.equal(attendance.status, 200);
  assert.ok(attendance.body.data.every((r: any) => r.employee_id !== otherEmployeeId));

  // The manager still sees the whole organisation.
  const all = await get("/api/attendances", managerToken);
  assert.ok(all.body.meta.total_records > attendance.body.meta.total_records);
});

test("an employee cannot read payroll-wide data", async () => {
  for (const path of [
    "/api/payruns",
    "/api/dashboard/kpis?period=2026-03",
    "/api/dashboard/salary-by-department?period=2026-03",
  ]) {
    const res = await get(path, employeeToken);
    assert.equal(res.status, 403, `${path} must not be readable by an EMPLOYEE`);
  }
});

test("a manager still reads payroll-wide data", async () => {
  for (const path of ["/api/payruns", "/api/dashboard/kpis?period=2026-03"]) {
    const res = await get(path, managerToken);
    assert.equal(res.status, 200, `${path} must stay readable by HR_MANAGER`);
  }
});

test("an employee cannot read another employee's leave balance", async () => {
  const res = await get(`/api/leave-requests/balances/${otherEmployeeId}`, employeeToken);
  assert.equal(res.status, 403);
});
