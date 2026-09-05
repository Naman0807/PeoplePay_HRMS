'use client';

import { useState } from 'react';
import { RequireAuth } from '@/src/components/auth/RequireAuth';
import { PageHeader } from '@/src/components/layout/PageHeader';
import { DataTable, type Column } from '@/src/components/layout/DataTable';
import { StatusBadge } from '@/src/components/layout/StatusBadge';
import { Modal } from '@/src/components/layout/Modal';
import { EmptyState } from '@/src/components/layout/EmptyState';
import { LoadingSpinner } from '@/src/components/layout/LoadingSpinner';
import {
  usePayslips,
  usePayslip,
  type Payslip,
  type PayslipLine,
} from '@/src/lib/api/queries';
import PayslipPdfButton from '@/src/components/payslip/PayslipPdfButton';

type PayslipDetail = Payslip & {
  lines?: Array<PayslipLine & { salary_rule?: { id: string; name: string; code: string } }>;
};

function formatDay(value: string) {
  const [year, month, day] = value.slice(0, 10).split('-');
  if (!year || !month || !day) return value;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[Number(month) - 1]} ${Number(day)}, ${year}`;
}

function money(value: number | string) {
  return `$${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function PayslipsPageContent() {
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading, isError, error } = usePayslips({ page, pageSize: 20 });
  const { data: detailData, isLoading: detailLoading } = usePayslip(selectedId ?? undefined);

  const payslips = Array.isArray(data) ? data : (data?.items ?? []);
  const meta = Array.isArray(data) ? undefined : data?.meta;
  const totalPages = meta?.totalPages ?? 1;
  const detail = detailData as PayslipDetail | undefined;

  const earnings = (detail?.lines ?? []).filter((line) => line.category !== 'DEDUCTION');
  const deductions = (detail?.lines ?? []).filter((line) => line.category === 'DEDUCTION');

  const columns: Column<Payslip>[] = [
    {
      key: 'employee',
      header: 'Employee',
      render: (row) =>
        row.employee ? `${row.employee.first_name} ${row.employee.last_name}` : '—',
    },
    {
      key: 'period',
      header: 'Period',
      render: (row) =>
        row.payrun
          ? `${formatDay(row.payrun.period_start)} — ${formatDay(row.payrun.period_end)}`
          : '—',
    },
    {
      key: 'gross',
      header: 'Gross',
      render: (row) => money(row.gross_amount),
    },
    {
      key: 'deductions',
      header: 'Deductions',
      render: (row) => money(row.deduction_amount),
    },
    {
      key: 'net',
      header: 'Net',
      render: (row) => <span className="font-medium text-slate-900">{money(row.net_amount)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <button
          type="button"
          onClick={() => setSelectedId(row.id)}
          className="rounded-md px-2.5 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
        >
          View
        </button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Payslips"
        description="Review employee payslip details by period"
      />

      {isError && (
        <div className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">
          Error loading payslips: {(error as Error).message}
        </div>
      )}

      {payslips.length === 0 && !isLoading && !isError ? (
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
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 13h6"
              />
            </svg>
          }
          message="No payslips found. Payslips are generated when a payrun is computed."
        />
      ) : (
        <DataTable
          columns={columns}
          data={payslips}
          keyExtractor={(row) => row.id}
          loading={isLoading}
          emptyMessage="No payslips found"
        />
      )}

      {!isLoading && !isError && payslips.length > 0 && totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Page {page} of {totalPages} · {meta?.total} payslips
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      <Modal
        open={selectedId !== null}
        onClose={() => setSelectedId(null)}
        title={detail ? `${detail.employee?.first_name} ${detail.employee?.last_name}` : 'Payslip'}
        size="md"
        scrollable
        footer={
          <>
            {detail ? <PayslipPdfButton payslipId={detail.id} /> : null}
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800"
            >
              Close
            </button>
          </>
        }
      >
        {detailLoading || !detail ? (
          <div className="flex min-h-40 items-center justify-center">
            <LoadingSpinner label="Loading payslip..." />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs">
              <div>
                <p className="text-[10px] uppercase tracking-wide text-slate-500">Employee</p>
                <p className="mt-0.5 truncate font-medium text-slate-900">
                  {detail.employee ? `${detail.employee.first_name} ${detail.employee.last_name}` : '—'}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-slate-500">Period</p>
                <p className="mt-0.5 font-medium text-slate-900">
                  {detail.payrun
                    ? `${formatDay(detail.payrun.period_start)} — ${formatDay(detail.payrun.period_end)}`
                    : '—'}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-slate-500">Worked days</p>
                <p className="mt-0.5 font-medium text-slate-900">{detail.worked_days}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-slate-500">Status</p>
                <div className="mt-0.5">
                  <StatusBadge status={detail.status} />
                </div>
              </div>
            </div>

            {detail.warnings && detail.warnings.length > 0 ? (
              <div className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <ul className="list-inside list-disc space-y-0.5">
                  {detail.warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="overflow-hidden rounded-lg border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-3 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500"
                    >
                      Earnings
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-1.5 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-500"
                    >
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="px-3 py-1.5 text-xs text-slate-700">Basic</td>
                    <td className="px-3 py-1.5 text-right text-xs text-slate-700">
                      {money(detail.basic_amount)}
                    </td>
                  </tr>
                  {earnings.map((line) => (
                    <tr key={line.id}>
                      <td className="px-3 py-1.5 text-xs text-slate-700">
                        {line.salary_rule?.name ?? line.code}
                      </td>
                      <td className="px-3 py-1.5 text-right text-xs text-slate-700">
                        {money(line.amount)}
                      </td>
                    </tr>
                  ))}
                  {deductions.map((line) => (
                    <tr key={line.id}>
                      <td className="px-3 py-1.5 text-xs text-rose-600">
                        {line.salary_rule?.name ?? line.code}
                      </td>
                      <td className="px-3 py-1.5 text-right text-xs text-rose-600">
                        -{money(line.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end">
              <div className="w-52 space-y-1 rounded-lg border border-slate-200 px-3 py-2.5 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Gross</span>
                  <span>{money(detail.gross_amount)}</span>
                </div>
                <div className="flex items-center justify-between text-rose-600">
                  <span>Deductions</span>
                  <span>-{money(detail.deduction_amount)}</span>
                </div>
                <div className="flex items-center justify-between border-t border-slate-200 pt-1.5 text-sm font-semibold text-slate-900">
                  <span>Net Pay</span>
                  <span>{money(detail.net_amount)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default function PayslipsPage() {
  return (
    <RequireAuth>
      <PayslipsPageContent />
    </RequireAuth>
  );
}