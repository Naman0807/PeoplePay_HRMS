import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../utils/ApiError';
import type { UserRole } from '@peoplepay360/shared';
import type {
  CreateEmployeeInput,
  UpdateEmployeeInput,
  ListEmployeesQuery,
  DirectoryQuery,
} from './employee.validation';

const employeeInclude = {
  department: true,
  working_schedule: true,
  manager: { select: { id: true, first_name: true, last_name: true } },
} satisfies Prisma.EmployeeInclude;

export async function listEmployees(
  query: ListEmployeesQuery,
  userId: string,
  userRole: UserRole
) {
  const { page, pageSize, departmentId, status, search } = query;

  const where: Prisma.EmployeeWhereInput = {};

  if (userRole === 'EMPLOYEE') {
    where.user_id = userId;
  } else {
    if (departmentId) where.department_id = departmentId;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { first_name: { contains: search, mode: 'insensitive' } },
        { last_name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
  }

  const [items, total] = await Promise.all([
    prisma.employee.findMany({
      where,
      include: employeeInclude,
      orderBy: [{ created_at: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.employee.count({ where }),
  ]);

  return {
    items,
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

export async function listDirectory(query: DirectoryQuery) {
  const { search, departmentId } = query;

  const where: Prisma.EmployeeWhereInput = { status: 'ACTIVE' };

  if (departmentId) where.department_id = departmentId;

  if (search) {
    where.OR = [
      { first_name: { contains: search, mode: 'insensitive' } },
      { last_name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  return prisma.employee.findMany({
    where,
    select: {
      id: true,
      first_name: true,
      last_name: true,
      email: true,
      job_position: true,
      department: { select: { id: true, name: true } },
      status: true,
    },
    orderBy: [{ first_name: 'asc' }, { last_name: 'asc' }],
  });
}

export async function getEmployee(id: string, userId: string, userRole: UserRole) {
  const employee = await prisma.employee.findUnique({
    where: { id },
    include: {
      department: true,
      working_schedule: true,
      manager: { select: { id: true, first_name: true, last_name: true } },
      contracts: { include: { salary_structure: true } },
      time_off_allocations: { include: { time_off_type: true } },
      time_off_requests: { include: { time_off_type: true } },
      attendances: { orderBy: { date: 'desc' }, take: 30 },
    },
  });

  if (!employee) {
    throw ApiError.notFound('Employee not found');
  }

  if (userRole === 'EMPLOYEE' && employee.user_id !== userId) {
    throw ApiError.forbidden(
      'You can only access your own employee record',
      'FORBIDDEN'
    );
  }

  return employee;
}

export async function getMyEmployee(userId: string) {
  const employee = await prisma.employee.findUnique({
    where: { user_id: userId },
    include: employeeInclude,
  });

  if (!employee) {
    throw ApiError.notFound('Employee profile not found', 'EMPLOYEE_NOT_FOUND');
  }

  return employee;
}

export async function getFormData() {
  const [departments, workingSchedules, managers] = await Promise.all([
    prisma.department.findMany({ orderBy: { name: 'asc' } }),
    prisma.workingSchedule.findMany({ orderBy: { name: 'asc' } }),
    prisma.employee.findMany({
      select: { id: true, first_name: true, last_name: true, email: true },
      orderBy: [{ first_name: 'asc' }, { last_name: 'asc' }],
    }),
  ]);

  return { departments, workingSchedules, managers };
}

export async function getKanban() {
  const employees = await prisma.employee.findMany({
    include: {
      department: { select: { id: true, name: true } },
      working_schedule: { select: { id: true, name: true } },
      manager: { select: { id: true, first_name: true, last_name: true } },
    },
    orderBy: [{ first_name: 'asc' }, { last_name: 'asc' }],
  });

  return {
    ACTIVE: employees.filter((e) => e.status === 'ACTIVE'),
    INACTIVE: employees.filter((e) => e.status === 'INACTIVE'),
  };
}

export async function createEmployee(data: CreateEmployeeInput) {
  const { temporary_password: temporaryPassword, ...employeeData } = data;

  return prisma.$transaction(async (tx) => {
    let user = await tx.user.findUnique({ where: { email: employeeData.email } });

    if (!user) {
      const passwordHash = await bcrypt.hash(temporaryPassword ?? 'Welcome123!', 10);
      user = await tx.user.create({
        data: {
          email: employeeData.email,
          password_hash: passwordHash,
          role: 'EMPLOYEE',
        },
      });
    }

    return tx.employee.create({
      data: { ...employeeData, user_id: user.id },
      include: employeeInclude,
    });
  });
}

export async function updateEmployee(id: string, data: UpdateEmployeeInput) {
  const { temporary_password: _temporaryPassword, ...employeeData } = data;

  try {
    return await prisma.employee.update({
      where: { id },
      data: employeeData,
      include: employeeInclude,
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      throw ApiError.notFound('Employee not found');
    }
    throw err;
  }
}

export async function deleteEmployee(id: string) {
  try {
    return await prisma.employee.delete({ where: { id } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      throw ApiError.notFound('Employee not found');
    }
    throw err;
  }
}