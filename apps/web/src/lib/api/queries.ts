'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './client';
import type {
  LoginResponse,
  PaginatedResponse,
  UserRole,
  CreateEmployeeDTO,
  UpdateEmployeeDTO,
  CreateContractDTO,
  CreateScheduleDTO,
  CreateTimeOffRequestDTO,
  CreateSalaryStructureDTO,
  CreateSalaryRuleDTO,
  CreatePayrunDTO,
  SelectEmployeesDTO,
} from '@peoplepay360/shared';

// ─── Shared response payload shapes ──────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

export interface Department {
  id: string;
  name: string;
  created_at: string;
}

export interface Employee {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  department_id: string;
  manager_id: string | null;
  job_position: string;
  working_schedule_id: string;
  bank_account_no: string | null;
  bank_name: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  department?: { id: string; name: string };
  working_schedule?: { id: string; name: string };
  manager?: { id: string; first_name: string; last_name: string };
}

export interface Contract {
  id: string;
  employee_id: string;
  name: string;
  start_date: string;
  end_date: string | null;
  wage: number;
  salary_structure_id: string;
  working_schedule_id: string;
  status: string;
  employee?: Pick<Employee, 'id' | 'first_name' | 'last_name' | 'email'>;
  salary_structure?: { id: string; name: string; code: string };
}

export interface WorkingSchedule {
  id: string;
  name: string;
  schedule_type: string;
  weekly_hours: number;
  schedule_lines?: Array<{
    id: string;
    day_of_week: string;
    start_time: string;
    end_time: string;
    break_duration_mins: number;
  }>;
}

export interface AttendanceRecord {
  id: string;
  employee_id: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  worked_hours: number | null;
  status: 'NORMAL' | 'EXCEPTION' | 'MANUALLY_EDITED';
  employee?: Pick<Employee, 'id' | 'first_name' | 'last_name'>;
}

export interface TimeOffType {
  id: string;
  name: string;
  unit: 'DAYS' | 'HOURS';
  requires_allocation: boolean;
  payroll_integration: boolean;
}

export interface TimeOffRequest {
  id: string;
  employee_id: string;
  time_off_type_id: string;
  start_date: string;
  end_date: string;
  duration: number;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REFUSED';
  employee?: Pick<Employee, 'id' | 'first_name' | 'last_name'>;
  time_off_type?: TimeOffType;
}

export interface TimeOffAllocation {
  id: string;
  employee_id: string;
  time_off_type_id: string;
  allocated_units: number;
  taken_units: number;
  remaining_units: number;
  valid_from: string;
  valid_to: string;
  status: string;
  employee?: Pick<Employee, 'id' | 'first_name' | 'last_name'>;
  time_off_type?: TimeOffType;
}

export interface SalaryStructure {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
  _count?: { rules: number };
}

export interface SalaryRule {
  id: string;
  salary_structure_id: string;
  name: string;
  code: string;
  category: string;
  sequence: number;
  computation_type: string;
  amount_fixed: number | null;
  percentage_rate: number | null;
  formula_string: string | null;
  is_active: boolean;
}

export interface Payrun {
  id: string;
  name: string;
  salary_structure_id: string;
  period_start: string;
  period_end: string;
  status: 'DRAFT' | 'COMPUTED' | 'VALIDATED' | 'PAID';
  created_by: string;
  created_at: string;
  salary_structure?: { id: string; name: string; code: string };
  _count?: { payslips: number };
}

export interface PayrunEmployee {
  id: string;
  payrun_id: string;
  employee_id: string;
  base_salary: number;
  gross_salary: number;
  total_deductions: number;
  net_salary: number;
  status: 'PENDING' | 'COMPUTED' | 'PAID';
  employee?: Pick<Employee, 'id' | 'first_name' | 'last_name' | 'email' | 'job_position'>;
}

