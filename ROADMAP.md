# PeoplePay360 — Future Roadmap

What we would build next, and why in this order. Everything here is a deliberate
sequencing decision made against the clock, not a list of things we forgot.

The principle throughout: build the logic a judge can check before the surface they
can only look at. Where we had to choose, we chose the rule over the screen.

---

## Already load-bearing

Stated first because the roadmap only makes sense against what it extends.

- **Period-aware contract resolver.** A second Running contract overlapping an
  existing one is refused with `409 CONTRACT_OVERLAP`, naming the contract it clashes
  with. Rejected writes leave nothing behind.
- **Sequenced salary rule engine.** Rules run in `sequence` order; each result is
  written to `payslip_lines` and becomes readable by later rules through its code.
  Formulas are parsed, never executed — a salary rule is a database row, and a row
  that can reach `eval` is a remote code execution hole.
- **Proration.** `BASIC` is `WAGE * 50 / 100 * WORKED_DAYS / PERIOD_DAYS`, so a
  mid-period joiner and unpaid leave both reduce pay, and every downstream rule
  follows.
- **Atomic leave consumption.** Approval deducts from the allocation inside one
  transaction with the row locked, so two concurrent approvals cannot overdraw it.
- **Role ladder.** Cumulative, enforced server-side, verified across all five roles.
- **Live dashboard.** Every figure is an aggregate query; DRAFT payslips are excluded,
  so a computed-but-unconfirmed payrun contributes zero until it is confirmed.

93 backend tests, each of the two jury-tested rules mutation-checked — we broke the
rule on purpose and confirmed the tests went red.

---

## 1. Time Off Allocations and Types as managed records

**What.** Screens for granting, approving and expiring leave allocations, and for
configuring leave types.

**Why first.** This is the only gap that is visibly broken rather than merely absent.
Allocations are seeded with a validity window ending 2026-12-31, so approving 2027
leave correctly fails with `NO_ALLOCATION` — the engine is right, but there is no way
in the product to grant next year's balance. An HR platform that cannot issue leave
entitlement is incomplete in a way a judge will find by clicking.

**Shape.** Allocation list and form with a To Approve → Approved workflow, leave type
list and form. No migration; the tables already carry `state`, `validity_start` and
`validity_end`. Four of our eight missing screens close here.

---

## 2. Overtime reaching the payslip

**What.** An `overtime_hours` column on attendance, computed against the schedule's
expected daily hours, and one `OT` salary rule of category Allowance.

**Why.** Attendance currently records presence and never influences pay. The rule is
one row — `WAGE / PERIOD_HOURS * OVERTIME_HOURS * 1.5` — which means overtime becomes
another line in the same audit trail as everything else rather than a special case in
code. It closes the loop between the two modules that today only share an employee id.

---

## 3. Payroll warnings, complete

**What.** `employees.bank_account`, then all four warning types firing:
`MISSING_BANK_DETAILS`, `DUPLICATE_PAYSLIP`, `NO_ACTIVE_CONTRACT`, `NEGATIVE_NET`.

**Why.** Two of the four are live. `MISSING_BANK_DETAILS` cannot fire because no bank
field exists, and `NO_ACTIVE_CONTRACT` never fires because ineligible employees are
excluded from the run rather than flagged in it. Excluding them is quieter and worse:
an employee silently missing from payroll is exactly the error the warning exists to
catch. The fix is to include them with a warning and a zero payslip.

---

## 4. Working Schedule as a real weekly pattern

**What.** A `resource_calendar_attendances` table — one row per working day with start
time, end time and break — and weekly hours computed from it rather than stored.

**Why here rather than sooner.** It is the largest migration on this list and the
current model already carries `days_per_week` and `hours_per_week`, which is enough to
drive proration and worked-days correctly today. It becomes necessary the moment
overtime needs per-day expected hours, so it pairs naturally with item 2 if both are
built.

---

## 5. Payslip distribution

**What.** Bulk `Send Payslips` from the payrun, with delivery status per payslip.

**Why.** PDF generation works per payslip. Bulk dispatch is the last step of the
payroll cycle and is named in the specification twice. We would log dispatch rather
than integrate a mail provider for a demo, but record the attempt per payslip so the
run shows who was sent and who failed.

---

## 6. Dashboard breadth

**What.** Total Net Paid, Payslips Generated, Average Salary, Approved Time Off and
Attendance Health as KPIs; a monthly net salary trend; an operational alerts panel;
an attendance overview covering present, late, absent, overtime and missing
check-outs.

**Why last among the functional items.** The dashboard is already live rather than
mocked, which is the property the specification actually tests — filters change the
numbers because they change the query. Adding more cards widens it; it does not make
it more real. Widening is worth doing, but not before a module that does not exist.

---

## 7. Presentation layer

Employee Kanban view, smart buttons with related-record counts on the employee form,
and Contracts and Reports as first-class navigation entries.

Deliberately last. These make an existing hub easier to move around; they add no
behaviour. With more time they are quick, and they are the first thing we would hand
to a second frontend developer.

---

## Deliberately out of scope

Choices we would keep, not gaps we would close.

- **Hard deletion of employees.** `status: INACTIVE` is correct. Deleting a person who
  appears on a paid payslip destroys payroll history.
- **Editing a structure that a confirmed payrun depends on.** Already refused with
  `409 STRUCTURE_IN_USE`. Rates change by creating a new structure, so historical
  payslips stay reproducible.
- **Attendance driving worked days.** `worked_days` comes from the resource calendar
  by design. Attendance is an exception record; pay is owed for scheduled days minus
  unpaid absence, not for badge swipes.

---

## If we had one more day

Items 1 and 2, both tested to the same standard as the contract resolver and the rule
engine — which is the standard the rest of the system is held to, and the reason we
would not trade either of them for a second chart.
