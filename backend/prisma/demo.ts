import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { computeLines, workingDays } from "../src/lib/payroll";

/**
 * Demo data on top of the seed, so every screen has something real to show.
 *
 * Re-runnable: everything is keyed on a stable email, contract reference or payrun
 * name, so running it twice leaves the same rows rather than duplicating them.
 *
 * Payslips go through the real rule engine — nothing here is a hardcoded number.
 * Run: npm run demo   (after npm run seed)
 */

const prisma = new PrismaClient();

const PEOPLE = [
  { name: "Neha Iyer",      email: "neha@peoplepay360.test",   department: "Sales",      job_title: "Sales Lead",           wage: 95000 },
  { name: "Arjun Desai",    email: "arjun@peoplepay360.test",  department: "Sales",      job_title: "Account Executive",    wage: 68000 },
  { name: "Fatima Sheikh",  email: "fatima@peoplepay360.test", department: "Sales",      job_title: "Sales Associate",      wage: 52000 },
  { name: "Kabir Malhotra", email: "kabir@peoplepay360.test",  department: "Support",    job_title: "Support Manager",      wage: 78000 },
  { name: "Ritu Bansal",    email: "ritu@peoplepay360.test",   department: "Support",    job_title: "Support Specialist",   wage: 46000 },
  { name: "Imran Qadri",    email: "imran@peoplepay360.test",  department: "Support",    job_title: "Support Specialist",   wage: 44000 },
  { name: "Lakshmi Pillai", email: "lakshmi@peoplepay360.test",department: "Design",     job_title: "Design Lead",          wage: 88000 },
  { name: "Tanvi Joshi",    email: "tanvi@peoplepay360.test",  department: "Design",     job_title: "Product Designer",     wage: 64000 },
  { name: "Sandeep Reddy",  email: "sandeep@peoplepay360.test",department: "Operations", job_title: "Operations Manager",   wage: 82000 },
  { name: "Meera Krishnan", email: "meera@peoplepay360.test",  department: "Operations", job_title: "Operations Analyst",   wage: 58000 },
];

/** Team leads, so the employee list shows a reporting line. */
const MANAGES: Record<string, string[]> = {
  "neha@peoplepay360.test": ["arjun@peoplepay360.test", "fatima@peoplepay360.test"],
  "kabir@peoplepay360.test": ["ritu@peoplepay360.test", "imran@peoplepay360.test"],
  "lakshmi@peoplepay360.test": ["tanvi@peoplepay360.test"],
  "sandeep@peoplepay360.test": ["meera@peoplepay360.test"],
};

const monthEnd = (year: number, month: number) => new Date(Date.UTC(year, month, 0));
const monthStart = (year: number, month: number) => new Date(Date.UTC(year, month - 1, 1));

