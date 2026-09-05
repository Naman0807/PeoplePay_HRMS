import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../lib/response";

/** 404 for unmatched routes — keeps the error envelope consistent even off the route map. */
export function notFoundHandler(_req: Request, res: Response) {
  return res.status(404).json({
    success: false,
    code: 404,
    error: "NOT_FOUND",
    message: "Route not found.",
    details: [],
  });
}

/**
 * Global exception handler (AGENT.md §5). No unhandled error reaches the client
 * as a raw stack trace — unknown failures are logged server-side and reported as 500.
 */
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    return res.status(err.code).json({
      success: false,
      code: err.code,
      error: err.error,
      message: err.message,
      details: err.details,
    });
  }

  console.error("[unhandled]", err);
  return res.status(500).json({
    success: false,
    code: 500,
    error: "INTERNAL_ERROR",
    message: "Something went wrong on our side.",
    details: [],
  });
}
