import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../utils/ApiError';
import type { CreateDepartmentInput, UpdateDepartmentInput } from './department.validation';

export async function listDepartments() {
  return prisma.department.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { employees: true } } },
  });
}

export async function getDepartment(id: string) {
  const department = await prisma.department.findUnique({
    where: { id },
    include: { _count: { select: { employees: true } } },
  });

  if (!department) {
    throw ApiError.notFound('Department not found');
  }

  return department;
}

export async function createDepartment(data: CreateDepartmentInput) {
  try {
    return await prisma.department.create({ data });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw ApiError.conflict('Department name already exists', 'DUPLICATE_NAME');
    }
    throw err;
  }
}

export async function updateDepartment(id: string, data: UpdateDepartmentInput) {
  try {
    return await prisma.department.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw ApiError.conflict('Department name already exists', 'DUPLICATE_NAME');
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      throw ApiError.notFound('Department not found');
    }
    throw err;
  }
}

export async function deleteDepartment(id: string) {
  try {
    return await prisma.department.delete({ where: { id } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      throw ApiError.notFound('Department not found');
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003') {
      throw ApiError.conflict('Cannot delete department with employees', 'DEPARTMENT_HAS_EMPLOYEES');
    }
    throw err;
  }
}
