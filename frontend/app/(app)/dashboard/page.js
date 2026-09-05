"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useFetch } from "@/lib/useFetch";
import { Loading, ErrorBox, Empty } from "@/components/StatusStates";
import { Card, PageHeader, Field, EmptyState } from "@/components/ui";
import { permissions } from "@/lib/permissions";

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

// Hex values matching the design tokens in globals.css — recharts needs real
// colors, not Tailwind class names, on its SVG props.
const COLOR_GRID = "#334155"; // border
const COLOR_MUTED = "#94a3b8"; // text-muted
const COLOR_SURFACE = "#1e293b"; // surface
const COLOR_SUCCESS = "#4ade80"; // status-success
const COLOR_ACTIVE = "#818cf8"; // status-active

function currentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatMoney(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return value ?? "—";
  return currency.format(num);
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2 text-xs shadow-lg">
      <div className="mb-1 text-text-muted">{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="font-medium text-text-primary">
          {formatMoney(p.value)}
        </div>
      ))}
    </div>
  );
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

  const grossNetData = kpis
    ? [
        { name: "Total gross", value: Number(kpis.total_gross), color: COLOR_SUCCESS },
        { name: "Total net", value: Number(kpis.total_net), color: COLOR_ACTIVE },
      ]
    : [];

  const departmentData = (chart || []).map((row) => ({
    name: row.department,
    value: Number(row.total_gross ?? row.amount ?? 0),
  }));

  return (
    <div>
      <PageHeader title="Dashboard" />

      <div className="mb-6 flex flex-col sm:flex-row gap-3">
        <Field id="period" type="month" label="Period" value={period} onChange={setPeriod} className="sm:w-44" />
        <Field id="department" label="Department" value={department} onChange={setDepartment} placeholder="All" />
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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {kpis && (Number(kpis.total_gross) > 0 || Number(kpis.total_net) > 0) && (
          <div>
            <h2 className="mb-2 text-sm font-semibold text-text-muted">Gross vs net</h2>
            <Card className="p-3">
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={grossNetData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLOR_GRID} vertical={false} />
                    <XAxis dataKey="name" stroke={COLOR_MUTED} fontSize={11} tickLine={false} axisLine={{ stroke: COLOR_GRID }} />
                    <YAxis stroke={COLOR_MUTED} fontSize={11} tickLine={false} axisLine={false} width={36} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: COLOR_SURFACE }} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={48}>
                      {grossNetData.map((d) => (
                        <Cell key={d.name} fill={d.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        )}

        <div>
          <h2 className="mb-2 text-sm font-semibold text-text-muted">Salary by department</h2>
          {chartLoading && <Loading />}
          {chartError && <ErrorBox message={chartError} onRetry={refetchChart} />}
          {!chartLoading && !chartError && departmentData.length === 0 && <Empty message="No data for this period." />}
          {!chartLoading && !chartError && departmentData.length > 0 && (
            <Card className="p-3">
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={departmentData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLOR_GRID} vertical={false} />
                    <XAxis dataKey="name" stroke={COLOR_MUTED} fontSize={11} tickLine={false} axisLine={{ stroke: COLOR_GRID }} />
                    <YAxis stroke={COLOR_MUTED} fontSize={11} tickLine={false} axisLine={false} width={36} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: COLOR_SURFACE }} />
                    <Bar dataKey="value" fill={COLOR_SUCCESS} radius={[6, 6, 0, 0]} maxBarSize={48} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}
        </div>
      </div>
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
