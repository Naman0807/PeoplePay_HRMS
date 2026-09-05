# PeoplePay360 — Frontend Design Mockups

## PART 1: PAGE MOCKUPS

---

### 1. LOGIN PAGE  (`/login`)

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│                        bg-gray-50                                │
│                                                                  │
│                    ┌────────────────────┐                        │
│                    │                    │                        │
│                    │   PeoplePay360     │  (text-xl, semibold)   │
│                    │                    │                        │
│  ┌─────────────┐  │  ┌──────────────┐  │  ┌─────────────┐      │
│  │  (red bg)   │  │  │⚠ Error msg   │  │  │  (optional) │      │
│  │  Error box  │  │  └──────────────┘  │  └─────────────┘      │
│  └─────────────┘  │                    │                        │
│                    │  Login             │                        │
│                    │  ┌────────────────┐│                        │
│                    │  │                ││                        │
│                    │  └────────────────┘│                        │
│                    │                    │                        │
│                    │  Password          │                        │
│                    │  ┌────────────────┐│                        │
│                    │  │ ••••••••       ││                        │
│                    │  └────────────────┘│                        │
│                    │                    │                        │
│                    │  ┌────────────────┐│                        │
│                    │  │    Sign in     ││  (full-width,          │
│                    │  └────────────────┘│   dark bg button)      │
│                    │                    │                        │
│                    └────────────────────┘                        │
│                       max-w-sm, white,                           │
│                       border, p-8, centered                      │
└──────────────────────────────────────────────────────────────────┘
```

**Layout notes:** Full-screen centered layout. Single white card centered on gray background. Contains title, optional error banner (red background, red text), two text fields (login, password), and a full-width dark "Sign in" button. No nav bar.

---

### 2. APP SHELL / NAV (all authenticated pages)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ┌──────────────────────────────────────────────────────────────────────────┐ │
│ │ Employees    Attendance    Time Off    Payroll    Dashboard              │ │
│ │                                                                     ─── │ │
│ │                                               Jane Doe · Admin  [Log out]│ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────────────────────────────────────┐ │
│ │                                                                          │ │
│ │                          max-w-5xl mx-auto                              │ │
│ │                          px-6  py-8                                     │ │
│ │                          bg-gray-50                                     │ │
│ │                                                                          │ │
│ │                         (page content here)                              │ │
│ │                                                                          │ │
│ │                                                                          │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘

Nav bar detail (white bg, border-bottom, px-6 py-3):
┌──────────────────────────────────────────────────────────────────────────────┐
│ Employees   Attendance   Time Off   Payroll   Dashboard        Jane · Admin │
│ ═════════                                                         [Log out] │
└──────────────────────────────────────────────────────────────────────────────┘
  (active =            (inactive = gray-500 text)
   dark text,
   font-medium)

Log out button: small, gray text button (no border/bg)
```

**Layout notes:** White top nav bar with horizontal links on the left (active link dark, inactive gray). User name and role on the right, followed by a small gray "Log out" text button. Content area below is centered (`max-w-5xl`), padded, on a light gray background.

---

### 3. DASHBOARD  (`/dashboard`)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ [Employees] [Attendance] [Time Off] [Payroll] [Dashboard▼]    Jane · Admin │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │                                                                        │  │
│  │  Dashboard                                                             │  │
│  │                                                                        │  │
│  │  Period: [2026-09    ]    Department: [All          ]                  │  │
│  │                                                                        │  │
│  │  ┌──────────────────┐ ┌──────────────────┐ ┌──────────┐ ┌──────────┐  │  │
│  │  │ Headcount        │ │ Total gross      │ │ Total net│ │ Pending  │  │  │
│  │  │                  │ │                  │ │          │ │ leave    │  │  │
│  │  │       12         │ │   $145,000       │ │ $118,500 │ │    3     │  │  │
│  │  │                  │ │                  │ │          │ │          │  │  │
│  │  └──────────────────┘ └──────────────────┘ └──────────┘ └──────────┘  │  │
│  │   white, border         small gray label, large bold value             │  │
│  │                                                                        │  │
│  │  Salary by department                                                  │  │
│  │  ┌──────────────────────────────────────────────────────────────────┐  │  │
│  │  │                                                                  │  │  │
│  │  │  Engineering    ████████████████████████████████████   $52,000   │  │  │
│  │  │                                                                  │  │  │
│  │  │  Marketing      ██████████████████████                 $34,000   │  │  │
│  │  │                                                                  │  │  │
│  │  │  Sales          ██████████████████████████             $38,500   │  │  │
│  │  │                                                                  │  │  │
│  │  │  HR             ██████████                             $18,000   │  │  │
│  │  │                                                                  │  │  │
│  │  │  Finance        ████████████                           $22,500   │  │  │
│  │  │                                                                  │  │  │
│  │  └──────────────────────────────────────────────────────────────────┘  │  │
│  │                                                                        │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Layout notes:** Title "Dashboard" at top. Filter row with a month input for "Period" and a text input for "Department" (placeholder "All"). Four KPI cards in a single row (Headcount, Total gross, Total net, Pending leave requests) — each is a white bordered card with a small gray label and a large bold numeric value. Below that, a section titled "Salary by department" with a bar chart card showing department names on the left, horizontal emerald bars, and dollar amounts on the right.

---

### 4. EMPLOYEES LIST  (`/employees`)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ [Employees▼] [Attendance] [Time Off] [Payroll] [Dashboard]     Jane · Admin│
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │                                                                        │  │
│  │  Employees                                        [Add employee +]    │  │
│  │  ────────────────────────────────────────────────────────────────────  │  │
│  │                                                                        │  │
│  │  ┌──────────────────────────────────────────────────────────────────┐  │  │
│  │  │  Name *              Work email *                                │  │  │
│  │  │  ┌────────────────┐  ┌────────────────────────────────────┐      │  │  │
│  │  │  │                │  │                                    │      │  │  │
│  │  │  └────────────────┘  └────────────────────────────────────┘      │  │  │
│  │  │                                                                  │  │  │
│  │  │  Department *          Job title *                                │  │  │
│  │  │  ┌────────────────┐  ┌────────────────────────────────────┐      │  │  │
│  │  │  │                │  │                                    │      │  │  │
│  │  │  └────────────────┘  └────────────────────────────────────┘      │  │  │
│  │  │                                                                  │  │  │
│  │  │  [Save employee]                                                 │  │  │
│  │  └──────────────────────────────────────────────────────────────────┘  │  │
│  │                                                                        │  │
│  │  ┌──────────────────────────────────────────────────────────────────┐  │  │
│  │  │  Name              Work email         Department    Status      │  │  │
│  │  │  ──────────────── ──────────────────  ──────────── ──────────  │  │  │
│  │  │  Alice Johnson     alice@company.com  Engineering  ACTIVE      │  │  │
│  │  │  ──────────────── ──────────────────  ──────────── ──────────  │  │  │
│  │  │  Bob Smith         bob@company.com    Marketing    ACTIVE      │  │  │
│  │  │  ──────────────── ──────────────────  ──────────── ──────────  │  │  │
│  │  │  Carol White       carol@company.com  HR           INACTIVE    │  │  │
│  │  └──────────────────────────────────────────────────────────────────┘  │  │
│  │                                                                        │  │
│  │   (empty state: "No employees yet.")                                   │  │
│  │                                                                        │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Layout notes:** Title "Employees" with a dark "Add employee" button on the right. Toggle-able form card (2-column grid) with fields: Name, Work email, Department, Job title, plus a "Save employee" button. Below the form, a table with columns: Name (rendered as a link), Work email, Department, Status. When no employees exist, displays "No employees yet." text.

---

