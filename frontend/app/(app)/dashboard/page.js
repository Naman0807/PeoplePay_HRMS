"use client";

import { useState } from "react";
import { useFetch } from "@/lib/useFetch";
import { Loading, ErrorBox, Empty } from "@/components/StatusStates";

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
      <h1 className="mb-6 text-xl font-semibold text-gray-900">Dashboard</h1>

      <div className="mb-6 flex gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600">Period</label>
          <input
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="mt-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600">Department</label>
          <input
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            placeholder="All"
            className="mt-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm"
          />
        </div>
      </div>

      <div className="mb-8 grid grid-cols-4 gap-3">
        {kpiLoading && <Loading />}
        {kpiError && <ErrorBox message={kpiError} onRetry={refetchKpis} />}
        {kpis && (
          <>
            <KpiCard label="Headcount" value={kpis.headcount} />
            <KpiCard label="Total gross" value={kpis.total_gross} />
            <KpiCard label="Total net" value={kpis.total_net} />
            <KpiCard label="Pending leave requests" value={kpis.pending_leave_requests} />
          </>
        )}
      </div>

      <h2 className="mb-3 text-sm font-semibold text-gray-700">Salary by department</h2>
      {chartLoading && <Loading />}
      {chartError && <ErrorBox message={chartError} onRetry={refetchChart} />}
      {!chartLoading && !chartError && chart?.length === 0 && <Empty message="No data for this period." />}
      {!chartLoading && !chartError && chart?.length > 0 && (
        <div className="space-y-2 rounded-lg border border-gray-200 bg-white p-4">
          {chart.map((row) => {
            const amount = Number(row.total_gross ?? row.amount ?? 0);
            const pct = maxAmount ? Math.round((amount / maxAmount) * 100) : 0;
            return (
              <div key={row.department} className="flex items-center gap-3 text-sm">
                <div className="w-28 shrink-0 text-gray-600">{row.department}</div>
                <div className="h-4 flex-1 rounded bg-gray-100">
                  <div className="h-4 rounded bg-emerald-500" style={{ width: `${pct}%` }} />
                </div>
                <div className="w-20 shrink-0 text-right text-gray-600">{amount}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function KpiCard({ label, value }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-gray-900">{value ?? "—"}</div>
    </div>
  );
}
