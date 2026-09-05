import { PrismaClient } from '@prisma/client';
import { assertCoversPeriod } from './contractRules';

export async function findEligibleEmployees(
  prisma: PrismaClient,
  structureId: string,
  periodStart: Date,
  periodEnd: Date
) {
  const contracts = await prisma.contract.findMany({
    where: {
      salary_structure_id: structureId,
      status: 'RUNNING',
      employee: { is: { status: 'ACTIVE' } },
    },
    include: {
      employee: {
        include: { department: true, working_schedule: true },
      },
    },
  });

  return contracts
    .filter((c) => c.employee && assertCoversPeriod(c, periodStart, periodEnd))
    .map((c) => ({
      employee: c.employee,
      contract: { id: c.id, name: c.name, start_date: c.start_date, end_date: c.end_date, wage: c.wage },
    }));
}
