export const API_PREFIX = '/api';

export const API_ROUTES = {
  AUTH: { LOGIN: '/auth/login', REFRESH: '/auth/refresh', LOGOUT: '/auth/logout' },
  USERS: '/users',
  DEPARTMENTS: '/departments',
  EMPLOYEES: '/employees',
  SCHEDULES: '/schedules',
  CONTRACTS: '/contracts',
  TIME_OFF: { TYPES: '/time-off/types', ALLOCATIONS: '/time-off/allocations', REQUESTS: '/time-off/requests' },
  ATTENDANCE: '/attendance',
  SALARY: { STRUCTURES: '/salary/structures', RULES: '/salary/rules' },
  PAYRUNS: '/payruns',
  PAYSLIPS: '/payslips',
  DASHBOARD: '/dashboard',
} as const;
