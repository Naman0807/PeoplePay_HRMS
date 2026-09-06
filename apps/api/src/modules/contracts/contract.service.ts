import { prisma } from '../../lib/prisma';
import { pageArgs, pageResult } from '../../utils/pagination';
import { Prisma } from '@prisma/client';
import { assertNoOverlap } from '../../utils/contractRules';
import { CreateContractInput, UpdateContractInput, ListContractsQuery } from './contract.validation';

const includeRelations = {
  employee: { select: { id: true, first_name: true, last_name: true } },
  salary_structure: true,
  working_schedule: true,
} as const;

export async function listContracts(query: ListContractsQuery) {
  const where: Prisma.ContractWhereInput = {};
  if (query.employeeId) where.employee_id = query.employeeId;
  if (query.status) where.status = query.status;

  const [items, total] = await Promise.all([
    prisma.contract.findMany({
      where,
      include: includeRelations,
      orderBy: { start_date: 'desc' },
      ...pageArgs(query),
    }),
    prisma.contract.count({ where }),
  ]);

  return pageResult(items, total, query);
}

export async function getContract(id: string) {
  const contract = await prisma.contract.findUnique({
    where: { id },
    include: includeRelations,
  });
  if (!contract) {
    const err = new Error('Contract not found');
    (err as any).status = 404;
    throw err;
  }
  return contract;
}

export async function createContract(data: CreateContractInput) {
  const startDate = new Date(data.start_date);
  const endDate = data.end_date ? new Date(data.end_date) : null;

  if (data.status === 'RUNNING') {
    await assertNoOverlap(prisma, data.employee_id, startDate, endDate);
  }

  return prisma.contract.create({
    data: {
      employee_id: data.employee_id,
      name: data.name,
      start_date: startDate,
      end_date: endDate,
      wage: new Prisma.Decimal(data.wage),
      salary_structure_id: data.salary_structure_id,
      working_schedule_id: data.working_schedule_id,
      status: data.status ?? 'DRAFT',
    },
    include: includeRelations,
  });
}

export async function updateContract(id: string, data: UpdateContractInput) {
  const existing = await prisma.contract.findUnique({ where: { id } });
  if (!existing) {
    const err = new Error('Contract not found');
    (err as any).status = 404;
    throw err;
  }

  const newStatus = data.status ?? existing.status;
  const newStartDate = data.start_date ? new Date(data.start_date) : existing.start_date;
  const newEndDate = data.end_date !== undefined ? (data.end_date ? new Date(data.end_date) : null) : existing.end_date;

  if (newStatus === 'RUNNING') {
    await assertNoOverlap(prisma, data.employee_id ?? existing.employee_id, newStartDate, newEndDate, id);
  }

  const updateData: Prisma.ContractUncheckedUpdateInput = {};
  if (data.employee_id) updateData.employee_id = data.employee_id;
  if (data.name) updateData.name = data.name;
  if (data.start_date) updateData.start_date = newStartDate;
  if (data.end_date !== undefined) updateData.end_date = newEndDate;
  if (data.wage !== undefined) updateData.wage = new Prisma.Decimal(data.wage);
  if (data.salary_structure_id) updateData.salary_structure_id = data.salary_structure_id;
  if (data.working_schedule_id) updateData.working_schedule_id = data.working_schedule_id;
  if (data.status) updateData.status = data.status;

  return prisma.contract.update({
    where: { id },
    data: updateData,
    include: includeRelations,
  });
}

export async function deleteContract(id: string) {
  try {
    return await prisma.contract.delete({ where: { id } });
  } catch (error: any) {
    if (error.code === 'P2025') {
      const err = new Error('Contract not found');
      (err as any).status = 404;
      throw err;
    }
    if (error.code === 'P2003') {
      const err = new Error('Cannot delete contract with payslips');
      (err as any).status = 409;
      (err as any).code = 'CONTRACT_IN_USE';
      throw err;
    }
    throw error;
  }
}
