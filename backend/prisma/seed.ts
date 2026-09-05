import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

// Every seeded account uses this password. Local demo data only — never a real credential.
const DEMO_PASSWORD = "password123";

const EMPLOYEES = [
  { name: "Asha Menon", work_email: "asha@peoplepay360.test", department: "Engineering", job_title: "Engineering Manager", wage: 120000 },
  { name: "Rohit Shah", work_email: "rohit@peoplepay360.test", department: "Engineering", job_title: "Software Engineer", wage: 85000 },
  { name: "Priya Nair", work_email: "priya@peoplepay360.test", department: "Finance", job_title: "Payroll Officer", wage: 70000 },
  { name: "Vikram Rao", work_email: "vikram@peoplepay360.test", department: "Finance", job_title: "Accountant", wage: 65000 },
  { name: "Sana Qureshi", work_email: "sana@peoplepay360.test", department: "People Ops", job_title: "HR Generalist", wage: 60000 },
];

// AGENT.md §5 rule chain: BASIC -> HRA -> GROSS -> PT -> PF -> NET.
// BASIC and HRA are PERCENT, PT is FIXED, GROSS and NET are FORMULA — so the seeded
// structure exercises all three amount_select branches of the engine.
// PERCENT base code WAGE is supplied by the engine from contract.wage; every other
// code resolves to a payslip_lines row written earlier in the same sequence.
const RULES = [
  { code: "BASIC", name: "Basic Salary",           category: "BASIC" as const,     sequence: 10, amount_select: "PERCENT" as const, amount_percent: 50, percent_base_code: "WAGE" },
  { code: "HRA",   name: "House Rent Allowance",   category: "ALLOWANCE" as const, sequence: 20, amount_select: "PERCENT" as const, amount_percent: 40, percent_base_code: "BASIC" },
  { code: "GROSS", name: "Gross Salary",           category: "GROSS" as const,     sequence: 30, amount_select: "FORMULA" as const, formula: "BASIC + HRA" },
  { code: "PT",    name: "Professional Tax",       category: "DEDUCTION" as const, sequence: 40, amount_select: "FIXED" as const,   amount_fixed: 200 },
  { code: "PF",    name: "Provident Fund",         category: "DEDUCTION" as const, sequence: 50, amount_select: "PERCENT" as const, amount_percent: 12, percent_base_code: "BASIC" },
  { code: "NET",   name: "Net Salary",             category: "NET" as const,       sequence: 60, amount_select: "FORMULA" as const, formula: "GROSS - PT - PF" },
];

async function main() {
  const password_hash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const calendar = await prisma.resourceCalendar.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, name: "Standard 40h / 5 days", hours_per_week: 40, days_per_week: 5, timezone: "Asia/Kolkata" },
  });

  const structure = await prisma.payrollStructure.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, name: "Standard Monthly Structure" },
  });

  for (const rule of RULES) {
    await prisma.salaryRule.upsert({
      where: { structure_id_code: { structure_id: structure.id, code: rule.code } },
      update: rule,
      create: { ...rule, structure_id: structure.id },
    });
  }

  // Employees, each with a RUNNING contract. Contracts are seeded (beyond the literal
  // seed list in AGENT.md §5) because both demo flows need them: the 409 overlap needs
  // an existing RUNNING contract to collide with, and payrun compute needs eligible
  // employees on day one.
  const employees = [];
  for (const [i, e] of EMPLOYEES.entries()) {
    const employee = await prisma.employee.upsert({
      where: { work_email: e.work_email },
      update: {},
      create: {
        name: e.name,
        work_email: e.work_email,
        department: e.department,
        job_title: e.job_title,
        resource_calendar_id: calendar.id,
      },
    });
    employees.push(employee);

    const reference = `CON-2026-${String(i + 1).padStart(4, "0")}`;
    await prisma.contract.upsert({
      where: { reference },
      update: {},
      create: {
        employee_id: employee.id,
        reference,
        wage: e.wage,
        start_date: new Date("2026-01-01"),
        end_date: null,
        resource_calendar_id: calendar.id,
        structure_id: structure.id,
        state: "RUNNING",
      },
    });
  }

  // Asha manages the two Engineering reports.
  await prisma.employee.updateMany({
    where: { work_email: { in: [EMPLOYEES[1].work_email] } },
    data: { manager_id: employees[0].id },
  });

  // One login per role, so every RBAC path is demoable. Roles map onto real employees
  // where it makes sense; ADMIN is a standalone operator account.
  const USERS: { name: string; login: string; role: Role; employee_id: number | null }[] = [
    { name: employees[0].name, login: employees[0].work_email, role: Role.HR_MANAGER,         employee_id: employees[0].id },
    { name: employees[1].name, login: employees[1].work_email, role: Role.EMPLOYEE,           employee_id: employees[1].id },
    { name: employees[2].name, login: employees[2].work_email, role: Role.HR_PAYROLL_MANAGER, employee_id: employees[2].id },
    { name: employees[3].name, login: employees[3].work_email, role: Role.HR_PAYROLL_USER,    employee_id: employees[3].id },
    { name: "System Admin",    login: "admin@peoplepay360.test", role: Role.ADMIN,            employee_id: null },
  ];

  for (const u of USERS) {
    await prisma.user.upsert({
      where: { login: u.login },
      update: { role: u.role, employee_id: u.employee_id },
      create: { ...u, password_hash },
    });
  }

  const leaveTypes = [
    { id: 1, name: "Paid Time Off", days: 18 },
    { id: 2, name: "Sick Leave", days: 8 },
  ];

  for (const lt of leaveTypes) {
    await prisma.leaveType.upsert({
      where: { id: lt.id },
      update: {},
      create: { id: lt.id, name: lt.name, request_unit: "DAYS", requires_allocation: true },
    });

    for (const employee of employees) {
      const existing = await prisma.leaveAllocation.findFirst({
        where: { employee_id: employee.id, leave_type_id: lt.id },
      });
      if (existing) continue;

      await prisma.leaveAllocation.create({
        data: {
          employee_id: employee.id,
          leave_type_id: lt.id,
          number_of_days: lt.days,
          validity_start: new Date("2026-01-01"),
          validity_end: new Date("2026-12-31"),
          state: "APPROVED",
        },
      });
    }
  }

  // Rows above are inserted with explicit ids so re-running the seed is idempotent,
  // but that leaves each SERIAL sequence at 1 and the next app-created row collides on
  // the primary key. Advance every sequence past the ids we just wrote.
  for (const table of ["resource_calendars", "payroll_structures", "leave_types", "salary_rules"]) {
    await prisma.$executeRawUnsafe(
      `SELECT setval(pg_get_serial_sequence('${table}', 'id'),
         GREATEST((SELECT COALESCE(MAX(id), 1) FROM ${table}), 1))`
    );
  }

  console.log(
    `seeded: ${employees.length} employees + contracts, ${RULES.length} salary rules, ` +
      `${USERS.length} users, ${leaveTypes.length} leave types with allocations`
  );
  console.log(`login with any address above, password: ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
