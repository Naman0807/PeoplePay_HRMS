'use client';

import { useMemo, useState } from 'react';
import {
  useApproveTimeOffRequest,
  useCreateTimeOffRequest,
  useEmployees,
  useRefuseTimeOffRequest,
  useSubmitTimeOffRequest,
  useTimeOffAllocations,
  useTimeOffRequests,
  useTimeOffTypes,
  listOf,
} from '@/src/lib/api/queries';
import { useAuthStore } from '@/src/store/authStore';
import { can } from '@peoplepay360/shared';
import type { Column } from '@/src/components/layout/DataTable';
import { Pagination } from '@/src/components/layout/Pagination';
import { DataTable } from '@/src/components/layout/DataTable';
import { EmptyState } from '@/src/components/layout/EmptyState';
import { LoadingSpinner } from '@/src/components/layout/LoadingSpinner';
import { Modal } from '@/src/components/layout/Modal';
import { ConfirmDialog } from '@/src/components/layout/ConfirmDialog';
import { PageHeader } from '@/src/components/layout/PageHeader';
import { StatCard } from '@/src/components/layout/StatCard';
import { StatusBadge } from '@/src/components/layout/StatusBadge';

function formatDate(value?: string | null) {
  if (!value) return '—';
  const [y, m, d] = value.slice(0, 10).split('-');
  if (!y || !m || !d) return '—';
  return `${m}/${d}/${y}`;
}

function employeeName(employee?: { first_name?: string; last_name?: string } | null) {
  if (!employee) return '—';
  const full = `${employee.first_name ?? ''} ${employee.last_name ?? ''}`.trim();
  return full || '—';
}

function CalendarIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

const inputClass =
  'w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900';
const labelClass = 'mb-1 block text-sm font-medium text-slate-700';

