import { z } from 'zod';

/** Query fields every paginated list endpoint accepts. Spread into a z.object(). */
export const paginationFields = {
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
};

export interface PageQuery {
  page: number;
  pageSize: number;
}

/** Prisma skip/take for a 1-based page. */
export function pageArgs({ page, pageSize }: PageQuery) {
  return { skip: (page - 1) * pageSize, take: pageSize };
}

/** Envelope every paginated list endpoint returns. */
export function pageResult<T>(items: T[], total: number, { page, pageSize }: PageQuery) {
  return {
    items,
    meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
}
