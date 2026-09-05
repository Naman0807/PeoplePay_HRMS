import type { Response } from "express";

// The success / error envelopes from AGENT.md §4. Every route replies through these.

export type Meta = { page: number; limit: number; total_records: number };
export type ErrorDetail = { field: string; issue: string };

export function ok(res: Response, data: unknown, code = 200, meta?: Meta) {
  return res.status(code).json({ success: true, code, data, ...(meta ? { meta } : {}) });
}

export function okList(res: Response, data: unknown[], meta: Meta) {
  return ok(res, data, 200, meta);
}

/** Thrown anywhere in a handler; the global error middleware turns it into the error envelope. */
export class ApiError extends Error {
  constructor(
    public code: number,
    public error: string,
    message: string,
    public details: ErrorDetail[] = []
  ) {
    super(message);
  }
}

export const badRequest = (message: string, details: ErrorDetail[] = []) =>
  new ApiError(400, "VALIDATION_FAILED", message, details);

export const unauthorized = (message = "Not logged in.") =>
  new ApiError(401, "UNAUTHORIZED", message);

export const forbidden = (message = "Your role does not allow this action.") =>
  new ApiError(403, "FORBIDDEN", message);

export const notFound = (what: string) =>
  new ApiError(404, "NOT_FOUND", `${what} not found.`);

export const conflict = (error: string, message: string, details: ErrorDetail[] = []) =>
  new ApiError(409, error, message, details);
