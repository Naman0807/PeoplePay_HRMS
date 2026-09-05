import type { Request } from "express";
import type { Prisma, Role } from "@prisma/client";
import { forbidden } from "./response";

/**
 * The role ladder, taken from section 2 of the PeoplePay360 problem statement.
 *
 * It is cumulative, not a set of separate lanes: each rung keeps everything below it
 * and adds to it. Getting that wrong is why an HR_PAYROLL_USER was previously refused
 * on employees and attendance.
 *
 *   EMPLOYEE            own details, own attendance, own leave balances; may create
 *                       attendance entries and time off requests. No HR or payroll.
 *   HR_MANAGER          full CRUD on Employees, Attendance, Contracts, Working
 *                       Schedules and Time Off; approves and refuses requests.
 *                       Explicitly no access to payroll features.
 *   HR_PAYROLL_USER     everything HR_MANAGER has, plus create, read and update on
 *                       Payruns and Payslips, and read-only Salary Structures/Rules.
 *   HR_PAYROLL_MANAGER  everything HR_PAYROLL_USER has, plus full CRUD on Payruns,
 *                       Payslips, Salary Structures and Salary Rules.
 *   ADMIN               everything, plus user and role administration.
 *
 * requireRole answers "may this role perform this action". The helpers below answer
 * "whose records may they touch", which is a separate question — without them any
 * logged-in employee could read a colleague's payslip.
 */

/** Roles confined to their own records. */
const SELF_ONLY: Role[] = ["EMPLOYEE"];

export const isPrivileged = (role: Role) => !SELF_ONLY.includes(role);

/**
 * HR administration: Employees, Contracts, Attendance, Working Schedules, Time Off.
 * Payroll roles inherit all of it, which is the cumulative part of the ladder.
 */
export const HR_ADMIN_ROLES: Role[] = [
  "HR_MANAGER",
  "HR_PAYROLL_USER",
  "HR_PAYROLL_MANAGER",
];

/**
 * Payroll: Payruns, Payslips and the payroll dashboard.
 *
 * HR_MANAGER is deliberately absent — the spec gives that role "no access to payroll
 * features", so it stops at Time Off.
 */
export const PAYROLL_ROLES: Role[] = ["HR_PAYROLL_USER", "HR_PAYROLL_MANAGER"];

/**
 * Salary Structures and Salary Rules are read-only for HR_PAYROLL_USER and fully
 * editable for HR_PAYROLL_MANAGER, so the two payroll roles differ in configuration
 * rights rather than in which payrun buttons they may press.
 */
export const PAYROLL_CONFIG_ROLES: Role[] = ["HR_PAYROLL_MANAGER"];

export function assertSelfOrPrivileged(req: Request, employee_id: number | null) {
  const user = req.user;
  if (!user) throw forbidden();
  if (isPrivileged(user.role)) return;

  if (user.employee_id === null || user.employee_id !== employee_id) {
    throw forbidden("You can only access your own records.");
  }
}

/**
 * Narrows a list query to the caller's own rows when they are an EMPLOYEE, so a list
 * cannot be widened just by dropping the employee_id query parameter.
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

/** Same narrowing where the employee is the row itself rather than a foreign key. */
export function scopeEmployeeRows(
  req: Request,
  where: Prisma.EmployeeWhereInput
): Prisma.EmployeeWhereInput {
  const user = req.user;
  if (!user) throw forbidden();
  if (isPrivileged(user.role)) return where;

  return { ...where, id: user.employee_id ?? -1 };
}
