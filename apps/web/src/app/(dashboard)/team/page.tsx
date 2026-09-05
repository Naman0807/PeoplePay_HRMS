'use client';

import { useEffect, useState } from 'react';
import { RequireAuth } from '@/src/components/auth/RequireAuth';
import { PageHeader } from '@/src/components/layout/PageHeader';
import { LoadingSpinner } from '@/src/components/layout/LoadingSpinner';
import { EmptyState } from '@/src/components/layout/EmptyState';
import { StatusBadge } from '@/src/components/layout/StatusBadge';
import { apiFetch, ApiError } from '@/src/lib/api/client';

interface DirectoryEmployee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  job_position: string;
  department: { id: string; name: string } | null;
  status: string;
}

interface Department {
  id: string;
  name: string;
}

const AVATAR_COLORS = [
  'bg-slate-700',
  'bg-emerald-700',
  'bg-sky-700',
  'bg-indigo-700',
  'bg-rose-700',
  'bg-amber-700',
  'bg-teal-700',
  'bg-violet-700',
];

function avatarColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function initials(firstName: string, lastName: string): string {
  return `${(firstName[0] ?? '').toUpperCase()}${(lastName[0] ?? '').toUpperCase()}`;
}

export default function TeamPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [employees, setEmployees] = useState<DirectoryEmployee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    apiFetch<Department[]>('/departments')
      .then((data) => setDepartments(data ?? []))
      .catch(() => setDepartments([]));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (departmentId) params.set('departmentId', departmentId);
    const query = params.toString();

    apiFetch<DirectoryEmployee[]>(`/employees/directory${query ? `?${query}` : ''}`)
      .then((data) => {
        if (!cancelled) setEmployees(data ?? []);
      })
      .catch((err) => {
        if (!cancelled) {
          setEmployees([]);
          setError(err instanceof ApiError ? err.message : 'Failed to load team members');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, departmentId]);

  return (
    <RequireAuth capability="VIEW_TEAM_DIRECTORY">
      <div>
        <PageHeader
          title="Team"
          description="Company directory"
          actions={
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name or email..."
                className="w-64 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
                aria-label="Search team members"
              />
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
                aria-label="Filter by department"
              >
                <option value="">All departments</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
            </div>
          }
        />

        {error ? (
          <div className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
        ) : null}

        {loading ? (
          <div className="flex min-h-40 items-center justify-center rounded-xl border border-slate-200 bg-white">
            <LoadingSpinner label="Loading team members..." />
          </div>
        ) : employees.length === 0 ? (
          <EmptyState
            icon={
              <svg
                className="h-10 w-10"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            }
            message="No team members found"
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {employees.map((employee) => (
              <div
                key={employee.id}
                className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ${avatarColor(employee.id)}`}
                  >
                    {initials(employee.first_name, employee.last_name)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">
                      {employee.first_name} {employee.last_name}
                    </p>
                    <p className="truncate text-sm text-slate-500">{employee.job_position}</p>
                  </div>
                  <div className="ml-auto shrink-0">
                    <StatusBadge status={employee.status} />
                  </div>
                </div>
                <div className="border-t border-slate-100 pt-3 text-sm text-slate-600">
                  <p className="truncate">
                    {employee.department ? employee.department.name : 'No department'}
                  </p>
                  <a
                    href={`mailto:${employee.email}`}
                    className="mt-0.5 block truncate text-slate-900 transition-colors hover:text-slate-500"
                  >
                    {employee.email}
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </RequireAuth>
  );
}