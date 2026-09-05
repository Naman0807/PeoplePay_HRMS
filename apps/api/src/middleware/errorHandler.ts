import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { ApiError } from '../utils/ApiError';
import { error } from '../utils/apiResponse';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  // Custom API error
  if (err instanceof ApiError) {
    return res.status(err.status).json(error(err.message, err.code, err.details));
  }

  // Zod validation error
  if (err instanceof ZodError) {
    const details = err.errors.map((e) => ({
      path: e.path.join('.'),
      message: e.message,
    }));
    return res.status(400).json(error('Validation failed', 'VALIDATION_ERROR', details));
  }

  // Prisma known errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002':
        return res.status(409).json(error('Unique constraint violation', 'DUPLICATE_ENTRY', { target: err.meta?.target }));
      case 'P2025':
        return res.status(404).json(error('Record not found', 'NOT_FOUND'));
      case 'P2003':
        return res.status(409).json(error('Foreign key constraint failed', 'FK_CONSTRAINT', { target: err.meta?.field_name }));
      default:
        return res.status(500).json(error('Database error', 'DB_ERROR'));
    }
  }

  // Unknown error — don't leak stack traces
  console.error('Unhandled error:', err);
  return res.status(500).json(error('Internal server error', 'INTERNAL_ERROR'));
}
