# Frontend brief — for teammate (Developer A)

Give this file to your Claude session as-is. Stack: Next.js (App Router), talking to a Node/Express/Prisma backend. Repo root `/frontend`, backend lives in `/backend` in the same repo.

Full spec: `docs/superpowers/specs/2026-09-05-peoplepay360-design.md`. API contract/envelope/status codes: `peoplepay360-agent.html` tab 4 — follow it exactly, don't guess field names.

## Ground rules

- No mock arrays, no hardcoded numbers — every screen hits a real endpoint from the start. If backend isn't up yet, run a tiny local stub (`json-server` or similar) returning the exact envelope shape from the contract, then swap the base URL when the real endpoint lands.
- One fetch wrapper that injects `Authorization: Bearer <token>` automatically — no per-call auth headers.
- Every list/detail view: loading (skeleton), error (retry button), empty (plain message) states. Never a blank screen while waiting.
- Disable submit buttons on click, especially Payrun Compute/Confirm/Mark Paid, to prevent double-fires.
- Payslip screen renders `line_ids` as a table in the order the API returns — sequence order is data, don't re-sort client-side.

## Screens to build (in order)

1. Login page (JWT via `POST /api/auth/login`).
2. Employee list + form (`GET/POST/PATCH /api/employees`).
3. Contract list + form (`/api/employees/:id/contracts`, `POST/PATCH /api/contracts`) — must surface the `409 CONTRACT_OVERLAP` error cleanly (this gets triggered live in the demo).
4. Attendance list + manual entry form.
5. Time Off: request form + Approve/Refuse actions (approving shows the balance visibly dropping — backend computes it, don't compute client-side).
6. Payrun wizard (2 steps: scope selection → employee filtering/create), then Compute → Confirm → Mark Paid actions.
7. Payslip view: renders the rule-by-rule breakdown table from `line_ids`, plus a link/button for PDF (`GET /api/payslips/:id/pdf`).
8. Dashboard: KPI cards + salary-by-department chart, filterable by period/department — each widget its own API call, its own loading state.

## What's cut for v1 (don't build unless everything above is done early)

Admin user management UI, employee Kanban view, schedule CRUD UI, live quick-punch attendance widget, leave types/allocation CRUD UI, salary rule/structure CRUD UI.

## Demo flows to rehearse

- Flow A: Employee → Contract (trigger a 409 overlap on purpose) → Attendance → Payrun → Payslip.
- Flow B: employee requests leave → manager approves → balance visibly drops → dashboard reflects it.
