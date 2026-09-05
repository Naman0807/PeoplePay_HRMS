import { z } from 'zod';

export const createTimeOffTypeSchema = z.object({
  name: z.string().min(1).max(100),
  unit: z.enum(['DAYS', 'HOURS']),
  requires_allocation: z.boolean().default(true),
  payroll_integration: z.boolean().default(false),
});

export const updateTimeOffTypeSchema = createTimeOffTypeSchema.partial();

export type CreateTimeOffTypeInput = z.infer<typeof createTimeOffTypeSchema>;
export type UpdateTimeOffTypeInput = z.infer<typeof updateTimeOffTypeSchema>;
