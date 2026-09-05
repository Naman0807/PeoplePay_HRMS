import { describe, expect, it } from 'vitest';
import { FormulaError } from '../../src/utils/formulaEvaluator';
import { executeRules, type SalaryRuleInput } from '../../src/utils/salaryEngine';

/** The exact structure created by `prisma/seed.ts`. */
const seedRules: SalaryRuleInput[] = [
  { id: 'r1', code: 'BASIC', category: 'BASIC', computation_type: 'FIXED', amount_fixed: 5000 },
  { id: 'r2', code: 'ALW-HOUSING', category: 'ALLOWANCE', computation_type: 'PERCENTAGE', percentage_rate: 10 },
  { id: 'r3', code: 'GROSS', category: 'GROSS', computation_type: 'FORMULA', formula_string: 'BASIC + ALW-HOUSING' },
  { id: 'r4', code: 'TAX-INCOME', category: 'DEDUCTION', computation_type: 'PERCENTAGE', percentage_rate: 5 },
  { id: 'r5', code: 'NET', category: 'NET', computation_type: 'FORMULA', formula_string: 'GROSS - TAX-INCOME' },
];

describe('executeRules', () => {
  it('produces the canonical seed vector', () => {
    const result = executeRules(seedRules, 5000);

    expect(result.base).toBe(5000);
    expect(result.gross).toBe(5500);
    expect(result.totalDeductions).toBe(275);
    expect(result.net).toBe(5225);
    expect(result.warnings).toEqual([]);
  });

  it('emits one line per rule, in sequence order', () => {
    const { lines } = executeRules(seedRules, 5000);

    expect(lines.map((line) => line.code)).toEqual([
      'BASIC',
      'ALW-HOUSING',
      'GROSS',
      'TAX-INCOME',
      'NET',
    ]);
    expect(lines.map((line) => line.amount)).toEqual([5000, 500, 5500, 275, 5225]);
    expect(lines[1].rate).toBe(10);
    expect(lines[0].salary_rule_id).toBe('r1');
  });

  it('handles a FIXED-only structure', () => {
    const rules: SalaryRuleInput[] = [
      { code: 'BASIC', category: 'BASIC', computation_type: 'FIXED', amount_fixed: 3000 },
      { code: 'ALW-MEAL', category: 'ALLOWANCE', computation_type: 'FIXED', amount_fixed: 200 },
      { code: 'PENSION', category: 'DEDUCTION', computation_type: 'FIXED', amount_fixed: 100 },
    ];

    const result = executeRules(rules, 3000);

    expect(result.base).toBe(3000);
    expect(result.gross).toBe(3200);
    expect(result.totalDeductions).toBe(100);
    expect(result.net).toBe(3100);
  });

  it('applies a PERCENTAGE deduction to the gross accumulated so far', () => {
    const rules: SalaryRuleInput[] = [
      { code: 'BASIC', category: 'BASIC', computation_type: 'FIXED', amount_fixed: 4000 },
      { code: 'ALW-CAR', category: 'ALLOWANCE', computation_type: 'FIXED', amount_fixed: 1000 },
      { code: 'TAX', category: 'DEDUCTION', computation_type: 'PERCENTAGE', percentage_rate: 10 },
    ];

    const result = executeRules(rules, 4000);

    expect(result.gross).toBe(5000);
    expect(result.totalDeductions).toBe(500); // 10% of 5000, not of the 4000 wage
    expect(result.net).toBe(4500);
  });

  it('falls back to the contract wage while gross is still zero', () => {
    const rules: SalaryRuleInput[] = [
      { code: 'BASIC', category: 'BASIC', computation_type: 'PERCENTAGE', percentage_rate: 50 },
    ];

    expect(executeRules(rules, 6000).gross).toBe(3000);
  });

  it('resolves a FORMULA with multiple references', () => {
    const rules: SalaryRuleInput[] = [
      { code: 'BASIC', category: 'BASIC', computation_type: 'FIXED', amount_fixed: 2000 },
      { code: 'ALW-A', category: 'ALLOWANCE', computation_type: 'FIXED', amount_fixed: 300 },
      { code: 'ALW-B', category: 'ALLOWANCE', computation_type: 'FIXED', amount_fixed: 200 },
      {
        code: 'GROSS',
        category: 'GROSS',
        computation_type: 'FORMULA',
        formula_string: '(BASIC + ALW-A + ALW-B) * 2 - WAGE',
      },
    ];

    // (2000 + 300 + 200) * 2 - 2000 = 3000
    expect(executeRules(rules, 2000).gross).toBe(3000);
  });

  it('exposes the contract wage as WAGE', () => {
    const rules: SalaryRuleInput[] = [
      { code: 'BASIC', category: 'BASIC', computation_type: 'FORMULA', formula_string: 'WAGE' },
    ];

    expect(executeRules(rules, 7200).base).toBe(7200);
  });

  it('rejects a formula that divides by zero', () => {
    const rules: SalaryRuleInput[] = [
      { code: 'BASIC', category: 'BASIC', computation_type: 'FIXED', amount_fixed: 1000 },
      { code: 'RATIO', category: 'ALLOWANCE', computation_type: 'FORMULA', formula_string: 'BASIC / 0' },
    ];

    expect(() => executeRules(rules, 1000)).toThrow(/Rule "RATIO": Division by zero/);
  });

  it('rejects a formula that references an unknown rule code', () => {
    const rules: SalaryRuleInput[] = [
      { code: 'BASIC', category: 'BASIC', computation_type: 'FIXED', amount_fixed: 1000 },
      { code: 'GROSS', category: 'GROSS', computation_type: 'FORMULA', formula_string: 'BASIC + BONUS' },
    ];

    expect(() => executeRules(rules, 1000)).toThrow(FormulaError);
    expect(() => executeRules(rules, 1000)).toThrow(/Unknown reference "BONUS"/);
  });

  it('rejects a formula that references a rule that has not executed yet', () => {
    const rules: SalaryRuleInput[] = [
      { code: 'GROSS', category: 'GROSS', computation_type: 'FORMULA', formula_string: 'BASIC' },
      { code: 'BASIC', category: 'BASIC', computation_type: 'FIXED', amount_fixed: 1000 },
    ];

    expect(() => executeRules(rules, 1000)).toThrow(/Unknown reference "BASIC"/);
  });

  it('rejects a FORMULA rule with no formula_string', () => {
    const rules: SalaryRuleInput[] = [
      { code: 'GROSS', category: 'GROSS', computation_type: 'FORMULA', formula_string: null },
    ];

    expect(() => executeRules(rules, 1000)).toThrow(/has no formula_string/);
  });

  it('warns instead of failing when a FIXED rule has no amount', () => {
    const rules: SalaryRuleInput[] = [
      { code: 'BASIC', category: 'BASIC', computation_type: 'FIXED', amount_fixed: null },
    ];

    const result = executeRules(rules, 1000);

    expect(result.gross).toBe(0);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toMatch(/BASIC/);
  });

  it('never returns a negative net', () => {
    const rules: SalaryRuleInput[] = [
      { code: 'BASIC', category: 'BASIC', computation_type: 'FIXED', amount_fixed: 100 },
      { code: 'FINE', category: 'DEDUCTION', computation_type: 'FIXED', amount_fixed: 500 },
    ];

    expect(executeRules(rules, 100).net).toBe(0);
  });

  it('computes a zero vector for an employee with no contract wage', () => {
    const result = executeRules(seedRules, 0);

    expect(result.base).toBe(5000); // BASIC is a FIXED rule, independent of the wage
    expect(result.net).toBe(5225);
    expect(executeRules([], 0)).toMatchObject({ base: 0, gross: 0, totalDeductions: 0, net: 0 });
  });
});
