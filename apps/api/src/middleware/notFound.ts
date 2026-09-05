import type { Request, Response } from 'express';
import { error } from '../utils/apiResponse';

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json(error('Route not found', 'NOT_FOUND'));
}
