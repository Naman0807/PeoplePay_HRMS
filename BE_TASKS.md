# Backend tasks — you (Developer B)

Stack: Node.js + TypeScript + Express + Prisma + Postgres. Repo root `/backend`.
Full spec: `docs/superpowers/specs/2026-09-05-peoplepay360-design.md`. Contract/schema source: `peoplepay360-agent.html` tabs 3-4.

## Build order

1. `/backend` skeleton: Express+TS, Prisma init, `.env` for DB URL + JWT secret, global error handler (never leak raw stack traces).
2. Prisma schema — all tables from spec's Data model section. Run first migration, commit it.
3. Seed script (`prisma/seed.ts`): 1 resource calendar, 3-5 employees, 1 payroll structure with rule chain BASIC→HRA→GROSS→PT→PF→NET, 2 leave types + allocations.
4. Auth: `POST /api/auth/login` (JWT), `GET /api/auth/me`, `requireRole(...roles)` middleware.
5. Employee CRUD: `GET/POST /api/employees`, `GET/PATCH /api/employees/:id`.
6. **Contract resolver** (first priority logic): `GET /api/employees/:id/contracts`, `POST/PATCH /api/contracts` — overlap check on RUNNING contracts → `409 CONTRACT_OVERLAP`. Write the test for this now, not later.
7. Attendance: `GET /api/attendances?employee_id=`, `POST /api/attendances` (compute `worked_hours` in code).
8. Time Off: `GET/POST /api/leave-requests`, `PATCH /api/leave-requests/:id/approve` (deducts allocation atomically), `PATCH .../refuse`.
9. **Salary rule engine**: sequence-ordered evaluation, FIXED/PERCENT/FORMULA, writes `payslip_lines`. Write the test for this now (formula rule reading a prior rule by code).
10. Payrun lifecycle: `POST /api/payruns`, `GET /api/payruns/:id/eligible-employees`, `POST .../compute`, `POST .../confirm`, `POST .../mark-paid`, `GET /api/payslips/:id`, `GET /api/payslips/:id/pdf`.
11. Dashboard: `GET /api/dashboard/kpis?period=&department=`, `GET /api/dashboard/salary-by-department?period=` — separate endpoint per widget, no giant blob.

## Non-negotiables

- Every response uses the exact envelope (success/error) from the spec. Don't change field names without updating the spec + telling FE.
- Role-gate is one middleware, not five inline checks.
- Never commit `.env`, secrets, DB passwords.
- Commit the first migration immediately so FE/teammate can pull and seed locally instead of re-deriving schema.
