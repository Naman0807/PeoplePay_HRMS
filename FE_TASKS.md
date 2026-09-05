# Frontend tasks — you (Developer A)

Stack: Next.js (App Router), calling Node/Express/Prisma backend at `/backend`.
Full spec: `docs/superpowers/specs/2026-09-05-peoplepay360-design.md`. API contract/envelope/status codes: `peoplepay360-agent.html` tab 4 — follow exactly, don't guess field names. Screen-level ground rules: `FE_BRIEF.md`.

## Build order

1. `/frontend` skeleton: Next.js App Router, Tailwind (or your pick), `.env.local` for API base URL.
2. Auth wrapper: one fetch/axios wrapper injecting `Authorization: Bearer <token>` automatically. Login page hitting `POST /api/auth/login`, store token, redirect on success.
3. Local mock server (json-server or 10-line stub) returning the exact envelope shape from the contract — so you're never blocked waiting on backend. Swap base URL when a real endpoint lands, zero refactor.
4. Employee list + form (`GET/POST/PATCH /api/employees`) — first real screen, wire to real endpoints as soon as BE's employee CRUD lands.
5. Contract list + form (`GET /api/employees/:id/contracts`, `POST/PATCH /api/contracts`) — must surface `409 CONTRACT_OVERLAP` cleanly, this gets triggered live in demo Flow A.
6. Attendance list + manual entry form (`GET/POST /api/attendances`).
7. Time Off: request form + Approve/Refuse actions (`GET/POST /api/leave-requests`, `PATCH .../approve`, `PATCH .../refuse`) — balance drop is server-computed, don't compute client-side.
8. Payrun wizard, 2 steps: scope selection (period + structure) → employee filtering/selection → Create Payrun. Then Compute → Confirm → Mark Paid action buttons (`POST /api/payruns`, `.../compute`, `.../confirm`, `.../mark-paid`).
9. Payslip view: renders `line_ids` as a table in server order (no client re-sort), PDF link/button (`GET /api/payslips/:id/pdf`).
10. Dashboard: KPI cards + salary-by-department chart (`GET /api/dashboard/kpis?period=&department=`, `GET /api/dashboard/salary-by-department?period=`) — each widget its own call, own loading state, filters actually re-fetch (proves it's live).

## Non-negotiables

- No mock arrays or hardcoded numbers once a real endpoint exists.
- Every list/detail view: loading (skeleton), error (retry button), empty (plain message) states.
- Disable submit buttons on click, especially Payrun Compute/Confirm/Mark Paid.
- Payslip line order is data from API, never re-sorted client-side.

## Cut for v1 (skip unless everything above ships early)

Admin user management UI, employee Kanban view, schedule CRUD UI, live quick-punch widget, leave types/allocation CRUD UI, salary rule/structure CRUD UI.

## Demo flows to rehearse

- Flow A: Employee → Contract (trigger 409 overlap on purpose) → Attendance → Payrun → Payslip.
- Flow B: leave request → manager approves → balance visibly drops → dashboard reflects it.

## Branch

Cut your branch from `dev`: `git checkout dev && git checkout -b feature/fe-<module>` (e.g. `feature/fe-employee-screens`). PR into `dev`, not `main`.
