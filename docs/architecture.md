# PeoplePay360 — Architecture

## 1. Shape of the system

```
┌─────────────────────┐         ┌──────────────────────┐        ┌──────────────┐
│  apps/web           │  HTTP   │  apps/api            │ Prisma │  PostgreSQL  │
│  Next.js App Router │ ──────► │  Express REST API    │ ─────► │  15 models   │
│  TanStack Query     │  JWT    │  JWT auth + RBAC     │        │              │
│  Zustand            │         │  Zod validation      │        │              │
└─────────────────────┘         └──────────────────────┘        └──────────────┘
            │                              │
            └──────────► packages/shared ◄─┘
                    types · DTOs · RBAC matrix · helpers
```

Every business rule is enforced in the API service layer. The frontend mirrors the RBAC matrix to hide what a role cannot use, but the API is the authority: it re-checks the same matrix on every request.

## 2. Data model (15 models)

| Model | Purpose | Key relations |
| --- | --- | --- |
| `User` | Login identity and role | → `Employee`, approves time off, creates payruns |
| `Department` | Organisational unit | → `Employee` |
| `WorkingSchedule` | Named schedule with derived `weekly_hours` | → `ScheduleLine`, `Employee`, `Contract` |
| `ScheduleLine` | One working day: start, end, break (unique per day) | → `WorkingSchedule` |
| `Employee` | HR record; one per user | → department, schedule, manager, contracts |
| `SalaryStructure` | Named set of salary rules (unique `code`) | → `SalaryRule`, `Contract`, `Payrun` |
| `SalaryRule` | One computation step, ordered by `sequence` | → `SalaryStructure`, `PayslipLine` |
| `Contract` | Wage and period linking employee, structure, schedule | → employee, structure, schedule, payslips |
| `TimeOffType` | Leave type: unit, whether it needs an allocation | → allocations, requests |
| `TimeOffAllocation` | Granted balance for a validity window | → employee, type |
| `TimeOffRequest` | A leave request and its approval state | → employee, type, approver |
| `Attendance` | One day of check-in/check-out per employee | → employee, editor |
| `Payrun` | A payroll batch for a structure and period | → structure, creator, payslips, selected employees |
| `PayrunEmployee` | Employees selected into a payrun, with their totals | → payrun, employee |
| `Payslip` | Per-employee result of a payrun | → payrun, employee, contract, lines |
| `PayslipLine` | One salary rule's contribution to a payslip | → payslip, salary rule |

(`PayslipLine` and `PayrunEmployee` are both listed above; the 15 top-level entities are the rows of this table.)

Enums: `UserRole`, `EmployeeStatus`, `ContractStatus`, `DayOfWeek`, `TimeOffUnit`, `AllocationStatus`, `TimeOffRequestStatus`, `AttendanceStatus`, `SalaryRuleCategory`, `ComputationType`, `PayrunStatus`, `PayslipStatus`, `PayrunEmployeeStatus`.

## 3. RBAC matrix

Defined once in `packages/shared/src/rbac.ts` and consumed by the API middleware (`requireCapability`) and the UI guards (`RequireAuth`, `RequireRole`).

| Capability | EMPLOYEE | HR_MANAGER | HR_PAYROLL_USER | HR_PAYROLL_MANAGER | ADMIN |
| --- | :-: | :-: | :-: | :-: | :-: |
| `VIEW_OWN_EMPLOYEE` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `VIEW_ALL_EMPLOYEES` | — | ✅ | ✅ | ✅ | ✅ |
| `MANAGE_EMPLOYEES` | — | ✅ | ✅ | ✅ | ✅ |
| `VIEW_OWN_ATTENDANCE` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `VIEW_ALL_ATTENDANCE` | — | ✅ | ✅ | ✅ | ✅ |
| `MANUAL_ATTENDANCE_CORRECTION` | — | ✅ | ✅ | ✅ | ✅ |
| `CREATE_TIME_OFF_REQUEST` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `APPROVE_TIME_OFF` | — | ✅ | ✅ | ✅ | ✅ |
| `MANAGE_TIME_OFF_TYPES` | — | ✅ | ✅ | ✅ | ✅ |
| `MANAGE_CONTRACTS_SCHEDULES` | — | ✅ | ✅ | ✅ | ✅ |
| `VIEW_OWN_PAYSLIPS` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `VIEW_ALL_PAYSLIPS` | — | ✅ | ✅ | ✅ | ✅ |
| `VIEW_PAYRUNS` | — | — | ✅ | ✅ | ✅ |
| `PROCESS_PAYRUNS` | — | — | ✅ | ✅ | ✅ |
| `VALIDATE_PAYRUNS` | — | — | ✅ | ✅ | ✅ |
| `VIEW_SALARY_STRUCTURES` | — | — | ✅ | ✅ | ✅ |
| `MANAGE_SALARY_RULES` | — | — | — | ✅ | ✅ |
| `VIEW_PAYROLL_DASHBOARD` | — | — | ✅ | ✅ | ✅ |
| `USER_MANAGEMENT` | — | — | — | — | ✅ |

