import type { NextFunction, Request, RequestHandler, Response } from "express";
import jwt from "jsonwebtoken";
import type { Role } from "@prisma/client";
import { forbidden, unauthorized } from "../lib/response";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error("JWT_SECRET is not set — copy .env.example to .env");

export type TokenPayload = { user_id: number; role: Role; employee_id: number | null };

export const signToken = (payload: TokenPayload) =>
  jwt.sign(payload, JWT_SECRET, { expiresIn: "12h" });

/** Verifies the Bearer token and attaches req.user. */
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return next(unauthorized());

  try {
    req.user = jwt.verify(token, JWT_SECRET!) as TokenPayload;
    return next();
  } catch {
    return next(unauthorized("Session expired or token invalid."));
  }
}

/**
 * The single role gate (AGENT.md §5) — one middleware, not per-handler checks.
 * Always runs behind requireAuth. ADMIN passes every gate.
 */
export const requireRole =
  (...roles: Role[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) return next(unauthorized());
    if (req.user.role === "ADMIN" || roles.includes(req.user.role)) return next();
    return next(forbidden());
  };
