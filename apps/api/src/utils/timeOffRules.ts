import { PrismaClient } from '@prisma/client';
import { ApiError } from './ApiError';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
/** Simplified working day used when a time off type is measured in hours. */
export const HOURS_PER_WORKING_DAY = 8;

/** Inclusive of both the start and the end date. */
export function calculateDuration(startDate: Date, endDate: Date, unit: 'DAYS' | 'HOURS'): number {
  const days = Math.round((endDate.getTime() - startDate.getTime()) / MS_PER_DAY) + 1;
  return unit === 'DAYS' ? days : days * HOURS_PER_WORKING_DAY;
}

export interface AllocationBalance {
  allocated_units: unknown;
  taken_units: unknown;
}

export function remainingBalance(allocations: AllocationBalance[]): number {
  return allocations.reduce(
    (sum, allocation) => sum + (Number(allocation.allocated_units) - Number(allocation.taken_units)),
    0
  );
}

type TimeOffBalanceQuery = {
  timeOffType: Pick<PrismaClient['timeOffType'], 'findUnique'>;
  timeOffAllocation: Pick<PrismaClient['timeOffAllocation'], 'findMany'>;
};

export async function assertBalanceAvailable(
  prisma: TimeOffBalanceQuery,
  employeeId: string,
  timeOffTypeId: string,
  startDate: Date,
  endDate: Date,
  duration: number
): Promise<void> {
  const type = await prisma.timeOffType.findUnique({ where: { id: timeOffTypeId } });
  if (!type) throw ApiError.notFound('Time off type not found', 'TIME_OFF_TYPE_NOT_FOUND');
  if (!type.requires_allocation) return; // unlimited type — no balance to consume

  const allocations = await prisma.timeOffAllocation.findMany({
    where: {
      employee_id: employeeId,
      time_off_type_id: timeOffTypeId,
      status: 'APPROVED',
      valid_from: { lte: startDate },
      valid_to: { gte: endDate },
    },
  });

  const remaining = remainingBalance(allocations);

  if (duration > remaining) {
    throw ApiError.badRequest(
      `Insufficient balance: requested ${duration}, remaining ${remaining}`,
      'INSUFFICIENT_BALANCE'
    );
  }
}
