import "dotenv/config";
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import type { Server } from "node:http";
import { app } from "../src/index";
import { prisma } from "../src/lib/prisma";

// Salary Structure and Rule configuration (A5, A6) and user administration.
// The two payroll roles differ here and nowhere else: a payroll user reads this
// configuration, a payroll manager changes it.

let server: Server;
let base: string;
let userToken: string; // vikram, HR_PAYROLL_USER
let managerToken: string; // priya, HR_PAYROLL_MANAGER
let adminToken: string;
let employeeToken: string;
let structure_id: number;

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
const patch = (p: string, t: string, b?: unknown) => call("PATCH", p, t, b);
const del = (p: string, t: string) => call("DELETE", p, t);

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
  await prisma.salaryRule.deleteMany({ where: { structure: { name: { startsWith: "TEST-STRUCT" } } } });
  await prisma.payrollStructure.deleteMany({ where: { name: { startsWith: "TEST-STRUCT" } } });
  await prisma.user.deleteMany({ where: { login: { startsWith: "test-user-" } } });
}

before(async () => {
  server = app.listen(0);
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("server did not bind a port");
  base = `http://127.0.0.1:${address.port}`;

  userToken = await login("vikram@peoplepay360.test");
  managerToken = await login("priya@peoplepay360.test");
  adminToken = await login("admin@peoplepay360.test");
  employeeToken = await login("rohit@peoplepay360.test");

  await cleanup();
  const created = await post("/api/salary-structures", managerToken, { name: "TEST-STRUCT A" });
  structure_id = created.body.data.id;
});

after(async () => {
  await cleanup();
  await prisma.$disconnect();
  server.close();
});

test("both payroll roles read structures; an employee cannot", async () => {
  assert.equal((await get("/api/salary-structures", userToken)).status, 200);
  assert.equal((await get("/api/salary-structures", managerToken)).status, 200);
  assert.equal((await get("/api/salary-structures", employeeToken)).status, 403);
});

test("a payroll user cannot change configuration, a payroll manager can", async () => {
  const refused = await post("/api/salary-structures", userToken, { name: "TEST-STRUCT B" });
  assert.equal(refused.status, 403, "read-only for HR_PAYROLL_USER");

  const allowed = await post("/api/salary-structures", managerToken, { name: "TEST-STRUCT B" });
  assert.equal(allowed.status, 201);
});

test("the structure list carries rule and employee counts", async () => {
  const res = await get("/api/salary-structures", managerToken);
  const seeded = res.body.data.find((s: any) => s.id === 1);
  assert.equal(seeded._count.salary_rules, 6, "the seeded chain has six rules");
  assert.ok(seeded._count.contracts > 0);
});

test("a rule is created and read back in sequence", async () => {
  const basic = await post("/api/salary-rules", managerToken, {
    structure_id,
    code: "BASIC",
    name: "Basic",
    sequence: 10,
    category: "BASIC",
    amount_select: "PERCENT",
    amount_percent: 50,
    percent_base_code: "WAGE",
  });
  assert.equal(basic.status, 201);

  const gross = await post("/api/salary-rules", managerToken, {
    structure_id,
    code: "GROSS",
    name: "Gross",
    sequence: 20,
    category: "GROSS",
    amount_select: "FORMULA",
    formula: "BASIC * 2",
  });
  assert.equal(gross.status, 201);

  const detail = await get(`/api/salary-structures/${structure_id}`, userToken);
  assert.deepEqual(
    detail.body.data.salary_rules.map((r: any) => r.code),
    ["BASIC", "GROSS"]
  );
});

test("a formula reading a code that runs later is rejected on save", async () => {
  // NET at sequence 15 cannot read GROSS, which is computed at 20.
  const res = await post("/api/salary-rules", managerToken, {
    structure_id,
    code: "NET",
    name: "Net",
    sequence: 15,
    amount_select: "FORMULA",
    formula: "GROSS - 100",
  });

  assert.equal(res.status, 400, "a broken rule must fail at save, not mid-payrun");
  assert.match(res.body.details[0].issue, /GROSS/);
});

test("a malformed formula is rejected on save", async () => {
  const res = await post("/api/salary-rules", managerToken, {
    structure_id,
    code: "BAD",
    name: "Bad",
    sequence: 30,
    amount_select: "FORMULA",
    formula: "BASIC + ",
  });
  assert.equal(res.status, 400);
});

