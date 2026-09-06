import { Prisma, $Enums } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { pageArgs, pageResult } from '../../utils/pagination';
import { ApiError } from '../../utils/ApiError';
import { findEligibleEmployees } from '../../utils/payrunRules';
import { executeRules, type SalaryResult, type SalaryRuleInput } from '../../utils/salaryEngine';
import { FormulaError } from '../../utils/formulaEvaluator';
import { CreatePayrunInput } from './payrun.validation';

export async function listPayruns(query: { page: number; pageSize: number }) {
  const [items, total] = await Promise.all([
    prisma.payrun.findMany({
      include: {
        salary_structure: { select: { id: true, name: true, code: true } },
        _count: { select: { payslips: true } },
      },
      orderBy: { created_at: 'desc' },
      ...pageArgs(query),
    }),
    prisma.payrun.count(),
  ]);

  return pageResult(items, total, query);
}

export async function getPayrun(id: string) {
  const payrun = await prisma.payrun.findUnique({
    where: { id },
    include: {
      salary_structure: true,
      creator: { select: { id: true, email: true } },
      payslips: { select: { id: true, employee_id: true, net_amount: true, status: true } },
      payrun_employees: {
        include: { employee: { select: { id: true, first_name: true, last_name: true } } },
      },
    },
  });
  if (!payrun) {
    throw ApiError.notFound('Payrun not found');
  }
  return payrun;
}

export async function createPayrun(data: CreatePayrunInput, userId: string) {
  const structure = await prisma.salaryStructure.findUnique({
    where: { id: data.salary_structure_id },
  });
  if (!structure) {
    throw ApiError.notFound('Salary structure not found');
  }

  return prisma.payrun.create({
    data: {
      name: data.name,
      salary_structure_id: data.salary_structure_id,
      period_start: new Date(data.period_start),
      period_end: new Date(data.period_end),
      status: 'DRAFT',
      created_by: userId,
    },
    include: {
      salary_structure: { select: { id: true, name: true, code: true } },
    },
  });
}

export async function getEligibleEmployees(payrunId: string) {
  const payrun = await prisma.payrun.findUnique({
    where: { id: payrunId },
    select: { id: true, salary_structure_id: true, period_start: true, period_end: true },
  });
  if (!payrun) {
    throw ApiError.notFound('Payrun not found');
  }

  return findEligibleEmployees(
    prisma,
    payrun.salary_structure_id,
    payrun.period_start,
    payrun.period_end
  );
}

export async function selectEmployees(payrunId: string, employeeIds: string[]) {
  const payrun = await prisma.payrun.findUnique({
    where: { id: payrunId },
    select: { id: true, status: true, salary_structure_id: true, period_start: true, period_end: true },
  });
  if (!payrun) {
    throw ApiError.notFound('Payrun not found');
  }
  if (payrun.status !== 'DRAFT') {
    throw ApiError.conflict('Only payruns in DRAFT status can have employees selected');
  }

  const eligible = await findEligibleEmployees(
    prisma,
    payrun.salary_structure_id,
    payrun.period_start,
    payrun.period_end
  );
  const eligibleIds = new Set(eligible.map((e) => e.employee.id));
  const ineligible = employeeIds.filter((id) => !eligibleIds.has(id));
  if (ineligible.length > 0) {
    throw ApiError.badRequest(
      `Employees are not eligible for this payrun: ${ineligible.join(', ')}`,
      'INELIGIBLE_EMPLOYEES'
    );
  }

  return prisma.$transaction(async (tx) => {
    await tx.payrunEmployee.deleteMany({ where: { payrun_id: payrunId } });
    await tx.payrunEmployee.createMany({
      data: employeeIds.map((employeeId) => ({ payrun_id: payrunId, employee_id: employeeId })),
    });
  });
}

interface ComputedSalary extends SalaryResult {
  contractId: string | null;
}

type PersistedSalaryRule = {
  id: string;
  code: string;
  name: string;
  category: $Enums.SalaryRuleCategory;
  computation_type: $Enums.ComputationType;
  amount_fixed: Prisma.Decimal | null;
  percentage_rate: Prisma.Decimal | null;
  formula_string: string | null;
};

function toEngineRules(rules: PersistedSalaryRule[]): SalaryRuleInput[] {
  return rules.map((rule) => ({
    id: rule.id,
    code: rule.code,
    name: rule.name,
    category: rule.category,
    computation_type: rule.computation_type,
    amount_fixed: rule.amount_fixed === null ? null : rule.amount_fixed.toNumber(),
    percentage_rate: rule.percentage_rate === null ? null : rule.percentage_rate.toNumber(),
    formula_string: rule.formula_string,
  }));
}

