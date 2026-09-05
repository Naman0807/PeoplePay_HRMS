'use client';

import { useState } from 'react';
import {
  useContracts,
  useCreateContract,
  useEmployees,
  useSalaryStructures,
  useSchedules,
} from '@/src/lib/api/queries';
import { RequireAuth } from '@/src/components/auth/RequireAuth';
import { PageHeader } from '@/src/components/layout/PageHeader';
import { DataTable, type Column } from '@/src/components/layout/DataTable';
import { StatusBadge } from '@/src/components/layout/StatusBadge';
import { Modal } from '@/src/components/layout/Modal';
import { EmptyState } from '@/src/components/layout/EmptyState';
import type { Contract, Employee } from '@/src/lib/api/queries';
import type { CreateContractDTO, PaginatedResponse } from '@peoplepay360/shared';

function toItems<T>(data: PaginatedResponse<T> | T[] | undefined): T[] {
  if (!data) return [];
  return Array.isArray(data) ? data : data.items ?? [];
}

function ContractsPageContent() {
  const [modalOpen, setModalOpen] = useState(false);
  const { data: contractsData, isLoading } = useContracts();
  const { data: employeesData } = useEmployees({ pageSize: 100, status: 'ACTIVE' });
  const { data: structures } = useSalaryStructures();
  const { data: schedules } = useSchedules();
  const createContract = useCreateContract();

  const contracts = toItems<Contract>(contractsData);
  const employees = toItems<Employee>(employeesData);

  const employeeMap = new Map(employees.map((e) => [e.id, `${e.first_name} ${e.last_name}`]));

  const [form, setForm] = useState({
    employee_id: '',
    name: '',
    start_date: '',
    end_date: '',
    wage: '',
    salary_structure_id: '',
    working_schedule_id: '',
    status: 'DRAFT' as CreateContractDTO['status'],
  });

  function resetForm() {
    setForm({
      employee_id: '',
      name: '',
      start_date: '',
      end_date: '',
      wage: '',
      salary_structure_id: '',
      working_schedule_id: '',
      status: 'DRAFT',
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.employee_id || !form.name || !form.start_date || !form.wage || !form.salary_structure_id || !form.working_schedule_id) return;

    createContract.mutate(
      {
        employee_id: form.employee_id,
        name: form.name,
        start_date: form.start_date,
        end_date: form.end_date || undefined,
        wage: Number(form.wage),
        salary_structure_id: form.salary_structure_id,
        working_schedule_id: form.working_schedule_id,
        status: form.status,
      },
      {
        onSuccess: () => {
          setModalOpen(false);
          resetForm();
        },
      }
    );
  }

  const columns: Column<Contract>[] = [
    {
      key: 'employee',
      header: 'Employee',
      render: (row) =>
        row.employee
          ? `${row.employee.first_name} ${row.employee.last_name}`
          : employeeMap.get(row.employee_id) ?? '—',
    },
    {
      key: 'name',
      header: 'Contract Name',
      render: (row) => row.name,
    },
    {
      key: 'start_date',
      header: 'Start Date',
      render: (row) => new Date(row.start_date).toLocaleDateString(),
    },
    {
      key: 'end_date',
      header: 'End Date',
      render: (row) => (row.end_date ? new Date(row.end_date).toLocaleDateString() : '—'),
    },
    {
      key: 'wage',
      header: 'Wage',
      render: (row) => `$${Number(row.wage).toLocaleString()}`,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'actions',
      header: '',
      render: () => (
        <button
          type="button"
          className="text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          View
        </button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Contracts"
        description="Manage employee contracts and terms"
        actions={
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New Contract
          </button>
        }
      />

      {contracts.length === 0 && !isLoading ? (
        <EmptyState
          icon={
            <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
          message="No contracts found"
          action={
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Create Contract
            </button>
          }
        />
      ) : (
        <DataTable
          columns={columns}
          data={contracts}
          keyExtractor={(row) => row.id}
          loading={isLoading}
          emptyMessage="No contracts found"
        />
      )}

      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          resetForm();
        }}
        title="New Contract"
        size="lg"
        footer={
          <>
            <button
              type="button"
              onClick={() => {
                setModalOpen(false);
                resetForm();
              }}
              disabled={createContract.isPending}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="contract-form"
              disabled={createContract.isPending}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
            >
              {createContract.isPending ? 'Creating...' : 'Create Contract'}
            </button>
          </>
        }
      >
        <form id="contract-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="employee_id" className="mb-1 block text-sm font-medium text-slate-700">
                Employee
              </label>
              <select
                id="employee_id"
                value={form.employee_id}
                onChange={(e) => setForm((f) => ({ ...f, employee_id: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
                required
              >
                <option value="">Select employee</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="name" className="mb-1 block text-sm font-medium text-slate-700">
                Contract Name
              </label>
              <input
                id="name"
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
                placeholder="e.g. Full-Time 2026"
                required
              />
            </div>

            <div>
              <label htmlFor="start_date" className="mb-1 block text-sm font-medium text-slate-700">
                Start Date
              </label>
              <input
                id="start_date"
                type="date"
                value={form.start_date}
                onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
                required
              />
            </div>

            <div>
              <label htmlFor="end_date" className="mb-1 block text-sm font-medium text-slate-700">
                End Date
              </label>
              <input
                id="end_date"
                type="date"
                value={form.end_date}
                onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
              />
            </div>

            <div>
              <label htmlFor="wage" className="mb-1 block text-sm font-medium text-slate-700">
                Wage
              </label>
              <input
                id="wage"
                type="number"
                min="0"
                step="0.01"
                value={form.wage}
                onChange={(e) => setForm((f) => ({ ...f, wage: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
                placeholder="0.00"
                required
              />
            </div>

            <div>
              <label htmlFor="status" className="mb-1 block text-sm font-medium text-slate-700">
                Status
              </label>
              <select
                id="status"
                value={form.status ?? 'DRAFT'}
                onChange={(e) =>
                  setForm((f) => ({ ...f, status: e.target.value as CreateContractDTO['status'] }))
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
              >
                <option value="DRAFT">Draft</option>
                <option value="RUNNING">Running</option>
                <option value="EXPIRED">Expired</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="salary_structure_id" className="mb-1 block text-sm font-medium text-slate-700">
                Salary Structure
              </label>
              <select
                id="salary_structure_id"
                value={form.salary_structure_id}
                onChange={(e) => setForm((f) => ({ ...f, salary_structure_id: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
                required
              >
                <option value="">Select structure</option>
                {(structures ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="working_schedule_id" className="mb-1 block text-sm font-medium text-slate-700">
                Working Schedule
              </label>
              <select
                id="working_schedule_id"
                value={form.working_schedule_id}
                onChange={(e) => setForm((f) => ({ ...f, working_schedule_id: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
                required
              >
                <option value="">Select schedule</option>
                {(schedules ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {createContract.isError && (
            <p className="text-sm text-rose-600">
              {(createContract.error as Error)?.message ?? 'Failed to create contract'}
            </p>
          )}
        </form>
      </Modal>
    </div>
  );
}

export default function ContractsPage() {
  return (
    <RequireAuth capability="MANAGE_CONTRACTS_SCHEDULES">
      <ContractsPageContent />
    </RequireAuth>
  );
}
