import { z } from 'zod';

export const punchInSchema = z.object({});

export const punchOutSchema = z.object({});

export const listAttendanceQuerySchema = z.object({
  employeeId: z.string().uuid().optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.enum(['NORMAL', 'EXCEPTION', 'MANUALLY_EDITED']).optional(),
});

export const updateAttendanceSchema = z.object({
  check_in: z.string().datetime().optional(),
  check_out: z.string().datetime().optional(),
}).refine((data) => data.check_in || data.check_out, {
  message: 'At least one of check_in or check_out must be provided',
});

export type ListAttendanceQuery = z.infer<typeof listAttendanceQuerySchema>;
export type UpdateAttendanceInput = z.infer<typeof updateAttendanceSchema>;
