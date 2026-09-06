import { z } from 'zod';
import { paginationFields } from '../../utils/pagination';

export const listRequestsQuerySchema = z.object({
  ...paginationFields,
  employee_id: z.string().uuid().optional(),
  status: z.string().optional(),
});

export type ListRequestsQuery = z.infer<typeof listRequestsQuerySchema>;

const requestBaseSchema = z.object({
  employee_id: z.string().uuid(),
  time_off_type_id: z.string().uuid(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
});

export const createRequestSchema = requestBaseSchema.refine((data) => data.start_date <= data.end_date, {
  message: 'start_date must be before or equal to end_date',
  path: ['end_date'],
});

export const updateRequestSchema = requestBaseSchema.partial().superRefine((data, ctx) => {
  if (data.start_date && data.end_date && data.start_date > data.end_date) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'start_date must be before or equal to end_date',
      path: ['end_date'],
    });
  }
});

export type CreateRequestInput = z.infer<typeof createRequestSchema>;
export type UpdateRequestInput = z.infer<typeof updateRequestSchema>;