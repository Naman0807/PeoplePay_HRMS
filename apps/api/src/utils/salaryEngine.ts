import { FormulaError, evaluateFormula } from './formulaEvaluator';

export type SalaryRuleCategory = 'BASIC' | 'ALLOWANCE' | 'GROSS' | 'DEDUCTION' | 'NET';
export type SalaryComputationType = 'FIXED' | 'PERCENTAGE' | 'FORMULA';

export interface SalaryRuleInput {
  id?: string;
  code: string;
  name?: string;
  category: SalaryRuleCategory;
  computation_type: SalaryComputationType;
  amount_fixed?: number | null;
  percentage_rate?: number | null;
  formula_string?: string | null;
}

export interface SalaryLine {
  salary_rule_id: string;
  code: string;
  category: SalaryRuleCategory;
  rate: number;
  amount: number;
}

export interface SalaryResult {
  base: number;
  gross: number;
  totalDeductions: number;
  net: number;
  lines: SalaryLine[];
  warnings: string[];
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Executes salary rules in the order given (callers pass them ordered by
 * `sequence`) and returns the payslip vector.
 *
 * Semantics:
 *  - FIXED       — the rule's `amount_fixed`.
 *  - PERCENTAGE  — `percentage_rate` % of the gross accumulated so far, and of
 *                  the contract wage while that accumulator is still zero.
 *  - FORMULA     — `formula_string` evaluated over the codes of rules that have
 *                  already executed, plus `WAGE` (the contract wage).
 *
 * Category drives accumulation: BASIC and ALLOWANCE add to gross, GROSS
 * overrides it, DEDUCTION adds to total deductions, NET overrides the net.
 */
export function executeRules(rules: SalaryRuleInput[], wage: number): SalaryResult {
  const variables: Record<string, number> = { WAGE: wage };
  const lines: SalaryLine[] = [];
  const warnings: string[] = [];

  let grossAccumulator = 0;
  let grossOverride: number | null = null;
  let netOverride: number | null = null;
  let basicTotal = 0;
  let hasBasicRule = false;
  let totalDeductions = 0;

  for (const rule of rules) {
    let rate = 0;
    let amount = 0;

    if (rule.computation_type === 'FIXED') {
      if (rule.amount_fixed === null || rule.amount_fixed === undefined) {
        warnings.push(`Rule "${rule.code}" is FIXED but has no amount_fixed; it was computed as 0`);
      }
      rate = rule.amount_fixed ?? 0;
      amount = rate;
    } else if (rule.computation_type === 'PERCENTAGE') {
      if (rule.percentage_rate === null || rule.percentage_rate === undefined) {
        warnings.push(`Rule "${rule.code}" is PERCENTAGE but has no percentage_rate; it was computed as 0`);
      }
      rate = rule.percentage_rate ?? 0;
      const percentageBase = grossAccumulator !== 0 ? grossAccumulator : wage;
      amount = (percentageBase * rate) / 100;
    } else {
      if (!rule.formula_string) {
        throw new FormulaError(`Rule "${rule.code}" is FORMULA but has no formula_string`);
      }
      try {
        amount = evaluateFormula(rule.formula_string, variables);
      } catch (err) {
        if (err instanceof FormulaError) {
          throw new FormulaError(`Rule "${rule.code}": ${err.message}`);
        }
        throw err;
      }
      rate = 0;
    }

    switch (rule.category) {
      case 'BASIC':
        hasBasicRule = true;
        basicTotal += amount;
        grossAccumulator += amount;
        break;
      case 'ALLOWANCE':
        grossAccumulator += amount;
        break;
      case 'GROSS':
        grossOverride = amount;
        grossAccumulator = amount;
        break;
      case 'DEDUCTION':
        totalDeductions += amount;
        break;
      case 'NET':
        netOverride = amount;
        break;
    }

    variables[rule.code] = amount;
    lines.push({
      salary_rule_id: rule.id ?? rule.code,
      code: rule.code,
      category: rule.category,
      rate,
      amount: round2(amount),
    });
  }

  const gross = grossOverride !== null ? grossOverride : grossAccumulator;
  const net = netOverride !== null ? netOverride : Math.max(gross - totalDeductions, 0);

  return {
    base: round2(hasBasicRule ? basicTotal : wage),
    gross: round2(gross),
    totalDeductions: round2(totalDeductions),
    net: round2(net),
    lines,
    warnings,
  };
}
