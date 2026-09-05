# PeoplePay360

A full-stack HR and payroll platform: employee records, working schedules, contracts, attendance, time off, salary structures, payruns and payslips — with role-based access control enforced on both the API and the UI.

- **`apps/api`** — Express REST API (TypeScript, Prisma, JWT auth, Zod validation)
- **`apps/web`** — Next.js App Router frontend (TanStack Query, Zustand, Tailwind, Recharts, @react-pdf/renderer)
- **`packages/shared`** — types, DTOs, the RBAC matrix and shared business helpers used by both apps
- **`prisma/`** — schema (15 models), migrations and the seed script

See [`docs/architecture.md`](docs/architecture.md) for the data model, module map, RBAC matrix and business rules, and [`docs/e2e-checklist.md`](docs/e2e-checklist.md) for the manual acceptance script.

## Prerequisites

- Node.js 18 or newer
- PostgreSQL 14 or newer, reachable on `localhost:5432` (or anywhere `DATABASE_URL` points)

## Setup

```bash
# 1. Install every workspace
npm install

# 2. Configure the environment
cp .env.example .env
cp .env.example apps/api/.env          # the API reads its own .env
cp apps/web/.env.example apps/web/.env.local

# 3. Create the schema and load the demo data
npm run db:migrate --workspace=@peoplepay360/api
npm run db:seed --workspace=@peoplepay360/api
```

`.env` needs at least:

```ini
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/peoplepay360
JWT_SECRET=change-me
JWT_REFRESH_SECRET=change-me-too
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
PORT=4000
```

`apps/web/.env.local` needs `NEXT_PUBLIC_API_URL=http://localhost:4000/api`.

## Running

```bash
npm run dev:api    # http://localhost:4000  (health check: /health)
npm run dev:web    # http://localhost:3000
```

Run them in two terminals. The web app talks to the API through `NEXT_PUBLIC_API_URL`.

### Seed credentials

| Email | Password | Role |
| --- | --- | --- |
| `admin@peoplepay360.com` | `admin123` | ADMIN |

The seed also creates a department, a working schedule, the `STD-001` salary structure (five rules), one employee, a running contract and a time-off allocation — enough to run a payrun immediately.

## Testing

```bash
npm test                                  # every workspace that has tests
npm test --workspace=@peoplepay360/api    # backend: unit + integration
npm test --workspace=@peoplepay360/web    # frontend: component tests
```

**Backend** (Vitest + Supertest). Unit tests cover the salary engine, the formula evaluator, contract overlap, time-off balance and weekly-hours calculation. Integration tests run against a real PostgreSQL database and cover auth, RBAC, employee CRUD, contract overlap, the time-off balance and approval flow, and the complete payrun wizard.

The integration suites never touch your development database. They create and migrate a sibling database named `<your database>_test` automatically (override it with `TEST_DATABASE_URL`), truncate every table between tests, and skip themselves entirely if PostgreSQL is unreachable.

**Frontend** (Vitest + Testing Library + jsdom). Component tests cover the login form, the schedule form's live weekly-hours total, the time-off request form, the payrun wizard state machine, and the payslip PDF — which is rendered through the real PDF renderer.

## Useful commands

| Command | What it does |
| --- | --- |
| `npm run db:migrate --workspace=@peoplepay360/api` | Apply migrations to the database |
| `npm run db:seed --workspace=@peoplepay360/api` | Load the demo data |
| `npm run db:studio --workspace=@peoplepay360/api` | Open Prisma Studio |
| `npm run build` | Type-check and build every workspace |

## Project layout

```
apps/
  api/
    src/
      modules/<feature>/    routes, controller, service, validation
      middleware/           auth, RBAC, validation, error handling
      utils/                salary engine, formula evaluator, business rules
    tests/
      unit/                 pure business-rule tests
      integration/          HTTP tests against a real database
  web/
    src/
      app/                  Next.js App Router pages
      components/           layout, auth guards, payslip PDF
      lib/api/              typed fetch client and TanStack Query hooks
      store/                Zustand stores (auth, payrun wizard, UI)
packages/
  shared/                   types, DTOs, RBAC matrix, shared helpers
prisma/                     schema, migrations, seed
```
