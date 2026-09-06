import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { pageArgs, pageResult } from '../../utils/pagination';
import { ApiError } from '../../utils/ApiError';
import { assertBalanceAvailable, calculateDuration } from '../../utils/timeOffRules';
import type { UserRole } from '@peoplepay360/shared';
import type { CreateRequestInput, UpdateRequestInput } from './request.validation';

const REQUEST_INCLUDE = {
  employee: { select: { id: true, first_name: true, last_name: true } },
  time_off_type: true,
  approver: { select: { id: true, email: true } },
} as const;

async function findEmployeeByUserId(userId: string) {
  const employee = await prisma.employee.findUnique({ where: { user_id: userId } });
  if (!employee) {
    throw ApiError.notFound('Employee profile not found', 'EMPLOYEE_NOT_FOUND');
  }
  return employee;
}

async function findRequestOrThrow(id: string) {
  const request = await prisma.timeOffRequest.findUnique({
    where: { id },
    include: REQUEST_INCLUDE,
  });

  if (!request) {
    throw ApiError.notFound('Time off request not found', 'TIME_OFF_REQUEST_NOT_FOUND');
  }

  return request;
}

export async function listRequests(
  userId: string,
  userRole: UserRole,
  query: { page: number; pageSize: number; employee_id?: string }
) {
  const where: Prisma.TimeOffRequestWhereInput = {};

  if (userRole === 'EMPLOYEE') {
    const employee = await findEmployeeByUserId(userId);
    where.employee_id = employee.id;
  } else if (query.employee_id) {
    where.employee_id = query.employee_id;
  }

  const [items, total] = await Promise.all([
    prisma.timeOffRequest.findMany({
      where,
      include: REQUEST_INCLUDE,
      orderBy: { created_at: 'desc' },
      ...pageArgs(query),
    }),
    prisma.timeOffRequest.count({ where }),
  ]);

  return pageResult(items, total, query);
}

export async function getRequest(id: string) {
  return findRequestOrThrow(id);
}

export async function createRequest(data: CreateRequestInput, userId: string, userRole: UserRole) {
  let employeeId = data.employee_id;

  if (userRole === 'EMPLOYEE') {
    const employee = await findEmployeeByUserId(userId);
    if (data.employee_id && data.employee_id !== employee.id) {
      throw ApiError.forbidden('Employees can only create requests for themselves', 'FORBIDDEN');
    }
    employeeId = employee.id;
  } else {
    const employee = await prisma.employee.findUnique({ where: { id: data.employee_id } });
    if (!employee) {
      throw ApiError.notFound('Employee not found', 'EMPLOYEE_NOT_FOUND');
    }
  }

  const type = await prisma.timeOffType.findUnique({ where: { id: data.time_off_type_id } });
  if (!type) {
    throw ApiError.notFound('Time off type not found', 'TIME_OFF_TYPE_NOT_FOUND');
  }

  const duration = calculateDuration(
    new Date(data.start_date),
    new Date(data.end_date),
    type.unit
  );

  return prisma.timeOffRequest.create({
    data: {
      employee_id: employeeId,
      time_off_type_id: data.time_off_type_id,
      start_date: new Date(data.start_date),
      end_date: new Date(data.end_date),
      duration,
      status: 'DRAFT',
    },
    include: REQUEST_INCLUDE,
  });
}

export async function submitRequest(id: string) {
  const request = await prisma.timeOffRequest.findUnique({ where: { id } });

  if (!request) {
    throw ApiError.notFound('Time off request not found', 'TIME_OFF_REQUEST_NOT_FOUND');
  }

  if (request.status !== 'DRAFT') {
    throw ApiError.conflict('Only draft requests can be submitted', 'INVALID_STATUS');
  }

  try {
    await assertBalanceAvailable(
      prisma,
      request.employee_id,
      request.time_off_type_id,
      request.start_date,
      request.end_date,
      Number(request.duration)
    );
  } catch (err: any) {
    if (err?.code === 'INSUFFICIENT_BALANCE') {
      throw ApiError.badRequest(err.message, 'INSUFFICIENT_BALANCE');
    }
    throw err;
  }

  return prisma.timeOffRequest.update({
    where: { id },
    data: { status: 'SUBMITTED' },
    include: REQUEST_INCLUDE,
  });
}

