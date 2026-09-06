import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { pageArgs, pageResult } from '../../utils/pagination';
import { ApiError } from '../../utils/ApiError';
import { computeWorkedHours, classifyAttendance } from '../../utils/attendanceRules';
import { utcDayStart } from '../../utils/dates';
import type { ListAttendanceQuery, UpdateAttendanceInput } from './attendance.validation';

async function findEmployeeByUserId(userId: string) {
  const employee = await prisma.employee.findUnique({ where: { user_id: userId } });
  if (!employee) {
    throw ApiError.notFound('Employee profile not found', 'EMPLOYEE_NOT_FOUND');
  }
  return employee;
}

export async function punchIn(userId: string) {
  const employee = await findEmployeeByUserId(userId);
  const today = utcDayStart();

  const existing = await prisma.attendance.findUnique({
    where: { employee_id_date: { employee_id: employee.id, date: today } },
  });

  if (existing) {
    if (existing.check_in) {
      throw ApiError.conflict('Already punched in today', 'ALREADY_PUNCHED_IN');
    }
    return prisma.attendance.update({
      where: { id: existing.id },
      data: { check_in: new Date(), status: 'EXCEPTION' },
    });
  }

  return prisma.attendance.create({
    data: {
      employee_id: employee.id,
      date: today,
      check_in: new Date(),
      status: 'EXCEPTION',
    },
  });
}

export async function punchOut(userId: string) {
  const employee = await findEmployeeByUserId(userId);
  const today = utcDayStart();

  const existing = await prisma.attendance.findUnique({
    where: { employee_id_date: { employee_id: employee.id, date: today } },
  });

  if (!existing) {
    throw ApiError.notFound('No punch-in record for today', 'NO_PUNCH_IN');
  }

  if (existing.check_out) {
    throw ApiError.conflict('Already punched out', 'ALREADY_PUNCHED_OUT');
  }

  const checkOut = new Date();
  const workedHours = existing.check_in ? computeWorkedHours(existing.check_in, checkOut) : null;
  const status = existing.check_in ? classifyAttendance(existing.check_in, checkOut) : 'EXCEPTION';

  return prisma.attendance.update({
    where: { id: existing.id },
    data: {
      check_out: checkOut,
      worked_hours: workedHours,
      status,
    },
  });
}

export async function listOwnAttendance(userId: string, query: ListAttendanceQuery) {
  const employee = await findEmployeeByUserId(userId);

  const where: Prisma.AttendanceWhereInput = { employee_id: employee.id };

  if (query.from || query.to) {
    where.date = {};
    if (query.from) where.date.gte = new Date(query.from);
    if (query.to) where.date.lte = new Date(query.to);
  }

  if (query.status) {
    where.status = query.status;
  }

  const [items, total] = await Promise.all([
    prisma.attendance.findMany({ where, orderBy: { date: 'desc' }, ...pageArgs(query) }),
    prisma.attendance.count({ where }),
  ]);

  return pageResult(items, total, query);
}

export async function listAllAttendance(query: ListAttendanceQuery) {
  const where: Prisma.AttendanceWhereInput = {};

  if (query.employeeId) {
    where.employee_id = query.employeeId;
  }

  if (query.from || query.to) {
    where.date = {};
    if (query.from) where.date.gte = new Date(query.from);
    if (query.to) where.date.lte = new Date(query.to);
  }

  if (query.status) {
    where.status = query.status;
  }

  const [items, total] = await Promise.all([
    prisma.attendance.findMany({
      where,
      include: { employee: { select: { id: true, first_name: true, last_name: true } } },
      orderBy: { date: 'desc' },
      ...pageArgs(query),
    }),
    prisma.attendance.count({ where }),
  ]);

  return pageResult(items, total, query);
}

export async function listExceptions(query: ListAttendanceQuery) {
  const where: Prisma.AttendanceWhereInput = { status: 'EXCEPTION' };

  if (query.employeeId) {
    where.employee_id = query.employeeId;
  }

  if (query.from || query.to) {
    where.date = {};
    if (query.from) where.date.gte = new Date(query.from);
    if (query.to) where.date.lte = new Date(query.to);
  }

  const [items, total] = await Promise.all([
    prisma.attendance.findMany({
      where,
      include: { employee: { select: { id: true, first_name: true, last_name: true } } },
      orderBy: { date: 'desc' },
      ...pageArgs(query),
    }),
    prisma.attendance.count({ where }),
  ]);

  return pageResult(items, total, query);
}

export async function updateAttendance(id: string, data: UpdateAttendanceInput, editorId: string) {
  const existing = await prisma.attendance.findUnique({ where: { id } });
  if (!existing) {
    throw ApiError.notFound('Attendance record not found', 'ATTENDANCE_NOT_FOUND');
  }

  const updateData: Prisma.AttendanceUpdateInput = {};

  if (data.check_in) {
    updateData.check_in = new Date(data.check_in);
  }
  if (data.check_out) {
    updateData.check_out = new Date(data.check_out);
  }

  const finalCheckIn = data.check_in ? new Date(data.check_in) : existing.check_in;
  const finalCheckOut = data.check_out ? new Date(data.check_out) : existing.check_out;

  if (finalCheckIn && finalCheckOut) {
    updateData.worked_hours = computeWorkedHours(finalCheckIn, finalCheckOut);
  }

  updateData.status = 'MANUALLY_EDITED';
  updateData.editor = { connect: { id: editorId } };

  return prisma.attendance.update({
    where: { id },
    data: updateData,
  });
}
