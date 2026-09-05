import { PrismaClient, UserRole, EmployeeStatus, ContractStatus, DayOfWeek, TimeOffUnit, ComputationType, SalaryRuleCategory, ScheduleLine, WorkingSchedule, Employee } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

const SALT_ROUNDS = 10;

// ─── Helpers ──────────────────────────────────────────────────────────────

function time(hour: number, minute: number = 0): Date {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d;
}

function date(y: number, m: number, d: number): Date {
  return new Date(y, m - 1, d);
}

// ─── Main Seed ────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱  Seeding PeoplePay360 database...\n');

  // ─── 1. Admin User ──────────────────────────────────────────────────────
  const adminPasswordHash = await hash('admin123', SALT_ROUNDS);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@peoplepay360.com' },
    update: {},
    create: {
      email: 'admin@peoplepay360.com',
      password_hash: adminPasswordHash,
      role: UserRole.ADMIN,
    },
  });
  console.log(`✅  Admin user created: ${admin.email} (${admin.id})`);

  // ─── 2. Sample Departments ──────────────────────────────────────────────
  const departmentNames = ['Engineering', 'Human Resources', 'Finance', 'Marketing'];

  const departments: Record<string, { id: string }> = {};
  for (const name of departmentNames) {
    // Find-or-create: avoid duplicates on re-seeding
    let dept = await prisma.department.findFirst({ where: { name } });
    if (!dept) {
      dept = await prisma.department.create({ data: { name } });
    }
    departments[name] = dept;
    console.log(`✅  Department: ${name} (${dept.id})`);
  }

  // ─── 3. Working Schedule — Full-Time Mon–Fri 9 AM – 5 PM, 1 h break ───
  //    8h work - 1h break = 7h/day × 5 days = 35h/week
  const fullTimeSchedule = await prisma.workingSchedule.create({
    data: {
      name: 'Full-Time (Mon-Fri, 9AM-5PM)',
      schedule_type: 'FULL_TIME',
      weekly_hours: 35.0,
      schedule_lines: {
        create: [
          { day_of_week: DayOfWeek.MONDAY,    start_time: time(9), end_time: time(17), break_duration_mins: 60 },
          { day_of_week: DayOfWeek.TUESDAY,   start_time: time(9), end_time: time(17), break_duration_mins: 60 },
          { day_of_week: DayOfWeek.WEDNESDAY, start_time: time(9), end_time: time(17), break_duration_mins: 60 },
          { day_of_week: DayOfWeek.THURSDAY,  start_time: time(9), end_time: time(17), break_duration_mins: 60 },
          { day_of_week: DayOfWeek.FRIDAY,    start_time: time(9), end_time: time(17), break_duration_mins: 60 },
        ],
      },
    },
    include: { schedule_lines: true },
  });
  console.log(`✅  Working schedule: ${fullTimeSchedule.name} — ${fullTimeSchedule.schedule_lines.length} lines, ${fullTimeSchedule.weekly_hours}h/week`);

  // ─── 4. Time Off Types ──────────────────────────────────────────────────
  const timeOffTypesData = [
    { name: 'Annual Leave',   unit: TimeOffUnit.DAYS, requires_allocation: true,  payroll_integration: true  },
    { name: 'Sick Leave',     unit: TimeOffUnit.DAYS, requires_allocation: false, payroll_integration: true  },
    { name: 'Personal Leave', unit: TimeOffUnit.DAYS, requires_allocation: false, payroll_integration: false },
  ];

  const timeOffTypes: Record<string, string> = {};
  for (const t of timeOffTypesData) {
    const record = await prisma.timeOffType.create({ data: t });
    timeOffTypes[t.name] = record.id;
    console.log(`✅  Time off type: ${t.name} (${record.id})`);
  }

  // ─── 5. Salary Structure with Rules ─────────────────────────────────────
  const salaryStructure = await prisma.salaryStructure.create({
    data: {
      name: 'Standard Salary Structure',
      code: 'STD-001',
      is_active: true,
      rules: {
        create: [
          {
            name: 'Basic Salary',
            code: 'BASIC',
            category: SalaryRuleCategory.BASIC,
            sequence: 1,
            computation_type: ComputationType.FIXED,
            amount_fixed: 5000.0,
            is_active: true,
          },
          {
            name: 'Housing Allowance',
            code: 'ALW-HOUSING',
            category: SalaryRuleCategory.ALLOWANCE,
            sequence: 2,
            computation_type: ComputationType.PERCENTAGE,
            percentage_rate: 10.0, // 10 % of BASIC
            is_active: true,
          },
          {
            name: 'Gross Salary',
            code: 'GROSS',
            category: SalaryRuleCategory.GROSS,
            sequence: 3,
            computation_type: ComputationType.FORMULA,
            formula_string: 'BASIC + ALW-HOUSING',
            is_active: true,
          },
          {
            name: 'Income Tax',
            code: 'TAX-INCOME',
            category: SalaryRuleCategory.DEDUCTION,
            sequence: 4,
            computation_type: ComputationType.PERCENTAGE,
            percentage_rate: 5.0, // 5 % of GROSS
            is_active: true,
          },
          {
            name: 'Net Salary',
            code: 'NET',
            category: SalaryRuleCategory.NET,
            sequence: 5,
            computation_type: ComputationType.FORMULA,
            formula_string: 'GROSS - TAX-INCOME',
            is_active: true,
          },
        ],
      },
    },
    include: { rules: true },
  });
  console.log(`✅  Salary structure: ${salaryStructure.name} (${salaryStructure.code}) — ${salaryStructure.rules.length} rules`);

  // ─── 6. Sample Employee (linked to admin) ───────────────────────────────
  const employee = await prisma.employee.create({
    data: {
      user_id: admin.id,
      first_name: 'System',
      last_name: 'Administrator',
      email: admin.email,
      department_id: departments['Engineering'].id,
      job_position: 'Platform Administrator',
      working_schedule_id: fullTimeSchedule.id,
      status: EmployeeStatus.ACTIVE,
      bank_account_no: '000123456789',
      bank_name: 'Global Trust Bank',
    },
  });
  console.log(`✅  Sample employee: ${employee.first_name} ${employee.last_name} (${employee.id})`);

  // ─── 7. Sample Contract (RUNNING) ──────────────────────────────────────
  const contract = await prisma.contract.create({
    data: {
      employee_id: employee.id,
      name: 'Full-Time Employment Contract',
      start_date: date(2025, 1, 1),
      end_date: null, // open-ended
      wage: 5000.0,
      salary_structure_id: salaryStructure.id,
      working_schedule_id: fullTimeSchedule.id,
      status: ContractStatus.RUNNING,
    },
  });
  console.log(`✅  Contract: ${contract.name} (${contract.status})`);

  // ─── 8. Sample Time Off Allocation ──────────────────────────────────────
  await prisma.timeOffAllocation.create({
    data: {
      employee_id: employee.id,
      time_off_type_id: timeOffTypes['Annual Leave'],
      allocated_units: 20,
      taken_units: 0,
      valid_from: date(2026, 1, 1),
      valid_to: date(2026, 12, 31),
      status: 'APPROVED',
    },
  });
  console.log('✅  Time off allocation: 20 days Annual Leave for sample employee');

  console.log('\n🎉  Seed completed successfully!\n');
  console.log('───────────────────────────────────────────────');
  console.log('  Login credentials:');
  console.log('  Email:    admin@peoplepay360.com');
  console.log('  Password: admin123');
  console.log('───────────────────────────────────────────────');
}

main()
  .catch((e) => {
    console.error('❌  Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
