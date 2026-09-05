import bcrypt from 'bcryptjs';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { refreshTokenStore } from '../src/modules/auth/auth.service';

export { prisma };
export const app = createApp();
export const api = () => request(app);

export type Role = 'EMPLOYEE' | 'HR_MANAGER' | 'HR_PAYROLL_USER' | 'HR_PAYROLL_MANAGER' | 'ADMIN';

export const TEST_PASSWORD = 'test1234';

/** True when the configured test database accepts connections. */
export async function isDatabaseReady(): Promise<boolean> {
  try {
    await prisma.$queryRawUnsafe('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

/** Empties every table so each test starts from a known state. */
export async function resetDatabase(): Promise<void> {
  const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  `;
  const names = tables
    .map((row) => row.tablename)
    .filter((name) => name !== '_prisma_migrations')
    .map((name) => `"public"."${name}"`);

  if (names.length > 0) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${names.join(', ')} RESTART IDENTITY CASCADE`);
  }
  refreshTokenStore.clear();
}

export async function createUser(email: string, role: Role, password = TEST_PASSWORD) {
  return prisma.user.create({
    data: {
      email,
      password_hash: await bcrypt.hash(password, 10),
      first_name: role,
      last_name: 'Tester',
      role,
    },
  });
}

/** Logs in over the real endpoint so the token is produced the same way it is in production. */
export async function loginAs(email: string, password = TEST_PASSWORD) {
  const res = await api().post('/api/auth/login').send({ email, password });
  if (res.status !== 200) {
    throw new Error(`login failed for ${email}: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body.data as {
    accessToken: string;
    refreshToken: string;
    user: { id: string; email: string; role: Role };
  };
}

export function bearer(token: string) {
  return { Authorization: `Bearer ${token}` };
}

/** Creates a user plus a linked employee record. */
export async function createEmployee(options: {
  email: string;
  role?: Role;
  departmentId: string;
  scheduleId: string;
  firstName?: string;
  lastName?: string;
}) {
  const user = await createUser(options.email, options.role ?? 'EMPLOYEE');
  const employee = await prisma.employee.create({
    data: {
      user_id: user.id,
      first_name: options.firstName ?? 'Test',
      last_name: options.lastName ?? 'Employee',
      email: options.email,
      department_id: options.departmentId,
      job_position: 'Tester',
      working_schedule_id: options.scheduleId,
      status: 'ACTIVE',
    },
  });
  return { user, employee };
}

export async function createDepartment(name = 'Engineering') {
  return prisma.department.create({ data: { name } });
}

export async function createSchedule(name = 'Full Time 38h') {
  return prisma.workingSchedule.create({
    data: { name, schedule_type: 'FULL_TIME', weekly_hours: 38 },
  });
}

/** The same five rules `prisma/seed.ts` creates: 5000 / 5500 / 275 / 5225. */
export async function createSeedSalaryStructure(code = 'STD-001') {
  return prisma.salaryStructure.create({
    data: {
      name: 'Standard Salary Structure',
      code,
      is_active: true,
      rules: {
        create: [
          { name: 'Basic Salary', code: 'BASIC', category: 'BASIC', sequence: 1, computation_type: 'FIXED', amount_fixed: 5000 },
          { name: 'Housing Allowance', code: 'ALW-HOUSING', category: 'ALLOWANCE', sequence: 2, computation_type: 'PERCENTAGE', percentage_rate: 10 },
          { name: 'Gross Salary', code: 'GROSS', category: 'GROSS', sequence: 3, computation_type: 'FORMULA', formula_string: 'BASIC + ALW-HOUSING' },
          { name: 'Income Tax', code: 'TAX-INCOME', category: 'DEDUCTION', sequence: 4, computation_type: 'PERCENTAGE', percentage_rate: 5 },
          { name: 'Net Salary', code: 'NET', category: 'NET', sequence: 5, computation_type: 'FORMULA', formula_string: 'GROSS - TAX-INCOME' },
        ],
      },
    },
    include: { rules: true },
  });
}

export async function createContract(options: {
  employeeId: string;
  salaryStructureId: string;
  scheduleId: string;
  startDate?: string;
  endDate?: string | null;
  wage?: number;
  status?: 'DRAFT' | 'RUNNING' | 'EXPIRED' | 'CANCELLED';
}) {
  return prisma.contract.create({
    data: {
      employee_id: options.employeeId,
      name: 'Permanent contract',
      start_date: new Date(options.startDate ?? '2024-01-01'),
      end_date: options.endDate ? new Date(options.endDate) : null,
      wage: options.wage ?? 5000,
      salary_structure_id: options.salaryStructureId,
      working_schedule_id: options.scheduleId,
      status: options.status ?? 'RUNNING',
    },
  });
}

/**
 * Department + schedule + salary structure + an ADMIN and an EMPLOYEE user,
 * which is what most integration tests need before they start.
 */
export async function seedBaseWorld() {
  const department = await createDepartment();
  const schedule = await createSchedule();
  const structure = await createSeedSalaryStructure();
  const admin = await createUser('admin@peoplepay360.com', 'ADMIN');
  const staff = await createEmployee({
    email: 'employee@peoplepay360.com',
    departmentId: department.id,
    scheduleId: schedule.id,
  });

  return { department, schedule, structure, admin, staff };
}
