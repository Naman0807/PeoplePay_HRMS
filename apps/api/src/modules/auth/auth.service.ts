import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../utils/ApiError';
import type { RegisterInput } from './auth.validation';

export const refreshTokenStore = new Map<string, string>();

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

export function signAccessToken(user: { id: string; role: string }) {
  return jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, {
    expiresIn: JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

export function signRefreshToken(user: { id: string }) {
  return jwt.sign({ sub: user.id }, JWT_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

export async function registerUser(data: RegisterInput) {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    throw ApiError.conflict('Email already registered', 'EMAIL_ALREADY_REGISTERED');
  }

  const passwordHash = await bcrypt.hash(data.password, 10);

  try {
    return await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: data.email,
          password_hash: passwordHash,
          first_name: data.firstName,
          last_name: data.lastName,
          role: 'EMPLOYEE',
          requested_role: data.role,
          approval_status: 'PENDING',
          is_active: false,
        },
      });

      const { password_hash: _passwordHash, ...safeUser } = user;
      return safeUser;
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw ApiError.conflict('Email already registered', 'EMAIL_ALREADY_REGISTERED');
    }
    throw err;
  }
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      role: true,
      is_active: true,
      approval_status: true,
      password_hash: true,
    },
  });

  if (!user) {
    throw ApiError.unauthorized('Invalid credentials', 'INVALID_CREDENTIALS');
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    throw ApiError.unauthorized('Invalid credentials', 'INVALID_CREDENTIALS');
  }

  if (user.approval_status === 'PENDING') {
    throw ApiError.forbidden('Your account is pending admin approval', 'ACCOUNT_PENDING_APPROVAL');
  }
  if (user.approval_status === 'REJECTED') {
    throw ApiError.forbidden('Your account was rejected', 'ACCOUNT_REJECTED');
  }
  if (!user.is_active) {
    throw ApiError.forbidden('Your account has been deactivated', 'ACCOUNT_DISABLED');
  }

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  refreshTokenStore.set(refreshToken, user.id);

  return {
    accessToken,
    refreshToken,
    user: { id: user.id, email: user.email, role: user.role },
  };
}

export async function refresh(refreshToken: string) {
  let payload: { sub: string };
  try {
    payload = jwt.verify(refreshToken, JWT_SECRET) as { sub: string };
  } catch {
    throw ApiError.unauthorized('Invalid refresh token', 'INVALID_REFRESH_TOKEN');
  }

  const userId = refreshTokenStore.get(refreshToken);
  if (!userId || userId !== payload.sub) {
    throw ApiError.unauthorized('Invalid refresh token', 'INVALID_REFRESH_TOKEN');
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, role: true, is_active: true, approval_status: true },
  });

  if (!user) {
    throw ApiError.unauthorized('Invalid refresh token', 'INVALID_REFRESH_TOKEN');
  }

  // An account rejected or deactivated after login must not keep minting access
  // tokens off the refresh token it was issued earlier.
  if (user.approval_status !== 'APPROVED' || !user.is_active) {
    refreshTokenStore.delete(refreshToken);
    throw ApiError.forbidden('Your account is no longer active', 'ACCOUNT_NOT_ACTIVE');
  }

  const accessToken = signAccessToken(user);
  return { accessToken };
}

export async function logout(refreshToken: string) {
  refreshTokenStore.delete(refreshToken);
}