function computeSalary(
  contract: { id: string; wage: Prisma.Decimal } | null,
  engineRules: SalaryRuleInput[]
): ComputedSalary {
  const wage = contract ? contract.wage.toNumber() : 0;
  try {
    const result = executeRules(engineRules, wage);
    return { ...result, contractId: contract?.id ?? null };
  } catch (err) {
    if (err instanceof FormulaError) {
      throw ApiError.badRequest(err.message, 'INVALID_FORMULA');
    }
    throw err;
  }
}

function dec(value: number) {
  return new Prisma.Decimal(value.toFixed(2));
}

async function countWorkedDays(
  tx: Prisma.TransactionClient,
  employeeId: string,
  periodStart: Date,
  periodEnd: Date
) {
  return tx.attendance.count({
    where: {
      employee_id: employeeId,
      date: { gte: periodStart, lte: periodEnd },
      check_in: { not: null },
    },
  });
}

export async function computePayrun(payrunId: string) {
  const payrun = await prisma.payrun.findUnique({
    where: { id: payrunId },
    include: {
      salary_structure: {
        include: {
          rules: {
            where: { is_active: true },
            orderBy: [{ sequence: 'asc' }, { created_at: 'asc' }],
          },
        },
      },
      payrun_employees: true,
    },
  });

  if (!payrun) {
    throw ApiError.notFound('Payrun not found', 'PAYRUN_NOT_FOUND');
  }
  if (payrun.status === 'VALIDATED' || payrun.status === 'PAID') {
    throw ApiError.conflict(
      `Payrun cannot be computed in status ${payrun.status}; only DRAFT or COMPUTED payruns can be (re)computed`,
      'INVALID_STATUS'
    );
  }
  if (payrun.payrun_employees.length === 0) {
    throw ApiError.badRequest('No employees selected for this payrun', 'NO_EMPLOYEES');
  }

  const engineRules = toEngineRules(payrun.salary_structure.rules);

  return prisma.$transaction(async (tx) => {
    const computedEmployees = [];
    let missingContractCount = 0;
    let netTotal = new Prisma.Decimal(0);

    for (const pe of payrun.payrun_employees) {
      const contract = await tx.contract.findFirst({
        where: {
          employee_id: pe.employee_id,
          salary_structure_id: payrun.salary_structure_id,
          status: 'RUNNING',
          start_date: { lte: payrun.period_end },
          OR: [{ end_date: null }, { end_date: { gte: payrun.period_start } }],
        },
        select: { id: true, wage: true },
      });

      const computed = computeSalary(contract, engineRules);

      if (!computed.contractId) {
        missingContractCount += 1;
      }

      await tx.payrunEmployee.update({
        where: { id: pe.id },
        data: {
          base_salary: dec(computed.base),
          gross_salary: dec(computed.gross),
          total_deductions: dec(computed.totalDeductions),
          net_salary: dec(computed.net),
          status: 'COMPUTED',
        },
      });

      if (computed.contractId) {
        const workedDays = await countWorkedDays(tx, pe.employee_id, payrun.period_start, payrun.period_end);
        const workedDaysDec = dec(workedDays);

        const payslipData = {
          payrun_id: payrunId,
          employee_id: pe.employee_id,
          contract_id: computed.contractId,
          basic_amount: dec(computed.base),
          gross_amount: dec(computed.gross),
          deduction_amount: dec(computed.totalDeductions),
          net_amount: dec(computed.net),
          worked_days: workedDaysDec,
          warnings: computed.warnings.length > 0 ? computed.warnings : Prisma.JsonNull,
          status: 'COMPUTED' as const,
        };

        let payslipId: string;
        const existingPayslip = await tx.payslip.findFirst({
          where: { payrun_id: payrunId, employee_id: pe.employee_id },
          select: { id: true },
        });

        if (existingPayslip) {
          payslipId = existingPayslip.id;
          await tx.payslipLine.deleteMany({ where: { payslip_id: existingPayslip.id } });
          await tx.payslip.update({ where: { id: existingPayslip.id }, data: payslipData });
        } else {
          const created = await tx.payslip.create({ data: payslipData });
          payslipId = created.id;
        }

        if (computed.lines.length > 0) {
          await tx.payslipLine.createMany({
            data: computed.lines.map((line) => ({
              payslip_id: payslipId,
              salary_rule_id: line.salary_rule_id,
              code: line.code,
              category: line.category,
              rate: new Prisma.Decimal(line.rate.toFixed(4)),
              amount: dec(line.amount),
            })),
          });
        }
      }

      const entry = {
        id: pe.id,
        employee_id: pe.employee_id,
        base_salary: computed.base,
        gross_salary: computed.gross,
        total_deductions: computed.totalDeductions,
        net_salary: computed.net,
        status: 'COMPUTED' as const,
      };
      computedEmployees.push(entry);
      netTotal = netTotal.plus(computed.net);
    }

    const updatedPayrun = await tx.payrun.update({
      where: { id: payrunId },
      data: { status: 'COMPUTED' },
    });

    return {
      payrun: updatedPayrun,
      summary: {
        employees: computedEmployees,
        totalNet: netTotal.toNumber(),
        warnings: missingContractCount > 0
          ? [`${missingContractCount} employee(s) have no covering RUNNING contract and were computed without a payslip`]
          : [],
      },
    };
  });
}

