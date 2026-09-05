import "dotenv/config";
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import type { Server } from "node:http";
import { app } from "../src/index";
import { prisma } from "../src/lib/prisma";

// Rule 6 end to end: a second RUNNING contract overlapping an existing one is rejected
// with 409 CONTRACT_OVERLAP, and the response uses the error envelope from AGENT.md §4.
// Runs against the seeded dev database and removes everything it creates.

let server: Server;
let base: string;
let token: string;
let employee_id: number;

const REF = (n: number) => `TEST-OVERLAP-${n}`;

async function post(path: string, body: unknown) {
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: (await res.json()) as any };
}

async function patch(path: string, body: unknown) {
  const res = await fetch(`${base}${path}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: (await res.json()) as any };
}

async function cleanup() {
  await prisma.contract.deleteMany({ where: { reference: { startsWith: "TEST-OVERLAP-" } } });
  await prisma.employee.deleteMany({ where: { work_email: "overlap.fixture@peoplepay360.test" } });
}

before(async () => {
  server = app.listen(0);
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("server did not bind a port");
  base = `http://127.0.0.1:${address.port}`;

  const login = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ login: "asha@peoplepay360.test", password: "password123" }),
  });
  const payload = (await login.json()) as any;
  assert.equal(login.status, 200, "seeded HR_MANAGER should be able to log in — run npm run seed");
  token = payload.data.token;

  await cleanup();
  const employee = await prisma.employee.create({
    data: { name: "Overlap Fixture", work_email: "overlap.fixture@peoplepay360.test" },
  });
  employee_id = employee.id;
});

after(async () => {
  await cleanup();
  await prisma.$disconnect();
  server.close();
});

test("a RUNNING contract is created normally", async () => {
  const res = await post("/api/contracts", {
    employee_id,
    reference: REF(1),
    wage: 50000,
    start_date: "2026-01-01",
    end_date: "2026-06-30",
    state: "RUNNING",
  });

  assert.equal(res.status, 201);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.state, "RUNNING");
});

test("a second RUNNING contract overlapping the first returns 409 CONTRACT_OVERLAP", async () => {
  const res = await post("/api/contracts", {
    employee_id,
    reference: REF(2),
    wage: 60000,
    start_date: "2026-04-01", // starts inside the first contract's window
    end_date: "2026-12-31",
    state: "RUNNING",
  });

  assert.equal(res.status, 409);
  assert.equal(res.body.success, false);
  assert.equal(res.body.code, 409);
  assert.equal(res.body.error, "CONTRACT_OVERLAP");
  assert.match(res.body.details[0].issue, /TEST-OVERLAP-1/);

  const stored = await prisma.contract.findUnique({ where: { reference: REF(2) } });
  assert.equal(stored, null, "the rejected contract must not have been written");
});

test("a DRAFT contract in the same window is allowed", async () => {
  const res = await post("/api/contracts", {
    employee_id,
    reference: REF(3),
    wage: 60000,
    start_date: "2026-04-01",
    end_date: "2026-12-31",
    state: "DRAFT",
  });

  assert.equal(res.status, 201);
  assert.equal(res.body.data.state, "DRAFT");
});

test("promoting that DRAFT to RUNNING is rejected by the same rule", async () => {
  const draft = await prisma.contract.findUniqueOrThrow({ where: { reference: REF(3) } });
  const res = await patch(`/api/contracts/${draft.id}`, { state: "RUNNING" });

  assert.equal(res.status, 409);
  assert.equal(res.body.error, "CONTRACT_OVERLAP");

  const stored = await prisma.contract.findUniqueOrThrow({ where: { id: draft.id } });
  assert.equal(stored.state, "DRAFT", "a rejected promotion must leave the state unchanged");
});

test("a non-overlapping RUNNING contract after the first one ends is allowed", async () => {
  const res = await post("/api/contracts", {
    employee_id,
    reference: REF(4),
    wage: 70000,
    start_date: "2026-07-01", // first contract ended 2026-06-30
    end_date: null,
    state: "RUNNING",
  });

  assert.equal(res.status, 201);
  assert.equal(res.body.data.state, "RUNNING");
});

test("editing a RUNNING contract does not conflict with itself", async () => {
  const own = await prisma.contract.findUniqueOrThrow({ where: { reference: REF(4) } });
  const res = await patch(`/api/contracts/${own.id}`, { wage: 75000 });

  assert.equal(res.status, 200);
  assert.equal(Number(res.body.data.wage), 75000);
});
