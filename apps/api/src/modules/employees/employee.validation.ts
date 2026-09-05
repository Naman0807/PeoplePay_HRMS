import { z } from 'zod';

export const createEmployeeSchema = z.object({
  first_name: z.string().min(1).max(100),
  last_name: z.string().min(1).max(100),
  email: z.string().email(),
  department_id: z.string().uuid(),
  manager_id: z.string().uuid().optional().nullable(),
  job_position: z.string().min(1).max(100),
  working_schedule_id: z.string().uuid(),
  bank_account_no: z.string().optional().nullable(),
  bank_name: z.string().optional().nullable(),
  temporary_password: z.string().min(6).optional(),
});

export const updateEmployeeSchema = createEmployeeSchema.partial();

export const listEmployeesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  departmentId: z.string().uuid().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  search: z.string().optional(),
});

export const directoryQuerySchema = z.object({
  search: z.string().min(1).optional(),
  departmentId: z.string().uuid().optional(),
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
export type ListEmployeesQuery = z.infer<typeof listEmployeesQuerySchema>;
export type DirectoryQuery = z.infer<typeof directoryQuerySchema>;