export async function approveRequest(id: string, approverId: string) {
  const request = await prisma.timeOffRequest.findUnique({ where: { id } });

  if (!request) {
    throw ApiError.notFound('Time off request not found', 'TIME_OFF_REQUEST_NOT_FOUND');
  }

  if (request.status !== 'SUBMITTED') {
    throw ApiError.conflict(
      request.status === 'APPROVED'
        ? 'Request has already been approved'
        : request.status === 'REFUSED'
          ? 'Request has already been refused'
          : 'Request must be submitted before approval',
      'INVALID_STATUS'
    );
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.timeOffRequest.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approved_by: approverId,
      },
      include: REQUEST_INCLUDE,
    });

    const allocations = await tx.timeOffAllocation.findMany({
      where: {
        employee_id: request.employee_id,
        time_off_type_id: request.time_off_type_id,
        status: 'APPROVED',
        valid_from: { lte: request.start_date },
        valid_to: { gte: request.end_date },
      },
    });

    if (allocations.length > 0) {
      await tx.timeOffAllocation.updateMany({
        where: { id: { in: allocations.map((a) => a.id) } },
        data: { taken_units: { increment: Number(request.duration) } },
      });
    }

    return updated;
  });
}

export async function refuseRequest(id: string, approverId: string) {
  const request = await prisma.timeOffRequest.findUnique({ where: { id } });

  if (!request) {
    throw ApiError.notFound('Time off request not found', 'TIME_OFF_REQUEST_NOT_FOUND');
  }

  if (request.status !== 'SUBMITTED') {
    throw ApiError.conflict('Only submitted requests can be refused', 'INVALID_STATUS');
  }

  return prisma.timeOffRequest.update({
    where: { id },
    data: {
      status: 'REFUSED',
      approved_by: approverId,
    },
    include: REQUEST_INCLUDE,
  });
}

export async function updateRequest(id: string, data: UpdateRequestInput) {
  const request = await findRequestOrThrow(id);

  if (request.status !== 'DRAFT') {
    throw ApiError.conflict('Only draft requests can be updated', 'INVALID_STATUS');
  }

  const newTypeId = data.time_off_type_id ?? request.time_off_type_id;
  const newStartDate = data.start_date ? new Date(data.start_date) : request.start_date;
  const newEndDate = data.end_date ? new Date(data.end_date) : request.end_date;

  let duration: number | undefined;
  if (data.start_date || data.end_date || data.time_off_type_id) {
    const type = await prisma.timeOffType.findUnique({ where: { id: newTypeId } });
    if (!type) {
      throw ApiError.notFound('Time off type not found', 'TIME_OFF_TYPE_NOT_FOUND');
    }
    duration = calculateDuration(newStartDate, newEndDate, type.unit);
  }

  try {
    return await prisma.timeOffRequest.update({
      where: { id },
      data: {
        ...(data.employee_id ? { employee_id: data.employee_id } : {}),
        ...(data.time_off_type_id ? { time_off_type_id: data.time_off_type_id } : {}),
        ...(data.start_date ? { start_date: newStartDate } : {}),
        ...(data.end_date ? { end_date: newEndDate } : {}),
        ...(duration !== undefined ? { duration } : {}),
      },
      include: REQUEST_INCLUDE,
    });
  } catch (err: any) {
    if (err?.code === 'P2025') {
      throw ApiError.notFound('Time off request not found', 'TIME_OFF_REQUEST_NOT_FOUND');
    }
    throw err;
  }
}

export async function deleteRequest(id: string) {
  const request = await findRequestOrThrow(id);

  if (request.status !== 'DRAFT') {
    throw ApiError.conflict('Only draft requests can be deleted', 'INVALID_STATUS');
  }

  try {
    await prisma.timeOffRequest.delete({ where: { id } });
    return { id };
  } catch (err: any) {
    if (err?.code === 'P2025') {
      throw ApiError.notFound('Time off request not found', 'TIME_OFF_REQUEST_NOT_FOUND');
    }
    throw err;
  }
}