### 5. EMPLOYEE DETAIL  (`/employees/[id]`)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ [Employees▼] [Attendance] [Time Off] [Payroll] [Dashboard]     Jane · Admin│
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │                                                                        │  │
│  │  Alice Johnson                              Contracts →                │  │
│  │  ────────────────────────────────────────────────────────────────────  │  │
│  │                                                                        │  │
│  │  ┌──────────────────────────────────────────────────────────────────┐  │  │
│  │  │                                                                  │  │  │
│  │  │  Name *                                                           │  │  │
│  │  │  ┌──────────────────────────────────────────────────────────┐    │  │  │
│  │  │  │  Alice Johnson                                          │    │  │  │
│  │  │  └──────────────────────────────────────────────────────────┘    │  │  │
│  │  │                                                                  │  │  │
│  │  │  Work email *                                                    │  │  │
│  │  │  ┌──────────────────────────────────────────────────────────┐    │  │  │
│  │  │  │  alice@company.com                                      │    │  │  │
│  │  │  └──────────────────────────────────────────────────────────┘    │  │  │
│  │  │                                                                  │  │  │
│  │  │  Department *          Job title *                                │  │  │
│  │  │  ┌──────────────────┐ ┌──────────────────────────────────┐       │  │  │
│  │  │  │  Engineering     │ │  Senior Developer               │       │  │  │
│  │  │  └──────────────────┘ └──────────────────────────────────┘       │  │  │
│  │  │                                                                  │  │  │
│  │  │  Status *                                                        │  │  │
│  │  │  ┌──────────────────────────────────┐                            │  │  │
│  │  │  │  ACTIVE              ▼           │  (select)                  │  │  │
│  │  │  └──────────────────────────────────┘                            │  │  │
│  │  │                                                                  │  │  │
│  │  │  [Save changes]                                                  │  │  │
│  │  │                                                                  │  │  │
│  │  └──────────────────────────────────────────────────────────────────┘  │  │
│  │                                                                        │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Layout notes:** Header shows employee name with a "Contracts →" link on the right. Below is an edit form card (`max-w-lg`) with fields: Name, Work email, Department, Job title, and Status (select dropdown with ACTIVE/INACTIVE options). A "Save changes" button at the bottom.

---

### 6. EMPLOYEE CONTRACTS  (`/employees/[id]/contracts`)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ [Employees▼] [Attendance] [Time Off] [Payroll] [Dashboard]     Jane · Admin│
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ← Back to employee                                                          │
│                                                                              │
│  Contracts                                    [New contract +]               │
│  ──────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │                                                                        │  │
│  │  ⚠ Contract overlap detected for this period.                         │  │
│  │    (amber bg, amber border — shown when 409 CONTRACT_OVERLAP)         │  │
│  │                                                                        │  │
│  │  Reference *        Wage *                                             │  │
│  │  ┌────────────────┐ ┌────────────────────────────────────────┐         │  │
│  │  │  CTR-2026-001  │ │  5500                               │         │  │
│  │  └────────────────┘ └────────────────────────────────────────┘         │  │
│  │                                                                        │  │
│  │  Start date *       End date *                                         │  │
│  │  ┌────────────────┐ ┌────────────────────────────────────────┐         │  │
│  │  │  2026-01-01    │ │  2026-12-31                          │         │  │
│  │  └────────────────┘ └────────────────────────────────────────┘         │  │
│  │                                                                        │  │
│  │  State *                 Resource calendar ID                          │  │
│  │  ┌────────────────┐ ┌────────────────────────────────────────┐         │  │
│  │  │  RUNNING   ▼  │ │                                       │         │  │
│  │  └────────────────┘ └────────────────────────────────────────┘         │  │
│  │                                                                        │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │  Reference          Wage          Start          End        State     │  │
│  │  ───────────────── ───────────── ────────────── ────────── ───────── │  │
│  │  CTR-2026-001      $5,500/mo     2026-01-01     2026-12-31 RUNNING  │  │
│  │  ───────────────── ───────────── ────────────── ────────── ───────── │  │
│  │  CTR-2025-003      $4,800/mo     2025-01-01     2025-12-31 EXPIRED  │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Layout notes:** "← Back to employee" link at top. Title "Contracts" with a "New contract" button on the right. An amber warning banner appears if a 409 CONTRACT_OVERLAP error occurs. Form card (2-column grid) with fields: Reference, Wage, Start date, End date, State (select: DRAFT/RUNNING/EXPIRED/CANCELLED), Resource calendar ID. Table below shows existing contracts with columns: Reference, Wage, Start, End, State.

---

### 7. ATTENDANCE  (`/attendance`)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ [Employees] [Attendance▼] [Time Off] [Payroll] [Dashboard]    Jane · Admin │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Attendance                                        [Add entry +]            │
│  ──────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  Employee:  ┌────────────────────────────────────────────┐                   │
│             │  Select employee...                    ▼  │                   │
│             └────────────────────────────────────────────┘                   │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │                                                                        │  │
│  │  Check in *                  Check out *                               │  │
│  │  ┌────────────────────────┐  ┌────────────────────────┐                │  │
│  │  │  2026-09-01T08:30      │  │  2026-09-01T17:00      │                │  │
│  │  └────────────────────────┘  └────────────────────────┘                │  │
│  │                                                                        │  │
│  │  Status *                   Notes                                      │  │
│  │  ┌────────────────────┐     ┌────────────────────────────────────┐     │  │
│  │  │  PRESENT      ▼  │     │  Normal workday                   │     │  │
│  │  └────────────────────┘     └────────────────────────────────────┘     │  │
│  │                                                                        │  │
│  │  [Save entry]                                                          │  │
│  │                                                                        │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │  Check in          Check out         Worked hours  Status    Notes    │  │
│  │  ──────────────── ─────────────────  ──────────── ──────── ────────── │  │
│  │  2026-09-01 08:30  2026-09-01 17:00      8.50     PRESENT  (none)     │  │
│  │  ──────────────── ─────────────────  ──────────── ──────── ────────── │  │
│  │  2026-09-02 09:00  2026-09-02 18:15      9.25     PRESENT  Late start │  │
│  │  ──────────────── ─────────────────  ──────────── ──────── ────────── │  │
│  │  2026-09-03 08:00  —                     —       ABSENT   Sick leave  │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Layout notes:** Title "Attendance" with "Add entry" button (visible only when an employee is selected). Employee select dropdown above the form. Form card (2-column grid) with fields: Check in (datetime-local), Check out (datetime-local), Status (select: PRESENT/ABSENT), Notes (text), and a "Save entry" button. Table below shows attendance records with columns: Check in, Check out, Worked hours, Status, Notes.

---

### 8. TIME OFF  (`/time-off`)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ [Employees] [Attendance] [Time Off▼] [Payroll] [Dashboard]    Jane · Admin │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Time Off                                      [Request leave +]             │
│  ──────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  Filter by employee (optional):  ┌──────────────────────────────┐            │
│                                  │  Select employee...      ▼  │            │
│                                  └──────────────────────────────┘            │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │                                                                        │  │
│  │  Leave type ID *         Number of days *                              │  │
│  │  ┌────────────────────┐  ┌────────────────────────────────────┐        │  │
│  │  │  1                 │  │  5                                │        │  │
│  │  └────────────────────┘  └────────────────────────────────────┘        │  │
│  │                                                                        │  │
│  │  From *                    To *                                         │  │
│  │  ┌────────────────────┐  ┌────────────────────────────────────┐        │  │
│  │  │  2026-09-15        │  │  2026-09-19                      │        │  │
│  │  └────────────────────┘  └────────────────────────────────────┘        │  │
│  │                                                                        │  │
│  │  Reason                                                              │  │
│  │  ┌──────────────────────────────────────────────────────────────┐      │  │
│  │  │  Family vacation                                             │      │  │
│  │  └──────────────────────────────────────────────────────────────┘      │  │
│  │                                                                        │  │
│  │  [Submit request]                                                      │  │
│  │                                                                        │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │  From          To             Days    State      Actions               │  │
│  │  ──────────── ──────────────  ───── ──────────  ───────────────────── │  │
│  │  2026-09-15   2026-09-19       5    CONFIRMED  (no action)            │  │
│  │  ──────────── ──────────────  ───── ──────────  ───────────────────── │  │
│  │  2026-10-01   2026-10-03       3    DRAFT      [Approve] [Refuse]    │  │
│  │  ──────────── ──────────────  ───── ──────────  ───────────────────── │  │
│  │  2026-11-20   2026-11-22       2    DRAFT      [Approve] [Refuse]    │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  Approve button: emerald bg        Refuse button: red bg                     │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Layout notes:** Title "Time Off" with a "Request leave" button on the right. An optional employee filter dropdown. Form card (2-column grid) with fields: Leave type ID (number), Number of days, From (date), To (date), Reason (text), and a "Submit request" button. Table shows leave requests with columns: From, To, Days, State, Actions. Action buttons are "Approve" (emerald) and "Refuse" (red), shown for pending requests.

---

