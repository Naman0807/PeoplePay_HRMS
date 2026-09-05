import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../utils/ApiError';
import { can, type UserRole } from '@peoplepay360/shared';
import type { CreateAllocationInput, UpdateAllocationInput } from './allocation.validation';

const ALLOCATION_INCLUDE = {
  employee: { select: { id: true, first_name: true, last_name: true } },
  time_off_type: true,
} as const;

async function resolveEmployeeIdForUser(userId: string) {
  const employee = await prisma.employee.findUnique({ where: { user_id: userId } });
  if (!employee) {
    throw ApiError.notFound('Employee profile not found', 'EMPLOYEE_NOT_FOUND');
  }
  return employee.id;
}

function addRemaining<T extends { allocated_units: any; taken_units: any }>(record: T) {
  const remaining = Number(record.allocated_units) - Number(record.taken_units);
  return { ...record, remaining_units: remaining };
}

export async function listAllocations(userId: string, userRole: UserRole, employeeId?: string) {
  const where: Prisma.TimeOffAllocationWhereInput = {};

  if (can(userRole, 'MANAGE_TIME_OFF_TYPES')) {
    if (employeeId) where.employee_id = employeeId;
  } else {
    where.employee_id = await resolveEmployeeIdForUser(userId);
  }

  const allocations = await prisma.timeOffAllocation.findMany({
    where,
    include: ALLOCATION_INCLUDE,
    orderBy: { created_at: 'desc' },
  });
  return allocations.map(addRemaining);
}

export async function getAllocation(id: string, userId: string, userRole: UserRole) {
  const allocation = await prisma.timeOffAllocation.findUnique({
    where: { id },
    include: ALLOCATION_INCLUDE,
  });

  if (!allocation) {
    throw ApiError.notFound('Time off allocation not found');
  }

  if (!can(userRole, 'MANAGE_TIME_OFF_TYPES')) {
    const ownEmployeeId = await resolveEmployeeIdForUser(userId);
    if (ownEmployeeId !== allocation.employee_id) {
      throw ApiError.forbidden('You can only view your own allocations', 'FORBIDDEN');
    }
  }

  return addRemaining(allocation);
}

export async function createAllocation(data: CreateAllocationInput) {
  const [employee, timeOffType] = await Promise.all([
    prisma.employee.findUnique({ where: { id: data.employee_id } }),
    prisma.timeOffType.findUnique({ where: { id: data.time_off_type_id } }),
  ]);

  if (!employee) {
    throw ApiError.notFound('Employee not found');
  }

  if (!timeOffType) {
    throw ApiError.notFound('Time off type not found');
  }

  const allocation = await prisma.timeOffAllocation.create({
    data: {
      ...data,
      status: 'DRAFT',
    },
    include: ALLOCATION_INCLUDE,
  });

  return addRemaining(allocation);
}

export async function updateAllocation(id: string, data: UpdateAllocationInput) {
  try {
    const allocation = await prisma.timeOffAllocation.update({
      where: { id },
      data,
      include: ALLOCATION_INCLUDE,
    });
    return addRemaining(allocation);
  } catch (err: any) {
    if (err?.code === 'P2025') {
      throw ApiError.notFound('Time off allocation not found');
    }
    throw err;
  }
}

export async function approveAllocation(id: string) {
  const allocation = await prisma.timeOffAllocation.findUnique({ where: { id } });

  if (!allocation) {
    throw ApiError.notFound('Time off allocation not found');
  }

  if (allocation.status === 'APPROVED') {
    return addRemaining(allocation);
  }

  if (allocation.status === 'REFUSED') {
    throw ApiError.conflict('Cannot approve a refused allocation');
  }

  const updated = await prisma.timeOffAllocation.update({
    where: { id },
    data: { status: 'APPROVED' },
    include: ALLOCATION_INCLUDE,
  });

  return addRemaining(updated);
}

export async function refuseAllocation(id: string) {
  const allocation = await prisma.timeOffAllocation.findUnique({ where: { id } });

  if (!allocation) {
    throw ApiError.notFound('Time off allocation not found');
  }

  if (allocation.status === 'REFUSED') {
    return addRemaining(allocation);
  }

  if (allocation.status === 'APPROVED') {
    throw ApiError.conflict('Cannot refuse an approved allocation');
  }

  const updated = await prisma.timeOffAllocation.update({
    where: { id },
    data: { status: 'REFUSED' },
    include: ALLOCATION_INCLUDE,
  });

  return addRemaining(updated);
}

export async function deleteAllocation(id: string) {
  try {
    await prisma.timeOffAllocation.delete({ where: { id } });
    return { id };
  } catch (err: any) {
    if (err?.code === 'P2025') {
      throw ApiError.notFound('Time off allocation not found');
    }
    if (err?.code === 'P2003') {
      throw ApiError.conflict('Cannot delete allocation in use');
    }
    throw err;
  }
}
