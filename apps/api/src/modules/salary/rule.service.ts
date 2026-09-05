import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../utils/ApiError';
import type { CreateRuleInput, UpdateRuleInput, ReorderRulesInput } from './rule.validation';

export async function listRules(structureId: string) {
  return prisma.salaryRule.findMany({
    where: { salary_structure_id: structureId },
    orderBy: { sequence: 'asc' },
  });
}

export async function getRule(id: string) {
  const rule = await prisma.salaryRule.findUnique({
    where: { id },
    include: { salary_structure: true },
  });

  if (!rule) {
    throw ApiError.notFound('Salary rule not found', 'RULE_NOT_FOUND');
  }

  return rule;
}

export async function createRule(structureId: string, data: CreateRuleInput) {
  try {
    return await prisma.salaryRule.create({
      data: { ...data, salary_structure_id: structureId },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw ApiError.conflict('Rule code already exists in this structure', 'DUPLICATE_CODE');
    }
    throw err;
  }
}

export async function updateRule(id: string, data: UpdateRuleInput) {
  try {
    return await prisma.salaryRule.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === 'P2025') {
        throw ApiError.notFound('Salary rule not found', 'RULE_NOT_FOUND');
      }
      if (err.code === 'P2002') {
        throw ApiError.conflict('Rule code already exists in this structure', 'DUPLICATE_CODE');
      }
    }
    throw err;
  }
}

export async function deleteRule(id: string) {
  try {
    return await prisma.salaryRule.delete({ where: { id } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      throw ApiError.notFound('Salary rule not found', 'RULE_NOT_FOUND');
    }
    throw err;
  }
}

export async function reorderRules(ruleIds: ReorderRulesInput['rule_ids']) {
  return prisma.$transaction(
    ruleIds.map((id, index) =>
      prisma.salaryRule.update({
        where: { id },
        data: { sequence: index + 1 },
      })
    )
  );
}