An employee listing or reading employees is additionally scoped in the service layer: an `EMPLOYEE` only ever sees their own record.

## 4. Business rules

1. **No overlapping running contracts.** `assertNoOverlap` (`apps/api/src/utils/contractRules.ts`) loads the employee's `RUNNING` contracts and rejects any new or edited contract whose period overlaps one of them. A `null` end date means open-ended. `DRAFT`, `EXPIRED` and `CANCELLED` contracts never block. Violations return `400 CONTRACT_OVERLAP`.
2. **Payrun period coverage.** `assertCoversPeriod` only makes an employee eligible when their running contract starts on or before the period start and ends on or after the period end (or is open-ended). Selecting an ineligible employee returns `400 INELIGIBLE_EMPLOYEES`.
3. **Weekly hours are derived, never typed in.** `calculateWeeklyHours` (`packages/shared/src/scheduleHours.ts`) sums each schedule line's paid time, subtracting the break and treating `end <= start` as an overnight shift. The API stores the result; the schedule form shows the same number live as you edit.
4. **Time-off duration.** `calculateDuration` counts whole days inclusive of both ends, and converts to hours at 8 hours per working day for hour-based types.
5. **Time-off balance.** On submit, `assertBalanceAvailable` sums `allocated_units - taken_units` over the `APPROVED` allocations whose validity window covers the request, and rejects an over-draw with `400 INSUFFICIENT_BALANCE`. Types with `requires_allocation = false` skip the check.
6. **Allocation consumption.** Approving a request increments `taken_units` on the covering allocations inside the same transaction that approves it. Refusing consumes nothing.
7. **Attendance.** Worked hours come from check-in to check-out; a day missing either side is an `EXCEPTION`. Manual corrections need `MANUAL_ATTENDANCE_CORRECTION` and record the editor.
8. **Salary rule execution.** `executeRules` (`apps/api/src/utils/salaryEngine.ts`) runs the structure's active rules in `sequence` order:
   - `FIXED` — the rule's `amount_fixed`.
   - `PERCENTAGE` — `percentage_rate` % of the gross accumulated so far, falling back to the contract wage while that accumulator is still zero.
   - `FORMULA` — `formula_string` evaluated over the codes of rules that already ran, plus `WAGE`.

   Category drives accumulation: `BASIC` and `ALLOWANCE` add to gross, `GROSS` overrides it, `DEDUCTION` adds to total deductions, `NET` overrides the net. Net never goes below zero.

   Formulas are parsed by a hand-written tokenizer and recursive-descent parser (`formulaEvaluator.ts`) — never `eval`. It supports `+ - * /`, parentheses, unary minus and decimals, and resolves rule codes that contain a hyphen (`GROSS - TAX-INCOME`) by matching the longest known code at each position. An unknown reference, a division by zero or malformed input fails the compute with `400 INVALID_FORMULA`.

   The seeded `STD-001` structure is the canonical vector: basic 5000, gross 5500, deductions 275, net 5225.
9. **Payrun wizard.** `DRAFT → COMPUTED → VALIDATED → PAID`, one direction only. Employees can be selected only while `DRAFT`; computing is idempotent and safe to repeat while `DRAFT` or `COMPUTED`; validation requires every selected employee to be computed; marking paid requires `VALIDATED`. Wrong-state calls return `409 INVALID_STATUS`.
10. **Payslip warnings.** Rules that cannot be computed cleanly (a `FIXED` rule with no amount, an employee with no covering contract) are recorded as warnings on the payslip rather than silently producing zeros.