export interface Payslip {
  id: string;
  payrun_id: string;
  employee_id: string;
  contract_id: string;
  basic_amount: number;
  gross_amount: number;
  deduction_amount: number;
  net_amount: number;
  worked_days: number;
  status: 'DRAFT' | 'COMPUTED' | 'VALIDATED' | 'PAID';
  warnings?: string[] | null;
  employee?: Pick<Employee, 'id' | 'first_name' | 'last_name' | 'email'>;
  payrun?: Pick<Payrun, 'id' | 'name' | 'period_start' | 'period_end' | 'status'>;
}

export interface PayslipLine {
  id: string;
  payslip_id: string;
  salary_rule_id: string;
  code: string;
  category: string;
  rate: number;
  amount: number;
}

export interface UserAccount {
  id: string;
  email: string;
  role: UserRole;
  first_name: string | null;
  last_name: string | null;
  is_active: boolean;
  requested_role?: UserRole | null;
  approval_status?: 'APPROVED' | 'PENDING' | 'REJECTED';
  created_at: string;
  employees?: Array<{
    id: string;
    first_name: string;
    last_name: string;
    job_position: string;
    status: string;
  }>;
}

export interface PendingApproval {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  requested_role: UserRole;
  created_at: string;
}

interface DashboardKpis {
  totalEmployees: number;
  activeEmployees: number;
  activeContracts: number;
  pendingTimeOffRequests: number;
  attendanceExceptionsToday: number;
  totalNetPaid: number;
  latestPayrunStatus: string | null;
}

interface AttendanceChartPoint {
  date: string;
  present: number;
  absent: number;
  exception: number;
}

interface DepartmentChartPoint {
  department: string;
  count: number;
}

interface PayrollChartPoint {
  payrunName: string;
  periodEnd: string;
  netTotal: number;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export function useLogin() {
  return useMutation<LoginResponse, unknown, { email: string; password: string }>({
    mutationFn: (credentials) =>
      apiFetch<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      }),
  });
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export function useDashboardKpis() {
  return useQuery<DashboardKpis>({
    queryKey: ['dashboard', 'kpis'],
    queryFn: () => apiFetch<DashboardKpis>('/dashboard/kpis'),
  });
}

export function useAttendanceChart(days = 30) {
  return useQuery<AttendanceChartPoint[]>({
    queryKey: ['dashboard', 'attendance-chart', days],
    queryFn: () => apiFetch<AttendanceChartPoint[]>(`/dashboard/attendance-chart?days=${days}`),
  });
}

export function useDepartmentChart() {
  return useQuery<DepartmentChartPoint[]>({
    queryKey: ['dashboard', 'department-chart'],
    queryFn: () => apiFetch<DepartmentChartPoint[]>('/dashboard/department-chart'),
  });
}

export function usePayrollChart() {
  return useQuery<PayrollChartPoint[]>({
    queryKey: ['dashboard', 'payroll-chart'],
    queryFn: () => apiFetch<PayrollChartPoint[]>('/dashboard/payroll-chart'),
  });
}

// ─── Employees ───────────────────────────────────────────────────────────────

export type EmployeeListParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  departmentId?: string;
  status?: 'ACTIVE' | 'INACTIVE';
};

export type PageParams = { page?: number; pageSize?: number };

/** Unwrap a paginated envelope (or a plain array) to a plain list. */
export function listOf<T>(data: PaginatedResponse<T> | T[] | undefined): T[] {
  if (!data) return [];
  return Array.isArray(data) ? data : data.items;
}

function toQueryString(params?: Record<string, unknown>) {
  if (!params) return '';
  const qs = Object.entries(params)
    .filter(
      ([, value]) =>
        value !== undefined &&
        value !== null &&
        value !== '' &&
        (typeof value === 'string' || typeof value === 'number')
    )
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');
  return qs ? `?${qs}` : '';
}

export function useEmployees(params?: EmployeeListParams & { enabled?: boolean }) {
  const { enabled = true, ...query } = params ?? {};
  return useQuery<PaginatedResponse<Employee>>({
    queryKey: ['employees', query],
    queryFn: () => apiFetch<PaginatedResponse<Employee>>(`/employees${toQueryString(query)}`),
    enabled,
  });
}