### 9. PAYROLL LIST  (`/payruns`)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ [Employees] [Attendance] [Time Off] [Payroll▼] [Dashboard]     Jane · Admin│
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Payroll                                      [New payrun →]                 │
│  ──────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │                                                                        │  │
│  │  Name                Period                   State                    │  │
│  │  ─────────────────  ──────────────────────── ──────────────────────── │  │
│  │  September 2026      2026-09-01 → 2026-09-30  DRAFT                   │  │
│  │  ─────────────────  ──────────────────────── ──────────────────────── │  │
│  │  August 2026         2026-08-01 → 2026-08-31  PAID                    │  │
│  │  ─────────────────  ──────────────────────── ──────────────────────── │  │
│  │  July 2026           2026-07-01 → 2026-07-31  PAID                    │  │
│  │  ─────────────────  ──────────────────────── ──────────────────────── │  │
│  │  June 2026           2026-06-01 → 2026-06-30  CONFIRMED              │  │
│  │                                                                        │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Layout notes:** Title "Payroll" with a "New payrun" dark link-button on the right. A table listing all payruns with columns: Name (rendered as a link to the payrun detail), Period (start → end format), and State. States include DRAFT, CONFIRMED, PAID.

---

### 10. NEW PAYRUN  (`/payruns/new`)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ [Employees] [Attendance] [Time Off] [Payroll▼] [Dashboard]     Jane · Admin│
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  New payrun — step 1 of 2                                                    │
│  ──────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │                                                                        │  │
│  │  Name *                    Structure ID *                              │  │
│  │  ┌──────────────────────┐  ┌────────────────────────────────────┐      │  │
│  │  │  September 2026      │  │  1                                │      │  │
│  │  └──────────────────────┘  └────────────────────────────────────┘      │  │
│  │                                                                        │  │
│  │  Period start *           Period end *                                  │  │
│  │  ┌──────────────────────┐  ┌────────────────────────────────────┐      │  │
│  │  │  2026-09-01          │  │  2026-09-30                      │      │  │
│  │  └──────────────────────┘  └────────────────────────────────────┘      │  │
│  │                                                                        │  │
│  │  [Create & review eligible employees]                                  │  │
│  │                                                                        │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│                                                                              │
│  ── STEP 2 (after create) ─────────────────────────────────────────────────  │
│                                                                              │
│  Eligible employees:                                                         │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │  ☑  Alice Johnson   (alice@company.com)                               │  │
│  │  ☑  Bob Smith       (bob@company.com)                                 │  │
│  │  ☑  Carol White     (carol@company.com)                               │  │
│  │  ☐  David Brown     (david@company.com)  — inactive, unchecked       │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  [Continue to compute →]                                                     │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Layout notes:** Title "New payrun — step 1 of 2". Step 1 form card (2-column grid) with fields: Name, Structure ID (number), Period start, Period end, and a "Create & review eligible employees" button. After creation, Step 2 shows a list of eligible employees with checkboxes, followed by a "Continue to compute →" button that links to the payrun detail page.

---

### 11. PAYRUN DETAIL  (`/payruns/[id]`)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ [Employees] [Attendance] [Time Off] [Payroll▼] [Dashboard]     Jane · Admin│
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ← All payruns                                                               │
│                                                                              │
│  September 2026                                                              │
│  Period: 2026-09-01 → 2026-09-30    State: CONFIRMED                        │
│                                                                              │
│  ┌────────────┐  ┌────────────┐  ┌─────────────┐                            │
│  │  Compute   │  │  Confirm   │  │  Mark paid  │                            │
│  │  (dark bg) │  │  (gray bg) │  │  (gray bg)  │                            │
│  └────────────┘  └────────────┘  └─────────────┘                            │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │                                                                        │  │
│  │  Payslip       Gross         Net          Warning                      │  │
│  │  ──────────── ───────────── ──────────── ──────────────────────────── │  │
│  │  Payslip #42   $5,500.00     $4,320.00                                  │  │
│  │  ──────────── ───────────── ──────────── ──────────────────────────── │  │
│  │  Payslip #43   $4,800.00     $3,890.00    ⚠ Missing contract          │  │
│  │  ──────────── ───────────── ──────────── ──────────────────────────── │  │
│  │  Payslip #44   $6,200.00     $5,100.00                                  │  │
│  │  ──────────── ───────────── ──────────── ──────────────────────────── │  │
│  │  Payslip #45   $3,500.00     $2,950.00    ⚠ Negative net pay         │  │
│  │                                                                        │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  Warning badge: amber bg, amber text, small rounded                         │
│  Payslip #id: link to /payslips/[id]                                        │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Layout notes:** "← All payruns" back link at top. Payrun name displayed as heading, with period and state shown below. Three action buttons in a row: "Compute" (dark bg), "Confirm" (gray bg), "Mark paid" (gray bg). Below, a payslips table with columns: Payslip (link to `/payslips/[id]`), Gross, Net, Warning. Warning column shows an amber badge when present (e.g., "Missing contract", "Negative net pay").

---

### 12. PAYSLIP DETAIL  (`/payslips/[id]`)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ [Employees] [Attendance] [Time Off] [Payroll▼] [Dashboard]     Jane · Admin│
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Payslip #42                                    Download PDF →               │
│  ──────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │                                                                        │  │
│  │  Period                  State                                         │  │
│  │  2026-09-01 → 2026-09-30 CONFIRMED                                    │  │
│  │                                                                        │  │
│  │  Gross                   Net                                           │  │
│  │  $5,500.00               $4,320.00                                    │  │
│  │                                                                        │  │
│  │  Warning                                                            │  │
│  │  (none)                                                              │  │
│  │                                                                        │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  Line items                                                                  │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │                                                                        │  │
│  │  Rule                                              Amount              │  │
│  │  ──────────────────────────────────────────────── ─────────────────── │  │
│  │  Basic Salary (BASIC)                               $4,500.00          │  │
│  │  ──────────────────────────────────────────────── ─────────────────── │  │
│  │  Housing Allowance (HOUSING)                         $800.00          │  │
│  │  ──────────────────────────────────────────────── ─────────────────── │  │
│  │  Transport Allowance (TRANSPORT)                     $200.00          │  │
│  │  ──────────────────────────────────────────────── ─────────────────── │  │
│  │  Income Tax (TAX)                                   -$780.00          │  │
│  │  ──────────────────────────────────────────────── ─────────────────── │  │
│  │  Social Security (SS)                               -$200.00          │  │
│  │  ──────────────────────────────────────────────── ─────────────────── │  │
│  │  Health Insurance (HEALTH)                          -$100.00          │  │
│  │  ──────────────────────────────────────────────── ─────────────────── │  │
│  │  Net Pay (NET)                                      $4,320.00          │  │
│  │                                                                        │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Layout notes:** Title "Payslip #42" with a "Download PDF →" link on the right. Summary card (2-column grid) showing: Period, State, Gross, Net, and Warning badge (amber if present). Below, a line items table with columns: Rule (displayed as name + code in parentheses, e.g. "Basic Salary (BASIC)") and Amount. Positive amounts are earnings, negative amounts are deductions. Final row shows Net Pay.

---

## Summary

| # | Page                    | Route                          | Key Components                                       |
|---|------------------------|--------------------------------|------------------------------------------------------|
| 1 | Login                  | `/login`                       | Centered card, email/password, sign in button        |
| 2 | App Shell / Nav        | (all routes)                   | Top nav bar with links, user info, logout            |
| 3 | Dashboard              | `/dashboard`                   | Filters, 4 KPI cards, bar chart by department        |
| 4 | Employees List         | `/employees`                   | Add form (toggle), table with links                  |
| 5 | Employee Detail        | `/employees/[id]`              | Edit form (max-w-lg), status select                  |
| 6 | Employee Contracts     | `/employees/[id]/contracts`    | Overlap warning, contract form, contracts table      |
| 7 | Attendance             | `/attendance`                  | Employee selector, check-in/out form, attendance tbl |
| 8 | Time Off               | `/time-off`                    | Employee filter, leave request form, approve/refuse  |
| 9 | Payroll List           | `/payruns`                     | Table of payruns with name links and state           |
| 10 | New Payrun             | `/payruns/new`                 | Step 1 form, step 2 eligible employees               |
| 11 | Payrun Detail          | `/payruns/[id]`                | Compute/Confirm/Paid actions, payslips table         |
| 12 | Payslip Detail         | `/payslips/[id]`               | Summary card, line items table, PDF download         |