async function main() {
  const calendar = await prisma.resourceCalendar.findFirstOrThrow();
  const structure = await prisma.payrollStructure.findFirstOrThrow();
  const rules = await prisma.salaryRule.findMany({
    where: { structure_id: structure.id },
    orderBy: { sequence: "asc" },
  });
  const leaveTypes = await prisma.leaveType.findMany({ orderBy: { id: "asc" } });
  if (!rules.length || !leaveTypes.length) throw new Error("run npm run seed first");

  // ---- employees, contracts, allocations -----------------------------------
  const byEmail = new Map<string, number>();

  for (const [index, person] of PEOPLE.entries()) {
    const employee = await prisma.employee.upsert({
      where: { work_email: person.email },
      update: { department: person.department, job_title: person.job_title },
      create: {
        name: person.name,
        work_email: person.email,
        department: person.department,
        job_title: person.job_title,
        resource_calendar_id: calendar.id,
      },
    });
    byEmail.set(person.email, employee.id);

    const reference = `CON-2026-1${String(index + 1).padStart(3, "0")}`;
    await prisma.contract.upsert({
      where: { reference },
      update: {},
      create: {
        employee_id: employee.id,
        reference,
        wage: person.wage,
        start_date: new Date("2026-01-01"),
        resource_calendar_id: calendar.id,
        structure_id: structure.id,
        state: "RUNNING",
      },
    });

    for (const type of leaveTypes) {
      const existing = await prisma.leaveAllocation.findFirst({
        where: { employee_id: employee.id, leave_type_id: type.id },
      });
      if (!existing) {
        await prisma.leaveAllocation.create({
          data: {
            employee_id: employee.id,
            leave_type_id: type.id,
            number_of_days: type.name.toLowerCase().includes("sick") ? 8 : 18,
            validity_start: new Date("2026-01-01"),
            validity_end: new Date("2026-12-31"),
            state: "APPROVED",
          },
        });
      }
    }
  }

  for (const [managerEmail, reportEmails] of Object.entries(MANAGES)) {
    const manager_id = byEmail.get(managerEmail)!;
    await prisma.employee.updateMany({
      where: { work_email: { in: reportEmails } },
      data: { manager_id },
    });
  }

  // ---- an expired contract and a draft one, so the contract screen has variety ----
  const arjun = byEmail.get("arjun@peoplepay360.test")!;
  await prisma.contract.upsert({
    where: { reference: "CON-2025-0900" },
    update: {},
    create: {
      employee_id: arjun,
      reference: "CON-2025-0900",
      wage: 60000,
      start_date: new Date("2025-01-01"),
      end_date: new Date("2025-12-31"),
      resource_calendar_id: calendar.id,
      structure_id: structure.id,
      state: "EXPIRED",
    },
  });
  await prisma.contract.upsert({
    where: { reference: "CON-2027-0001" },
    update: {},
    create: {
      employee_id: arjun,
      reference: "CON-2027-0001",
      wage: 75000,
      start_date: new Date("2027-01-01"),
      resource_calendar_id: calendar.id,
      structure_id: structure.id,
      state: "DRAFT",
    },
  });

  // ---- attendance: three weeks of weekdays for six people ------------------
  const attendanceFor = [...byEmail.values()].slice(0, 6);
  let attendanceCount = 0;

  for (const employee_id of attendanceFor) {
    for (let day = 1; day <= 21; day++) {
      const date = new Date(Date.UTC(2026, 3, day)); // April 2026
      const weekday = (date.getUTCDay() + 6) % 7;
      if (weekday > 4) continue; // weekends off

      const check_in = new Date(Date.UTC(2026, 3, day, 9, employee_id % 20));
      const exists = await prisma.attendance.findFirst({ where: { employee_id, check_in } });
      if (exists) continue;

      // A little variety so the list is not uniform: one short day per person.
      const hours = day % 7 === 0 ? 6 : 9;
      const check_out = new Date(check_in.getTime() + hours * 3_600_000);

      await prisma.attendance.create({
        data: {
          employee_id,
          check_in,
          check_out,
          worked_hours: hours,
          status: "PRESENT",
        },
      });
      attendanceCount++;
    }
  }

  // ---- leave requests in every state ---------------------------------------
  const [pto, sick] = leaveTypes;
  const LEAVES = [
    { email: "arjun@peoplepay360.test",  type: pto.id,  from: "2026-05-04", to: "2026-05-06", days: 3, state: "APPROVED"   as const, reason: "Family wedding" },
    { email: "ritu@peoplepay360.test",   type: sick.id, from: "2026-04-20", to: "2026-04-21", days: 2, state: "APPROVED"   as const, reason: "Fever" },
    { email: "tanvi@peoplepay360.test",  type: pto.id,  from: "2026-06-15", to: "2026-06-19", days: 5, state: "TO_APPROVE" as const, reason: "Vacation" },
    { email: "imran@peoplepay360.test",  type: pto.id,  from: "2026-05-25", to: "2026-05-26", days: 2, state: "TO_APPROVE" as const, reason: "Personal" },
    { email: "meera@peoplepay360.test",  type: sick.id, from: "2026-05-18", to: "2026-05-18", days: 1, state: "TO_APPROVE" as const, reason: "Medical appointment" },
    { email: "fatima@peoplepay360.test", type: pto.id,  from: "2026-07-01", to: "2026-07-10", days: 10, state: "REFUSED"   as const, reason: "Extended trip" },
  ];

  const approver = await prisma.employee.findUnique({
    where: { work_email: "asha@peoplepay360.test" },
  });

  let leaveCount = 0;
  for (const leave of LEAVES) {
    const employee_id = byEmail.get(leave.email)!;
    const date_from = new Date(leave.from);

    const exists = await prisma.leaveRequest.findFirst({
      where: { employee_id, leave_type_id: leave.type, date_from },
    });
    if (exists) continue;

    await prisma.leaveRequest.create({
      data: {
        employee_id,
        leave_type_id: leave.type,
        date_from,
        date_to: new Date(leave.to),
        number_of_days: leave.days,
        state: leave.state,
        reason: leave.reason,
        approver_id: leave.state === "TO_APPROVE" ? null : approver?.id ?? null,
      },
    });

    // Approved leave has already come out of the allocation, exactly as the
    // approve endpoint would have done it.
    if (leave.state === "APPROVED") {
      const allocation = await prisma.leaveAllocation.findFirst({
        where: { employee_id, leave_type_id: leave.type, state: "APPROVED" },
        orderBy: { id: "asc" },
      });
      if (allocation) {
        await prisma.leaveAllocation.update({
          where: { id: allocation.id },
          data: { number_of_days: { decrement: leave.days } },
        });
      }
    }
    leaveCount++;
  }

  // ---- payruns: two paid months and one left mid-flow for the demo ---------
  const PAYRUNS = [
    { name: "February 2026 Payroll", year: 2026, month: 2, finish: "PAID" as const },
    { name: "March 2026 Payroll", year: 2026, month: 3, finish: "PAID" as const },
    { name: "May 2026 Payroll", year: 2026, month: 5, finish: "COMPUTED" as const },
  ];

  for (const spec of PAYRUNS) {
    if (await prisma.payslipRun.findFirst({ where: { name: spec.name } })) continue;

    const date_start = monthStart(spec.year, spec.month);
    const date_end = monthEnd(spec.year, spec.month);

    const payrun = await prisma.payslipRun.create({
      data: { name: spec.name, structure_id: structure.id, date_start, date_end },
    });

    const contracts = await prisma.contract.findMany({
      where: {
        state: "RUNNING",
        start_date: { lte: date_end },
        OR: [{ end_date: null }, { end_date: { gte: date_start } }],
      },
      include: { employee: { include: { resource_calendar: true } }, resource_calendar: true },
    });

    for (const contract of contracts) {
      const cal = contract.resource_calendar ?? contract.employee.resource_calendar;
      const { lines, gross_amount, net_amount } = computeLines(rules, contract.wage);

      await prisma.payslip.create({
        data: {
          employee_id: contract.employee_id,
          payrun_id: payrun.id,
          contract_id: contract.id,
          structure_id: structure.id,
          date_from: date_start,
          date_to: date_end,
          worked_days: workingDays(date_start, date_end, cal?.days_per_week ?? 5),
          gross_amount,
          net_amount,
          state: spec.finish === "PAID" ? "PAID" : "DRAFT",
          line_ids: { create: lines },
        },
      });
    }

    await prisma.payslipRun.update({
      where: { id: payrun.id },
      data: { state: spec.finish },
    });
  }

  const totals = await Promise.all([
    prisma.employee.count(),
    prisma.contract.count(),
    prisma.attendance.count(),
    prisma.leaveRequest.count(),
    prisma.payslipRun.count(),
    prisma.payslip.count(),
  ]);

  console.log(
    `demo data ready — added ${attendanceCount} attendance rows and ${leaveCount} leave requests\n` +
      `database now holds: ${totals[0]} employees, ${totals[1]} contracts, ${totals[2]} attendances, ` +
      `${totals[3]} leave requests, ${totals[4]} payruns, ${totals[5]} payslips`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
