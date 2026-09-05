import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../utils/ApiError';
import { can, type UserRole } from '@peoplepay360/shared';
import type { ListPayslipsQuery } from './payslip.validation';

const payslipListInclude = {
  employee: { select: { id: true, first_name: true, last_name: true, email: true } },
  payrun: {
    select: { id: true, name: true, period_start: true, period_end: true, status: true },
  },
} as const;

async function resolveEmployeeIdForUser(userId: string) {
  const employee = await prisma.employee.findUnique({ where: { user_id: userId } });
  if (!employee) {
    throw ApiError.notFound('Employee profile not found', 'EMPLOYEE_NOT_FOUND');
  }
  return employee.id;
}

async function assertCanAccess(employeeId: string, userId: string, userRole: UserRole) {
  if (can(userRole, 'VIEW_ALL_PAYSLIPS')) return;
  const ownEmployeeId = await resolveEmployeeIdForUser(userId);
  if (ownEmployeeId !== employeeId) {
    throw ApiError.forbidden('You can only view your own payslips', 'FORBIDDEN');
  }
}

export async function listPayslips(userId: string, userRole: UserRole, query: ListPayslipsQuery) {
  const { page, pageSize, employeeId, status } = query;

  const where: Prisma.PayslipWhereInput = {};

  if (can(userRole, 'VIEW_ALL_PAYSLIPS')) {
    if (employeeId) where.employee_id = employeeId;
    if (status) where.status = status;
  } else {
    where.employee_id = await resolveEmployeeIdForUser(userId);
  }

  const [items, total] = await Promise.all([
    prisma.payslip.findMany({
      where,
      include: payslipListInclude,
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.payslip.count({ where }),
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

export async function getPayslip(id: string, userId: string, userRole: UserRole) {
  const payslip = await prisma.payslip.findUnique({
    where: { id },
    include: {
      ...payslipListInclude,
      contract: true,
      lines: {
        include: { salary_rule: { select: { id: true, name: true, code: true } } },
        orderBy: { created_at: 'asc' },
      },
    },
  });

  if (!payslip) {
    throw ApiError.notFound('Payslip not found', 'PAYSLIP_NOT_FOUND');
  }

  await assertCanAccess(payslip.employee_id, userId, userRole);

  return payslip;
}

export async function listPayslipItems(id: string, userId: string, userRole: UserRole) {
  const payslip = await prisma.payslip.findUnique({
    where: { id },
    select: { id: true, employee_id: true },
  });

  if (!payslip) {
    throw ApiError.notFound('Payslip not found', 'PAYSLIP_NOT_FOUND');
  }

  await assertCanAccess(payslip.employee_id, userId, userRole);

  return prisma.payslipLine.findMany({
    where: { payslip_id: id },
    include: {
      salary_rule: { select: { id: true, name: true, code: true } },
    },
    orderBy: { created_at: 'asc' },
  });
}