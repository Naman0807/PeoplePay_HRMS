export type UserRole =
  | 'EMPLOYEE'
  | 'HR_MANAGER'
  | 'HR_PAYROLL_USER'
  | 'HR_PAYROLL_MANAGER'
  | 'ADMIN';

export type ApprovalStatus = 'APPROVED' | 'PENDING' | 'REJECTED';

export type EmployeeStatus = 'ACTIVE' | 'INACTIVE';

export type ContractStatus = 'DRAFT' | 'RUNNING' | 'EXPIRED' | 'CANCELLED';

export type DayOfWeek =
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY'
  | 'SUNDAY';

export type TimeOffUnit = 'DAYS' | 'HOURS';

export type AllocationStatus = 'DRAFT' | 'APPROVED' | 'REFUSED';

export type TimeOffRequestStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'REFUSED';

export type AttendanceStatus = 'NORMAL' | 'EXCEPTION' | 'MANUALLY_EDITED';

export type SalaryRuleCategory =
  | 'BASIC'
  | 'ALLOWANCE'
  | 'GROSS'
  | 'DEDUCTION'
  | 'NET';

export type ComputationType = 'FIXED' | 'PERCENTAGE' | 'FORMULA';

export type PayrunStatus = 'DRAFT' | 'COMPUTED' | 'VALIDATED' | 'PAID';

export type PayslipStatus = 'DRAFT' | 'COMPUTED' | 'VALIDATED' | 'PAID';

export type PayrunEmployeeStatus = 'PENDING' | 'COMPUTED' | 'PAID';
