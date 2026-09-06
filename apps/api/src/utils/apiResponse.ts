import { Prisma } from '@prisma/client';
import type { ApiResponse, PaginationMeta } from '@peoplepay360/shared';

/**
 * Prisma serialises `Decimal` columns to JSON as strings, so clients that treat
 * a declared `number` field as one (`worked_hours.toFixed(2)`) crash. Convert
 * them once here, where every successful response is built.
 *
 * ponytail: values fit comfortably in float64 at these scales (12,2 money and
 * 5,2 hours); switch to a string-based money type if precision ever matters.
 */
function toPlainNumbers(value: unknown): unknown {
  if (value instanceof Prisma.Decimal) return value.toNumber();
  if (value === null || typeof value !== 'object') return value;
  if (value instanceof Date) return value;
  if (Array.isArray(value)) return value.map(toPlainNumbers);

  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    out[key] = toPlainNumbers(item);
  }
  return out;
}

export function ok<T>(data: T, meta?: PaginationMeta): ApiResponse<T> {
  return { success: true, data: toPlainNumbers(data) as T, ...(meta ? { meta } : {}) };
}

export function created<T>(data: T): ApiResponse<T> {
  return { success: true, data: toPlainNumbers(data) as T };
}

export function error(message: string, code: string, details?: unknown): ApiResponse<never> {
  return {
    success: false,
    error: { code, message, ...(details !== undefined ? { details } : {}) },
  };
}
