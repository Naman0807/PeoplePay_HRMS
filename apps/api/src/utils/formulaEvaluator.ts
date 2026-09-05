/**
 * Safe arithmetic expression evaluator for salary rule formulas.
 *
 * No `eval()`. Supports `+ - * /`, parentheses, unary minus, decimal numbers
 * and variable references (salary rule codes such as `BASIC` or `ALW-HOUSING`).
 *
 * Rule codes may contain `-`, which also happens to be the subtraction
 * operator. The tokenizer resolves the ambiguity by matching the longest known
 * variable name at each position, so `GROSS - TAX-INCOME` reads as
 * `GROSS` `-` `TAX-INCOME`.
 */

export class FormulaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FormulaError';
  }
}

type Token =
  | { type: 'num'; value: number }
  | { type: 'var'; name: string }
  | { type: 'op'; value: string };

const OPERATORS = new Set(['+', '-', '*', '/', '(', ')']);
const IDENT_START = /[A-Za-z_]/;
const IDENT_BODY = /[A-Za-z0-9_.-]/;
const IDENT_BOUNDARY = /[A-Za-z0-9_]/;

function tokenize(expression: string, variableNames: string[]): Token[] {
  // Longest first so `ALW-HOUSING` wins over a hypothetical `ALW`.
  const names = [...variableNames].sort((a, b) => b.length - a.length);
  const tokens: Token[] = [];
  let i = 0;

  while (i < expression.length) {
    const char = expression[i];

    if (/\s/.test(char)) {
      i += 1;
      continue;
    }

    if (OPERATORS.has(char)) {
      tokens.push({ type: 'op', value: char });
      i += 1;
      continue;
    }

    if (/[0-9.]/.test(char)) {
      let end = i;
      while (end < expression.length && /[0-9.]/.test(expression[end])) end += 1;
      const raw = expression.slice(i, end);
      const value = Number(raw);
      if (!Number.isFinite(value)) {
        throw new FormulaError(`Invalid number "${raw}" in formula`);
      }
      tokens.push({ type: 'num', value });
      i = end;
      continue;
    }

    if (IDENT_START.test(char)) {
      const matched = names.find((name) => {
        if (!expression.startsWith(name, i)) return false;
        const next = expression[i + name.length];
        return next === undefined || !IDENT_BOUNDARY.test(next);
      });
      if (matched) {
        tokens.push({ type: 'var', name: matched });
        i += matched.length;
        continue;
      }
      let end = i;
      while (end < expression.length && IDENT_BODY.test(expression[end])) end += 1;
      const raw = expression.slice(i, end).replace(/-+$/, '');
      throw new FormulaError(`Unknown reference "${raw}" in formula`);
    }

    throw new FormulaError(`Unexpected character "${char}" in formula`);
  }

  return tokens;
}

/**
 * Recursive descent over:
 *   expr   := term (('+' | '-') term)*
 *   term   := factor (('*' | '/') factor)*
 *   factor := ('-' | '+')? primary
 *   primary := number | variable | '(' expr ')'
 */
function parse(tokens: Token[], variables: Record<string, number>): number {
  let pos = 0;
  const peek = (): Token | undefined => tokens[pos];
  const peekOp = (...values: string[]): boolean => {
    const token = peek();
    return token !== undefined && token.type === 'op' && values.includes(token.value);
  };

  function expr(): number {
    let left = term();
    while (peekOp('+', '-')) {
      const op = (tokens[pos] as { type: 'op'; value: string }).value;
      pos += 1;
      const right = term();
      left = op === '+' ? left + right : left - right;
    }
    return left;
  }

  function term(): number {
    let left = factor();
    while (peekOp('*', '/')) {
      const op = (tokens[pos] as { type: 'op'; value: string }).value;
      pos += 1;
      const right = factor();
      if (op === '/') {
        if (right === 0) throw new FormulaError('Division by zero in formula');
        left = left / right;
      } else {
        left = left * right;
      }
    }
    return left;
  }

  function factor(): number {
    if (peekOp('-')) {
      pos += 1;
      return -factor();
    }
    if (peekOp('+')) {
      pos += 1;
      return factor();
    }
    return primary();
  }

  function primary(): number {
    const token = peek();
    if (!token) throw new FormulaError('Unexpected end of formula');
    if (token.type === 'num') {
      pos += 1;
      return token.value;
    }
    if (token.type === 'var') {
      pos += 1;
      return variables[token.name];
    }
    if (token.value === '(') {
      pos += 1;
      const value = expr();
      if (!peekOp(')')) throw new FormulaError('Missing closing parenthesis in formula');
      pos += 1;
      return value;
    }
    throw new FormulaError(`Unexpected token "${token.value}" in formula`);
  }

  const result = expr();
  if (pos < tokens.length) {
    throw new FormulaError('Unexpected trailing input in formula');
  }
  return result;
}

export function evaluateFormula(expression: string, variables: Record<string, number>): number {
  if (!expression || !expression.trim()) {
    throw new FormulaError('Formula is empty');
  }
  const result = parse(tokenize(expression, Object.keys(variables)), variables);
  if (!Number.isFinite(result)) {
    throw new FormulaError('Formula produced a non-finite result');
  }
  return result;
}
