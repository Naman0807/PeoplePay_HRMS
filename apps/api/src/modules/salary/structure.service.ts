import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../utils/ApiError';
import type { CreateStructureInput, UpdateStructureInput } from './structure.validation';

export async function listStructures() {
  return prisma.salaryStructure.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { rules: true } } },
  });
}

export async function getStructure(id: string) {
  const structure = await prisma.salaryStructure.findUnique({
    where: { id },
    include: { rules: { orderBy: { sequence: 'asc' } } },
  });

  if (!structure) {
    throw ApiError.notFound('Salary structure not found', 'STRUCTURE_NOT_FOUND');
  }

  return structure;
}

export async function createStructure(data: CreateStructureInput) {
  try {
    return await prisma.salaryStructure.create({ data });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw ApiError.conflict('Structure code already exists', 'DUPLICATE_CODE');
    }
    throw err;
  }
}

export async function updateStructure(id: string, data: UpdateStructureInput) {
  try {
    return await prisma.salaryStructure.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === 'P2025') {
        throw ApiError.notFound('Salary structure not found', 'STRUCTURE_NOT_FOUND');
      }
      if (err.code === 'P2002') {
        throw ApiError.conflict('Structure code already exists', 'DUPLICATE_CODE');
      }
    }
    throw err;
  }
}

export async function deleteStructure(id: string) {
  try {
    return await prisma.salaryStructure.delete({ where: { id } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === 'P2025') {
        throw ApiError.notFound('Salary structure not found', 'STRUCTURE_NOT_FOUND');
      }
      if (err.code === 'P2003') {
        throw ApiError.conflict('Cannot delete structure in use', 'STRUCTURE_IN_USE');
      }
    }
    throw err;
  }
}
