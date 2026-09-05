'use client';

import Link from 'next/link';
import { PageHeader } from '@/src/components/layout/PageHeader';
import { LoadingSpinner } from '@/src/components/layout/LoadingSpinner';
import { EmptyState } from '@/src/components/layout/EmptyState';
import { useEmployees, type Employee } from '@/src/lib/api/queries';

function Avatar({ firstName, lastName }: { firstName: string; lastName: string }) {
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  return (
    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-700">
      {initials}
    </span>
  );
}

const COLUMNS: { key: Employee['status']; label: string; dot: string }[] = [
  { key: 'ACTIVE', label: 'Active', dot: 'bg-emerald-500' },
  { key: 'INACTIVE', label: 'Inactive', dot: 'bg-slate-400' },
];

export default function EmployeesKanbanPage() {
  const { data, isLoading, isError, error } = useEmployees({ page: 1, pageSize: 100 });

  const employees = Array.isArray(data) ? data : (data?.items ?? []);

  const grouped = COLUMNS.map((column) => ({
    ...column,
    employees: employees.filter((e) => e.status === column.key),
  }));

  const total = employees.length;

  return (
    <div>
      <PageHeader
        title="Employees"
        description="Employees grouped by employment status"
        actions={
          <Link
            href="/employees"
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to list
          </Link>
        }
      />

      <nav className="mb-4 text-sm text-slate-500">
        <Link href="/employees" className="transition-colors hover:text-slate-900">
          Employees
        </Link>
        <span className="mx-2 text-slate-300">/</span>
        <span className="text-slate-700">Kanban</span>
      </nav>

      {isLoading && (
        <div className="flex min-h-60 items-center justify-center rounded-xl border border-slate-200 bg-white">
          <LoadingSpinner label="Loading employees..." />
        </div>
      )}

      {isError && (
        <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">
          Error loading employees: {(error as Error).message}
        </div>
      )}

      {!isLoading && !isError && total === 0 && (
        <EmptyState message="No employees yet. Add employees to populate the board." />
      )}

      {!isLoading && !isError && total > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {grouped.map((column) => (
            <div
              key={column.key}
              className="rounded-xl border border-slate-200 bg-white shadow-sm"
            >
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${column.dot}`} />
                  <h2 className="text-sm font-semibold text-slate-900">{column.label}</h2>
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                  {column.employees.length}
                </span>
              </div>
              <div className="max-h-[70vh] space-y-3 overflow-y-auto p-4">
                {column.employees.length === 0 ? (
                  <p className="py-6 text-center text-sm text-slate-400">No employees</p>
                ) : (
                  column.employees.map((employee) => (
                    <Link
                      key={employee.id}
                      href={`/employees/${employee.id}/edit`}
                      className="block rounded-lg border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300 hover:bg-slate-50"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar firstName={employee.first_name} lastName={employee.last_name} />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-900">
                            {employee.first_name} {employee.last_name}
                          </p>
                          <p className="truncate text-xs text-slate-500">
                            {employee.department?.name ?? 'No department'}
                          </p>
                          <p className="truncate text-xs text-slate-500">{employee.job_position}</p>
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}