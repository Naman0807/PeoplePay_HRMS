import { PrismaClient } from '@prisma/client';
import { ApiError } from './ApiError';

export interface ContractPeriodCheck {
  start_date: Date;
  end_date: Date | null;
}

export function assertCoversPeriod(
  contract: ContractPeriodCheck,
  periodStart: Date,
  periodEnd: Date
): boolean {
  const startOk = contract.start_date <= periodStart;
  const endOk = contract.end_date === null || contract.end_date >= periodEnd;
  return startOk && endOk;
}

/** A null end date means open-ended, i.e. the period never closes. */
export function periodsOverlap(
  aStart: Date,
  aEnd: Date | null,
  bStart: Date,
  bEnd: Date | null
): boolean {
  const aEndMs = aEnd === null ? Infinity : aEnd.getTime();
  const bEndMs = bEnd === null ? Infinity : bEnd.getTime();
  return aStart.getTime() <= bEndMs && bStart.getTime() <= aEndMs;
}

type ContractOverlapQuery = Pick<PrismaClient['contract'], 'findMany'>;

/**
 * Only RUNNING contracts block a new one — DRAFT, EXPIRED and CANCELLED
 * contracts may overlap freely.
 */
export async function assertNoOverlap(
  prisma: { contract: ContractOverlapQuery },
  employeeId: string,
  startDate: Date,
  endDate: Date | null,
  excludeContractId?: string
): Promise<void> {
  // ponytail: overlap is filtered in JS over one employee's RUNNING contracts
  // (a handful of rows) so the rule stays unit-testable without a database.
  const running = await prisma.contract.findMany({
    where: {
      employee_id: employeeId,
      status: 'RUNNING',
      ...(excludeContractId ? { id: { not: excludeContractId } } : {}),
    },
    select: { id: true, name: true, start_date: true, end_date: true },
  });

  const overlapping = running.find((contract) =>
    periodsOverlap(startDate, endDate, contract.start_date, contract.end_date)
  );

  if (overlapping) {
    throw ApiError.badRequest(
      `Contract overlaps with existing RUNNING contract: ${overlapping.name}`,
      'CONTRACT_OVERLAP'
    );
  }
}