## 5. API surface

All routes are mounted under `/api` and require `Authorization: Bearer <accessToken>` except `/health` and the auth routes.

| Area | Endpoints |
| --- | --- |
| Auth | `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout` |
| Users (ADMIN) | `GET/POST /users`, `GET/PATCH/DELETE /users/:id`, `PATCH /users/:id/status` |
| Departments | `GET/POST /departments`, `GET/PATCH/DELETE /departments/:id` |
| Employees | `GET /employees`, `GET /employees/me`, `/form-data`, `/kanban`, `GET /employees/:id`, `POST /employees`, `PATCH/DELETE /employees/:id` |
| Schedules | `GET/POST /schedules`, `GET/PATCH/DELETE /schedules/:id` |
| Contracts | `GET/POST /contracts`, `GET/PATCH/DELETE /contracts/:id` |
| Time off | `/time-off/types`, `/time-off/allocations` (+ `:id/approve`, `:id/refuse`), `/time-off/requests` (+ `:id/submit`, `:id/approve`, `:id/refuse`) |
| Attendance | `POST /attendance/punch-in`, `POST /attendance/punch-out`, `GET /attendance/me`, `GET /attendance/exceptions`, `GET /attendance`, `PATCH /attendance/:id` |
| Salary | `GET/POST /salary/structures`, `GET/PATCH/DELETE /salary/structures/:id`, `GET/POST /salary/structures/:structureId/rules`, `POST /salary/rules/reorder`, `GET/PATCH/DELETE /salary/rules/:id` |
| Payruns | `GET/POST /payruns`, `GET /payruns/:id`, `/:id/eligible-employees`, `/:id/select-employees`, `/:id/compute`, `/:id/validate`, `/:id/mark-paid`, `/:id/employees`, `/:id/payslips` |
| Payslips | `GET /payslips`, `GET /payslips/:id`, `GET /payslips/:id/items` |
| Dashboard | `/dashboard/kpis`, `/attendance-chart`, `/department-chart`, `/payroll-chart` |

Every response uses the same envelope: `{ success: true, data, meta? }` or `{ success: false, error: { code, message, details? } }`. `errorHandler` maps `ApiError`, `ZodError` (→ `400 VALIDATION_ERROR` with field details) and known Prisma errors (`P2002` → 409, `P2025` → 404, `P2003` → 409); anything else becomes a generic 500 with no stack leak.

## 6. Frontend structure

- `src/app/(auth)/login` — the only unauthenticated page.
- `src/app/(dashboard)/*` — dashboard, employees (list, kanban, create, edit), contracts, schedules, attendance, time off, salary, payroll, payslips, admin, plus `403`, error and not-found pages. The layout wraps everything in the auth guard.
- `src/lib/api/client.ts` — fetch wrapper that attaches the JWT and unwraps the response envelope.
- `src/lib/api/queries.ts` — one typed TanStack Query hook per endpoint, with cache invalidation on mutations.
- `src/store/` — Zustand: `authStore` (persisted session), `payrunWizardStore` (wizard step and selection), `uiStore`.
- `src/components/` — layout primitives (`DataTable`, `Modal`, `StatCard`, `PageHeader`, …), auth guards, and the payslip PDF document plus its download button.

## 7. Testing strategy

| Layer | Tool | What it proves |
| --- | --- | --- |
| Business rules | Vitest unit tests | The salary engine, formula evaluator, contract overlap, time-off balance and weekly-hours maths, including edge cases (open-ended contracts, overnight shifts, division by zero, unknown rule codes) |
| HTTP + database | Vitest + Supertest against a real PostgreSQL test database | Auth and token lifecycle, the RBAC matrix (403s), CRUD, contract overlap as a 400, balance enforcement and allocation consumption, and the full payrun wizard down to the payslip amounts |
| UI | Vitest + Testing Library | Login submit and failure, live weekly-hours calculation, the time-off request form, payrun wizard step transitions, and the payslip PDF rendered by the real renderer |

The integration suites create and migrate their own `<database>_test` database, truncate between tests, and skip if PostgreSQL is unreachable, so `npm test` is safe to run anywhere.
