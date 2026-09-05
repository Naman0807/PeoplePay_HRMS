'use client';

import { useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { StatCard } from '@/src/components/layout/StatCard';
import { LoadingSpinner } from '@/src/components/layout/LoadingSpinner';
import { StatusBadge } from '@/src/components/layout/StatusBadge';
import { useAuthStore } from '@/src/store/authStore';
import { can } from '@peoplepay360/shared';
import {
  useDashboardKpis,
  useAttendanceChart,
  useDepartmentChart,
  usePayrollChart,
  useMyAttendance,
  useMyEmployee,
  useTimeOffAllocations,
  useTimeOffRequests,
  usePayslips,
} from '@/src/lib/api/queries';

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function toLocalDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function money(value: number | string): string {
  return `$${Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold text-slate-900">{title}</h2>
      {children}
    </div>
  );
}

function ChartState({
  isLoading,
  isError,
  isEmpty,
}: {
  isLoading: boolean;
  isError: boolean;
  isEmpty: boolean;
}) {
  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner label="Loading..." />
      </div>
    );
  }
  if (isError) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-red-600">
        Error loading chart data
      </div>
    );
  }
  if (isEmpty) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-slate-400">
        No data available
      </div>
    );
  }
  return null;
}

// ─── Payroll dashboard (ADMIN / HR roles) ───────────────────────────────────

function PayrollDashboard() {
  const { data: kpis, isLoading: kpisLoading, error: kpisError } = useDashboardKpis();
  const { data: attendance, isLoading: attendanceLoading, isError: attendanceError } =
    useAttendanceChart(30);
  const { data: department, isLoading: departmentLoading, isError: departmentError } =
    useDepartmentChart();
  const { data: payroll, isLoading: payrollLoading, isError: payrollError } = usePayrollChart();

  const attendanceData = (attendance ?? []).map((p) => ({
    ...p,
    label: formatShortDate(p.date),
  }));

  const departmentData = department ?? [];

  const payrollData = (payroll ?? [])
    .slice(0, 12)
    .map((p) => ({ ...p, label: formatShortDate(p.periodEnd) }));

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Dashboard</h1>

      {kpisError && (
        <div className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">
          Error loading KPIs: {(kpisError as Error).message}
        </div>
      )}

      {kpisLoading && (
        <div className="mb-4 flex min-h-24 items-center justify-center rounded-xl border border-slate-200 bg-white">
          <LoadingSpinner label="Loading KPIs..." />
        </div>
      )}

      {kpis && (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            label="Total Employees"
            value={kpis.totalEmployees}
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            }
          />
          <StatCard
            label="Active Employees"
            value={kpis.activeEmployees}
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
          />
          <StatCard
            label="Active Contracts"
            value={kpis.activeContracts}
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            }
          />
          <StatCard
            label="Pending Time Off"
            value={kpis.pendingTimeOffRequests}
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 7V3m8 4V3M3 11h18M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            }
          />
          <StatCard
            label="Attendance Exceptions Today"
            value={kpis.attendanceExceptionsToday}
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            }
          />
          <StatCard
            label="Total Net Paid"
            value={`$${Number(kpis.totalNetPaid).toLocaleString()}`}
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard title="Attendance Overview">
          <ChartState
            isLoading={attendanceLoading}
            isError={attendanceError}
            isEmpty={attendanceData.length === 0}
          />
          {!attendanceLoading && !attendanceError && attendanceData.length > 0 && (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={attendanceData} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  stroke="#e2e8f0"
                  interval="preserveStartEnd"
                />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} stroke="#e2e8f0" allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="present" name="Present" stroke="#059669" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="absent" name="Absent" stroke="#94a3b8" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="exception" name="Exception" stroke="#e11d48" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Employees by Department">
          <ChartState
            isLoading={departmentLoading}
            isError={departmentError}
            isEmpty={departmentData.length === 0}
          />
          {!departmentLoading && !departmentError && departmentData.length > 0 && (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={departmentData} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="department"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  stroke="#e2e8f0"
                />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} stroke="#e2e8f0" allowDecimals={false} />
                <Tooltip cursor={{ fill: '#f1f5f9' }} />
                <Bar dataKey="count" name="Employees" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Payroll Trend">
          <ChartState
            isLoading={payrollLoading}
            isError={payrollError}
            isEmpty={payrollData.length === 0}
          />
          {!payrollLoading && !payrollError && payrollData.length > 0 && (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={payrollData} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  stroke="#e2e8f0"
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  stroke="#e2e8f0"
                  tickFormatter={(value: number) => `$${value.toLocaleString()}`}
                />
                <Tooltip formatter={(value: unknown) => [`$${Number(value).toLocaleString()}`, 'Net Total']} cursor={{ fill: '#f1f5f9' }} />
                <Bar dataKey="netTotal" name="Net Total" fill="#0f172a" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>
    </div>
  );
}

// ─── Personal dashboard (EMPLOYEE role) ─────────────────────────────────────

function ClockIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 7V3m8 4V3M3 11h18M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}

function Card({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        {icon ? <span className="text-slate-400">{icon}</span> : null}
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function CardState({
  isLoading,
  isError,
  isEmpty,
  emptyMessage,
}: {
  isLoading: boolean;
  isError: boolean;
  isEmpty: boolean;
  emptyMessage: string;
}) {
  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <LoadingSpinner label="Loading..." />
      </div>
    );
  }
  if (isError) {
    return <p className="text-sm text-red-600">Error loading data</p>;
  }
  if (isEmpty) {
    return <p className="text-sm text-slate-400">{emptyMessage}</p>;
  }
  return null;
}

function PersonalDashboard() {
  const user = useAuthStore((s) => s.user);
  const { data: employee, isLoading: employeeLoading } = useMyEmployee();
  const {
    data: attendance,
    isLoading: attendanceLoading,
    isError: attendanceError,
  } = useMyAttendance();
  const {
    data: allocations,
    isLoading: allocationsLoading,
    isError: allocationsError,
  } = useTimeOffAllocations();
  const {
    data: payslipsData,
    isLoading: payslipsLoading,
    isError: payslipsError,
  } = usePayslips({ page: 1, pageSize: 5 });
  const {
    data: requests,
    isLoading: requestsLoading,
    isError: requestsError,
  } = useTimeOffRequests();

  const firstName = employee?.first_name ?? user?.email?.split('@')[0] ?? 'there';
  const payslips = Array.isArray(payslipsData) ? payslipsData : (payslipsData?.items ?? []);

  const todayKey = toLocalDateKey(new Date());
  const todayRecord = (attendance ?? []).find(
    (r) => toLocalDateKey(new Date(r.date)) === todayKey
  );

  const balances = useMemo(() => {
    const map = new Map<
      string,
      {
        typeId: string;
        typeName: string;
        unit: string;
        allocated: number;
        taken: number;
        remaining: number;
      }
    >();
    for (const a of allocations ?? []) {
      const key = a.time_off_type_id;
      const entry =
        map.get(key) ?? {
          typeId: key,
          typeName: a.time_off_type?.name ?? 'Unknown',
          unit: a.time_off_type?.unit ?? 'DAYS',
          allocated: 0,
          taken: 0,
          remaining: 0,
        };
      entry.allocated += Number(a.allocated_units) || 0;
      entry.taken += Number(a.taken_units) || 0;
      entry.remaining += Number(a.remaining_units) || 0;
      map.set(key, entry);
    }
    return [...map.values()].sort((a, b) => a.typeName.localeCompare(b.typeName));
  }, [allocations]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Welcome back, {firstName}</h1>
          <p className="mt-1 text-sm text-slate-500">
            Here&apos;s a snapshot of your attendance, time off and payslips.
          </p>
        </div>
        <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium uppercase tracking-wide text-slate-700">
          {user?.role ?? 'EMPLOYEE'}
        </span>
      </div>

      {employeeLoading && (
        <div className="mb-6 flex min-h-24 items-center justify-center rounded-xl border border-slate-200 bg-white">
          <LoadingSpinner label="Loading profile..." />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="Today's Attendance" icon={<ClockIcon />}>
          <CardState
            isLoading={attendanceLoading}
            isError={attendanceError}
            isEmpty={!todayRecord}
            emptyMessage="No attendance record for today yet."
          />
          {!attendanceLoading && !attendanceError && todayRecord && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500">Check In</p>
                <p className="mt-0.5 text-lg font-semibold text-slate-900">
                  {formatTime(todayRecord.check_in)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Check Out</p>
                <p className="mt-0.5 text-lg font-semibold text-slate-900">
                  {formatTime(todayRecord.check_out)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Worked Hours</p>
                <p className="mt-0.5 text-lg font-semibold text-slate-900">
                  {todayRecord.worked_hours != null
                    ? `${Number(todayRecord.worked_hours).toFixed(2)}h`
                    : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Status</p>
                <div className="mt-0.5">
                  <StatusBadge status={todayRecord.status} />
                </div>
              </div>
            </div>
          )}
        </Card>

        <Card title="Time Off Balance" icon={<CalendarIcon />}>
          <CardState
            isLoading={allocationsLoading}
            isError={allocationsError}
            isEmpty={balances.length === 0}
            emptyMessage="No time off allocations yet."
          />
          {!allocationsLoading && !allocationsError && balances.length > 0 && (
            <ul className="divide-y divide-slate-100">
              {balances.map((b) => (
                <li key={b.typeId} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{b.typeName}</p>
                    <p className="text-xs text-slate-500">
                      {b.allocated} allocated · {b.taken} taken
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-slate-900">
                    {b.remaining} {b.unit === 'HOURS' ? 'hrs' : 'days'} left
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Recent Payslips" icon={<DocumentIcon />}>
          <CardState
            isLoading={payslipsLoading}
            isError={payslipsError}
            isEmpty={payslips.length === 0}
            emptyMessage="No payslips yet."
          />
          {!payslipsLoading && !payslipsError && payslips.length > 0 && (
            <ul className="divide-y divide-slate-100">
              {payslips.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {p.payrun
                        ? `${formatShortDate(p.payrun.period_start)} — ${formatShortDate(p.payrun.period_end)}`
                        : '—'}
                    </p>
                    <div className="mt-0.5">
                      <StatusBadge status={p.status} />
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-slate-900">
                    {money(p.net_amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Recent Time Off Requests" icon={<CalendarIcon />}>
          <CardState
            isLoading={requestsLoading}
            isError={requestsError}
            isEmpty={(requests ?? []).length === 0}
            emptyMessage="No time off requests yet."
          />
          {!requestsLoading && !requestsError && (requests ?? []).length > 0 && (
            <ul className="divide-y divide-slate-100">
              {(requests ?? []).slice(0, 5).map((r) => (
                <li key={r.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {r.time_off_type?.name ?? 'Time off'}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatShortDate(r.start_date)} — {formatShortDate(r.end_date)} ·{' '}
                      {r.duration} {r.time_off_type?.unit ?? ''}
                    </p>
                  </div>
                  <StatusBadge status={r.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

// ─── Role-aware entry point ─────────────────────────────────────────────────

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const canViewPayrollDashboard = user ? can(user.role, 'VIEW_PAYROLL_DASHBOARD') : false;

  if (!canViewPayrollDashboard) {
    return <PersonalDashboard />;
  }

  return <PayrollDashboard />;
}