export function useEmployee(id?: string) {
  return useQuery<Employee>({
    queryKey: ['employees', id],
    queryFn: () => apiFetch<Employee>(`/employees/${id}`),
    enabled: !!id,
  });
}

export function useMyEmployee() {
  return useQuery<Employee>({
    queryKey: ['employees', 'me'],
    queryFn: () => apiFetch<Employee>('/employees/me'),
  });
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();
  return useMutation<Employee, unknown, CreateEmployeeDTO>({
    mutationFn: (data) =>
      apiFetch<Employee>('/employees', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();
  return useMutation<Employee, unknown, { id: string; data: UpdateEmployeeDTO }>({
    mutationFn: ({ id, data }) =>
      apiFetch<Employee>(`/employees/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}

// ─── Departments ─────────────────────────────────────────────────────────────

export function useDirectory(params?: { search?: string; departmentId?: string }) {
  return useQuery<Employee[]>({
    queryKey: ['employees', 'directory', params],
    queryFn: () => apiFetch<Employee[]>(`/employees/directory${toQueryString(params)}`),
  });
}

export function useDeleteEmployee() {
  const queryClient = useQueryClient();
  return useMutation<{ message: string }, unknown, string>({
    mutationFn: (id) => apiFetch<{ message: string }>(`/employees/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}

export function useDepartments() {
  return useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: () => apiFetch<Department[]>('/departments'),
  });
}

// ─── Contracts ───────────────────────────────────────────────────────────────

export type ContractListParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
};

export function useContracts(params?: ContractListParams) {
  return useQuery<PaginatedResponse<Contract>>({
    queryKey: ['contracts', params],
    queryFn: () => apiFetch<PaginatedResponse<Contract>>(`/contracts${toQueryString(params)}`),
  });
}

export function useCreateContract() {
  const queryClient = useQueryClient();
  return useMutation<Contract, unknown, CreateContractDTO>({
    mutationFn: (data) =>
      apiFetch<Contract>('/contracts', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
    },
  });
}

export function useUpdateContract() {
  const queryClient = useQueryClient();
  return useMutation<Contract, unknown, { id: string; data: Partial<CreateContractDTO> }>({
    mutationFn: ({ id, data }) =>
      apiFetch<Contract>(`/contracts/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
    },
  });
}

export function useDeleteContract() {
  const queryClient = useQueryClient();
  return useMutation<{ message: string }, unknown, string>({
    mutationFn: (id) => apiFetch<{ message: string }>(`/contracts/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
    },
  });
}

// ─── Schedules ───────────────────────────────────────────────────────────────

export function useSchedules(params?: PageParams) {
  return useQuery<PaginatedResponse<WorkingSchedule>>({
    queryKey: ['schedules', params],
    queryFn: () =>
      apiFetch<PaginatedResponse<WorkingSchedule>>(`/schedules${toQueryString(params)}`),
  });
}

export function useCreateSchedule() {
  const queryClient = useQueryClient();
  return useMutation<WorkingSchedule, unknown, CreateScheduleDTO>({
    mutationFn: (data) =>
      apiFetch<WorkingSchedule>('/schedules', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
  });
}

export function useUpdateSchedule() {
  const queryClient = useQueryClient();
  return useMutation<WorkingSchedule, unknown, { id: string; data: Partial<CreateScheduleDTO> }>({
    mutationFn: ({ id, data }) =>
      apiFetch<WorkingSchedule>(`/schedules/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
  });
}

export function useDeleteSchedule() {
  const queryClient = useQueryClient();
  return useMutation<{ message: string }, unknown, string>({
    mutationFn: (id) => apiFetch<{ message: string }>(`/schedules/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
  });
}

// ─── Attendance ──────────────────────────────────────────────────────────────

export type AttendanceParams = PageParams & {
  from?: string;
  to?: string;
  status?: 'NORMAL' | 'EXCEPTION' | 'MANUALLY_EDITED';
  employeeId?: string;
};

export function useAttendance(params?: AttendanceParams & { enabled?: boolean }) {
  const { enabled = true, ...query } = params ?? {};
  return useQuery<PaginatedResponse<AttendanceRecord>>({
    queryKey: ['attendance', query],
    queryFn: () =>
      apiFetch<PaginatedResponse<AttendanceRecord>>(`/attendance${toQueryString(query)}`),
    enabled,
  });
}

export function useMyAttendance(
  params?: Omit<AttendanceParams, 'employeeId'> & { enabled?: boolean }
) {
  const { enabled = true, ...query } = params ?? {};
  return useQuery<PaginatedResponse<AttendanceRecord>>({
    queryKey: ['attendance', 'me', query],
    queryFn: () =>
      apiFetch<PaginatedResponse<AttendanceRecord>>(`/attendance/me${toQueryString(query)}`),
    enabled,
  });
}

export function usePunchIn() {
  const queryClient = useQueryClient();
  return useMutation<AttendanceRecord, unknown, void>({
    mutationFn: () => apiFetch<AttendanceRecord>('/attendance/punch-in', { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
  });
}

export function usePunchOut() {
  const queryClient = useQueryClient();
  return useMutation<AttendanceRecord, unknown, void>({
    mutationFn: () => apiFetch<AttendanceRecord>('/attendance/punch-out', { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
  });
}

export function useUpdateAttendance() {
  const queryClient = useQueryClient();
  return useMutation<
    AttendanceRecord,
    unknown,
    { id: string; data: { check_in?: string; check_out?: string } }
  >({
    mutationFn: ({ id, data }) =>
      apiFetch<AttendanceRecord>(`/attendance/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
  });
}

// ─── Time Off ────────────────────────────────────────────────────────────────

export function useTimeOffTypes() {
  return useQuery<TimeOffType[]>({
    queryKey: ['time-off', 'types'],
    queryFn: () => apiFetch<TimeOffType[]>('/time-off/types'),
  });
}

export function useTimeOffRequests(
  params?: PageParams & { employee_id?: string; status?: string }
) {
  return useQuery<PaginatedResponse<TimeOffRequest>>({
    queryKey: ['time-off', 'requests', params],
    queryFn: () =>
      apiFetch<PaginatedResponse<TimeOffRequest>>(`/time-off/requests${toQueryString(params)}`),
  });
}

export function useCreateTimeOffRequest() {
  const queryClient = useQueryClient();
  return useMutation<TimeOffRequest, unknown, CreateTimeOffRequestDTO>({
    mutationFn: (data) =>
      apiFetch<TimeOffRequest>('/time-off/requests', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-off', 'requests'] });
    },
  });
}

export function useSubmitTimeOffRequest() {
  const queryClient = useQueryClient();
  return useMutation<TimeOffRequest, unknown, string>({
    mutationFn: (id) =>
      apiFetch<TimeOffRequest>(`/time-off/requests/${id}/submit`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-off', 'requests'] });
    },
  });
}

export function useTimeOffAllocations(params?: PageParams & { employee_id?: string }) {
  return useQuery<PaginatedResponse<TimeOffAllocation>>({
    queryKey: ['time-off', 'allocations', params],
    queryFn: () =>
      apiFetch<PaginatedResponse<TimeOffAllocation>>(
        `/time-off/allocations${toQueryString(params)}`
      ),
  });
}

export function useApproveTimeOffRequest() {
  const queryClient = useQueryClient();
  return useMutation<TimeOffRequest, unknown, string>({
    mutationFn: (id) =>
      apiFetch<TimeOffRequest>(`/time-off/requests/${id}/approve`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-off', 'requests'] });
    },
  });
}

export function useRefuseTimeOffRequest() {
  const queryClient = useQueryClient();
  return useMutation<TimeOffRequest, unknown, string>({
    mutationFn: (id) =>
      apiFetch<TimeOffRequest>(`/time-off/requests/${id}/refuse`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-off', 'requests'] });
    },
  });
}

// ─── Salary ──────────────────────────────────────────────────────────────────

export function useSalaryStructures(params?: PageParams) {
  return useQuery<PaginatedResponse<SalaryStructure>>({
    queryKey: ['salary', 'structures', params],
    queryFn: () =>
      apiFetch<PaginatedResponse<SalaryStructure>>(`/salary/structures${toQueryString(params)}`),
  });
}

export function useSalaryRules(structureId?: string) {
  return useQuery<SalaryRule[]>({
    queryKey: ['salary', 'rules', structureId],
    queryFn: () => apiFetch<SalaryRule[]>(`/salary/structures/${structureId}/rules`),
    enabled: !!structureId,
  });
}

export function useCreateSalaryStructure() {
  const queryClient = useQueryClient();
  return useMutation<SalaryStructure, unknown, CreateSalaryStructureDTO>({
    mutationFn: (data) =>
      apiFetch<SalaryStructure>('/salary/structures', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary', 'structures'] });
    },
  });
}

export function useUpdateSalaryStructure() {
  const queryClient = useQueryClient();
  return useMutation<
    SalaryStructure,
    unknown,
    { id: string; data: Partial<CreateSalaryStructureDTO> }
  >({
    mutationFn: ({ id, data }) =>
      apiFetch<SalaryStructure>(`/salary/structures/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary', 'structures'] });
    },
  });
}

export function useDeleteSalaryStructure() {
  const queryClient = useQueryClient();
  return useMutation<{ message: string }, unknown, string>({
    mutationFn: (id) =>
      apiFetch<{ message: string }>(`/salary/structures/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary'] });
    },
  });
}

export function useCreateSalaryRule(structureId: string) {
  const queryClient = useQueryClient();
  return useMutation<SalaryRule, unknown, CreateSalaryRuleDTO>({
    mutationFn: (data) =>
      apiFetch<SalaryRule>(`/salary/structures/${structureId}/rules`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary', 'rules', structureId] });
    },
  });
}

export function useUpdateSalaryRule(structureId: string) {
  const queryClient = useQueryClient();
  return useMutation<SalaryRule, unknown, { id: string; data: Partial<CreateSalaryRuleDTO> }>({
    mutationFn: ({ id, data }) =>
      apiFetch<SalaryRule>(`/salary/rules/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary', 'rules', structureId] });
    },
  });
}

export function useDeleteSalaryRule(structureId: string) {
  const queryClient = useQueryClient();
  return useMutation<unknown, unknown, string>({
    mutationFn: (id) => apiFetch<unknown>(`/salary/rules/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary', 'rules', structureId] });
    },
  });
}

// ─── Payruns ─────────────────────────────────────────────────────────────────

export function usePayruns(params?: PageParams) {
  return useQuery<PaginatedResponse<Payrun>>({
    queryKey: ['payruns', params],
    queryFn: () => apiFetch<PaginatedResponse<Payrun>>(`/payruns${toQueryString(params)}`),
  });
}

export function usePayrun(id?: string) {
  return useQuery<Payrun & { payrun_employees: PayrunEmployee[] }>({
    queryKey: ['payruns', id],
    queryFn: () => apiFetch<Payrun & { payrun_employees: PayrunEmployee[] }>(`/payruns/${id}`),
    enabled: !!id,
  });
}

export function useCreatePayrun() {
  const queryClient = useQueryClient();
  return useMutation<Payrun, unknown, CreatePayrunDTO>({
    mutationFn: (data) =>
      apiFetch<Payrun>('/payruns', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payruns'] });
    },
  });
}

export function useSelectPayrunEmployees(payrunId: string) {
  const queryClient = useQueryClient();
  return useMutation<unknown, unknown, SelectEmployeesDTO>({
    mutationFn: (data) =>
      apiFetch<unknown>(`/payruns/${payrunId}/select-employees`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payruns', payrunId] });
    },
  });
}

function usePayrunAction(action: 'compute' | 'validate' | 'mark-paid', invalidateKeys: string[]) {
  const queryClient = useQueryClient();
  return useMutation<unknown, unknown, { payrunId: string }>({
    mutationFn: ({ payrunId }) =>
      apiFetch<unknown>(`/payruns/${payrunId}/${action}`, { method: 'POST' }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['payruns', variables.payrunId] });
      queryClient.invalidateQueries({ queryKey: ['payruns'] });
      invalidateKeys.forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
    },
  });
}

export function useComputePayrun() {
  return usePayrunAction('compute', ['payslips']);
}

export function useValidatePayrun() {
  return usePayrunAction('validate', ['payslips']);
}

export function useMarkPaid() {
  return usePayrunAction('mark-paid', ['payslips']);
}

export function usePayrunEmployees(payrunId?: string) {
  return useQuery<PayrunEmployee[]>({
    queryKey: ['payruns', payrunId, 'employees'],
    queryFn: () => apiFetch<PayrunEmployee[]>(`/payruns/${payrunId}/employees`),
    enabled: !!payrunId,
  });
}

export function usePayrunPayslips(payrunId?: string) {
  return useQuery<Payslip[]>({
    queryKey: ['payruns', payrunId, 'payslips'],
    queryFn: () => apiFetch<Payslip[]>(`/payruns/${payrunId}/payslips`),
    enabled: !!payrunId,
  });
}

// ─── Payslips ────────────────────────────────────────────────────────────────

export type PayslipListParams = {
  page?: number;
  pageSize?: number;
  employeeId?: string;
  status?: string;
};

export function usePayslips(params?: PayslipListParams) {
  return useQuery<PaginatedResponse<Payslip>>({
    queryKey: ['payslips', params],
    queryFn: () => apiFetch<PaginatedResponse<Payslip>>(`/payslips${toQueryString(params)}`),
  });
}

export function usePayslip(id?: string) {
  return useQuery<Payslip & { lines?: PayslipLine[] }>({
    queryKey: ['payslips', id],
    queryFn: () => apiFetch<Payslip & { lines?: PayslipLine[] }>(`/payslips/${id}`),
    enabled: !!id,
  });
}

// ─── Users (Admin) ───────────────────────────────────────────────────────────

export type UserListParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  role?: UserRole;
  isActive?: 'true' | 'false';
};

export function useUsers(params?: UserListParams) {
  return useQuery<PaginatedResponse<UserAccount>>({
    queryKey: ['users', params],
    queryFn: () => apiFetch<PaginatedResponse<UserAccount>>(`/users${toQueryString(params)}`),
  });
}

export interface CreateUserInput {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
}

export interface UpdateUserInput {
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  isActive?: boolean;
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation<UserAccount, unknown, CreateUserInput>({
    mutationFn: (data) =>
      apiFetch<UserAccount>('/users', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation<UserAccount, unknown, { id: string; data: UpdateUserInput }>({
    mutationFn: ({ id, data }) =>
      apiFetch<UserAccount>(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useUpdateUserStatus() {
  const queryClient = useQueryClient();
  return useMutation<UserAccount, unknown, { id: string; isActive: boolean }>({
    mutationFn: ({ id, isActive }) =>
      apiFetch<UserAccount>(`/users/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function usePendingApprovals() {
  return useQuery<PendingApproval[]>({
    queryKey: ['users', 'pending'],
    queryFn: () => apiFetch<PendingApproval[]>('/users/pending'),
  });
}

function useApprovalAction(
  action: 'approve' | 'reject',
  invalidateKeys: Array<Array<string>>
) {
  const queryClient = useQueryClient();
  return useMutation<UserAccount, unknown, string>({
    mutationFn: (id) => apiFetch<UserAccount>(`/users/${id}/${action}`, { method: 'POST' }),
    onSuccess: () => {
      invalidateKeys.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
    },
  });
}

export function useApproveUser() {
  return useApprovalAction('approve', [
    ['users', 'pending'],
    ['users'],
  ]);
}

export function useRejectUser() {
  return useApprovalAction('reject', [
    ['users', 'pending'],
    ['users'],
  ]);
}