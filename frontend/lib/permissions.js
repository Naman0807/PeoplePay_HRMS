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

// The ladder is cumulative: payroll roles inherit everything HR_MANAGER can do.
const MANAGE_PEOPLE = [
  ROLES.HR_MANAGER,
  ROLES.HR_PAYROLL_USER,
  ROLES.HR_PAYROLL_MANAGER,
  ROLES.ADMIN,
];
// HR_MANAGER is absent on purpose — the spec gives that role no payroll access.
const PAYROLL = [ROLES.HR_PAYROLL_USER, ROLES.HR_PAYROLL_MANAGER, ROLES.ADMIN];
// Salary Structures and Rules are read-only for a payroll user, editable for a manager.
const PAYROLL_CONFIG = [ROLES.HR_PAYROLL_MANAGER, ROLES.ADMIN];

const has = (user, roles) => Boolean(user) && roles.includes(user.role);

export function permissions(user = getUser()) {
  return {
    user,
    isEmployee: Boolean(user) && user.role === ROLES.EMPLOYEE,
    isAdmin: Boolean(user) && user.role === ROLES.ADMIN,

    // Employees, contracts, attendance — all HR_MANAGER territory.
    canManageEmployees: has(user, MANAGE_PEOPLE),
    canManageContracts: has(user, MANAGE_PEOPLE),
    canManageAttendance: has(user, MANAGE_PEOPLE),

    // Approving leave is HR_MANAGER; filing it for someone else is too.
    canApproveLeave: has(user, MANAGE_PEOPLE),
    canFileLeaveForOthers: has(user, MANAGE_PEOPLE),

    // Both payroll roles run the whole payrun lifecycle; they differ on whether they
    // may edit Salary Structures and Rules.
    canViewPayroll: has(user, PAYROLL),
    canRunPayroll: has(user, PAYROLL),
    canApprovePayroll: has(user, PAYROLL),
    canConfigurePayroll: has(user, PAYROLL_CONFIG),

    canViewDashboard: has(user, PAYROLL),
  };
}
