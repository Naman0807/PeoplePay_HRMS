'use client';

import { Fragment, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/src/lib/api/client';
import { RequireAuth } from '@/src/components/auth/RequireAuth';
import { PageHeader } from '@/src/components/layout/PageHeader';
import { StatusBadge } from '@/src/components/layout/StatusBadge';
import { EmptyState } from '@/src/components/layout/EmptyState';
import { LoadingSpinner } from '@/src/components/layout/LoadingSpinner';
import { usePayrunWizardStore } from '@/src/store/payrunWizardStore';
import {
  usePayruns,
  usePayrun,
  useCreatePayrun,
  useComputePayrun,
  useValidatePayrun,
  useMarkPaid,
  usePayrunEmployees,
  usePayrunPayslips,
  useEmployees,
  useSalaryStructures,
  type Payrun,
} from '@/src/lib/api/queries';
import type { PaginatedResponse } from '@peoplepay360/shared';

const WIZARD_STEPS = [
  { step: 1, label: 'Period' },
  { step: 2, label: 'Employees' },
  { step: 3, label: 'Review' },
  { step: 4, label: 'Process' },
];

function toItems<T>(data: PaginatedResponse<T> | T[] | undefined): T[] {
  if (!data) return [];
  return Array.isArray(data) ? data : data.items ?? [];
}

function formatDay(value: string) {
  const [year, month, day] = value.slice(0, 10).split('-');
  if (!year || !month || !day) return value;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[Number(month) - 1]} ${Number(day)}, ${year}`;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function money(value: number | string) {
  return `$${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function PayrollPageContent() {
  const queryClient = useQueryClient();
  const {
    step,
    payrunId,
    selectedEmployees,
    periodStart,
    periodEnd,
    notes,
    setStep,
    setPayrunId,
    toggleEmployee,
    setAllEmployees,
    setPeriod,
    setNotes,
  } = usePayrunWizardStore();

  const [salaryStructureId, setSalaryStructureId] = useState('');
  const [wizardError, setWizardError] = useState<string | null>(null);
  const [expandedPayrunId, setExpandedPayrunId] = useState<string | null>(null);

  const { data: structures } = useSalaryStructures();
  const {
    data: employeesData,
    isLoading: employeesLoading,
    isError: employeesError,
  } = useEmployees({ page: 1, pageSize: 100, status: 'ACTIVE' });
  const { data: payrunsData, isLoading: payrunsLoading } = usePayruns();
  const { data: currentPayrun } = usePayrun(payrunId ?? undefined);
  const { data: expandedEmployees } = usePayrunEmployees(expandedPayrunId ?? undefined);
  const { data: expandedPayslips } = usePayrunPayslips(expandedPayrunId ?? undefined);

  const createPayrun = useCreatePayrun();
  const computePayrun = useComputePayrun();
  const validatePayrun = useValidatePayrun();
  const markPaid = useMarkPaid();

  const employeeCandidates = toItems(employeesData);
  const payruns: Payrun[] = payrunsData ?? [];

  const allSelected =
    employeeCandidates.length > 0 && selectedEmployees.length === employeeCandidates.length;
  const canProceedToEmployees = !!periodStart && !!periodEnd && !!salaryStructureId;
  const canProceedToReview = selectedEmployees.length > 0;

  const status = currentPayrun?.status;
  const canCompute = status === 'DRAFT' || status === 'COMPUTED';
  const canValidate = status === 'COMPUTED';
  const canMarkPaid = status === 'VALIDATED';

  function toggleSelectAll() {
    setAllEmployees(allSelected ? [] : employeeCandidates.map((e) => e.id));
  }

  async function handleCreatePayrun() {
    setWizardError(null);
    try {
      const created = await createPayrun.mutateAsync({
        name: `Payrun ${periodStart} - ${periodEnd}`,
        salary_structure_id: salaryStructureId,
        period_start: periodStart,
        period_end: periodEnd,
      });
      await apiFetch<{ message: string }>(`/payruns/${created.id}/select-employees`, {
        method: 'POST',
        body: JSON.stringify({ employee_ids: selectedEmployees }),
      });
      setPayrunId(created.id);
      queryClient.invalidateQueries({ queryKey: ['payruns'] });
      setStep(4);
    } catch (err) {
      setWizardError((err as Error).message || 'Failed to create payrun');
    }
  }

  function handleCompute() {
    if (!payrunId) return;
    setWizardError(null);
    computePayrun.mutate(
      { payrunId },
      { onError: (err) => setWizardError((err as Error).message) }
    );
  }

  function handleValidate() {
    if (!payrunId) return;
    setWizardError(null);
    validatePayrun.mutate(
      { payrunId },
      { onError: (err) => setWizardError((err as Error).message) }
    );
  }

  function handleMarkPaid() {
    if (!payrunId) return;
    setWizardError(null);
    markPaid.mutate(
      { payrunId },
      { onError: (err) => setWizardError((err as Error).message) }
    );
  }

  function renderStepIndicator() {
    return (
      <ol className="mb-6 flex items-center gap-2 overflow-x-auto">
        {WIZARD_STEPS.map((s, index) => {
          const isActive = s.step === step;
          const isDone = s.step < step;
          return (
            <Fragment key={s.step}>
              <li className="flex shrink-0 items-center gap-2">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                    isDone
                      ? 'bg-emerald-600 text-white'
                      : isActive
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {isDone ? (
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    s.step
                  )}
                </span>
                <span
                  className={`text-sm font-medium ${
                    isActive ? 'text-slate-900' : isDone ? 'text-slate-600' : 'text-slate-400'
                  }`}
                >
                  {s.label}
                </span>
              </li>
              {index < WIZARD_STEPS.length - 1 ? (
                <span className="mx-1 h-px w-6 shrink-0 bg-slate-200" />
              ) : null}
            </Fragment>
          );
        })}
      </ol>
    );
  }

  function renderStepOne() {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="period-start"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Period Start
            </label>
            <input
              id="period-start"
              type="date"
              value={periodStart}
              onChange={(e) => setPeriod(e.target.value, periodEnd)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
              required
            />
          </div>
          <div>
            <label
              htmlFor="period-end"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Period End
            </label>
            <input
              id="period-end"
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriod(periodStart, e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
              required
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="salary-structure"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            Salary Structure
          </label>
          <select
            id="salary-structure"
            value={salaryStructureId}
            onChange={(e) => setSalaryStructureId(e.target.value)}
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

        <div>
          <label
            htmlFor="period-notes"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            Notes
          </label>
          <textarea
            id="period-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Optional notes for this payrun..."
            className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
          />
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setStep(2)}
            disabled={!canProceedToEmployees}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    );
  }

  function renderStepTwo() {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            {selectedEmployees.length} of {employeeCandidates.length} selected
          </p>
          <button
            type="button"
            onClick={toggleSelectAll}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            {allSelected ? 'Clear all' : 'Select all'}
          </button>
        </div>

        {employeesLoading ? (
          <div className="flex min-h-40 items-center justify-center rounded-xl border border-slate-200 bg-white">
            <LoadingSpinner label="Loading employees..." />
          </div>
        ) : employeesError ? (
          <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-rose-600">
            Failed to load employees.
          </div>
        ) : employeeCandidates.length === 0 ? (
          <EmptyState message="No eligible employees found. Check that employees have an active RUNNING contract." />
        ) : (
          <div className="max-h-96 divide-y divide-slate-200 overflow-y-auto rounded-xl border border-slate-200 bg-white">
            {employeeCandidates.map((employee) => {
              const checked = selectedEmployees.includes(employee.id);
              return (
                <label
                  key={employee.id}
                  className="flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleEmployee(employee.id)}
                    className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                  />
                  <span className="flex-1">
                    <span className="block text-sm font-medium text-slate-900">
                      {employee.first_name} {employee.last_name}
                    </span>
                    <span className="block text-xs text-slate-500">
                      {employee.job_position || employee.email}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        )}

        <div className="flex justify-between gap-2">
          <button
            type="button"
            onClick={() => setStep(1)}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            Back
          </button>
          <button
            type="button"
            onClick={() => setStep(3)}
            disabled={!canProceedToReview}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    );
  }

  function renderStepThree() {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white">
          <dl className="divide-y divide-slate-200">
            <div className="flex items-center justify-between px-4 py-3">
              <dt className="text-sm text-slate-500">Period</dt>
              <dd className="text-sm font-medium text-slate-900">
                {formatDay(periodStart)} — {formatDay(periodEnd)}
              </dd>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <dt className="text-sm text-slate-500">Salary structure</dt>
              <dd className="text-sm font-medium text-slate-900">
                {structures?.find((s) => s.id === salaryStructureId)?.name ?? '—'}
              </dd>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <dt className="text-sm text-slate-500">Employees selected</dt>
              <dd className="text-sm font-medium text-slate-900">{selectedEmployees.length}</dd>
            </div>
            {notes ? (
              <div className="px-4 py-3">
                <dt className="text-sm text-slate-500">Notes</dt>
                <dd className="mt-1 text-sm text-slate-900">{notes}</dd>
              </div>
            ) : null}
          </dl>
        </div>

        <div className="flex justify-between gap-2">
          <button
            type="button"
            onClick={() => setStep(2)}
            disabled={createPayrun.isPending}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            Back
          </button>
          <button
            type="button"
            onClick={handleCreatePayrun}
            disabled={createPayrun.isPending}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
          >
            {createPayrun.isPending ? 'Creating payrun...' : 'Create Payrun'}
          </button>
        </div>
      </div>
    );
  }

  function renderStepFour() {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-900">
                Payrun {formatDay(periodStart)} — {formatDay(periodEnd)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {currentPayrun?.payrun_employees?.length ?? 0} employees selected
              </p>
            </div>
            <StatusBadge status={status ?? 'DRAFT'} />
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <button
              type="button"
              onClick={handleCompute}
              disabled={!canCompute || computePayrun.isPending}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
            >
              {computePayrun.isPending ? 'Computing...' : 'Compute Salaries'}
            </button>
            <button
              type="button"
              onClick={handleValidate}
              disabled={!canValidate || validatePayrun.isPending}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
            >
              {validatePayrun.isPending ? 'Validating...' : 'Validate'}
            </button>
            <button
              type="button"
              onClick={handleMarkPaid}
              disabled={!canMarkPaid || markPaid.isPending}
              className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
            >
              {markPaid.isPending ? 'Marking as paid...' : 'Mark as Paid'}
            </button>
          </div>
          <p className="mt-3 text-xs text-slate-400">
            Compute, then validate, then mark as paid. Each step unlocks once the previous has run
            successfully.
          </p>
        </div>

        <div className="flex justify-start gap-2">
          <button
            type="button"
            onClick={() => setStep(3)}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  function renderPayrunsHistory() {
    if (payrunsLoading) {
      return (
        <div className="flex min-h-40 items-center justify-center rounded-xl border border-slate-200 bg-white">
          <LoadingSpinner label="Loading payruns..." />
        </div>
      );
    }

    if (payruns.length === 0) {
      return (
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
                d="M9 7h6m-3 -3v6m6 -3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
          message="No payruns yet. Create your first payrun using the wizard above."
        />
      );
    }

    return (
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              {['Period', 'Status', 'Payslips', 'Created', ''].map((header) => (
                <th
                  key={header}
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {payruns.map((payrun) => {
              const expanded = expandedPayrunId === payrun.id;
              return (
                <Fragment key={payrun.id}>
                  <tr className={expanded ? 'bg-slate-50' : ''}>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">
                      {formatDay(payrun.period_start)} — {formatDay(payrun.period_end)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">
                      <StatusBadge status={payrun.status} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">
                      {payrun._count?.payslips ?? 0}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-500">
                      {formatDateTime(payrun.created_at)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                      <button
                        type="button"
                        onClick={() => setExpandedPayrunId(expanded ? null : payrun.id)}
                        className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                      >
                        {expanded ? 'Collapse' : 'View'}
                        <svg
                          className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                  {expanded ? (
                    <tr key={`${payrun.id}-detail`}>
                      <td colSpan={5} className="bg-slate-50 px-4 py-4">
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                          <div>
                            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                              Employees ({expandedEmployees?.length ?? 0})
                            </h4>
                            {expandedEmployees && expandedEmployees.length > 0 ? (
                              <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
                                {expandedEmployees.map((pe) => (
                                  <li
                                    key={pe.id}
                                    className="flex items-center justify-between px-3 py-2"
                                  >
                                    <span className="text-sm text-slate-700">
                                      {pe.employee
                                        ? `${pe.employee.first_name} ${pe.employee.last_name}`
                                        : pe.employee_id}
                                    </span>
                                    <span className="text-xs font-medium text-slate-500">
                                      {money(pe.net_salary)}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-sm text-slate-500">No employees selected.</p>
                            )}
                          </div>
                          <div>
                            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                              Payslips ({expandedPayslips?.length ?? 0})
                            </h4>
                            {expandedPayslips && expandedPayslips.length > 0 ? (
                              <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
                                {expandedPayslips.map((payslip) => (
                                  <li
                                    key={payslip.id}
                                    className="flex items-center justify-between gap-2 px-3 py-2"
                                  >
                                    <span className="text-sm text-slate-700">
                                      {payslip.employee
                                        ? `${payslip.employee.first_name} ${payslip.employee.last_name}`
                                        : payslip.employee_id}
                                    </span>
                                    <span className="flex items-center gap-2">
                                      <span className="text-xs font-medium text-slate-500">
                                        {money(payslip.net_amount)}
                                      </span>
                                      <StatusBadge status={payslip.status} />
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-sm text-slate-500">
                                No payslips yet. Run Compute to generate them.
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Payroll"
        description="Create, compute, validate and pay salary runs"
      />

      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        {renderStepIndicator()}

        {wizardError ? (
          <div className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">
            {wizardError}
          </div>
        ) : null}

        {step === 1 ? renderStepOne() : null}
        {step === 2 ? renderStepTwo() : null}
        {step === 3 ? renderStepThree() : null}
        {step === 4 ? renderStepFour() : null}
      </div>

      <h2 className="mb-3 text-lg font-semibold text-slate-900">Payrun History</h2>
      {renderPayrunsHistory()}
    </div>
  );
}

export default function PayrollPage() {
  return (
    <RequireAuth capability="VIEW_PAYRUNS">
      <PayrollPageContent />
    </RequireAuth>
  );
}