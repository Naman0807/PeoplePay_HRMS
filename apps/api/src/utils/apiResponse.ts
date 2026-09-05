import type { ApiResponse, PaginationMeta } from '@peoplepay360/shared';

export function ok<T>(data: T, meta?: PaginationMeta): ApiResponse<T> {
  return { success: true, data, ...(meta ? { meta } : {}) };
}

export function created<T>(data: T): ApiResponse<T> {
  return { success: true, data };
}

export function error(message: string, code: string, details?: unknown): ApiResponse<never> {
  return {
    success: false,
    error: { code, message, ...(details !== undefined ? { details } : {}) },
  };
}
