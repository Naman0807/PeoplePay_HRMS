"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Plus, X } from "lucide-react";
import api from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import { permissions } from "@/lib/permissions";
import { BackLink, PageHeader, Card, Field, PrimaryButton, Toast, Loading, ErrorBox } from "@/components/ui";

const WEEKDAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

function timeToMinutes(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function rowHours(row) {
  const mins = timeToMinutes(row.end_time || "00:00") - timeToMinutes(row.start_time || "00:00") - Number(row.break_minutes || 0);
  return Math.max(0, mins / 60);
}

export default function WorkingSchedulePage() {
  const perms = permissions();
  const { id } = useParams();
  const { data: calendar, loading, error, refetch } = useFetch(`/api/resource-calendars/${id}`);

  const [config, setConfig] = useState(null);
  const [rows, setRows] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [toast, setToast] = useState(null);

  if (calendar && config === null) {
    setConfig({
      name: calendar.name,
      days_per_week: String(calendar.days_per_week),
      hours_per_week: String(calendar.hours_per_week),
      timezone: calendar.timezone || "",
    });
    setRows(calendar.days.map((d) => ({ ...d })));
  }

  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} />;
  if (!config || !rows) return null;

  const canEdit = perms.canManageEmployees;
  const usedDays = new Set(rows.map((r) => r.day));
  const nextDay = WEEKDAYS.find((d) => !usedDays.has(d));
  const totalHours = rows.reduce((sum, r) => sum + rowHours(r), 0);

  function updateRow(index, patch) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function addDay() {
    if (!nextDay) return;
    setRows((prev) => [...prev, { day: nextDay, start_time: "09:00", end_time: "18:00", break_minutes: 60 }]);
  }

  function removeRow(index) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      await api.patch(`/api/resource-calendars/${id}`, {
        name: config.name,
        days_per_week: Number(config.days_per_week),
        hours_per_week: Number(config.hours_per_week),
        timezone: config.timezone,
      });
      await api.patch(`/api/resource-calendars/${id}/days`, {
        days: rows.map((r) => ({
          day: r.day,
          start_time: r.start_time,
          end_time: r.end_time,
          break_minutes: Number(r.break_minutes || 0),
        })),
      });
      refetch();
      setToast("Schedule saved successfully");
    } catch (err) {
      setSaveError(err.response?.data?.message || "Could not save the schedule.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <BackLink href="/employees">Back to list</BackLink>
      <div className="mt-3 mb-6">
        <PageHeader title={`${config.hours_per_week} Hours / Week`} />
      </div>

      {saveError && (
        <div className="mb-4">
          <ErrorBox message={saveError} />
        </div>
      )}

      <Card className="mb-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Schedule Name" value={config.name} onChange={(v) => setConfig({ ...config, name: v })} disabled={!canEdit} />
          <Field
            label="Days per Week"
            type="number"
            value={config.days_per_week}
            onChange={(v) => setConfig({ ...config, days_per_week: v })}
            disabled={!canEdit}
          />
          <Field
            label="Hours per Week"
            type="number"
            value={config.hours_per_week}
            onChange={(v) => setConfig({ ...config, hours_per_week: v })}
            disabled={!canEdit}
          />
          <Field label="Timezone" value={config.timezone} onChange={(v) => setConfig({ ...config, timezone: v })} disabled={!canEdit} />
        </div>
      </Card>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text-muted">Weekly Schedule</h2>
        {canEdit && nextDay && (
          <button
            type="button"
            onClick={addDay}
            className="flex items-center gap-1 rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-text-primary hover:bg-surface/50"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Day
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead className="bg-surface text-left text-xs uppercase text-text-muted">
            <tr>
              <th className="px-4 py-2 font-medium">Day</th>
              <th className="px-4 py-2 font-medium">Start Time</th>
              <th className="px-4 py-2 font-medium">End Time</th>
              <th className="px-4 py-2 font-medium">Break (min)</th>
              <th className="px-4 py-2 font-medium">Hours</th>
              {canEdit && <th className="px-4 py-2 font-medium">Action</th>}
            </tr>
          </thead>
          <tbody className="[&>tr]:border-b [&>tr]:border-border/50 [&>tr:last-child]:border-b-0">
            {rows.map((row, i) => (
              <tr key={row.day}>
                <td className="px-4 py-2 text-text-primary">{row.day}</td>
                <td className="px-4 py-2">
                  <input
                    type="time"
                    value={row.start_time}
                    disabled={!canEdit}
                    onChange={(e) => updateRow(i, { start_time: e.target.value })}
                    className="rounded border border-border bg-surface px-2 py-1 text-sm text-text-primary disabled:opacity-60"
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    type="time"
                    value={row.end_time}
                    disabled={!canEdit}
                    onChange={(e) => updateRow(i, { end_time: e.target.value })}
                    className="rounded border border-border bg-surface px-2 py-1 text-sm text-text-primary disabled:opacity-60"
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    type="number"
                    min="0"
                    value={row.break_minutes}
                    disabled={!canEdit}
                    onChange={(e) => updateRow(i, { break_minutes: e.target.value })}
                    className="w-20 rounded border border-border bg-surface px-2 py-1 text-sm text-text-primary disabled:opacity-60"
                  />
                </td>
                <td className="px-4 py-2 text-text-muted">{rowHours(row)}h</td>
                {canEdit && (
                  <td className="px-4 py-2">
                    <button type="button" onClick={() => removeRow(i)} className="text-text-muted hover:text-status-error">
                      <X className="h-4 w-4" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-sm font-medium text-text-primary">Total Weekly Hours: {totalHours}h</p>

      {canEdit && (
        <PrimaryButton className="mt-4" onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save schedule"}
        </PrimaryButton>
      )}

      <Toast message={toast} onClose={() => setToast(null)} />
    </div>
  );
}
