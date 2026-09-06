import { prisma } from '../../lib/prisma';
import { pageArgs, pageResult } from '../../utils/pagination';
import { Prisma } from '@prisma/client';
import { ApiError } from '../../utils/ApiError';
import { calculateWeeklyHours } from '@peoplepay360/shared';
import type { CreateScheduleInput, UpdateScheduleInput, ListSchedulesQuery } from './schedule.validation';

function isPrismaError(error: unknown): { code?: string } | null {
  if (typeof error === 'object' && error !== null) {
    const maybe = error as { code?: unknown };
    if (typeof maybe.code === 'string') {
      return maybe as { code?: string };
    }
  }
  return null;
}

// Convert "HH:MM" string to a Date object for Prisma @db.Time fields
function toTimeDate(time: string): Date {
  const [h, m] = time.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

export async function listSchedules(query: ListSchedulesQuery) {
  const [items, total] = await Promise.all([
    prisma.workingSchedule.findMany({
      include: { schedule_lines: true },
      orderBy: { name: 'asc' },
      ...pageArgs(query),
    }),
    prisma.workingSchedule.count(),
  ]);

  return pageResult(items, total, query);
}

export async function getSchedule(id: string) {
  const schedule = await prisma.workingSchedule.findUnique({
    where: { id },
    include: { schedule_lines: true },
  });
  if (!schedule) {
    throw ApiError.notFound('Working schedule not found');
  }
  return schedule;
}

export async function createSchedule(data: CreateScheduleInput) {
  const weeklyHours = calculateWeeklyHours(data.schedule_lines);

  try {
    return await prisma.workingSchedule.create({
      data: {
        name: data.name,
        schedule_type: data.schedule_type,
        weekly_hours: weeklyHours,
        schedule_lines: {
          create: data.schedule_lines.map((line) => ({
            day_of_week: line.day_of_week,
            start_time: toTimeDate(line.start_time),
            end_time: toTimeDate(line.end_time),
            break_duration_mins: line.break_duration_mins,
          })),
        },
      },
      include: { schedule_lines: true },
    });
  } catch (error) {
    if (isPrismaError(error)?.code === 'P2002') {
      throw ApiError.conflict('Duplicate day in schedule', 'DUPLICATE_DAY');
    }
    throw error;
  }
}

export async function updateSchedule(id: string, data: UpdateScheduleInput) {
  const existing = await prisma.workingSchedule.findUnique({ where: { id } });
  if (!existing) {
    throw ApiError.notFound('Working schedule not found');
  }

  const hasLines = data.schedule_lines !== undefined;
  const updateData: Prisma.WorkingScheduleUpdateInput = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.schedule_type !== undefined) updateData.schedule_type = data.schedule_type;
  if (hasLines) {
    updateData.weekly_hours = calculateWeeklyHours(data.schedule_lines!);
  }

  return prisma.$transaction(async (tx) => {
    await tx.workingSchedule.update({
      where: { id },
      data: updateData,
    });

    if (hasLines) {
      await tx.scheduleLine.deleteMany({ where: { working_schedule_id: id } });
      await tx.scheduleLine.createMany({
        data: data.schedule_lines!.map((line) => ({
          working_schedule_id: id,
          day_of_week: line.day_of_week,
          start_time: toTimeDate(line.start_time),
          end_time: toTimeDate(line.end_time),
          break_duration_mins: line.break_duration_mins,
        })),
      });
    }

    return tx.workingSchedule.findUnique({
      where: { id },
      include: { schedule_lines: true },
    });
  });
}

export async function deleteSchedule(id: string) {
  try {
    await prisma.workingSchedule.delete({ where: { id } });
  } catch (error) {
    if (isPrismaError(error)?.code === 'P2003') {
      throw ApiError.conflict('Cannot delete schedule in use', 'SCHEDULE_IN_USE');
    }
    throw error;
  }
}