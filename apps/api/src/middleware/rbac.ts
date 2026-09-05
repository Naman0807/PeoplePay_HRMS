import type { Request, Response, NextFunction } from 'express';
import { can, type Capability } from '@peoplepay360/shared';
import { ApiError } from '../utils/ApiError';

export function requireCapability(capability: Capability) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required', 'NO_TOKEN'));
    }

    if (!can(req.user.role, capability)) {
      return next(
        ApiError.forbidden(
          `Role ${req.user.role} does not have permission: ${capability}`,
          'INSUFFICIENT_PERMISSIONS'
        )
      );
    }

    next();
  };
}
