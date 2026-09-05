import type { Request, Response, NextFunction } from 'express';
import type { UserRole } from '@peoplepay360/shared';
import { ApiError } from '../utils/ApiError';

export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required', 'NO_TOKEN'));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        ApiError.forbidden(
          `Role ${req.user.role} is not allowed to access this resource`,
          'INSUFFICIENT_PERMISSIONS'
        )
      );
    }

    next();
  };
}
