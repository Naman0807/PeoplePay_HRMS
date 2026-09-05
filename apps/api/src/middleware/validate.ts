import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';

type ValidationSource = 'body' | 'query' | 'params';

export function validate(schema: ZodSchema, source: ValidationSource = 'body') {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req[source]);
      if (source === 'body') {
        req.body = parsed;
      } else if (source === 'query') {
        req.query = parsed as Request['query'];
      } else {
        req.params = parsed as Request['params'];
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
