# AGENT.md — build plan for two

Odoo Hackathon · PeoplePay360. MVP scope, git branch split, DB schema, and API contract — both devs start coding in parallel against one shared contract.

- **Developer A · Frontend** — Employee/Contract/Attendance/TimeOff screens, Payrun wizard UI, Payslip view, Dashboard UI. Task list: `FE_TASKS.md`.
- **Developer B · Backend** — Auth/RBAC, contract resolver, salary rule engine, payrun lifecycle, dashboard aggregation queries. Task list: `BE_TASKS.md`.

## 1. MVP Scope

Everything below must be real — no mock arrays, no hardcoded payslip math. "Cut for v1" is built only if the rest finishes early.

| Area | Build (P0) | Cut for v1 |
|---|---|---|
| Auth | Login only, roles seeded in DB | Admin User Management UI |
| Employee | List + Form | Kanban view |
| Contract | List + Form, **overlap-rejection live (409)** | — |
| Schedule | One seeded default schedule | Schedule CRUD UI |
| Attendance | List + manual entry form | Live quick-punch widget |
| Time Off | Request form + Approve/Refuse + balance deduction | Types/Allocation CRUD UI (seed via script) |
| Payroll | Seeded Structure + Rules, real sequenced engine, Payrun wizard (2-step), Compute→Validate→Mark Paid, Payslip breakdown + PDF | Salary Rule/Structure CRUD UI, real email send (log "sent" is fine) |
| Dashboard | KPI cards + 1 live chart (salary by dept) | Attendance/leave overview panel, trend chart |

**Two flows to rehearse for the live demo:**
- Flow A: Employee → Contract (trigger overlap rejection on purpose) → Attendance → Payrun → Payslip. Walk the rule-sequence table live.
- Flow B: Seeded leave type/allocation → employee requests leave → manager approves → balance visibly drops → dashboard reflects it.

**Build order (both start on hour 0):**
1. Both: lock the schema below — nothing starts until field names and types are fixed.
2. Backend: Auth + Employee + Contract endpoints, with overlap-rejection rule live first.
3. Frontend: Employee list/form wired to real endpoints from hour 0 — build against the API contract, not mock JSON.
4. Backend: Salary rule engine — sequence execution + `payslip_line` lookup table.
5. Frontend: Attendance + Time Off screens, contract-aware employee smart buttons.
6. Backend: Payrun wizard endpoints + Compute/Validate/Mark Paid actions.
7. Frontend: Payrun wizard UI + Payslip screen rendering the rule breakdown.
8. Both: Dashboard last, wired to live aggregate queries — the easiest part to fake, first thing a judge pokes at.

## 2. Git Plan

One repo, one `main`, short-lived feature branches merged behind the API contract, not behind each other's screens.

- `main` — always demoable, only merges that pass the Pre-Merge checklist land here.
- `dev` — integration branch. Both feature branches target this, not `main` directly.
- `feature/be-<module>` — e.g. `feature/be-contract-resolver`, `feature/be-payrun-engine`.
- `feature/fe-<module>` — e.g. `feature/fe-employee-screens`, `feature/fe-payslip-view`.

The API contract (tab 4 here) is written and agreed **before** either dev writes a route handler or a fetch call. Backend implements against it; Frontend builds against a local mock server returning the exact same JSON shape. Swap the mock base URL for the real one when an endpoint lands — zero refactor, the envelope never changes.

> Recommended: run `json-server` or a 10-line Express/Flask stub seeded from the API contract's example payloads, so Frontend is never idle waiting on Backend.

**Commit & merge rhythm:**
- Commit small, commit often — a broken build on someone else's branch costs the other person nothing.
- Open a PR into `dev` the moment a screen or endpoint is demoable, even half-styled — don't batch a whole module into one PR.
- Whoever finishes a layer first writes the seed data for it, so the other person always has real records to build against.
- Merge `dev → main` after each of the two demo flows works end-to-end — two checkpoints, not one big-bang merge at the deadline.

## 3. DB Schema (Postgres)

P0 tables only, matches MVP scope above.

