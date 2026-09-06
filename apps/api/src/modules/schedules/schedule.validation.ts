import { z } from 'zod';
import { paginationFields } from '../../utils/pagination';

export const scheduleLineSchema = z.object({
  day_of_week: z.enum(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be HH:MM'),
  end_time: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be HH:MM'),
  break_duration_mins: z.number().int().min(0).max(480),
});

export const createScheduleSchema = z.object({
  name: z.string().min(1).max(100),
  schedule_type: z.string().min(1).max(50),
  schedule_lines: z.array(scheduleLineSchema).min(1, 'At least one schedule line required'),
});

export const updateScheduleSchema = createScheduleSchema.partial();

export const listSchedulesQuerySchema = z.object({
  ...paginationFields,
});

export type CreateScheduleInput = z.infer<typeof createScheduleSchema>;
export type UpdateScheduleInput = z.infer<typeof updateScheduleSchema>;
export type ListSchedulesQuery = z.infer<typeof listSchedulesQuerySchema>;