test("a percentage rule needs a base that exists earlier", async () => {
  const res = await post("/api/salary-rules", managerToken, {
    structure_id,
    code: "PCT",
    name: "Percent",
    sequence: 30,
    amount_select: "PERCENT",
    amount_percent: 10,
    percent_base_code: "NOPE",
  });
  assert.equal(res.status, 400);
  assert.match(res.body.details[0].issue, /NOPE/);
});

test("a duplicate rule code in one structure is refused", async () => {
  const res = await post("/api/salary-rules", managerToken, {
    structure_id,
    code: "BASIC",
    name: "Basic again",
    sequence: 40,
    amount_select: "FIXED",
    amount_fixed: 1,
  });
  assert.equal(res.status, 409);
  assert.equal(res.body.error, "DUPLICATE_RULE_CODE");
});

test("a rule another rule depends on cannot be deleted", async () => {
  const basic = await prisma.salaryRule.findFirstOrThrow({ where: { structure_id, code: "BASIC" } });
  const res = await del(`/api/salary-rules/${basic.id}`, managerToken);

  assert.equal(res.status, 409);
  assert.equal(res.body.error, "RULE_IN_USE");
  assert.match(res.body.details[0].issue, /GROSS/);
});

test("a structure in use cannot be deleted", async () => {
  const res = await del("/api/salary-structures/1", managerToken);
  assert.equal(res.status, 409);
  assert.equal(res.body.error, "STRUCTURE_IN_USE");
});

test("only an admin administers users", async () => {
  for (const token of [employeeToken, userToken, managerToken]) {
    assert.equal((await get("/api/users", token)).status, 403);
  }
  assert.equal((await get("/api/users", adminToken)).status, 200);
});

test("an admin creates a working login for a new hire", async () => {
  const employee = await prisma.employee.create({
    data: { name: "New Hire", work_email: `newhire.${Date.now()}@peoplepay360.test` },
  });

  const created = await post("/api/users", adminToken, {
    name: "New Hire",
    login: `test-user-${Date.now()}@peoplepay360.test`,
    password: "hunter2hunter2",
    role: "EMPLOYEE",
    employee_id: employee.id,
  });

  assert.equal(created.status, 201);
  assert.equal(created.body.data.password_hash, undefined, "never return the hash");

  // The new account must actually be able to sign in.
  const res = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ login: created.body.data.login, password: "hunter2hunter2" }),
  });
  assert.equal(res.status, 200);
  assert.equal(((await res.json()) as any).data.user.employee_id, employee.id);

  await prisma.user.delete({ where: { id: created.body.data.id } });
  await prisma.employee.delete({ where: { id: employee.id } });
});

test("a short password is refused", async () => {
  const res = await post("/api/users", adminToken, {
    name: "Weak",
    login: `test-user-weak-${Date.now()}@peoplepay360.test`,
    password: "short",
    role: "EMPLOYEE",
  });
  assert.equal(res.status, 400);
  assert.match(res.body.details[0].issue, /8 characters/);
});

test("the last administrator cannot be demoted", async () => {
  const admin = await prisma.user.findFirstOrThrow({ where: { role: "ADMIN" } });
  const res = await patch(`/api/users/${admin.id}`, adminToken, { role: "EMPLOYEE" });

  assert.equal(res.status, 400, "an admin may not remove their own access");
  const unchanged = await prisma.user.findUniqueOrThrow({ where: { id: admin.id } });
  assert.equal(unchanged.role, "ADMIN");
});

test("anyone can change their own password, with the current one", async () => {
  const wrong = await patch("/api/users/me/password", employeeToken, {
    current_password: "not-it",
    new_password: "brandnewpass1",
  });
  assert.equal(wrong.status, 403);

  const ok = await patch("/api/users/me/password", employeeToken, {
    current_password: "password123",
    new_password: "brandnewpass1",
  });
  assert.equal(ok.status, 200);

  // Put it back so the rest of the suite and the demo keep working.
  const restored = await patch("/api/users/me/password", employeeToken, {
    current_password: "brandnewpass1",
    new_password: "password123",
  });
  assert.equal(restored.status, 200);
});
