import { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../utils/ApiError';
import type {
  CreateUserInput,
  UpdateUserInput,
  UpdateUserStatusInput,
  ListUsersQuery,
} from './user.validation';

const userSafeSelect = {
  id: true,
  email: true,
  role: true,
  first_name: true,
  last_name: true,
  is_active: true,
  requested_role: true,
  approval_status: true,
  created_at: true,
  updated_at: true,
} satisfies Prisma.UserSelect;

const userWithEmployeesSelect = {
  ...userSafeSelect,
  employees: {
    select: {
      id: true,
      first_name: true,
      last_name: true,
      email: true,
      job_position: true,
      status: true,
      department: { select: { id: true, name: true } },
    },
  },
} satisfies Prisma.UserSelect;

async function findUserOrThrow(id: string) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw ApiError.notFound('User not found', 'USER_NOT_FOUND');
  }
  return user;
}

async function assertEmailAvailable(email: string, excludeId?: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing && existing.id !== excludeId) {
    throw ApiError.conflict('A user with this email already exists', 'DUPLICATE_EMAIL');
  }
}

export async function listUsers(query: ListUsersQuery) {
  const { page, pageSize, search, role, isActive } = query;

  const where: Prisma.UserWhereInput = {};

  if (search) {
    where.OR = [
      { email: { contains: search, mode: 'insensitive' } },
      { first_name: { contains: search, mode: 'insensitive' } },
      { last_name: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (role) where.role = role;
  if (isActive !== undefined) where.is_active = isActive === 'true';

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: userWithEmployeesSelect,
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    items,
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

export async function getUser(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      ...userWithEmployeesSelect,
      employees: {
        select: {
          id: true,
          first_name: true,
          last_name: true,
          email: true,
          job_position: true,
          status: true,
          department: { select: { id: true, name: true } },
          manager: { select: { id: true, first_name: true, last_name: true } },
        },
      },
    },
  });

  if (!user) {
    throw ApiError.notFound('User not found', 'USER_NOT_FOUND');
  }

  return user;
}

export async function createUser(data: CreateUserInput) {
  await assertEmailAvailable(data.email);

  const passwordHash = await bcrypt.hash(data.password, 10);

  return prisma.user.create({
    data: {
      email: data.email,
      password_hash: passwordHash,
      role: data.role,
      first_name: data.firstName ?? null,
      last_name: data.lastName ?? null,
      is_active: true,
    },
    select: userSafeSelect,
  });
}

export async function updateUser(id: string, data: UpdateUserInput) {
  await findUserOrThrow(id);

  if (data.email) {
    await assertEmailAvailable(data.email, id);
  }

  try {
    return await prisma.user.update({
      where: { id },
      data: {
        ...(data.email ? { email: data.email } : {}),
        ...(data.role ? { role: data.role } : {}),
        ...(data.firstName !== undefined ? { first_name: data.firstName } : {}),
        ...(data.lastName !== undefined ? { last_name: data.lastName } : {}),
        ...(data.isActive !== undefined ? { is_active: data.isActive } : {}),
      },
      select: userSafeSelect,
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      throw ApiError.notFound('User not found', 'USER_NOT_FOUND');
    }
    throw err;
  }
}

export async function deleteUser(id: string) {
  await findUserOrThrow(id);

  return prisma.user.update({
    where: { id },
    data: { is_active: false },
    select: userSafeSelect,
  });
}

export async function updateUserStatus(id: string, data: UpdateUserStatusInput) {
  await findUserOrThrow(id);

  return prisma.user.update({
    where: { id },
    data: { is_active: data.isActive },
    select: userSafeSelect,
  });
}

export async function listPendingUsers() {
  return prisma.user.findMany({
    where: { approval_status: 'PENDING' },
    select: {
      id: true,
      email: true,
      first_name: true,
      last_name: true,
      requested_role: true,
      created_at: true,
    },
    orderBy: { created_at: 'desc' },
  });
}

export async function approveUser(id: string) {
  const user = await findUserOrThrow(id);

  if (user.approval_status !== 'PENDING') {
    throw ApiError.conflict('User is not pending approval', 'NOT_PENDING_APPROVAL');
  }

  const requestedRole = user.requested_role ?? 'EMPLOYEE';

  return prisma.$transaction(async (tx) => {
    const approved = await tx.user.update({
      where: { id },
      data: {
        role: requestedRole,
        requested_role: requestedRole,
        approval_status: 'APPROVED',
        is_active: true,
      },
      select: userSafeSelect,
    });

    await tx.employee.create({
      data: {
        user_id: id,
        first_name: user.first_name ?? '',
        last_name: user.last_name ?? '',
        email: user.email,
        job_position: 'New Employee',
        status: 'ACTIVE',
      },
    });

    return approved;
  });
}

export async function rejectUser(id: string) {
  const user = await findUserOrThrow(id);

  if (user.approval_status !== 'PENDING') {
    throw ApiError.conflict('User is not pending approval', 'NOT_PENDING_APPROVAL');
  }

  return prisma.user.update({
    where: { id },
    data: { approval_status: 'REJECTED', is_active: false },
    select: userSafeSelect,
  });
}