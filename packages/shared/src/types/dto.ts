import {
  UserRole,
  EmployeeStatus,
  ContractStatus,
  DayOfWeek,
  TimeOffUnit,
  SalaryRuleCategory,
  ComputationType,
} from './entities';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

export interface CreateUserDTO {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
}

export interface UpdateUserDTO {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  isActive?: boolean;
}

export interface CreateEmployeeDTO {
  first_name: string;
  last_name: string;
  email: string;
  department_id: string;
  manager_id?: string;
  job_position: string;
  working_schedule_id: string;
  bank_account_no?: string;
  bank_name?: string;
}

export interface UpdateEmployeeDTO extends Partial<CreateEmployeeDTO> {
  status?: EmployeeStatus;
}

export interface CreateContractDTO {
  employee_id: string;
  name: string;
  start_date: string;
  end_date?: string;
  wage: number;
  salary_structure_id: string;
  working_schedule_id: string;
  status?: ContractStatus;
}

export interface CreateScheduleDTO {
  name: string;
  schedule_type: string;
  schedule_lines: ScheduleLineInput[];
}

export interface ScheduleLineInput {
  day_of_week: DayOfWeek;
  start_time: string;
  end_time: string;
  break_duration_mins: number;
}

export interface CreateTimeOffTypeDTO {
  name: string;
  unit: TimeOffUnit;
  requires_allocation: boolean;
  payroll_integration: boolean;
}

export interface CreateAllocationDTO {
  employee_id: string;
  time_off_type_id: string;
  allocated_units: number;
  valid_from: string;
  valid_to: string;
}

export interface CreateTimeOffRequestDTO {
  employee_id: string;
  time_off_type_id: string;
  start_date: string;
  end_date: string;
}

export interface CreateSalaryStructureDTO {
  name: string;
  code: string;
  is_active?: boolean;
}

export interface CreateSalaryRuleDTO {
  name: string;
  code: string;
  category: SalaryRuleCategory;
  sequence: number;
  computation_type: ComputationType;
  amount_fixed?: number;
  percentage_rate?: number;
  formula_string?: string;
}

export interface CreatePayrunDTO {
  name: string;
  salary_structure_id: string;
  period_start: string;
  period_end: string;
}

export interface SelectEmployeesDTO {
  employee_ids: string[];
}