---

## PART 2: STYLE GUIDE

---

## Design Tokens

### Color Palette (Tailwind classes used in the app)

**Neutrals:**
- `gray-50` (#F9FAFB) — app background, table header background
- `gray-100` (#F3F4F6) — secondary button bg, chart track, logout button bg
- `gray-200` (#E5E7EB) — card borders, nav bottom border, table borders
- `gray-300` (#D1D5DB) — input borders
- `gray-400` (#9CA3AF) — hint text, empty state text
- `gray-500` (#6B7280) — muted text, inactive nav links
- `gray-600` (#4B5563) — body text, labels
- `gray-700` (#374151) — section titles
- `gray-800` (#1F2937) — secondary button text
- `gray-900` (#111827) — primary button bg, headings, active nav link

**Semantic:**
- `emerald-100` (#D1FAE5) — approve button bg
- `emerald-500` (#10B981) — chart bars
- `emerald-800` (#065F46) — approve button text
- `red-50` (#FEF2F2) — error box bg
- `red-100` (#FEE2E2) — refuse button bg, retry button bg
- `red-200` (#FECACA) — retry button hover
- `red-700` (#B91C1C) — error text
- `red-800` (#991B1B) — refuse button text
- `amber-50` (#FFFBEB) — overlap warning bg
- `amber-100` (#FEF3C7) — warning badge bg
- `amber-300` (#FCD34D) — overlap warning border
- `amber-800` (#92400E) — warning text

### Typography Scale

| Element | Class | Size | Weight | Color |
|---------|-------|------|--------|-------|
| Page title | `text-xl font-semibold` | 20px | 600 | gray-900 |
| Section title | `text-sm font-semibold` | 14px | 600 | gray-700 |
| KPI value | `text-2xl font-semibold` | 24px | 600 | gray-900 |
| KPI label | `text-xs` | 12px | 400 | gray-500 |
| Form label | `text-xs font-medium` | 12px | 500 | gray-600 |
| Input text | `text-sm` | 14px | 400 | default |
| Table header | `text-xs uppercase` | 12px | 400 | gray-500 |
| Table cell | `text-sm` | 14px | 400 | gray-600 |
| Hint text | `text-xs` | 12px | 400 | gray-400 |
| Button text | `text-sm font-medium` | 14px | 500 | white/gray-800 |
| Small action btn | `text-xs font-medium` | 12px | 500 | emerald-800/red-800 |

### Spacing System

- Page container: `max-w-5xl mx-auto px-6 py-8`
- Page title bottom margin: `mb-6`
- Section bottom margin: `mb-4`, `mb-8`
- Card padding: `p-4` (compact), `p-5` (forms), `p-8` (login)
- Form grid: `grid-cols-2 gap-3`
- KPI grid: `grid-cols-4 gap-3`
- Table cell padding: `px-4 py-2`
- Nav padding: `px-6 py-3`
- Form field spacing: `space-y-3`
- Input label margin: `mt-1`
- Button gap: `gap-2`, `gap-3`, `gap-5`

### Border Radius
- `rounded` — small buttons, badges
- `rounded-md` — inputs, primary buttons
- `rounded-lg` — cards, tables

### Shadows
- `shadow-sm` — login card only
- No shadows elsewhere (flat design)

## Component Library

### Buttons
1. **Primary** — `rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white` (hover: none defined)
2. **Submit** — `rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50`
3. **Secondary** — `rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-800`
4. **Small action (approve)** — `rounded bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-800 disabled:opacity-50`
5. **Small action (refuse)** — `rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-800 disabled:opacity-50`
6. **Logout** — `rounded bg-gray-100 px-3 py-1 text-xs font-medium hover:bg-gray-200`

### Inputs
- Text/number/date/email: `mt-1 w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm`
- Select: `mt-1 w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm` (or `max-w-xs` for filters)
- Month: `mt-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm`

### Cards
- `rounded-lg border border-gray-200 bg-white p-4` (KPI)
- `rounded-lg border border-gray-200 bg-white p-5` (forms)
- `rounded-lg border border-gray-200 bg-white p-4` (chart)

### Tables
- Wrapper: `w-full border-collapse overflow-hidden rounded-lg border border-gray-200 bg-white text-sm`
- Header: `bg-gray-50 text-left text-xs uppercase text-gray-500`
- Header cell: `px-4 py-2`
- Body cell: `px-4 py-2 text-gray-600`
- Row: `border-t border-gray-100` (with `hover:bg-gray-50` on clickable rows)

### Alerts
1. **Error** — `rounded-md bg-red-50 px-3 py-2 text-sm text-red-700` + optional Retry button `rounded bg-red-100 px-2 py-1 text-xs font-medium hover:bg-red-200`
2. **Warning (overlap)** — `rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800`
3. **Badge (warning)** — `rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800`

### Status States
1. **Loading** — `animate-pulse py-6 text-sm text-gray-400` "Loading…"
2. **Error** — red box with optional retry
3. **Empty** — `py-6 text-sm text-gray-400` message

## Layout Rules

1. All authenticated pages share the same shell: top nav + `max-w-5xl mx-auto px-6 py-8` content area on `bg-gray-50`
2. Every page starts with a header row: title (left) + primary action button (right)
3. Forms are always white cards with `rounded-lg border border-gray-200`
4. Data is always displayed in tables with the same header style
5. Every data screen shows Loading → Error/Empty → Data states
6. Detail pages use `max-w-lg` or `max-w-xl` or `max-w-2xl` for narrower layouts

---

## PART 3: DESIGN REVIEW & IMPROVEMENT SUGGESTIONS

This section critically reviews the current mockups against accessibility, usability, and interaction best practices. Each finding includes the severity, the root cause, and a concrete remediation. Every suggestion has a corresponding ASCII wireframe showing the improved layout.

---

### GLOBAL DESIGN ISSUES

These 15 issues affect every page. They are ordered roughly by impact priority. Fixing these in `globals.css` and the shared component library (`Badge`, `Toast`, `ConfirmDialog`, `PageHeader`, `DataTable`) will resolve most of them once, app-wide.

**G1. No label↔input association** *(High, a11y)*
- **Problem:** All labels are plain `<p>`/`<span>` siblings of their inputs. Screen readers cannot associate label text with the field, so assistive tech users get "unnamed edit, —" instead of "Work email, edit text".
- **Fix:** Every field must use `<label htmlFor="field-name">…</label>` paired with `<input id="field-name">`. The label click should also focus the field (free usability win).
- **Pattern:**
```tsx
<label htmlFor="work-email" className="text-xs font-medium text-gray-600">
  Work email *
</label>
<input id="work-email" name="workEmail" type="email" required … />
```
- Apply to: Login (login, password), Employee list/detail, Contracts, Attendance, Time Off, New Payrun.

**G2. No focus-visible styles** *(High, a11y)*
- **Problem:** Inputs, links, and buttons have no `:focus-visible` outline. Keyboard users see nothing happen on Tab, making navigation invisible.
- **Fix:** Add a single global rule in `globals.css`:
```css
:focus-visible {
  outline: 2px solid #111827;
  outline-offset: 2px;
}
```
- For inputs specifically, also keep an explicit focus ring: `focus:ring-2 focus:ring-gray-900 focus:border-gray-900` on all `input`/`select`/`textarea`.

**G3. No success feedback** *(High, UX)*
- **Problem:** Every action (save, create, approve, confirm, mark paid) completes silently. Users can't tell whether their action succeeded and are forced to re-check the list.
- **Fix:** Add a global toast system. Render a `<ToastProvider>` in `(app)/layout.js` and expose a `toast.success('Employee updated')` helper. Toasts: white card, `rounded-lg border`, left accent bar (emerald for success, red for error), auto-dismiss ~4s, `role="status"` + `aria-live="polite"`.

**G4. No confirmation for destructive actions** *(High, data integrity)*
- **Problem:** Confirm payrun, Mark paid, Approve leave, Refuse leave all execute on a single click. Actions like "Confirm" are financially irreversible — one mis-click fires immediately.
- **Fix:** Route all destructive/high-impact actions through a shared `<ConfirmDialog>`. It renders a modal overlay (`fixed inset-0 bg-black/40` backdrop), a white centered card, the action title, an explanation sentence, and Cancel / Confirm buttons (Confirm = red for destructive, dark for confirm-only). The confirm button is `autofocus` so Enter trips the safe default, not the destructive one.

**G5. Tables don't scroll horizontally on mobile** *(Medium, responsive)*
- **Problem:** The table wrapper uses `overflow-hidden`, which clips columns on narrow screens — data silently disappears with no way to reach it.
- **Fix:** Change the table wrapper to `overflow-x-auto`, and (recommended) add `min-w-[640px]` on the inner `<table>` so columns keep readable widths while the wrapper scrolls.

**G6. Fixed grid columns** *(Medium, responsive)*
- **Problem:** `grid-cols-2` (forms) and `grid-cols-4` (KPIs) stay fixed at all breakpoints. On a 375px phone, grid-cols-4 squeezes each KPI into ~80px, truncating "$118,500".
- **Fix:** Use responsive prefixes:
  - KPI grid → `grid-cols-2 lg:grid-cols-4`
  - Two-column forms → `grid-cols-1 sm:grid-cols-2`
  - Four-column tables/filters → `grid-cols-2 lg:grid-cols-4`

**G7. No ARIA labels** *(Medium, a11y)*
- **Problem:** Many interactive elements carry an icon or bare text ("←", "→", "✕") with no accessible name. Icon-only "Edit"/"Delete" buttons are unnamed.
- **Fix:** Add `aria-label` to all icon-only controls. For the nav logo and home link: `<Link aria-label="Dashboard home">`. For toolbar icon buttons: `aria-label="Edit employee"`.

**G8. Error messages not announced** *(Medium, a11y)*
- **Problem:** Error boxes are visually rendered but not announced by screen readers; dynamic errors appear without any notification.
- **Fix:** Wrap error rendering in a container with `role="alert"` (implicit `aria-live="assertive"`). For inline field errors use `aria-describedby` linking the input to the error text `id`.

**G9. Status shown as plain text** *(Medium, UX/consistency)*
- **Problem:** Statuses render as raw uppercase text ("ACTIVE", "DRAFT", "CONFIRMED", "PAID"). They neither convey meaning at a glance nor match UI conventions.
- **Fix:** Create a shared `<Badge>` component with a color map:
```tsx
const COLORS = {
  ACTIVE: 'bg-emerald-100 text-emerald-800',
  INACTIVE: 'bg-gray-100 text-gray-600',
  DRAFT: 'bg-gray-100 text-gray-700',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  PAID: 'bg-emerald-100 text-emerald-800',
  PRESENT: 'bg-emerald-100 text-emerald-800',
  ABSENT: 'bg-red-100 text-red-800',
  // fallback
  default: 'bg-gray-100 text-gray-600',
};
```
Usage: `<Badge value={row.state} />`. Also add a visually-hidden "Status:" prefix for screen readers rather than relying on the pipe symbol.

**G10. No hover/active states on primary buttons** *(Low, feedback)*
- **Problem:** Primary buttons are `bg-gray-900` with no hover, so users get zero feedback that a button is interactive/clicked.
- **Fix:** Add `hover:bg-gray-800` and `active:scale-[0.98]` to the primary button class in the shared component. Same for secondary: `hover:bg-gray-200`.

**G11. No back navigation on detail pages** *(Medium, navigation)*
- **Problem:** Employee detail and Payslip detail have no "Back" link, leaving users trapped with only the top nav to return.
- **Fix:** Add `← Back to <label>` links in the page header of every detail page (matching the pattern already present on Contracts and Payrun detail).

**G12. Raw backend IDs exposed** *(High, data quality)*
- **Problem:** "Leave type ID" (`1`), "Structure ID" (`1`), and "Resource calendar ID" show raw numeric ID inputs. Users can't pick meaningfully and may enter invalid IDs.
- **Fix:** Replace with selects populated from real options:
  - Time Off → `<select>` of leave types (name, e.g. "Annual Leave", "Sick Leave")
  - New Payrun → `<select>` of salary structures
  - Contracts → `<select>` of resource calendars
- Show the human-readable label; store the ID.

**G13. Nav overflows on mobile** *(Medium, responsive)*
- **Problem:** 5 nav links + user name/role + logout sit in one horizontal row. On narrow screens links wrap awkwardly or clip.
- **Fix:** Below `md`, collapse nav into a hamburger (☰) that toggles a dropdown/menu panel. Wrap user info and logout inside the menu.

**G14. White-screen flash on route guard** *(Medium, UX)*
- **Problem:** `(app)/layout.js` returns `null` while checking auth, causing a blank white flash on every navigation/refresh.
- **Fix:** Return a centered skeleton spinner (e.g., `animate-pulse` brand mark or spinner) while the session resolves.

**G15. Empty states are text-only** *(Low, engagement)*
- **Problem:** "No employees yet." and similar are bare text — no explanation of next steps or CTA.
- **Fix:** Standard empty-state component: centered icon, headline, one-line explanation, and a primary action button (e.g., "Add your first employee").

---

### PER-PAGE REVIEW

---

#### 1. LOGIN PAGE

**What's Good**
- Single, focused centered card — clean and on-brand.
- Optional error box pattern already exists (red bg) — just needs `role="alert"`.
- Space to add branding exists without cluttering the form.

**What Needs Improvement**
- No logo/branding beyond the text title — reduce "generic form" feel.
- No `autocomplete` attributes: login field should be `autoComplete="username"`, password `autoComplete="current-password"` so password managers work.
- No `autoFocus` on first field — users must click/tab to begin.
- No hover state on "Sign in" button (G10).
- No label↔input association (G1) and no `:focus-visible` (G2).

**Recommended Improved Mockup**
```
┌──────────────────────────────────────────────────────────────────┐
│                        bg-gray-50                                │
│                                                                  │
│            ╲o/   PeoplePay360                                    │
│            logo   (brand mark + wordmark, text-lg semibold)      │
│                                                                  │
│        ┌────────────────────────────────────────┐                │
│        │ ▓▓ Person icon ▓▓  Welcome back         │                │
│        │    Sign in to your workspace            │  (profile      │
│        │                                        │   avatar +     │
│        │        Login                            │   subtitle)    │
│        │      ┌────────────────────────────┐    │                │
│        │      │ you@company.com      ®      │    │  (autoFocus,  │
│        │      └────────────────────────────┘    │   autocomplete │
│        │      (inline error · role="alert")     │   username)    │
│        │                                        │                │
│        │        Password                        │                │
│        │      ┌────────────────────────────┐    │                │
│        │      │ •••••••••           👁      │    │  (autocomplete │
│        │      └────────────────────────────┘    │   current-     │
│        │      [Forgot password?]                │   password)    │
│        │                                        │                │
│        │        ┌──────────────────────────┐    │                │
│        │        │         Sign in         │    │  hover:bg-900  │
│        │        └──────────────────────────┘    │  active:scale  │
│        │                                        │                │
│        │   No account? [Request access]         │  max-w-sm      │
│        └────────────────────────────────────────┘  white card    │
└──────────────────────────────────────────────────────────────────┘
```

---

#### 2. APP SHELL / NAV

**What's Good**
- Clear visual separation between nav and content; active-link highlighting is present.
- Logout is visually distinct from page navigation — good hierarchy.

**What Needs Improvement**
- Nav row overflows on mobile (G13) — 5 links + user info in a fixed row.
- No focus-visible styles on nav links (G2).
- No `aria-label` on the brand/home link (G7).
- Route guard returns `null` → white-screen flash (G14).

**Recommended Improved Mockup**
```
Desktop (≥ md):
┌──────────────────────────────────────────────────────────────────────────────┐
│  ╲o/ PeoplePay        Employees  Attendance  Time Off  Payroll  Dashboard   │
│  (brand, home link)                                                        │
│                       active ⟵ ⟶  inactive (gray-500)                      │
│                                                            Jane · Admin  ⏻ │
├──────────────────────────────────────────────────────────────────────────────┤
│  (content)                                                                    │
└──────────────────────────────────────────────────────────────────────────────┘

Mobile (< md):
┌────────────────────────────────────────────────────────────┐
│  ╲o/ PeoplePay                          ☰  Jane · Admin    │
├────────────────────────────────────────────────────────────┤
│  (content, max-w container)                                 │
└────────────────────────────────────────────────────────────┘
  ┌ ☰ menu dropdown ──────────────┐
  │  Employees      (uppercase xs) │
  │  Attendance                   │
  │  Time Off                     │
  │  Payroll                      │
  │  Dashboard                    │
  │ ───────────────────────────── │
  │  Jane Doe · Admin             │
  │  [Log out]                    │
  └───────────────────────────────┘
  (fixed overlay, backdrop bg-black/40)
```

---

#### 3. DASHBOARD

**What's Good**
- KPI cards with label + large bold value create strong scannability.
- The bar chart is easy to read.
- Filters are positioned well.

**What Needs Improvement**
- KPI grid `grid-cols-4` is too cramped on mobile (G6) → use `grid-cols-2 lg:grid-cols-4`.
- Department filter refetches on every keystroke — debounce (~300ms) or switch to a select.
- Chart bars use color-only encoding (emerald) with the amount as separate text — no value on the bar; and color coding is not accessible for color-blind users (G7). Add the amount label inside/at the end of each bar.
- Amounts aren't currency-formatted in KPIs or chart (raw numbers).
- No success/error toast (G3/G8).

**Recommended Improved Mockup**
```
┌──────────────────────────────────────────────────────────────────────────────┐
│ [Employees] [Attendance] [Time Off] [Payroll] [Dashboard]     Jane · Admin │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Dashboard                                              ┌ Toast ────────┐  │
│  ─────────────                                          │ ✓ Loaded 694ms │  │
│  Period: [2026-09▾]   Department: [All ▾]  Apply        └───────────────┘  │
│  (month picker)       (select, not text)                                     │
│                                                                              │
│  ┌──────────────┐┌──────────────┐┌──────────────┐┌──────────────┐          │
│  │ Headcount    ││ Total gross  ││ Total net    ││ Pending leave│          │
│  │              ││              ││              ││              │          │
│  │      12      ││  $145,000    ││  $118,500    ││     3        │          │
│  │  ▲ 2 vs Aug  ││  ▲ 4.2%      ││  ▲ 3.1%      ││  ⚠ 2 overdue │          │
│  └──────────────┘└──────────────┘└──────────────┘└──────────────┘          │
│   grid-cols-2 lg:grid-cols-4   (amounts as "$145,000" — currency)          │
│                                                                              │
│  Salary by department          ░ ░ ░ (legend / note)                        │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │  Engineering  ████████████████████████████████████ $52,000          │    │
│  │  Marketing    ██████████████████████               $34,000          │    │
│  │  Sales        ██████████████████████████           $38,500          │    │
│  │  HR           ██████████                           $18,000          │    │
│  │  Finance      ████████████                         $22,500          │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│   (bar value printed on/at end of each bar — not color-coded alone)        │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

#### 4. EMPLOYEES LIST

**What's Good**
- Header row with primary "Add employee" action is clear.
- Table + toggle-able form pattern is straightforward.

**What Needs Improvement**
- Status shown as plain text (G9) → replace with badges.
- No search/filter → with many employees the list is unscannable. Add a search input (name/email) and a department filter.
- Form lacks `htmlFor`/`id` (G1) and focus states (G2).
- Table doesn't scroll horizontally (G5).
- Grid `grid-cols-2` collapses poorly on mobile (G6) → use responsive `sm:grid-cols-2`.
- Empty state is text-only (G15).

**Recommended Improved Mockup**
```
┌──────────────────────────────────────────────────────────────────────────────┐
│ [Employees] [Attendance] [Time Off] [Payroll] [Dashboard]     Jane · Admin │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Employees                                        [+ Add employee]          │
│  ─────────────                                                                 │
│                                                                              │
│  ┌─ Add employee (collapsed) ────────────────────────────────────────────┐  │
│  │  Name *          Work email *         │  Dept *       Job title *     │  │
│  │  [            ]  [                    ]│  [▾          ] [             │] │
│  │  (2-col, sm:grid-cols-2)              │                                │  │
│  │                        [Save employee]│                                │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  Search: [🔍 name or email_____]    Dept: [All ▾]                           │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │  Name           Work email         Department    Status    (actions)   │  │
│  │  ─────────────  ─────────────────  ────────────  ────────  ─────────  │  │
│  │  Alice Johnson  alice@company.com  Engineering   [ACTIVE ▮]   [● ●]   │  │
│  │  Bob Smith      bob@company.com    Marketing     [ACTIVE ▮]           │  │
│  │  Carol White    carol@company.com  HR            [INACTIVE ▯]         │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│   (overflow-x-auto + min-w-[640px] on table; status = Badge)               │
│                                                                              │
│  ┌─ Empty state ────────────────────────────────────────────────────────┐   │
│  │   ○  (icon)                                                           │   │
│  │   No employees yet                                                   │   │
│  │   Add your first employee to get started on pay.                    │   │
│  │                     [+ Add employee]                                  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

#### 5. EMPLOYEE DETAIL

**What's Good**
- Status select gives constrained, valid options.
- Header shows the employee name clearly.

**What Needs Improvement**
- No back navigation (G11) → add "← Back to employees".
- No success feedback after save (G3).
- Form is single-column `max-w-lg` — too narrow; could use 2 columns and a wider card (`max-w-2xl`).
- Label/input association (G1) and focus states (G2) missing.
- No badge for the status display (though it's a select here, a read-only summary could show a badge).

**Recommended Improved Mockup**
```
┌──────────────────────────────────────────────────────────────────────────────┐
│ [Employees] [Attendance] [Time Off] [Payroll] [Dashboard]     Jane · Admin │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ← Back to employees                                                         │
│                                                                              │
│  Alice Johnson                                 ┌ Toast ───────────────┐    │
│  ──────────────────────                        │ ✓ Changes saved      │    │
│  Work email: alice@company.com   Status:       └──────────────────────┘    │
│  Department: Engineering         [ACTIVE ▮]                                │
│  Job title: Senior Developer     (badge)                                   │
│                                                                              │
│  ┌─ Edit details (max-w-2xl, 2-col) ────────────────────────────────────┐  │
│  │  Name *                     Work email *                              │  │
│  │  [ Alice Johnson            ] [ alice@company.com                  ] │  │
│  │  Department *               Job title *                               │  │
│  │  [ Engineering  ▾           ] [ Senior Developer                   ] │  │
│  │                                  ┌ Actions ──────────────┐            │  │
│  │  Status *                        │ [Save changes]        │            │  │
│  │  [ ACTIVE ▾ ]                    │                       │            │  │
│  │                                  └───────────────────────┘            │  │
│  │   (htmlFor/id on all labels+inputs; focus styles)                     │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

#### 6. EMPLOYEE CONTRACTS

**What's Good**
- "← Back to employee" back link already exists (consistent, keep this on all detail pages).
- 409 overlap warning banner is a thoughtful touch.
- Table reads well with descriptive columns.

**What Needs Improvement**
- Wage is a raw number — no currency formatting/hint. Use `<input type="number" step="0.01">` with a "$" prefix and format display.
- "Resource calendar ID" is raw number input (G12) → replace with a select of calendars.
- No success feedback after save (G3).
- No confirmation on destructive-ish actions (though the only actions here are create — still, no toast).
- Overlap warning box should have `role="alert"` (G8).

**Recommended Improved Mockup**
```
┌──────────────────────────────────────────────────────────────────────────────┐
│ [Employees] [Attendance] [Time Off] [Payroll] [Dashboard]     Jane · Admin │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ← Back to employee                                                          │
│  Contracts                                       [+ New contract]           │
│  ─────────────                                                                 │
│                                                                              │
│  ⚠ Contract overlap detected for this period.          (role="alert")       │
│  ██████████████████████████████████████████                                 │
│                                                                              │
│  ┌─ New contract (2-col) ────────────────────────────────────────────────┐  │
│  │  Reference *              Wage * (per month)                          │  │
│  │  [ CTR-2026-001           ]  $ [ 5500 ▾ ]  (prefix $, number input)   │  │
│  │  Start date *             End date *                                  │  │
│  │  [ 2026-01-01             ]  [ 2026-12-31              ]              │  │
│  │  State *                  Resource calendar *                         │  │
│  │  [ RUNNING ▾              ]  [ Standard 40h ▾           ]  (select)   │  │
│  │                                    [Save contract]                    │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │  Reference       Wage      Start         End         State    Actions │  │
│  │  CTR-2026-001   $5,500/mo  2026-01-01   2026-12-31  [RUNNING ▮]  ●    │  │
│  │  CTR-2025-003   $4,800/mo  2025-01-01   2025-12-31  [EXPIRED ▯]       │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│   (wage column formatted "$5,500/mo"; state = Badge; overflow-x-auto)        │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

#### 7. ATTENDANCE

**What's Good**
- Employee selector gates the form logically.
- Worked-hours column is useful computed data.

**What Needs Improvement**
- "Add entry" button is hidden until an employee is selected — confusing/discoverability problem. Either always show it (disabling until selection) or show a hint.
- No confirmation for actions (G4) — deleting/overriding entries should confirm.
- `datetime-local` inputs are awkward on mobile keyboards. Split into date + time, or offer the native input (validate/format).
- Status is plain text (G9) → badges.
- No success feedback (G3).
- Label/input association (G1).

**Recommended Improved Mockup**
```
┌──────────────────────────────────────────────────────────────────────────────┐
│ [Employees] [Attendance] [Time Off] [Payroll] [Dashboard]     Jane · Admin │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Attendance                                       [+ Add entry] (always vis)│
│  ─────────────                                       disabled until employee│
│                                                                              │
│  Employee:  [ Select employee… ▾ ]   (required)                             │
│                                                                              │
│  ┌─ Add entry (2-col) ───────────────────────────────────────────────────┐  │
│  │  Check in                    Check out                                 │  │
│  │  [ Date ] [ Time ▾ ]         [ Date ] [ Time ▾ ]   (split date/time)   │  │
│  │  Status *                    Notes                                     │  │
│  │  [ PRESENT ▾ ]               [ Normal workday______________________ ]  │  │
│  │                                      ┌────────────────────────────┐    │  │
│  │                                      │  [Save entry]              │    │  │
│  │                                      └────────────────────────────┘    │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │  Check in          Check out        Hours   Status    Notes    ▓      │  │
│  │  2026-09-01 08:30  2026-09-01 17:00  8.50   [PRESENT ▮]            ⋯ │  │
│  │  2026-09-02 09:00  2026-09-02 18:15  9.25   [PRESENT ▮]  Late start │  │
│  │  2026-09-03 08:00  —                 —       [ABSENT ▯]   Sick leave │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│   (empty → icon + "No entries yet" + action button; overflow-x-auto)        │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

#### 8. TIME OFF

**What's Good**
- Employee filter is a sensible default.
- Good clear Approve/Refuse pattern.
- Form fields are logically grouped.

**What Needs Improvement**
- "Leave type ID" is a raw number (G12) → replace with `<select>` of leave types (Annual Leave, Sick Leave, etc.).
- No confirmation for Approve/Refuse (G4) — single-click actions, financially/scheduling impactful.
- No success feedback (G3).
- Number of days could be auto-derived from From/To; consider showing type as a label + color.
- Status plain text (G9) → badges.

**Recommended Improved Mockup**
```
┌──────────────────────────────────────────────────────────────────────────────┐
│ [Employees] [Attendance] [Time Off] [Payroll] [Dashboard]     Jane · Admin │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Time Off                                          [+ Request leave]        │
│  ───────────                                                                   │
│  Filter employee:  [ Select employee… ▾ ]   (optional)                       │
│                                                                              │
│  ┌─ Request leave (2-col) ────────────────────────────────────────────────┐  │
│  │  Leave type *               Days (auto)                                │  │
│  │  [ Annual Leave ▾        ]  [ ▸ 5 ]        (derived from From/To)      │  │
│  │  From *                    To *                                        │  │
│  │  [ 2026-09-15            ]  [ 2026-09-19                ]              │  │
│  │  Reason                                                               │  │
│  │  [ Family vacation__________________________________________________ ] │  │
│  │                                      [Submit request]                  │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │  From         To           Days  Type        State       Actions       │  │
│  │  2026-09-15   2026-09-19   5    Annual       [CONFIRMED ▮]  —          │  │
│  │  2026-10-01   2026-10-03   3    Sick         [DRAFT ▯]  [✓] [✕]        │  │
│  │  2026-11-20   2026-11-22   2    Annual       [DRAFT ▯]  [✓] [✕]        │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│   (Leave type column replaces raw ID; Approve/Refuse open ConfirmDialog;    │
│    state = Badge; empty → icon + "No leave requests" + [+ Request leave])    │
│                                                                              │
│   ┌ Confirm ──────────────────────┐                                          │
│   │ Approve leave for Alice?      │                                          │
│   │ This will confirm the request.│                                          │
│   │        [Cancel]  [Approve ✓]   │   (Confirm autofocus = safe)           │
│   └───────────────────────────────┘                                          │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

#### 9. PAYROLL LIST

**What's Good**
- Clean table with clear Period range display.
- "New payrun →" is a good primary action.

**What Needs Improvement**
- State shown as plain text (G9) → badges (DRAFT/PAID/CONFIRMED distinct colors).
- No search/filter → many payruns unscannable. Add search + period filter.
- Table doesn't scroll horizontally (G5).
- No confirmation when navigating away from "new" — minor.
- Empty state text-only (G15).

**Recommended Improved Mockup**
```
┌──────────────────────────────────────────────────────────────────────────────┐
│ [Employees] [Attendance] [Time Off] [Payroll] [Dashboard]     Jane · Admin │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Payroll                                         [→ New payrun]             │
│  ──────                                                                            │
│  Search: [🔍 payrun…_____]   Status: [All ▾]                                  │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │  Name           Period                   State      Payslips   Created  │  │
│  │  ─────────────  ──────────────────────── ────────   ────────  ───────  │  │
│  │  September 2026 2026-09-01 → 2026-09-30  [DRAFT ▯]    4      Sep 01    │  │
│  │  August 2026    2026-08-01 → 2026-08-31  [PAID ▮]     4      Aug 01    │  │
│  │  July 2026      2026-07-01 → 2026-07-31  [PAID ▮]     4      Jul 01    │  │
│  │  June 2026      2026-06-01 → 2026-06-30  [CONFIRMED ▮] 4      Jun 01    │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│   (state = Badge; name = link; overflow-x-auto + min-w)                      │
│                                                                              │
│  ┌─ Empty ────────────────────────────────────────────────────────────────┐ │
│  │  ○   No payruns yet — run your first payroll.   [→ New payrun]         │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

#### 10. NEW PAYRUN

**What's Good**
- Two-step flow (define → select eligible) is a clean simple model.
- Checkbox list makes eligibility selection explicit.

**What Needs Improvement**
- "Structure ID" is a raw number input (G12) → replace with a select of salary structures.
- Step indicator is just text "step 1 of 2" — could be a visual stepper (numbered dots/bar with current highlighted).
- No success feedback when created (G3).
- Form fields need htmlFor/id (G1) and focus styles (G2).
- No back navigation / cancel.

**Recommended Improved Mockup**
```
┌──────────────────────────────────────────────────────────────────────────────┐
│ [Employees] [Attendance] [Time Off] [Payroll] [Dashboard]     Jane · Admin │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ← All payruns                                          ← Cancel             │
│                                                                              │
│  ① Define ────────── ② Select employees ────────── ③ Review                 │
│     ●▲●  active        ○ / completed             ○ / locked                 │
│  (visual stepper with connected segments + check on completed)              │
│                                                                              │
│  ┌─ Step 1: Define ──────────────────────────────────────────────────────┐  │
│  │  Name *                    Structure *                                 │  │
│  │  [ September 2026         ]  [ Standard Monthly ▾ ]   (select, Label)   │  │
│  │  Period start *           Period end *                                 │  │
│  │  [ 2026-09-01            ]  [ 2026-09-30                 ]             │  │
│  │                               [→ Create & continue]                     │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌─ Step 2: Select eligible employees ────────────────────────────────────┐ │
│  │  ☑ Alice Johnson      alice@company.com                                │ │
│  │  ☑ Bob Smith          bob@company.com                                  │ │
│  │  ☑ Carol White        carol@company.com                                │ │
│  │  ☐ David Brown        david@company.com   (inactive)                   │ │
│  │  5 selected of 6                       [← Back]  [→ Continue to review]│ │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌ Toast ─────────────┐                                                     │
│  │ ✓ Step 2 created ✓ │                                                     │
│  └────────────────────┘                                                     │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

#### 11. PAYRUN DETAIL

**What's Good**
- Back link "← All payruns" present.
- Action row (Compute / Confirm / Mark paid) is clearly grouped.
- Warning badges in the payslips table surface problems well.

**What Needs Improvement**
- No confirmation for Confirm/Mark paid — **financially irreversible** (G4). Must gate behind ConfirmDialog.
- No success feedback for Compute/Confirm/Paid transitions (G3) — users get zero signal.
- Fetches the entire payrun list to find one record instead of fetching by ID — inefficient; fetch `/payruns/{{id}}` directly.
- State shown as plain text near the period — use a badge.
- Buttons lack hover/active states (G10).

**Recommended Improved Mockup**
```
┌──────────────────────────────────────────────────────────────────────────────┐
│ [Employees] [Attendance] [Time Off] [Payroll] [Dashboard]     Jane · Admin │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ← All payruns                                                    Period    │
│                                                                              │
│  September 2026                 Period: 2026-09-01 → 2026-09-30             │
│  ───────────────────            State: [CONFIRMED ▮]  (badge, not text)    │
│                                                                              │
│  [⚙ Compute]   [✓ Confirm]   [✓ Mark paid]                                 │
│   dark          gray           gray   (all: hover + active states)          │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │  Payslip     Gross       Net        Warning            Actions        │  │
│  │  #42         $5,500.00   $4,320.00                     [PDF]          │  │
│  │  #43         $4,800.00   $3,890.00   ⚠ Missing contract              │  │
│  │  #44         $6,200.00   $5,100.00                     [PDF]          │  │
│  │  #45         $3,500.00   $2,950.00   ⚠ Negative net pay              │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│   (payslip = link to detail; warnings amber badge; overflow-x-auto)          │
│                                                                              │
│  ┌ Confirm ───────────────────────────────┐                                 │
│  │ ▓ Mark this payrun as paid?            │                                 │
│  │   This action is irreversible.         │                                 │
│  │        [Cancel]      [Confirm ✓]        │                                 │
│  └────────────────────────────────────────┘    (backdrop bg-black/40)        │
│  ┌ Toast ─────────────────┐                                                 │
│  │ ✓ Payrun marked as paid│                                                 │
│  └────────────────────────┘                                                 │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

#### 12. PAYSLIP DETAIL

**What's Good**
- Summary + line items split is clean and readable.
- Deductions are visually encoded (negative amounts).
- Warning badge pattern is consistent.

**What Needs Improvement**
- No back navigation (G11) → add "← Back to payrun".
- PDF download is a plain `<a>` link, bypassing auth — must go through an authenticated fetch/download flow (e.g., a button hitting a protected endpoint with token), not a bare href.
- Amounts not currency-formatted consistently (Net row and line items should use `Intl.NumberFormat`).
- No success feedback generally, and no confirmation if any action were added later.
- Line items could be screen-reader grouped (`aria-label` on the section) (G7).

**Recommended Improved Mockup**
```
┌──────────────────────────────────────────────────────────────────────────────┐
│ [Employees] [Attendance] [Time Off] [Payroll] [Dashboard]     Jane · Admin │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ← Back to payrun                                             [⬇ Download PDF]│
│  Payslip #42                                              (button → authed   │
│  ───────────                                              endpooint, NOT <a>)│
│                                                                              │
│  ┌─ Summary (2-col) ────────────────────────────────────────────────────┐   │
│  │  Period                State                                         │   │
│  │  2026-09-01 → 30       [CONFIRMED ▮]  (badge)                        │   │
│  │  Gross                 Net                                           │   │
│  │  $5,500.00             $4,320.00    (Intl currency format)          │   │
│  │  Warning                                                             │   │
│  │  (none)                                                              │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  Line items   (aria-label="Payslip line items")                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │  Rule                                       Amount                     │  │
│  │  Basic Salary (BASIC)                         $4,500.00                │  │
│  │  Housing Allowance (HOUSING)                   $800.00                 │  │
│  │  Transport Allowance (TRANSPORT)               $200.00                 │  │
│  │  Income Tax (TAX)                            −$780.00   (deduction)    │  │
│  │  Social Security (SS)                        −$200.00                  │  │
│  │  Health Insurance (HEALTH)                   −$100.00                  │  │
│  │ ──────────────────────────────────────────────────────────────────     │  │
│  │  Net Pay (NET)                               $4,320.00   (bold)        │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│   (amounts left/right aligned groups: earnings +, deductions −;             │
│    overflow-x-auto)                                                          │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

### PRIORITY IMPLEMENTATION ORDER

To maximize impact with the least churn, build the shared primitives first, then sweep pages. Recommended order:

| Step | Deliverable | Resolves |
|------|-------------|----------|
| 1 | `Badge` component + color map | G9, page statuses |
| 2 | Global `:focus-visible` + input focus ring in `globals.css` | G2 |
| 3 | `ToastProvider` + `useToast()` | G3, success feedback |
| 4 | `ConfirmDialog` component | G4, destructive actions |
| 5 | `DataTable` wrapper (`overflow-x-auto`, `min-w`, sticky header) | G5 |
| 6 | Responsive grid sweep (`sm:`/`lg:` prefixes) | G6 |
| 7 | Label/`htmlFor` sweep on all forms | G1 |
| 8 | Select pickers for raw IDs (leave type, structure, calendar) | G12 |
| 9 | Back-links on detail pages | G11 |
| 10 | Nav responsive (hamburger) + skeleton route guard | G13, G14 |
| 11 | Empty-state component with CTA; ARIA labels; `role="alert"` | G15, G7, G8 |
| 12 | Currency formatting helper; search/filter; debounce; authed PDF download | page-specific |

---

## PART 2: STYLE GUIDE APPENDIX — ADDITIONS FROM THIS REVIEW

The following tokens/components are new recommendations that extend the existing style guide but are not yet implemented.

| Token | Value | Purpose |
|-------|-------|---------|
| `focus ring` | `outline: 2px solid #111827; outline-offset: 2px` | Global keyboard focus (G2) |
| Focus state (inputs) | `focus:ring-2 focus:ring-gray-900 focus:border-gray-900` | Visible focus on form fields |
| Success toast | `bg-white border-l-4 border-emerald-500` | Success feedback (G3) |
| Error toast | `bg-white border-l-4 border-red-500` | Error feedback (G3) |
| Status `ACTIVE` | `bg-emerald-100 text-emerald-800` | Badge color (G9) |
| Status `CONFIRMED` | `bg-blue-100 text-blue-800` | Badge color (G9) |
| Status `PAID` | `bg-emerald-100 text-emerald-800` | Badge color (G9) |
| Status `DRAFT` | `bg-gray-100 text-gray-700` | Badge color (G9) |
| Status `INACTIVE` | `bg-gray-100 text-gray-600` | Badge color (G9) |
| Status `PRESENT` | `bg-emerald-100 text-emerald-800` | Badge color (G9) |
| Status `ABSENT` | `bg-red-100 text-red-800` | Badge color (G9) |
| Modal overlay | `fixed inset-0 bg-black/40` | ConfirmDialog backdrop (G4) |
| Table min width | `min-w-[640px]` | Enable horizontal scroll (G5) |
| Currency format | `Intl.NumberFormat('en-US',{style:'currency',currency:'USD'})` | Consistent money display |
| Hover (primary) | `hover:bg-gray-800` | Interactive feedback (G10) |
| Press (primary) | `active:scale-[0.98]` | Press feedback (G10) |

---

## Summary of Part 3

This section audits all 12 pages plus the app shell against accessibility, usability, and data-integrity standards. It documents **15 global issues** (with a per-issue remediation and, where relevant, a code snippet) and a **per-page review** covering "What's Good", "What Needs Improvement", and a **revised ASCII wireframe** for each of the 12 pages. Each wireframe demonstrates: shared `Badge` components for statuses, `overflow-x-auto` tables with `min-w`, responsive `grid-cols-1 sm:grid-cols-2` / `grid-cols-2 lg:grid-cols-4` layouts, inline label↔input association, a `ConfirmDialog` for destructive actions (Confirm payrun, Mark paid, Approve/Refuse leave), `Toast` success feedback, screen-reader roles (`role="alert"`, `aria-label`), select pickers replacing raw ID inputs, back-links on detail pages, a visual multi-step stepper, an authenticated PDF download flow, currency formatting, and improved empty states with CTAs.

A proposed **12-step priority implementation order** is provided so the team can build the shared primitives (Badge, Toast, ConfirmDialog, DataTable, responsive grids, focus styles) before sweeping each page. A new **Style Guide Appendix** lists the exact new tokens and component classes these recommendations add to the existing design system.
