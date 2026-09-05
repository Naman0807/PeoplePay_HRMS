"use client";

import { useState } from "react";
import { useFetch } from "@/lib/useFetch";
import { Loading, ErrorBox, Empty } from "@/components/StatusStates";
import { Card, PageHeader, Field, EmptyState } from "@/components/ui";
import { permissions } from "@/lib/permissions";

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function currentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function DashboardPage() {
  const perms = permissions();
  const [period, setPeriod] = useState(currentPeriod());
  const [department, setDepartment] = useState("");

  const kpiUrl = perms.canViewDashboard
    ? `/api/dashboard/kpis?period=${period}${department ? `&department=${department}` : ""}`
    : null;
  const chartUrl = perms.canViewDashboard
    ? `/api/dashboard/salary-by-department?period=${period}`
    : null;

  const { data: kpis, loading: kpiLoading, error: kpiError, refetch: refetchKpis } = useFetch(kpiUrl);
  const { data: chart, loading: chartLoading, error: chartError, refetch: refetchChart } = useFetch(chartUrl);

  const maxAmount = chart?.length ? Math.max(...chart.map((d) => Number(d.total_gross ?? d.amount ?? 0))) : 0;

  // The backend 403s this whole section for an EMPLOYEE — don't even fire the
  // requests (see kpiUrl/chartUrl above), and show one clean message instead
  // of two stacked error banners from calls that were never going to succeed.
  if (!perms.canViewDashboard) {
    return (
      <div>
        <PageHeader title="Dashboard" />
        <EmptyState message="You don't have access to the dashboard. Ask an HR/payroll manager if you need it." />
      </div>
    );
  }

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

      {kpis && (Number(kpis.total_gross) > 0 || Number(kpis.total_net) > 0) && (
        <div className="mb-8">
          <h2 className="mb-3 text-sm font-semibold text-text-muted">Gross vs net</h2>
          <Card
            role="img"
            aria-label="Bar chart comparing total gross and total net payroll for the selected period"
          >
            <div className="flex items-end justify-center gap-10">
              {[
                { label: "Total gross", value: Number(kpis.total_gross), color: "bg-status-success" },
                { label: "Total net", value: Number(kpis.total_net), color: "bg-status-active" },
              ].map((row) => {
                const max = Math.max(Number(kpis.total_gross), Number(kpis.total_net)) || 1;
                const pct = Math.round((row.value / max) * 100);
                return <VerticalBar key={row.label} label={row.label} value={formatMoney(row.value)} pct={pct} color={row.color} />;
              })}
            </div>
          </Card>
        </div>
      )}

      <h2 className="mb-3 text-sm font-semibold text-text-muted">Salary by department</h2>
      {chartLoading && <Loading />}
      {chartError && <ErrorBox message={chartError} onRetry={refetchChart} />}
      {!chartLoading && !chartError && chart?.length === 0 && <Empty message="No data for this period." />}
      {!chartLoading && !chartError && chart?.length > 0 && (
        <Card
          role="img"
          aria-label="Bar chart of total gross salary by department for the selected period"
        >
          <div className="flex items-end justify-center gap-8 overflow-x-auto">
            {chart.map((row) => {
              const amount = Number(row.total_gross ?? row.amount ?? 0);
              const pct = maxAmount ? Math.round((amount / maxAmount) * 100) : 0;
              return (
                <VerticalBar
                  key={row.department}
                  label={row.department}
                  value={formatMoney(amount)}
                  pct={pct}
                  color="bg-status-success"
                />
              );
            })}
          </div>
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

function VerticalBar({ label, value, pct, color }) {
  return (
    <div className="flex w-16 shrink-0 flex-col items-center gap-2">
      <div className="text-xs text-text-muted">{value}</div>
      <div className="flex h-40 w-8 items-end overflow-hidden rounded-t-md bg-surface">
        <div className={`w-full rounded-t-md ${color} transition-all`} style={{ height: `${pct}%` }} />
      </div>
      <div className="text-center text-xs text-text-muted">{label}</div>
    </div>
  );
}

function KpiCard({ label, value }) {
  return (
    <Card>
      <div className="text-xs text-text-muted">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-text-primary">{value ?? "—"}</div>
    </Card>
  );
}
