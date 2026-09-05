import type { Request } from "express";
import type { Prisma, Role } from "@prisma/client";
import { forbidden } from "./response";

/**
 * Record-level access, layered on top of the requireRole gate.
 *
 * requireRole answers "may this role perform this action at all". This answers
 * "whose records may they touch" — without it a logged-in EMPLOYEE can read any
 * payslip, any wage, and file leave in someone else's name, because every handler
 * takes employee_id from the request rather than from the token.
 *
 * EMPLOYEE is scoped to their own records. Every other role sees the organisation,
 * which is the point of those roles.
 */

const SELF_ONLY: Role[] = ["EMPLOYEE"];

export const isPrivileged = (role: Role) => !SELF_ONLY.includes(role);

/** Roles allowed to see payroll-wide data: payruns and the dashboard aggregates. */
export const PAYROLL_VIEW_ROLES: Role[] = [
  "HR_MANAGER",
  "HR_PAYROLL_USER",
  "HR_PAYROLL_MANAGER",
];

/**
 * Throws 403 unless the caller is privileged or the record belongs to them.
 * Use on any handler that reads or writes a single employee's data.
 */
export function assertSelfOrPrivileged(req: Request, employee_id: number | null) {
  const user = req.user;
  if (!user) throw forbidden();
  if (isPrivileged(user.role)) return;

  if (user.employee_id === null || user.employee_id !== employee_id) {
    throw forbidden("You can only access your own records.");
  }
}

/**
 * Narrows a list query to the caller's own rows when they are an EMPLOYEE, so a
 * list endpoint cannot be widened just by dropping the employee_id query parameter.
 *
 * An account with no linked employee record sees nothing rather than everything —
 * failing closed is the only safe default here.
 */
export function scopeToSelf<T extends { employee_id?: number }>(req: Request, where: T): T {
  const user = req.user;
  if (!user) throw forbidden();
  if (isPrivileged(user.role)) return where;

  return { ...where, employee_id: user.employee_id ?? -1 };
}

/** Same narrowing for queries that reach the employee through a relation. */
export function scopeRelationToSelf(
  req: Request,
  where: Prisma.PayslipWhereInput
): Prisma.PayslipWhereInput {
  const user = req.user;
  if (!user) throw forbidden();
  if (isPrivileged(user.role)) return where;

  return { ...where, employee_id: user.employee_id ?? -1 };
}