```sql
CREATE TABLE users (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(120) NOT NULL,
    login         VARCHAR(160) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role          VARCHAR(30) NOT NULL CHECK (role IN
                    ('EMPLOYEE','HR_MANAGER','HR_PAYROLL_USER','HR_PAYROLL_MANAGER','ADMIN')),
    status        VARCHAR(10) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE')),
    employee_id   INT,           -- FK added after employees table exists
    created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE resource_calendars (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(80) NOT NULL,
    hours_per_week  NUMERIC(5,2) NOT NULL DEFAULT 40,
    days_per_week   INT NOT NULL DEFAULT 5,
    timezone        VARCHAR(40) DEFAULT 'Asia/Kolkata'
);

CREATE TABLE employees (
    id                    SERIAL PRIMARY KEY,
    name                  VARCHAR(120) NOT NULL,
    work_email            VARCHAR(160) UNIQUE NOT NULL,
    department            VARCHAR(80),
    job_title             VARCHAR(80),
    manager_id            INT REFERENCES employees(id) ON DELETE SET NULL,
    resource_calendar_id  INT REFERENCES resource_calendars(id) ON DELETE RESTRICT,
    status                VARCHAR(10) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE')),
    created_at            TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE users ADD CONSTRAINT fk_users_employee
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE SET NULL;

CREATE TABLE contracts (
    id                    SERIAL PRIMARY KEY,
    employee_id           INT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    reference             VARCHAR(40) UNIQUE NOT NULL,
    wage                  NUMERIC(12,2) NOT NULL CHECK (wage >= 0),
    start_date            DATE NOT NULL,
    end_date              DATE,
    resource_calendar_id  INT REFERENCES resource_calendars(id),
    structure_id          INT,   -- FK added after payroll_structures exists
    state                 VARCHAR(12) DEFAULT 'DRAFT' CHECK (state IN
                            ('DRAFT','RUNNING','EXPIRED','CANCELLED')),
    created_at            TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_contracts_employee ON contracts(employee_id);
CREATE INDEX idx_contracts_state ON contracts(state);
-- Rule 6: reject overlapping RUNNING contracts in application logic before insert/update.

CREATE TABLE attendances (
    id              SERIAL PRIMARY KEY,
    employee_id     INT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    check_in        TIMESTAMPTZ NOT NULL,
    check_out       TIMESTAMPTZ,
    worked_hours    NUMERIC(6,2) GENERATED ALWAYS AS
                      (EXTRACT(EPOCH FROM (check_out - check_in)) / 3600.0) STORED,
    status          VARCHAR(10) DEFAULT 'PRESENT' CHECK (status IN ('PRESENT','ABSENT')),
    notes           TEXT
);
CREATE INDEX idx_attendance_employee ON attendances(employee_id);

CREATE TABLE leave_types (
    id                   SERIAL PRIMARY KEY,
    name                 VARCHAR(60) NOT NULL,
    request_unit         VARCHAR(10) DEFAULT 'DAYS' CHECK (request_unit IN ('DAYS','HOURS')),
    requires_allocation  BOOLEAN DEFAULT true,
    active               BOOLEAN DEFAULT true
);

CREATE TABLE leave_allocations (
    id              SERIAL PRIMARY KEY,
    employee_id     INT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    leave_type_id   INT NOT NULL REFERENCES leave_types(id) ON DELETE RESTRICT,
    number_of_days  NUMERIC(5,2) NOT NULL,
    validity_start  DATE,
    validity_end    DATE,
    state           VARCHAR(12) DEFAULT 'APPROVED' CHECK (state IN ('TO_APPROVE','APPROVED','REFUSED'))
);
CREATE INDEX idx_alloc_employee ON leave_allocations(employee_id, leave_type_id);

CREATE TABLE leave_requests (
    id                  SERIAL PRIMARY KEY,
    employee_id         INT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    leave_type_id       INT NOT NULL REFERENCES leave_types(id) ON DELETE RESTRICT,
    date_from           DATE NOT NULL,
    date_to             DATE NOT NULL,
    number_of_days      NUMERIC(5,2) NOT NULL,
    state               VARCHAR(12) DEFAULT 'TO_APPROVE' CHECK (state IN ('TO_APPROVE','APPROVED','REFUSED')),
    approver_id         INT REFERENCES employees(id),
    reason              TEXT,
    created_at          TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_leave_employee ON leave_requests(employee_id);
CREATE INDEX idx_leave_state ON leave_requests(state);
-- Rule 4: on state -> APPROVED, deduct number_of_days from matching leave_allocations row atomically.

CREATE TABLE payroll_structures (
    id      SERIAL PRIMARY KEY,
    name    VARCHAR(80) NOT NULL,
    active  BOOLEAN DEFAULT true
);
ALTER TABLE contracts ADD CONSTRAINT fk_contracts_structure
    FOREIGN KEY (structure_id) REFERENCES payroll_structures(id);

CREATE TABLE salary_rules (
    id                SERIAL PRIMARY KEY,
    structure_id      INT NOT NULL REFERENCES payroll_structures(id) ON DELETE CASCADE,
    code              VARCHAR(20) NOT NULL,      -- BASIC, HRA, GROSS, PT, PF, NET
    name              VARCHAR(80) NOT NULL,
    category          VARCHAR(12) CHECK (category IN ('BASIC','ALLOWANCE','GROSS','DEDUCTION','NET')),
    sequence          INT NOT NULL,
    amount_select     VARCHAR(10) CHECK (amount_select IN ('FIXED','PERCENT','FORMULA')),
    amount_fixed      NUMERIC(12,2),
    amount_percent    NUMERIC(5,2),
    percent_base_code VARCHAR(20),               -- which prior rule code the percentage applies to
    formula           TEXT,                      -- e.g. "GROSS - PT - PF"
    UNIQUE(structure_id, code)
);
CREATE INDEX idx_rules_structure_seq ON salary_rules(structure_id, sequence);

CREATE TABLE payslip_runs (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(80) NOT NULL,
    structure_id  INT NOT NULL REFERENCES payroll_structures(id),
    date_start    DATE NOT NULL,
    date_end      DATE NOT NULL,
    state         VARCHAR(12) DEFAULT 'DRAFT' CHECK (state IN ('DRAFT','COMPUTED','CONFIRMED','PAID')),
    created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE payslips (
    id             SERIAL PRIMARY KEY,
    employee_id    INT NOT NULL REFERENCES employees(id),
    payrun_id      INT NOT NULL REFERENCES payslip_runs(id) ON DELETE CASCADE,
    contract_id    INT NOT NULL REFERENCES contracts(id),
    structure_id   INT NOT NULL REFERENCES payroll_structures(id),
    date_from      DATE NOT NULL,
    date_to        DATE NOT NULL,
    worked_days    NUMERIC(5,2),
    gross_amount   NUMERIC(12,2),
    net_amount     NUMERIC(12,2),
    state          VARCHAR(10) DEFAULT 'DRAFT' CHECK (state IN ('DRAFT','DONE','PAID')),
    warning_code   VARCHAR(30)   -- MISSING_BANK_DETAILS | DUPLICATE_PAYSLIP | NO_ACTIVE_CONTRACT | NEGATIVE_NET | NULL
);
CREATE INDEX idx_payslip_employee ON payslips(employee_id);
CREATE INDEX idx_payslip_run ON payslips(payrun_id);

CREATE TABLE payslip_lines (
    id          SERIAL PRIMARY KEY,
    payslip_id  INT NOT NULL REFERENCES payslips(id) ON DELETE CASCADE,
    rule_code   VARCHAR(20) NOT NULL,
    rule_name   VARCHAR(80) NOT NULL,
    amount      NUMERIC(12,2) NOT NULL,
    sequence    INT NOT NULL
);
CREATE INDEX idx_lines_payslip ON payslip_lines(payslip_id);
-- this table IS the audit trail: any later rule's formula reads a prior row here by rule_code.
```

