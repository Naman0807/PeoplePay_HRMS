import { z } from 'zod';

const allocationBaseSchema = z.object({
  employee_id: z.string().uuid(),
  time_off_type_id: z.string().uuid(),
  allocated_units: z.number().positive(),
  valid_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  valid_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
});

export const createAllocationSchema = allocationBaseSchema.refine(
  (data) => data.valid_from <= data.valid_to,
  {
    message: 'valid_from must be before or equal to valid_to',
    path: ['valid_to'],
  }
);

export const updateAllocationSchema = allocationBaseSchema.partial();

export type CreateAllocationInput = z.infer<typeof createAllocationSchema>;
export type UpdateAllocationInput = z.infer<typeof updateAllocationSchema>;
