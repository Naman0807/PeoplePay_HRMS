import { z } from 'zod';

export const createContractSchema = z.object({
  employee_id: z.string().uuid(),
  name: z.string().min(1).max(100),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional().nullable(),
  wage: z.number().nonnegative(),
  salary_structure_id: z.string().uuid(),
  working_schedule_id: z.string().uuid(),
  status: z.enum(['DRAFT', 'RUNNING', 'EXPIRED', 'CANCELLED']).default('DRAFT'),
}).refine((data) => !data.end_date || data.start_date <= data.end_date, {
  message: 'start_date must be before or equal to end_date',
  path: ['end_date'],
});

export const updateContractSchema = createContractSchema.innerType().partial();

export const listContractsQuerySchema = z.object({
  employeeId: z.string().uuid().optional(),
  status: z.enum(['DRAFT', 'RUNNING', 'EXPIRED', 'CANCELLED']).optional(),
});

export type CreateContractInput = z.infer<typeof createContractSchema>;
export type UpdateContractInput = z.infer<typeof updateContractSchema>;
export type ListContractsQuery = z.infer<typeof listContractsQuerySchema>;
