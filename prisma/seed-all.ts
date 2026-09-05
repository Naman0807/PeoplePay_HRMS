import {
  PrismaClient,
  UserRole,
  EmployeeStatus,
  ContractStatus,
  DayOfWeek,
  TimeOffUnit,
  AllocationStatus,
  TimeOffRequestStatus,
  ComputationType,
  SalaryRuleCategory,
  AttendanceStatus,
  PayrunStatus,
  PayslipStatus,
  PayrunEmployeeStatus,
} from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

const SALT_ROUNDS = 10;
const PASSWORD = 'Welcome123!';

// ─── Helpers ──────────────────────────────────────────────────────────────

function time(hour: number, minute: number = 0): Date {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d;
}

function date(y: number, m: number, d: number): Date {
  return new Date(y, m - 1, d);
}

function startOfToday(): Date {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}

async function findOrCreateDepartment(name: string) {
  let dept = await prisma.department.findFirst({ where: { name } });
  if (!dept) dept = await prisma.department.create({ data: { name } });
  return dept;
}

async function findOrCreateWorkingSchedule() {
  const NAME = 'Full-Time (Mon-Fri, 9AM-5PM)';
  let schedule = await prisma.workingSchedule.findFirst({ where: { name: NAME } });
  if (!schedule) {
    schedule = await prisma.workingSchedule.create({
      data: {
        name: NAME,
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
    });
  }
  return schedule;
}

async function findOrCreateTimeOffType(input: { name: string; unit: TimeOffUnit; requires_allocation: boolean; payroll_integration: boolean }) {
  let t = await prisma.timeOffType.findFirst({ where: { name: input.name } });
  if (!t) t = await prisma.timeOffType.create({ data: input });
  return t;
}

async function findOrCreateSalaryStructure() {
  const CODE = 'STD-001';
  let structure = await prisma.salaryStructure.findFirst({ where: { code: CODE } });
  if (!structure) {
    structure = await prisma.salaryStructure.create({ data: { name: 'Standard Salary Structure', code: CODE, is_active: true } });
  }
  const rules = [
    { name: 'Basic Salary',    code: 'BASIC',       category: SalaryRuleCategory.BASIC,      sequence: 1, computation_type: ComputationType.FIXED,       amount_fixed: 5000.0, percentage_rate: null, formula_string: null },
    { name: 'Housing Allowance', code: 'ALW-HOUSING', category: SalaryRuleCategory.ALLOWANCE, sequence: 2, computation_type: ComputationType.PERCENTAGE, amount_fixed: null, percentage_rate: 10.0, formula_string: null },
    { name: 'Gross Salary',    code: 'GROSS',       category: SalaryRuleCategory.GROSS,      sequence: 3, computation_type: ComputationType.FORMULA,     amount_fixed: null, percentage_rate: null, formula_string: 'BASIC + ALW-HOUSING' },
    { name: 'Income Tax',      code: 'TAX-INCOME',  category: SalaryRuleCategory.DEDUCTION,  sequence: 4, computation_type: ComputationType.PERCENTAGE, amount_fixed: null, percentage_rate: 5.0,  formula_string: null },
    { name: 'Net Salary',      code: 'NET',         category: SalaryRuleCategory.NET,        sequence: 5, computation_type: ComputationType.FORMULA,     amount_fixed: null, percentage_rate: null, formula_string: 'GROSS - TAX-INCOME' },
  ];
  const createdRules: { code: string; id: string }[] = [];
  for (const r of rules) {
    const existing = await prisma.salaryRule.findFirst({ where: { salary_structure_id: structure.id, code: r.code } });
    const rule = existing ?? (await prisma.salaryRule.create({
      data: { salary_structure_id: structure.id, name: r.name, code: r.code, category: r.category, sequence: r.sequence, computation_type: r.computation_type, amount_fixed: r.amount_fixed, percentage_rate: r.percentage_rate, formula_string: r.formula_string, is_active: true },
    }));
    createdRules.push({ code: rule.code, id: rule.id });
  }
  return { structure, rules: createdRules };
}

interface EnsureEmployeeArgs {
  user: { id: string; email: string };
  first_name: string;
  last_name: string;
  department_id: string;
  job_position: string;
  working_schedule_id: string;
  existingEmail?: string;
  bank_account_no?: string;
  bank_name?: string;
}

async function ensureEmployee(args: EnsureEmployeeArgs) {
  // For employee1 (Nirbhay): if an employee already exists with the legacy email,
  // re-link that employee to the new user rather than creating a duplicate.
  if (args.existingEmail) {
    const legacy = await prisma.employee.findFirst({ where: { email: args.existingEmail } });
    if (legacy) {
      const updated = await prisma.employee.update({
        where: { id: legacy.id },
        data: { user_id: args.user.id },
      });
      return updated;
    }
  }
  // Otherwise find by user_id (idempotent)
  const existing = await prisma.employee.findUnique({ where: { user_id: args.user.id } });
  if (existing) return existing;
  return prisma.employee.create({
    data: {
      user_id: args.user.id,
      first_name: args.first_name,
      last_name: args.last_name,
      email: args.email ?? args.user.email,
      department_id: args.department_id,
      job_position: args.job_position,
      working_schedule_id: args.working_schedule_id,
      status: EmployeeStatus.ACTIVE,
      bank_account_no: args.bank_account_no,
      bank_name: args.bank_name,
    },
  });
}

async function ensureContract(employee_id: string, wage: number, salary_structure_id: string, working_schedule_id: string) {
  const existing = await prisma.contract.findFirst({ where: { employee_id, name: 'Full-Time Employment Contract', status: ContractStatus.RUNNING } });
  if (existing) return existing;
  return prisma.contract.create({
    data: {
      employee_id,
      name: 'Full-Time Employment Contract',
      start_date: date(2025, 1, 1),
      end_date: null,
      wage,
      salary_structure_id,
      working_schedule_id,
      status: ContractStatus.RUNNING,
    },
  });
}

async function ensureAllocation(employee_id: string, time_off_type_id: string, year: number) {
  const valid_from = new Date(year, 0, 1);
  const valid_to = new Date(year, 11, 31);
  const existing = await prisma.timeOffAllocation.findFirst({
    where: { employee_id, time_off_type_id, valid_from, valid_to, status: AllocationStatus.APPROVED },
  });
  if (existing) return existing;
  return prisma.timeOffAllocation.create({
    data: {
      employee_id,
      time_off_type_id,
      allocated_units: 20,
      taken_units: 0,
      valid_from,
      valid_to,
      status: AllocationStatus.APPROVED,
    },
  });
}

async function ensureTimeOffRequest(
  employee_id: string,
  time_off_type_id: string,
  start: Date,
  end: Date,
  duration: number,
  status: TimeOffRequestStatus
) {
  const existing = await prisma.timeOffRequest.findFirst({
    where: { employee_id, time_off_type_id, start_date: start, end_date: end, status },
  });
  if (existing) return existing;
  return prisma.timeOffRequest.create({
    data: {
      employee_id,
      time_off_type_id,
      start_date: start,
      end_date: end,
      duration,
      status,
    },
  });
}

// ─── Main Seed ────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱  Seeding PeoplePay360 — ALL roles...\n');

  // ─── 1. Users (all roles) ────────────────────────────────────────────────
  const pw = await hash(PASSWORD, SALT_ROUNDS);
  const adminPw = await hash('admin123', SALT_ROUNDS);

  const users: Record<string, { id: string; email: string }> = {};

  const userDefs: { key: string; email: string; role: UserRole; first: string; last: string; pass: string }[] = [
    { key: 'ADMIN', email: 'admin@peoplepay360.com', role: UserRole.ADMIN, first: 'System', last: 'Administrator', pass: 'admin123' },
    { key: 'HR_MANAGER', email: 'hr.manager@peoplepay360.com', role: UserRole.HR_MANAGER, first: 'Anita', last: 'Desai', pass: PASSWORD },
    { key: 'HR_PAYROLL_USER', email: 'hr.payroll@peoplepay360.com', role: UserRole.HR_PAYROLL_USER, first: 'Vikram', last: 'Singh', pass: PASSWORD },
    { key: 'HR_PAYROLL_MANAGER', email: 'hr.payroll.manager@peoplepay360.com', role: UserRole.HR_PAYROLL_MANAGER, first: 'Meera', last: 'Patel', pass: PASSWORD },
    { key: 'EMP1', email: 'employee1@peoplepay360.com', role: UserRole.EMPLOYEE, first: 'Nirbhay', last: 'Parmar', pass: PASSWORD },
    { key: 'EMP2', email: 'employee2@peoplepay360.com', role: UserRole.EMPLOYEE, first: 'Priya', last: 'Sharma', pass: PASSWORD },
    { key: 'EMP3', email: 'employee3@peoplepay360.com', role: UserRole.EMPLOYEE, first: 'Rahul', last: 'Verma', pass: PASSWORD },
  ];

  for (const def of userDefs) {
    const u = await prisma.user.upsert({
      where: { email: def.email },
      update: { first_name: def.first, last_name: def.last, is_active: true },
      create: {
        email: def.email,
        password_hash: def.pass === 'admin123' ? adminPw : pw,
        role: def.role,
        first_name: def.first,
        last_name: def.last,
        is_active: true,
      },
    });
    users[def.key] = { id: u.id, email: u.email };
    console.log(`✅  User [${def.key}]: ${u.email} (${u.role})`);
  }

  // ─── 2. Departments ──────────────────────────────────────────────────────
  const deptNames = ['Engineering', 'Human Resources', 'Finance', 'Marketing'];
  const depts: Record<string, { id: string }> = {};
  for (const n of deptNames) {
    const d = await findOrCreateDepartment(n);
    depts[n] = d;
    console.log(`✅  Department: ${n}`);
  }

  // ─── 3. Working schedule ─────────────────────────────────────────────────
  const schedule = await findOrCreateWorkingSchedule();
  console.log(`✅  Working schedule: ${schedule.name}`);

  // ─── 4. Time off types ───────────────────────────────────────────────────
  const timeOffDefs = [
    { name: 'Annual Leave',   unit: TimeOffUnit.DAYS, requires_allocation: true,  payroll_integration: true },
    { name: 'Sick Leave',     unit: TimeOffUnit.DAYS, requires_allocation: false, payroll_integration: true },
    { name: 'Personal Leave', unit: TimeOffUnit.DAYS, requires_allocation: false, payroll_integration: false },
  ];
  const timeOffTypes: Record<string, string> = {};
  for (const t of timeOffDefs) {
    const rec = await findOrCreateTimeOffType(t);
    timeOffTypes[t.name] = rec.id;
    console.log(`✅  Time off type: ${t.name}`);
  }

  // ─── 5. Salary structure ─────────────────────────────────────────────────
  const { structure, rules: salaryRules } = await findOrCreateSalaryStructure();
  console.log(`✅  Salary structure: ${structure.name} — ${salaryRules.length} rules`);

  // ─── 6. Employees (one per non-admin user) ───────────────────────────────
  const empDefs = [
    { key: 'HR_MANAGER', first: 'Anita', last: 'Desai', dept: 'Human Resources', job: 'HR Manager', wage: 8000, bank: '000223344556', bankName: 'Global Trust Bank' },
    { key: 'HR_PAYROLL_USER', first: 'Vikram', last: 'Singh', dept: 'Finance', job: 'Payroll Specialist', wage: 8000, bank: '000334455667', bankName: 'Global Trust Bank' },
    { key: 'HR_PAYROLL_MANAGER', first: 'Meera', last: 'Patel', dept: 'Finance', job: 'Payroll Manager', wage: 8000, bank: '000445566778', bankName: 'Global Trust Bank' },
    { key: 'EMP1', first: 'Nirbhay', last: 'Parmar', dept: 'Engineering', job: 'SDE', wage: 5000, bank: '000556677889', bankName: 'Global Trust Bank', legacyEmail: 'niravnirbhay94@gmail.com' },
    { key: 'EMP2', first: 'Priya', last: 'Sharma', dept: 'Marketing', job: 'Marketing Executive', wage: 5000, bank: '000667788990', bankName: 'Global Trust Bank' },
    { key: 'EMP3', first: 'Rahul', last: 'Verma', dept: 'Engineering', job: 'QA Engineer', wage: 5000, bank: '000778899001', bankName: 'Global Trust Bank' },
    { key: 'ADMIN', first: 'System', last: 'Administrator', dept: 'Engineering', job: 'Platform Administrator', wage: 5000, bank: '000123456789', bankName: 'Global Trust Bank' },
  ];

  const employees: Record<string, { id: string; email: string; wage: number }> = {};
  for (const def of empDefs) {
    const emp = await ensureEmployee({
      user: { id: users[def.key].id, email: users[def.key].email },
      first_name: def.first,
      last_name: def.last,
      department_id: depts[def.dept].id,
      job_position: def.job,
      working_schedule_id: schedule.id,
      existingEmail: def.legacyEmail,
      bank_account_no: def.bank,
      bank_name: def.bankName,
    });
    employees[def.key] = { id: emp.id, email: emp.email, wage: def.wage };
    console.log(`✅  Employee [${def.key}]: ${emp.first_name} ${emp.last_name}`);
  }

  // ─── 7. Contracts ────────────────────────────────────────────────────────
  for (const def of empDefs) {
    const c = await ensureContract(employees[def.key].id, def.wage, structure.id, schedule.id);
    console.log(`✅  Contract: ${employees[def.key].email} → ${c.name} (${c.status})`);
  }

  // ─── 8. Time off allocations (20 days Annual Leave, 2026) ───────────────
  for (const def of empDefs) {
    await ensureAllocation(employees[def.key].id, timeOffTypes['Annual Leave'], 2026);
    console.log(`✅  Allocation: ${employees[def.key].email} → 20 days Annual Leave`);
  }

  // ─── 9. Sample time off requests ─────────────────────────────
  const sickLeave = timeOffTypes['Sick Leave'];
  const priya = employees['EMP2'];
  await ensureTimeOffRequest(
    priya.id,
    sickLeave,
    date(2026, 9, 14),
    date(2026, 9, 15),
    2,
    TimeOffRequestStatus.SUBMITTED
  );
  console.log(`✅  Time off request: ${priya.email} → Sick Leave (SUBMITTED)`);

  // ─── 10. Sample attendance for employee1 (today) ─────────────────────────
  const today = startOfToday();
  const attendanceDefs = [
    { check_in: time(9, 0), check_out: time(17, 0), worked_hours: 7.0 },
  ];
  for (const a of attendanceDefs) {
    const existing = await prisma.attendance.findUnique({
      where: { employee_id_date: { employee_id: employees['EMP1'].id, date: today } },
    });
    if (!existing) {
      await prisma.attendance.create({
        data: {
          employee_id: employees['EMP1'].id,
          date: today,
          check_in: a.check_in,
          check_out: a.check_out,
          worked_hours: a.worked_hours,
          status: AttendanceStatus.NORMAL,
        },
      });
    }
    console.log(`✅  Attendance: ${employees['EMP1'].email} → ${today.toISOString().slice(0, 10)}`);
  }

  // ─── 11. Sample payrun (last month) + payslips for all employees ────────
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  const payrunName = `Payrun ${periodStart.getFullYear()}-${String(periodStart.getMonth() + 1).padStart(2, '0')}`;

  let payrun = await prisma.payrun.findFirst({ where: { name: payrunName, period_start: periodStart } });
  if (!payrun) {
    payrun = await prisma.payrun.create({
      data: {
        name: payrunName,
        salary_structure_id: structure.id,
        period_start: periodStart,
        period_end: periodEnd,
        status: PayrunStatus.COMPUTED,
        created_by: users['HR_PAYROLL_MANAGER'].id,
      },
    });
    console.log(`✅  Payrun created: ${payrun.name} (${payrun.status})`);
  } else {
    console.log(`✅  Payrun exists: ${payrun.name} (${payrun.status})`);
  }

  for (const def of empDefs) {
    const empId = employees[def.key].id;
    const contract = await prisma.contract.findFirst({
      where: { employee_id: empId, status: ContractStatus.RUNNING },
    });
    if (!contract) continue;

    const base = def.wage;
    const housing = Math.round(base * 0.10 * 100) / 100;
    const gross = base + housing;
    const tax = Math.round(gross * 0.05 * 100) / 100;
    const net = gross - tax;

    // PayrunEmployee join
    await prisma.payrunEmployee.upsert({
      where: { payrun_id_employee_id: { payrun_id: payrun.id, employee_id: empId } },
      update: {},
      create: {
        payrun_id: payrun.id,
        employee_id: empId,
        base_salary: base,
        gross_salary: gross,
        total_deductions: tax,
        net_salary: net,
        status: PayrunEmployeeStatus.COMPUTED,
      },
    });

    // Payslip
    let payslip = await prisma.payslip.findFirst({ where: { payrun_id: payrun.id, employee_id: empId } });
    if (!payslip) {
      payslip = await prisma.payslip.create({
        data: {
          payrun_id: payrun.id,
          employee_id: empId,
          contract_id: contract.id,
          basic_amount: base,
          gross_amount: gross,
          deduction_amount: tax,
          net_amount: net,
          worked_days: 21,
          status: PayslipStatus.COMPUTED,
        },
      });

      const ruleById = new Map(salaryRules.map((r) => [r.code, r.id]));
      const lineDefs = [
        { code: 'BASIC', category: SalaryRuleCategory.BASIC, rate: base, amount: base },
        { code: 'ALW-HOUSING', category: SalaryRuleCategory.ALLOWANCE, rate: 10.0, amount: housing },
        { code: 'GROSS', category: SalaryRuleCategory.GROSS, rate: gross, amount: gross },
        { code: 'TAX-INCOME', category: SalaryRuleCategory.DEDUCTION, rate: 5.0, amount: tax },
        { code: 'NET', category: SalaryRuleCategory.NET, rate: net, amount: net },
      ];
      for (const l of lineDefs) {
        const ruleId = ruleById.get(l.code);
        if (!ruleId) continue;
        await prisma.payslipLine.create({
          data: { payslip_id: payslip.id, salary_rule_id: ruleId, code: l.code, category: l.category, rate: l.rate, amount: l.amount },
        });
      }
    }
    console.log(`✅  Payslip: ${employees[def.key].email} → net $${net}`);
  }

  // ─── Output ──────────────────────────────────────────────────────────────
  console.log('\n🎉  Seed completed successfully!\n');
  console.log('───────────────────────────────────────────────');
  console.log('  LOGIN CREDENTIALS (password: Welcome123! unless noted)');
  console.log(`  ADMIN:              admin@peoplepay360.com / admin123`);
  console.log(`  HR MANAGER:         hr.manager@peoplepay360.com / ${PASSWORD}`);
  console.log(`  HR PAYROLL USER:    hr.payroll@peoplepay360.com / ${PASSWORD}`);
  console.log(`  HR PAYROLL MANAGER: hr.payroll.manager@peoplepay360.com / ${PASSWORD}`);
  console.log(`  EMPLOYEE 1:         employee1@peoplepay360.com / ${PASSWORD}  (Nirbhay Parmar)`);
  console.log(`  EMPLOYEE 2:         employee2@peoplepay360.com / ${PASSWORD}  (Priya Sharma)`);
  console.log(`  EMPLOYEE 3:         employee3@peoplepay360.com / ${PASSWORD}  (Rahul Verma)`);
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
