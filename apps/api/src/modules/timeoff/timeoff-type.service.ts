import { prisma } from '../../lib/prisma';
import { ApiError } from '../../utils/ApiError';
import type { CreateTimeOffTypeInput, UpdateTimeOffTypeInput } from './timeoff-type.validation';

const TIME_OFF_TYPE_SELECT = {
  id: true,
  name: true,
  unit: true,
  requires_allocation: true,
  payroll_integration: true,
  created_at: true,
} as const;

export async function listTimeOffTypes() {
  return prisma.timeOffType.findMany({
    select: TIME_OFF_TYPE_SELECT,
    orderBy: { name: 'asc' },
  });
}

export async function getTimeOffType(id: string) {
  const timeOffType = await prisma.timeOffType.findUnique({
    where: { id },
    select: TIME_OFF_TYPE_SELECT,
  });

  if (!timeOffType) {
    throw ApiError.notFound('Time off type not found');
  }

  return timeOffType;
}

export async function createTimeOffType(data: CreateTimeOffTypeInput) {
  try {
    return await prisma.timeOffType.create({
      data,
      select: TIME_OFF_TYPE_SELECT,
    });
  } catch (err: any) {
    if (err?.code === 'P2002') {
      throw ApiError.conflict('Time off type name already exists', 'DUPLICATE_NAME');
    }
    throw err;
  }
}

export async function updateTimeOffType(id: string, data: UpdateTimeOffTypeInput) {
  try {
    return await prisma.timeOffType.update({
      where: { id },
      data,
      select: TIME_OFF_TYPE_SELECT,
    });
  } catch (err: any) {
    if (err?.code === 'P2025') {
      throw ApiError.notFound('Time off type not found');
    }
    throw err;
  }
}

export async function deleteTimeOffType(id: string) {
  try {
    await prisma.timeOffType.delete({ where: { id } });
    return { id };
  } catch (err: any) {
    if (err?.code === 'P2025') {
      throw ApiError.notFound('Time off type not found');
    }
    if (err?.code === 'P2003') {
      throw ApiError.conflict('Cannot delete type in use', 'TYPE_IN_USE');
    }
    throw err;
  }
}