export async function validatePayrun(payrunId: string) {
  const payrun = await prisma.payrun.findUnique({
    where: { id: payrunId },
    include: {
      payrun_employees: { select: { id: true, status: true } },
      payslips: { select: { id: true, status: true } },
    },
  });

  if (!payrun) {
    throw ApiError.notFound('Payrun not found', 'PAYRUN_NOT_FOUND');
  }
  if (payrun.status === 'PAID') {
    throw ApiError.conflict('Paid payruns cannot be revalidated', 'INVALID_STATUS');
  }
  if (payrun.status === 'DRAFT') {
    throw ApiError.conflict('Payrun must be computed before validation', 'INVALID_STATUS');
  }
  if (payrun.payrun_employees.length === 0) {
    throw ApiError.badRequest('No employees selected for this payrun', 'NO_EMPLOYEES');
  }

  const uncomputed = payrun.payrun_employees.filter((e) => e.status !== 'COMPUTED');
  if (uncomputed.length > 0) {
    throw ApiError.conflict(
      `${uncomputed.length} employee(s) have not been computed yet`,
      'UNCOMPUTED_EMPLOYEES'
    );
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.payrun.update({
      where: { id: payrunId },
      data: { status: 'VALIDATED' },
    });
    await tx.payslip.updateMany({
      where: { payrun_id: payrunId },
      data: { status: 'VALIDATED' },
    });
    return updated;
  });
}

export async function markPayrunPaid(payrunId: string) {
  const payrun = await prisma.payrun.findUnique({
    where: { id: payrunId },
    select: { id: true, status: true },
  });

  if (!payrun) {
    throw ApiError.notFound('Payrun not found', 'PAYRUN_NOT_FOUND');
  }
  if (payrun.status !== 'VALIDATED') {
    throw ApiError.conflict(
      `Payrun must be VALIDATED before marking as paid; current status is ${payrun.status}`,
      'INVALID_STATUS'
    );
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.payrun.update({
      where: { id: payrunId },
      data: { status: 'PAID' },
    });
    await tx.payrunEmployee.updateMany({
      where: { payrun_id: payrunId },
      data: { status: 'PAID' },
    });
    await tx.payslip.updateMany({
      where: { payrun_id: payrunId },
      data: { status: 'PAID' },
    });
    return updated;
  });
}

export async function listPayrunEmployees(payrunId: string) {
  const payrun = await prisma.payrun.findUnique({
    where: { id: payrunId },
    select: { id: true },
  });
  if (!payrun) {
    throw ApiError.notFound('Payrun not found', 'PAYRUN_NOT_FOUND');
  }

  return prisma.payrunEmployee.findMany({
    where: { payrun_id: payrunId },
    include: {
      employee: {
        select: {
          id: true,
          first_name: true,
          last_name: true,
          email: true,
          job_position: true,
          department: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { created_at: 'asc' },
  });
}

export async function listPayrunPayslips(payrunId: string) {
  const payrun = await prisma.payrun.findUnique({
    where: { id: payrunId },
    select: { id: true },
  });
  if (!payrun) {
    throw ApiError.notFound('Payrun not found', 'PAYRUN_NOT_FOUND');
  }

  return prisma.payslip.findMany({
    where: { payrun_id: payrunId },
    include: {
      employee: {
        select: {
          id: true,
          first_name: true,
          last_name: true,
          email: true,
        },
      },
      lines: { orderBy: { created_at: 'asc' } },
    },
    orderBy: { created_at: 'asc' },
  });
}