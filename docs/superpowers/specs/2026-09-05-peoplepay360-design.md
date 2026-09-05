# PeoplePay360 — Design Spec

Source of truth for scope/schema/API: `~/Desktop/peoplepay360-agent.html` (AGENT.md). This spec pins the tech stack and translates that plan into concrete deliverables.

## Stack

- Backend: Node.js + TypeScript + Express + Prisma + Postgres
- Frontend: Next.js (App Router)
- Repo: monorepo, `/backend` and `/frontend`, one `main`, `dev` integration branch (per AGENT.md tab 2)

## Data model

Prisma schema is a 1:1 translation of AGENT.md tab 3's `CREATE TABLE` block:
`User, ResourceCalendar, Employee, Contract, Attendance, LeaveType, LeaveAllocation, LeaveRequest, PayrollStructure, SalaryRule, PayslipRun, Payslip, PayslipLine`.

Enums replace CHECK constraints (role, status, contract state, leave state, salary rule category/amount_select, payslip run/payslip state).

Deviation: Postgres `worked_hours` generated column on `attendances` has no clean Prisma equivalent — compute `worked_hours` in application code (on attendance create/read) instead of a DB generated column.

## Auth / RBAC

JWT on `POST /api/auth/login`. One `requireRole(...roles)` Express middleware applied per-route — not per-handler checks. Roles: `EMPLOYEE, HR_MANAGER, HR_PAYROLL_USER, HR_PAYROLL_MANAGER, ADMIN`.

## Core logic (jury-tested pieces)

1. **Contract overlap rule** — before insert/update of a `RUNNING` contract, check no other `RUNNING` contract for same employee overlaps the date range. Violation → `409 CONTRACT_OVERLAP`.
2. **Salary rule engine** — for a payslip, evaluate `salary_rules` for the structure ordered by `sequence`. `amount_select`:
   - `FIXED` → `amount_fixed`
   - `PERCENT` → `amount_percent`% of the `payslip_lines` row matching `percent_base_code`
   - `FORMULA` → evaluate `formula` (e.g. `GROSS - PT - PF`), substituting prior `payslip_lines` amounts by `rule_code`
   Each result is written as a `payslip_lines` row (`rule_code, rule_name, amount, sequence`) — this table is the audit trail.

## API contract

Exact envelope, status codes, and endpoint list as AGENT.md tab 4. No deviations — frontend builds against this without checking with backend first.

## Frontend

Pages: Employee (list/form), Contract (list/form), Attendance (list/manual entry), Time Off (request + approve/refuse), Payrun wizard (2-step), Payslip (renders `line_ids` in server order, not re-sorted), Dashboard (KPI cards + salary-by-department chart).

Standards: one fetch wrapper injecting `Authorization: Bearer`, loading/error/empty states on every list/detail view, disable-on-submit on Payrun compute/confirm/mark-paid.

## Testing

One test file for contract-overlap (create overlapping RUNNING contract → expect 409). One test file for salary-rule-engine (a FORMULA rule correctly reads a prior rule's stored amount by code).

## Seed script

1 resource calendar, 3-5 employees, 1 payroll structure with rule chain `BASIC → HRA → GROSS → PT → PF → NET`, 2 leave types with allocations. Needed for both demo flows in AGENT.md tab 1.

## Out of scope for MVP (per AGENT.md "cut for v1")

Admin user management UI, Kanban employee view, schedule CRUD UI, live quick-punch widget, leave types/allocation CRUD UI (seed script only), salary rule/structure CRUD UI, real email send (log only), attendance/leave dashboard panel, trend chart.