> Whoever sets this up first runs it and commits the migration file — the other person pulls it, doesn't re-derive it. (Backend: this is done via Prisma migration, see `BE_TASKS.md`.)

## 4. API Contract

Stick to this exactly. Frontend never guesses a field name; Backend never renames one without updating this file.

Request/response `data` objects mirror the Prisma models field-for-field, using the column names in §3 (`snake_case` as written there, unless Prisma's generated client forces camelCase — Backend confirms the actual casing when the first migration lands). No field names are invented ahead of that — this doc names endpoints and shapes, not exact payloads, until the schema is the single source.

**Success envelope:**
```json
{
  "success": true,
  "code": 200,
  "data": {},
  "meta": { "page": 1, "limit": 20, "total_records": 0 }
}
```

**Error envelope:**
```json
{
  "success": false,
  "code": 409,
  "error": "CONTRACT_OVERLAP",
  "message": "Employee already has a running contract for this period.",
  "details": [{ "field": "start_date", "issue": "Overlaps CON-2026-0042 (Apr 1 - active)" }]
}
```

**Status codes used:**

| Code | Meaning here |
|---|---|
| 200 / 201 | Read / created successfully |
| 400 | Validation failed (missing field, bad date range) |
| 401 / 403 | Not logged in / role doesn't allow this action |
| 404 | Employee, contract, payrun, etc. not found |
| 409 | Contract overlap — the rule jury will test live |

Every list endpoint (`/employees`, `/employees/:id/contracts`, `/attendances`, `/leave-requests`, `/payruns`) accepts `page=` and `limit=` (defaults `page=1`, `limit=20`) and returns `meta.total_records` as the full filtered count, not just the current page's length.

**Auth**
- `POST /api/auth/login`
- `GET /api/auth/me`

`login` accepts `{ login, password }`, returns `data: { token, user: { id, name, login, role, employee_id } }`. `me` returns `data: { id, name, login, role, employee_id }` — same `user` shape, no `token`. FE gates Approve/Refuse and other role-only actions off `user.role`.

**Employee**
- `GET /api/employees`
- `GET /api/employees/:id`
- `POST /api/employees`
- `PATCH /api/employees/:id`

**Contract — the resolver lives here**
- `GET /api/employees/:id/contracts`
- `GET /api/contracts/:id`
- `POST /api/contracts`
- `PATCH /api/contracts/:id`

`POST /api/contracts` accepts `state` (`DRAFT` or `RUNNING`); `PATCH /api/contracts/:id` can change it. The overlap check (rule 6) runs on both, whenever the resulting state is `RUNNING` — returns `409 CONTRACT_OVERLAP` on conflict. A `DRAFT` contract never triggers or blocks on overlap.

**Attendance**
- `GET /api/attendances?employee_id=`
- `POST /api/attendances`

**Time Off**
- `GET /api/leave-requests?employee_id=&state=`
- `POST /api/leave-requests`
- `PATCH /api/leave-requests/:id/approve`
- `PATCH /api/leave-requests/:id/refuse`

Approve endpoint deducts the allocation server-side (rule 4) — Frontend never computes the balance itself.

**Payroll — the rule engine lives here**
- `GET /api/payruns`
- `POST /api/payruns`
- `GET /api/payruns/:id/eligible-employees`
- `POST /api/payruns/:id/compute`
- `POST /api/payruns/:id/confirm`
- `POST /api/payruns/:id/mark-paid`
- `GET /api/payslips/:id`
- `GET /api/payslips/:id/pdf`

`compute` response includes `line_ids` per payslip — the full rule-by-rule breakdown, in sequence, is what the Payslip screen renders directly.

`compute` is bulk: a duplicate payslip for one employee never fails the whole payrun. It's flagged via `payslips.warning_code = DUPLICATE_PAYSLIP` on that payslip only, not a `409`. `409` is reserved for contract overlap.

`payslips.worked_days` is derived from the contract's `resource_calendar` working days within the payslip period. Attendance records do **not** feed payroll in v1 — worked_days comes from the calendar, not from `attendances` rows. State this explicitly if a judge asks whether attendance affects pay.

**Dashboard**
- `GET /api/dashboard/kpis?period=&department=`
- `GET /api/dashboard/salary-by-department?period=`

`period=` is `YYYY-MM` (e.g. `2026-04`) on both endpoints.

`kpis` returns exactly four numbers: `headcount`, `total_gross` (period), `total_net` (period), `pending_leave_requests`.

One endpoint per KPI/chart (rule 10) — never one giant `/dashboard` blob. Easier for Frontend to loading-state each widget independently.

## 5. Frontend / Backend Standards

**Frontend (Developer A)**
- One axios/fetch wrapper, injects `Authorization: Bearer <token>` automatically — no per-call auth headers.
- Every list/detail view implements three states: loading (skeleton), error (retry button), empty (plain message) — never a blank screen while waiting.
- Disable submit buttons on click to prevent double-fires (matters most on Payrun's Compute/Confirm actions).
- Payslip screen renders `line_ids` as a table in the order the API returns it — sequence order is data, not something Frontend re-sorts.

**Backend (Developer B)**
- Role-gate middleware on every route, keyed off the role ladder above — one middleware function, not five separate checks.
- Global exception handler: no unhandled error ever reaches the client as a raw stack trace.
- Contract overlap check and the salary rule engine are the two pieces of logic that get a dedicated test file — these are what a judge will ask you to prove.
- Seed script creates: 1 schedule, 3-5 employees, 1 payroll structure with the 6-rule chain (BASIC→HRA→GROSS→PT→PF→NET), 2 leave types with allocations.

## 6. Pre-Merge Checklist

Before every PR into `dev`:

- [ ] Migration runs clean on a fresh DB, doesn't drop existing seed data.
- [ ] Response shape matches the API contract exactly (field names, envelope).
- [ ] Contract overlap rule tested: creating a second RUNNING contract in the same window returns 409.
- [ ] Salary rule engine tested: at least one formula rule correctly reads a prior rule's amount by code.
- [ ] Loading / error / empty states present on any new screen.
- [ ] No API keys, DB passwords, or JWT secrets committed — `.env` only.
- [ ] Dashboard numbers change when the period/department filter changes (proves it's live, not cached).

## 7. Jury Defense

**30-second pitch:** "We built PeoplePay360, an HR & Payroll platform. The core is a period-aware contract resolver and a sequenced salary rule engine — every number on a payslip traces to a specific rule and a specific contract, computed live, not hardcoded."

**If they ask "prove this isn't hardcoded":** Open `payslip_lines` for one payslip. Point at the `PT` row's stored amount, then open the `salary_rules` row for `PT` and show its formula reads `GROSS` — a code, not a number. Then show the `GROSS` row was itself computed two rules earlier in the same request.

**If they ask about AI / Cloud Code usage:** "We used AI to accelerate scaffolding and boilerplate. The contract-overlap rule, the salary rule engine, and the schema were designed and reviewed by us — that's the part we can walk you through line by line."

---

Original source: `peoplepay360-agent.html`. Stack pinned in `docs/superpowers/specs/2026-09-05-peoplepay360-design.md`. Task lists: `BE_TASKS.md`, `FE_TASKS.md`.
