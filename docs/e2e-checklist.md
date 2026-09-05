# End-to-end acceptance checklist

The final gate before a demo or a release. It walks the whole product in one sitting and then re-checks the RBAC matrix role by role.

## Before you start

```bash
npm install
npm run db:migrate --workspace=@peoplepay360/api
npm run db:seed --workspace=@peoplepay360/api
npm run dev:api      # terminal 1 — http://localhost:4000
npm run dev:web      # terminal 2 — http://localhost:3000
```

Open the browser console and keep it visible: "no console errors" is one of the acceptance criteria.

Seed login: `admin@peoplepay360.com` / `admin123`.

## Automated coverage

Run this first — it fails faster than a person can click, and it covers the same happy path:

```bash
npm test
```

Expected: the API suite (unit + integration) and the web component suite both pass. The integration suite already asserts the full payrun wizard end to end, including the `5000 / 5500 / 275 / 5225` payslip vector, so a red run here means the manual walkthrough will fail too.

The manual pass below still matters: it is the only thing that exercises the browser, the PDF download and the navigation.

## A0. Signup and admin approval

| # | Step | Expected result | ✅ |
| --- | --- | --- | --- |
| 1 | Open `/signup`, request the **HR Manager** role with a valid password (8+ chars, a letter and a digit) | Success panel: the request was sent to the admin for approval, with a link back to login | ☐ |
| 2 | Try a password like `abc1`, or a confirmation that does not match | Inline field errors; nothing is sent to the API | ☐ |
| 3 | Sign up again with the same email | "Email already registered" | ☐ |
| 4 | Try to log in as the new account | Refused: account is pending admin approval | ☐ |
| 5 | Sign in as ADMIN and open **Admin** | The signup is listed under Pending Approvals with the role it asked for | ☐ |
| 6 | Approve it | Row leaves the queue; the user now holds the requested role and an employee record exists | ☐ |
| 7 | Log in as the approved account | Signs in, and the pages its new role allows are reachable | ☐ |
| 8 | Sign up a second account and **reject** it | Login refused: the account was rejected | ☐ |
| 9 | As ADMIN, deactivate an approved user (**Admin → status**) | That user can no longer log in, and an already-open session cannot refresh its token | ☐ |

## A. Main flow (as ADMIN)

| # | Step | Expected result | ✅ |
| --- | --- | --- | --- |
| 1 | Sign in with the seed credentials | Redirected to `/dashboard`; KPI cards and charts render | ☐ |
| 2 | Go to **Employees** and create an employee | Appears in the list; a login is created for the address you gave | ☐ |
| 3 | Open **Employees → Kanban** | The new employee shows in the correct status column | ☐ |
| 4 | Go to **Schedules** and create a schedule for Mon–Fri, 09:00–17:00, 60 min break | The live "Weekly hours" total reads **35** before you save; the saved schedule shows 35h | ☐ |
| 5 | Go to **Contracts** and create a running contract for the new employee using `STD-001` and that schedule | Contract is created with status RUNNING | ☐ |
| 6 | Create a second running contract for the same employee overlapping the first | Rejected with a contract-overlap message, **not** a generic 500 | ☐ |
| 7 | Go to **Attendance** and punch in, then punch out | The day appears with worked hours; a day with only a punch-in is flagged as an exception | ☐ |
| 8 | Go to **Time Off**, create an allocation for the employee, approve it | The balance card shows the remaining units | ☐ |
| 9 | Create a time-off request inside the balance and submit it | Status becomes SUBMITTED | ☐ |
| 10 | Create and submit a request larger than the balance | Rejected with an insufficient-balance message naming the requested and remaining units | ☐ |
| 11 | Approve the valid request | Status APPROVED; the allocation's taken units increase by the request duration | ☐ |
| 12 | Go to **Salary** and inspect `STD-001` | Five rules in sequence: BASIC, ALW-HOUSING, GROSS, TAX-INCOME, NET | ☐ |
| 13 | Go to **Payroll** and create a payrun for `STD-001` over a period the contract fully covers | Payrun created as DRAFT; wizard is on step 1 | ☐ |
| 14 | Step 2 — review the eligible employees and select them | Only employees whose running contract covers the whole period are listed | ☐ |
| 15 | Step 3 — compute | Status COMPUTED; totals show basic 5000, gross 5500, deductions 275, net 5225 for a seed-wage employee | ☐ |
| 16 | Compute a second time | Still one payslip per employee — no duplicates | ☐ |
| 17 | Step 4 — validate, then mark as paid | Status VALIDATED, then PAID; the actions are refused out of order | ☐ |
| 18 | Go to **Payslips** and open the new payslip | Header totals match step 15; five payslip lines are listed | ☐ |
| 19 | Click the PDF download | A PDF opens/downloads with the employee, period and both tables rendered | ☐ |
| 20 | Go to **Admin → Users** and create a user for each remaining role | Users created; you can sign in as each below | ☐ |

## B. RBAC pass

Sign in as each role and confirm what is reachable. The API must refuse with 403 even if a URL is typed directly.

| Role | Must be able to | Must NOT be able to | ✅ |
| --- | --- | --- | --- |
| `EMPLOYEE` | See only their own employee record, own attendance, own payslips; create and submit their own time-off request | Employee list of others, contracts, schedules, salary, payroll (`/payroll` → 403), user admin | ☐ |
| `HR_MANAGER` | Employees, contracts, schedules, attendance (all), time-off types and approvals, all payslips | Payruns, salary structures, salary rules, user admin | ☐ |
| `HR_PAYROLL_USER` | Everything HR_MANAGER can, plus salary structures, payruns (create, compute, validate, mark paid) and the payroll dashboard | Managing salary rules, user admin | ☐ |
| `HR_PAYROLL_MANAGER` | Everything above, plus creating and reordering salary rules | User admin | ☐ |
| `ADMIN` | Everything, including user management | — | ☐ |

Also check, for any non-admin role: navigating directly to `/admin` lands on the 403 page rather than rendering the admin screen.

## C. Final checks

- ☐ No unhandled errors in the browser console during any of the flows above.
- ☐ No 500 responses in the API terminal — business-rule failures come back as 400 or 409 with a specific error code.
- ☐ Signing out clears the session; the protected pages bounce back to `/login`.
- ☐ Refreshing a protected page while signed in keeps you there (the session is persisted).

## Recording results

Note any failure as a follow-up task with the step number, what you saw, and the API error code from the network tab. A step that fails here is a release blocker, not a nice-to-have.
