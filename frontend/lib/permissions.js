import { getUser } from "./auth";

/**
 * Which roles may do what, mirroring the backend's requireRole gates.
 *
 * This hides controls the API would reject anyway — the server is still the only
 * thing enforcing access. Showing an employee a button that always returns 403
 * reads as broken access control even when the backend is doing its job.
 *
 * ADMIN passes every backend gate, so it appears in every list here.
 */

export const ROLES = {
  EMPLOYEE: "EMPLOYEE",
  HR_MANAGER: "HR_MANAGER",
  HR_PAYROLL_USER: "HR_PAYROLL_USER",
  HR_PAYROLL_MANAGER: "HR_PAYROLL_MANAGER",
  ADMIN: "ADMIN",
};

const MANAGE_PEOPLE = [ROLES.HR_MANAGER, ROLES.ADMIN];
const RUN_PAYROLL = [ROLES.HR_PAYROLL_USER, ROLES.HR_PAYROLL_MANAGER, ROLES.ADMIN];
const APPROVE_PAYROLL = [ROLES.HR_PAYROLL_MANAGER, ROLES.ADMIN];
const VIEW_PAYROLL = [
  ROLES.HR_MANAGER,
  ROLES.HR_PAYROLL_USER,
  ROLES.HR_PAYROLL_MANAGER,
  ROLES.ADMIN,
];

const has = (user, roles) => Boolean(user) && roles.includes(user.role);

export function permissions(user = getUser()) {
  return {
    user,
    isEmployee: Boolean(user) && user.role === ROLES.EMPLOYEE,

    // Employees, contracts, attendance — all HR_MANAGER territory.
    canManageEmployees: has(user, MANAGE_PEOPLE),
    canManageContracts: has(user, MANAGE_PEOPLE),
    canManageAttendance: has(user, MANAGE_PEOPLE),

    // Approving leave is HR_MANAGER; filing it for someone else is too.
    canApproveLeave: has(user, MANAGE_PEOPLE),
    canFileLeaveForOthers: has(user, MANAGE_PEOPLE),

    // Payroll splits in two: creating and computing a run, versus confirming and
    // paying it. A payroll user may prepare a run but not release the money.
    canViewPayroll: has(user, VIEW_PAYROLL),
    canRunPayroll: has(user, RUN_PAYROLL),
    canApprovePayroll: has(user, APPROVE_PAYROLL),

    canViewDashboard: has(user, VIEW_PAYROLL),

    // Approving a signup into an HR/payroll role is the one action that can grant
    // that access — ADMIN only, no bypass list to widen here.
    canApproveSignups: Boolean(user) && user.role === ROLES.ADMIN,
  };
}
