import { describe, expect, it } from 'vitest';
import { FormulaError, evaluateFormula } from '../../src/utils/formulaEvaluator';

const vars = {
  WAGE: 5000,
  BASIC: 5000,
  'ALW-HOUSING': 500,
  GROSS: 5500,
  'TAX-INCOME': 275,
  ZERO: 0,
};

describe('evaluateFormula', () => {
  it('adds and subtracts', () => {
    expect(evaluateFormula('1 + 2', vars)).toBe(3);
    expect(evaluateFormula('10 - 4', vars)).toBe(6);
  });

  it('multiplies and divides', () => {
    expect(evaluateFormula('6 * 7', vars)).toBe(42);
    expect(evaluateFormula('9 / 3', vars)).toBe(3);
  });

  it('honours operator precedence', () => {
    expect(evaluateFormula('2 + 3 * 4', vars)).toBe(14);
    expect(evaluateFormula('20 - 6 / 2', vars)).toBe(17);
  });

  it('honours parentheses', () => {
    expect(evaluateFormula('(2 + 3) * 4', vars)).toBe(20);
    expect(evaluateFormula('((1 + 1) * (2 + 2)) / 4', vars)).toBe(2);
  });

  it('substitutes variables', () => {
    expect(evaluateFormula('BASIC', vars)).toBe(5000);
    expect(evaluateFormula('BASIC + ALW-HOUSING', vars)).toBe(5500);
  });

  it('resolves rule codes that contain a hyphen against the minus operator', () => {
    expect(evaluateFormula('GROSS - TAX-INCOME', vars)).toBe(5225);
    expect(evaluateFormula('GROSS-TAX-INCOME', vars)).toBe(5225);
  });

  it('supports decimals and unary minus', () => {
    expect(evaluateFormula('2.5 * 4', vars)).toBe(10);
    expect(evaluateFormula('-BASIC + GROSS', vars)).toBe(500);
  });

  it('mixes variables, numbers and parentheses', () => {
    expect(evaluateFormula('(BASIC + ALW-HOUSING) * 0.05', vars)).toBeCloseTo(275, 10);
  });

  it('rejects division by zero', () => {
    expect(() => evaluateFormula('BASIC / 0', vars)).toThrow(FormulaError);
    expect(() => evaluateFormula('BASIC / ZERO', vars)).toThrow(/Division by zero/);
  });

  it('rejects unknown references', () => {
    expect(() => evaluateFormula('BASIC + BONUS', vars)).toThrow(/Unknown reference "BONUS"/);
  });

  it('rejects malformed input', () => {
    expect(() => evaluateFormula('', vars)).toThrow(/Formula is empty/);
    expect(() => evaluateFormula('1 +', vars)).toThrow(/Unexpected end of formula/);
    expect(() => evaluateFormula('(1 + 2', vars)).toThrow(/Missing closing parenthesis/);
    expect(() => evaluateFormula('1 2', vars)).toThrow(/Unexpected trailing input/);
    expect(() => evaluateFormula('1 & 2', vars)).toThrow(/Unexpected character "&"/);
  });

  it('does not evaluate arbitrary JavaScript', () => {
    expect(() => evaluateFormula('process.exit(1)', vars)).toThrow(FormulaError);
  });
});
