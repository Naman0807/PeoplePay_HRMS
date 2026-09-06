'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/src/components/layout/PageHeader';
import { Pagination } from '@/src/components/layout/Pagination';
import { DataTable, type Column } from '@/src/components/layout/DataTable';
import { StatusBadge } from '@/src/components/layout/StatusBadge';
import { EmptyState } from '@/src/components/layout/EmptyState';
import {
  useEmployees,
  useDepartments,
  useDeleteEmployee,
  type Employee,
} from '@/src/lib/api/queries';
import { ConfirmDialog } from '@/src/components/layout/ConfirmDialog';
import { RequireAuth } from '@/src/components/auth/RequireAuth';

function Avatar({ firstName, lastName }: { firstName: string; lastName: string }) {
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  return (
    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700">
      {initials}
    </span>
  );
}

function ActionLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      onClick={(e) => e.stopPropagation()}
      className="rounded-md px-2.5 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
    >
      {label}
    </Link>
  );
}

function EmployeesPageContent() {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, isLoading, isError, error } = useEmployees({
    page,
    pageSize: 20,
    search: search || undefined,
    departmentId: departmentId || undefined,
    status: status ? (status as 'ACTIVE' | 'INACTIVE') : undefined,
  });
  const { data: departments } = useDepartments();
  const deleteEmployee = useDeleteEmployee();
  const [deleting, setDeleting] = useState<Employee | null>(null);

  const employees = Array.isArray(data) ? data : (data?.items ?? []);
  const meta = Array.isArray(data) ? undefined : data?.meta;
  const totalPages = meta?.totalPages ?? 1;

  const columns: Column<Employee>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (row) => (
        <div className="flex items-center gap-3">
          <Avatar firstName={row.first_name} lastName={row.last_name} />
          <div>
            <p className="font-medium text-slate-900">
              {row.first_name} {row.last_name}
            </p>
            <p className="text-xs text-slate-500">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      render: (row) => <span className="text-slate-500">{row.email}</span>,
    },
    {
      key: 'department',
      header: 'Department',
      render: (row) => <span className="text-slate-700">{row.department?.name ?? '—'}</span>,
    },
    {
      key: 'role',
      header: 'Role',
      render: (row) => <span className="text-slate-700">{row.job_position}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-1">
          <ActionLink href={`/employees/${row.id}/edit`} label="View" />
          <ActionLink href={`/employees/${row.id}/edit`} label="Edit" />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setDeleting(row);
            }}
            className="rounded-md px-2.5 py-1 text-xs font-medium text-rose-600 transition-colors hover:bg-rose-50 hover:text-rose-700"
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Employees"
        description="Manage employee records across the organisation"
        actions={
          <>
            <Link
              href="/employees/kanban"
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Kanban
            </Link>
            <Link
              href="/employees/new"
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800"
            >
              Add Employee
            </Link>
          </>
        }
      />

      <div className="mb-4 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-4">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-slate-500">Search</label>
          <div className="relative">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                setPage(1);
              }}
              placeholder="Search by name or email..."
              className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-slate-500 focus:outline-none"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Department</label>
          <select
            value={departmentId}
            onChange={(e) => {
              setDepartmentId(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          >
            <option value="">All departments</option>
            {departments?.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Status</label>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          >
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
      </div>

      {isError && (
        <div className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">
          Error loading employees: {(error as Error).message}
        </div>
      )}

      {!isLoading && !isError && employees.length === 0 ? (
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
          message="No employees found. Add your first employee to get started."
          action={
            <Link
              href="/employees/new"
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800"
            >
              Add your first employee
            </Link>
          }
        />
      ) : (
        <DataTable
          columns={columns}
          data={employees}
          keyExtractor={(row) => row.id}
          loading={isLoading}
          emptyMessage="No employees found"
          onRowClick={(row) => router.push(`/employees/${row.id}/edit`)}
        />
      )}

            <Pagination
        page={page}
        totalPages={totalPages}
        total={meta?.total}
        label="employees"
        onChange={setPage}
      />

      <ConfirmDialog
        open={!!deleting}
        title="Delete employee"
        message={`Delete ${deleting?.first_name ?? ''} ${deleting?.last_name ?? ''}? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        loading={deleteEmployee.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (!deleting) return;
          deleteEmployee.mutate(deleting.id, { onSuccess: () => setDeleting(null) });
        }}
      />
    </div>
  );
}

export default function EmployeesPage() {
  return (
    <RequireAuth capability="VIEW_ALL_EMPLOYEES">
      <EmployeesPageContent />
    </RequireAuth>
  );
}