export default function TimeOffPage() {
  const [newRequestOpen, setNewRequestOpen] = useState(false);
  const [confirm, setConfirm] = useState<{ id: string; action: 'approve' | 'refuse' } | null>(null);

  const [employeeId, setEmployeeId] = useState('');
  const [typeId, setTypeId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const typesQuery = useTimeOffTypes();
  const user = useAuthStore((s) => s.user);
  const canApprove = !!user && can(user.role, 'APPROVE_TIME_OFF');
  const canManageTypes = !!user && can(user.role, 'MANAGE_TIME_OFF_TYPES');

  const [requestsPage, setRequestsPage] = useState(1);
  const [allocationsPage, setAllocationsPage] = useState(1);
  const allocationsQuery = useTimeOffAllocations({ page: allocationsPage, pageSize: 20 });
  const requestsQuery = useTimeOffRequests({ page: requestsPage, pageSize: 20 });
  const employeesQuery = useEmployees();

  const createRequest = useCreateTimeOffRequest();
  const submitRequest = useSubmitTimeOffRequest();
  const approveRequest = useApproveTimeOffRequest();
  const refuseRequest = useRefuseTimeOffRequest();

  const types = typesQuery.data ?? [];
  const allocations = listOf(allocationsQuery.data);
  const requests = listOf(requestsQuery.data);
  const employees = listOf(employeesQuery.data);

  // Employees can only file for themselves; preselect their own record.
  const ownEmployeeId = canApprove ? '' : employees[0]?.id ?? '';
  const effectiveEmployeeId = canApprove ? employeeId : ownEmployeeId;

  const balances = useMemo(() => {
    const map = new Map<string, { typeId: string; typeName: string; remaining: number }>();
    for (const a of allocations) {
      const key = a.time_off_type_id;
      const entry =
        map.get(key) ?? {
          typeId: key,
          typeName: a.time_off_type?.name ?? 'Unknown',
          remaining: 0,
        };
      entry.remaining += Number(a.remaining_units) || 0;
      map.set(key, entry);
    }
    return [...map.values()].sort((a, b) => a.typeName.localeCompare(b.typeName));
  }, [allocations]);

  const pendingCount = useMemo(
    () => requests.filter((r) => r.status === 'SUBMITTED').length,
    [requests]
  );

  const loading =
    typesQuery.isLoading || allocationsQuery.isLoading || requestsQuery.isLoading;
  const hasError =
    typesQuery.isError || allocationsQuery.isError || requestsQuery.isError || employeesQuery.isError;

  function handleCreateRequest() {
    if (!effectiveEmployeeId || !typeId || !startDate || !endDate) return;
    createRequest.mutate(
      {
        employee_id: effectiveEmployeeId,
        time_off_type_id: typeId,
        start_date: startDate,
        end_date: endDate,
      },
      {
        onSuccess: () => {
          setNewRequestOpen(false);
          setEmployeeId('');
          setTypeId('');
          setStartDate('');
          setEndDate('');
        },
      }
    );
  }

  function handleConfirm() {
    if (!confirm) return;
    const mutation =
      confirm.action === 'approve' ? approveRequest : refuseRequest;
    mutation.mutate(confirm.id, {
      onSuccess: () => setConfirm(null),
    });
  }

  const requestColumns: Column<(typeof requests)[number]>[] = [
    {
      key: 'employee',
      header: 'Employee',
      render: (row) => employeeName(row.employee),
    },
    {
      key: 'type',
      header: 'Type',
      render: (row) => row.time_off_type?.name ?? '—',
    },
    {
      key: 'start',
      header: 'Start date',
      render: (row) => formatDate(row.start_date),
    },
    {
      key: 'end',
      header: 'End date',
      render: (row) => formatDate(row.end_date),
    },
    {
      key: 'duration',
      header: 'Duration',
      render: (row) => `${row.duration} ${row.time_off_type?.unit ?? ''}`.trim(),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) =>
        row.status === 'DRAFT' ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => submitRequest.mutate(row.id)}
              disabled={submitRequest.isPending}
              className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
            >
              <CheckIcon />
              Submit
            </button>
          </div>
        ) : row.status === 'SUBMITTED' && canApprove ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setConfirm({ id: row.id, action: 'approve' })}
              disabled={approveRequest.isPending}
              className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
            >
              <CheckIcon />
              Approve
            </button>
            <button
              type="button"
              onClick={() => setConfirm({ id: row.id, action: 'refuse' })}
              disabled={refuseRequest.isPending}
              className="inline-flex items-center gap-1 rounded-md bg-rose-600 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-rose-700 disabled:opacity-50"
            >
              <XIcon />
              Reject
            </button>
          </div>
        ) : (
          <span className="text-slate-400">—</span>
        ),
    },
  ];

  const typeColumns: Column<(typeof types)[number]>[] = [
    { key: 'name', header: 'Name', render: (row) => row.name },
    { key: 'unit', header: 'Unit', render: (row) => row.unit },
    {
      key: 'requires_allocation',
      header: 'Requires allocation',
      render: (row) => (row.requires_allocation ? 'Yes' : 'No'),
    },
    {
      key: 'payroll_integration',
      header: 'Payroll integration',
      render: (row) => (row.payroll_integration ? 'Yes' : 'No'),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: () => <span className="text-slate-400">—</span>,
    },
  ];

  const allocationColumns: Column<(typeof allocations)[number]>[] = [
    {
      key: 'employee',
      header: 'Employee',
      render: (row) => employeeName(row.employee),
    },
    {
      key: 'type',
      header: 'Type',
      render: (row) => row.time_off_type?.name ?? '—',
    },
    {
      key: 'year',
      header: 'Year',
      render: (row) => (row.valid_from ? row.valid_from.slice(0, 4) : '—'),
    },
    {
      key: 'allocated',
      header: 'Allocated days',
      render: (row) => row.allocated_units,
    },
    {
      key: 'used',
      header: 'Used days',
      render: (row) => row.taken_units,
    },
    {
      key: 'remaining',
      header: 'Remaining',
      render: (row) => row.remaining_units,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Time Off"
        description="Manage time off requests, types and employee balances."
        actions={
          <button
            type="button"
            onClick={() => setNewRequestOpen(true)}
            className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800"
          >
            <PlusIcon />
            New Request
          </button>
        }
      />

      {hasError && (
        <div className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">
          Something went wrong while loading time off data. Please try again.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Pending requests" value={pendingCount} icon={<CalendarIcon />} />
        {balances.map((balance) => (
          <StatCard
            key={balance.typeId}
            label={`${balance.typeName} available`}
            value={balance.remaining}
            icon={<CalendarIcon />}
          />
        ))}
      </div>

      {!loading && balances.length === 0 && (
        <p className="mt-3 text-sm text-slate-500">
          No leave allocated to you yet. Ask HR to allocate leave before requesting time off.
        </p>
      )}

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Requests</h2>
        </div>
        {loading ? (
          <div className="flex min-h-40 items-center justify-center rounded-xl border border-slate-200 bg-white">
            <LoadingSpinner label="Loading requests..." />
          </div>
        ) : requests.length === 0 ? (
          <EmptyState icon={<CalendarIcon />} message="No time off requests yet." />
        ) : (
          <DataTable columns={requestColumns} data={requests} keyExtractor={(row) => row.id} />
        )}
        <Pagination
          page={requestsPage}
          totalPages={requestsQuery.data?.meta?.totalPages ?? 1}
          total={requestsQuery.data?.meta?.total}
          label="requests"
          onChange={setRequestsPage}
        />
      </section>

      {canManageTypes && (
      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Types</h2>
        {loading ? (
          <div className="flex min-h-40 items-center justify-center rounded-xl border border-slate-200 bg-white">
            <LoadingSpinner label="Loading types..." />
          </div>
        ) : types.length === 0 ? (
          <EmptyState icon={<CalendarIcon />} message="No time off types configured yet." />
        ) : (
          <DataTable columns={typeColumns} data={types} keyExtractor={(row) => row.id} />
        )}
      </section>
      )}

      {canManageTypes && (
      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Allocations</h2>
        {loading ? (
          <div className="flex min-h-40 items-center justify-center rounded-xl border border-slate-200 bg-white">
            <LoadingSpinner label="Loading allocations..." />
          </div>
        ) : allocations.length === 0 ? (
          <EmptyState icon={<CalendarIcon />} message="No allocations recorded yet." />
        ) : (
          <DataTable
            columns={allocationColumns}
            data={allocations}
            keyExtractor={(row) => row.id}
          />
        )}
        <Pagination
          page={allocationsPage}
          totalPages={allocationsQuery.data?.meta?.totalPages ?? 1}
          total={allocationsQuery.data?.meta?.total}
          label="allocations"
          onChange={setAllocationsPage}
        />
      </section>
      )}

      <Modal
        open={newRequestOpen}
        onClose={() => setNewRequestOpen(false)}
        title="New Time Off Request"
        footer={
          <>
            <button
              type="button"
              onClick={() => setNewRequestOpen(false)}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreateRequest}
              disabled={!effectiveEmployeeId || !typeId || !startDate || !endDate || createRequest.isPending}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
            >
              {createRequest.isPending ? 'Submitting...' : 'Submit Request'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {canApprove ? (
            <div>
              <label className={labelClass} htmlFor="to-employee">
                Employee
              </label>
              <select
                id="to-employee"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className={inputClass}
              >
                <option value="">Select employee</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <div>
            <label className={labelClass} htmlFor="to-type">
              Time off type
            </label>
            <select
              id="to-type"
              value={typeId}
              onChange={(e) => setTypeId(e.target.value)}
              className={inputClass}
            >
              <option value="">Select type</option>
              {types.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="to-start">
                Start date
              </label>
              <input
                id="to-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="to-end">
                End date
              </label>
              <input
                id="to-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
          {createRequest.isError && (
            <p className="text-sm text-rose-600">Failed to create time off request.</p>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={confirm !== null}
        title={confirm?.action === 'approve' ? 'Approve request?' : 'Reject request?'}
        message={
          confirm?.action === 'approve'
            ? 'Are you sure you want to approve this time off request? The balance will be deducted once approved.'
            : 'Are you sure you want to reject this time off request? This action cannot be undone.'
        }
        confirmLabel={confirm?.action === 'approve' ? 'Approve' : 'Reject'}
        cancelLabel="Cancel"
        danger={confirm?.action === 'refuse'}
        loading={approveRequest.isPending || refuseRequest.isPending}
        onConfirm={handleConfirm}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}