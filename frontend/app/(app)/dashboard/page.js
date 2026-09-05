"use client";

import { useState } from "react";
import { useFetch } from "@/lib/useFetch";
import { Loading, ErrorBox, Empty } from "@/components/StatusStates";
import { Card, PageHeader, Field } from "@/components/ui";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function currentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function DashboardPage() {
  const [period, setPeriod] = useState(currentPeriod());
  const [department, setDepartment] = useState("");

  const kpiUrl = `/api/dashboard/kpis?period=${period}${department ? `&department=${department}` : ""}`;
  const chartUrl = `/api/dashboard/salary-by-department?period=${period}`;

  const { data: kpis, loading: kpiLoading, error: kpiError, refetch: refetchKpis } = useFetch(kpiUrl);
  const { data: chart, loading: chartLoading, error: chartError, refetch: refetchChart } = useFetch(chartUrl);

  const maxAmount = chart?.length ? Math.max(...chart.map((d) => Number(d.total_gross ?? d.amount ?? 0))) : 0;

  return (
    <div>
      <PageHeader title="Dashboard" />

      <div className="mb-6 flex flex-col sm:flex-row gap-3">
        <Field
          id="period"
          type="month"
          label="Period"
          value={period}
          onChange={setPeriod}
          className="sm:w-44"
        />
        <Field
          id="department"
          label="Department"
          value={department}
          onChange={setDepartment}
          placeholder="All"
        />
      </div>

      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpiLoading && <Loading />}
        {kpiError && <ErrorBox message={kpiError} onRetry={refetchKpis} />}
        {kpis && (
          <>
            <KpiCard label="Headcount" value={kpis.headcount} />
            <KpiCard label="Total gross" value={formatMoney(kpis.total_gross)} />
            <KpiCard label="Total net" value={formatMoney(kpis.total_net)} />
            <KpiCard label="Pending leave requests" value={kpis.pending_leave_requests} />
          </>
        )}
      </div>

      <h2 className="mb-3 text-sm font-semibold text-gray-700">Salary by department</h2>
      {chartLoading && <Loading />}
      {chartError && <ErrorBox message={chartError} onRetry={refetchChart} />}
      {!chartLoading && !chartError && chart?.length === 0 && <Empty message="No data for this period." />}
      {!chartLoading && !chartError && chart?.length > 0 && (
        <Card
          role="img"
          aria-label="Bar chart of total gross salary by department for the selected period"
          className="space-y-3"
        >
          {chart.map((row) => {
            const amount = Number(row.total_gross ?? row.amount ?? 0);
            const pct = maxAmount ? Math.round((amount / maxAmount) * 100) : 0;
            return (
              <div key={row.department} className="flex items-center gap-3 text-sm">
                <div className="w-28 shrink-0 text-gray-600">{row.department}</div>
                <div className="h-4 flex-1 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="w-24 shrink-0 text-right text-gray-600">{formatMoney(amount)}</div>
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}

function formatMoney(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return value ?? "—";
  return currency.format(num);
}

function KpiCard({ label, value }) {
  return (
    <Card>
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-gray-900">{value ?? "—"}</div>
    </Card>
  );
}
