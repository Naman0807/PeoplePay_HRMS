import { z } from 'zod';
import { paginationFields } from '../../utils/pagination';

export const listPayrunsQuerySchema = z.object({ ...paginationFields });
export type ListPayrunsQuery = z.infer<typeof listPayrunsQuerySchema>;

export const createPayrunSchema = z.object({
  name: z.string().min(1).max(100),
  salary_structure_id: z.string().uuid(),
  period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
}).refine((data) => data.period_start <= data.period_end, {
  message: 'period_start must be before or equal to period_end',
  path: ['period_end'],
});

export const selectEmployeesSchema = z.object({
  employee_ids: z.array(z.string().uuid()).min(1, 'At least one employee required'),
});

export type CreatePayrunInput = z.infer<typeof createPayrunSchema>;
export type SelectEmployeesInput = z.infer<typeof selectEmployeesSchema>;