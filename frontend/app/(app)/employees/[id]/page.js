"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import { permissions } from "@/lib/permissions";
import {
  BackLink,
  PageHeader,
  Field,
  Select,
  Card,
  PrimaryButton,
  SecondaryButton,
  Badge,
  statusVariant,
  Toast,
  Loading,
  ErrorBox,
} from "@/components/ui";

function initials(name) {
  return (name || "")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function EmployeeDetailPage() {
  const perms = permissions();
  const { id } = useParams();
  const { data: employee, loading, error, refetch } = useFetch(`/api/employees/${id}`);
  const { data: employees } = useFetch("/api/employees");
  // The three "smart button" counts — all real, from the same list endpoints the
  // Contracts/Attendance/Time Off screens already use (meta.total_records).
  const { meta: contractsMeta } = useFetch(`/api/employees/${id}/contracts`);
  const { meta: attendanceMeta } = useFetch(`/api/attendances?employee_id=${id}`);
  const { meta: leaveMeta } = useFetch(`/api/leave-requests?employee_id=${id}`);

  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState("work");
  const [form, setForm] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [toast, setToast] = useState(null);

  if (employee && form === null) {
    setForm({
      name: employee.name,
      work_email: employee.work_email,
      department: employee.department || "",
      job_title: employee.job_title || "",
      status: employee.status,
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setSaveError(null);
    try {
      await api.patch(`/api/employees/${id}`, form);
      refetch();
      setToast("Changes saved successfully");
      setEditing(false);
    } catch (err) {
      setSaveError(err.response?.data?.message || "Could not save changes.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} onRetry={refetch} />;
  if (!form) return null;

  const manager = employees?.find((e) => e.id === employee.manager_id);
  // Editing (including flipping status) is HR_MANAGER-only on the backend, for every
  // employee record — including the signed-in user's own.
  const canEdit = perms.canManageEmployees;

  return (
    <div className="max-w-3xl">
      <BackLink href="/employees">Employees</BackLink>

      <div className="mt-3 mb-6">
        <PageHeader title={`Employee / ${employee.name}`} />
        <p className="-mt-4 text-sm text-text-muted">Main employee form with related HR actions</p>
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          {canEdit &&
            (editing ? (
              <SecondaryButton onClick={() => setEditing(false)}>Cancel</SecondaryButton>
            ) : (
              <SecondaryButton onClick={() => setEditing(true)}>EDIT</SecondaryButton>
            ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <SmartButton label="Time Off" count={leaveMeta?.total_records} href="/time-off" />
          <SmartButton label="Contracts" count={contractsMeta?.total_records} href={`/employees/${id}/contracts`} />
          <SmartButton label="Attendance" count={attendanceMeta?.total_records} href="/attendance" />
        </div>
      </div>

      <Card className="mb-6">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/20 text-lg font-semibold text-primary">
            {initials(employee.name)}
          </div>
          <div>
            <div className="text-lg font-semibold text-text-primary">{employee.name}</div>
            <div className="text-sm text-text-muted">
              {employee.job_title || "—"} • {employee.department || "—"}
            </div>
            <div className="text-sm text-text-muted">{employee.work_email}</div>
          </div>
        </div>
      </Card>

      <div className="mb-4 flex gap-1 border-b border-border">
        <TabButton active={tab === "work"} onClick={() => setTab("work")}>
          Work Information
        </TabButton>
        <TabButton active={tab === "private"} onClick={() => setTab("private")}>
          Private Information
        </TabButton>
      </div>

      {tab === "private" && (
        <Card>
          <p className="text-sm text-text-muted">No private information is tracked for this employee yet.</p>
        </Card>
      )}

      {tab === "work" && !editing && (
        <Card>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ReadOnlyField label="Department" value={employee.department || "—"} />
            <ReadOnlyField label="Manager" value={manager?.name || "—"} />
            <ReadOnlyField
              label="Schedule"
              value={
                employee.resource_calendar_id ? (
                  <Link href={`/schedules/${employee.resource_calendar_id}`} className="hover:underline">
                    Calendar #{employee.resource_calendar_id}
                  </Link>
                ) : (
                  "—"
                )
              }
            />
            <ReadOnlyField label="Job Position" value={employee.job_title || "—"} />
            <ReadOnlyField
              label="Status"
              value={<Badge variant={statusVariant(employee.status)}>{employee.status}</Badge>}
            />
            <ReadOnlyField label="Email" value={employee.work_email} />
          </div>
        </Card>
      )}

      {tab === "work" && editing && (
        <Card>
          <form onSubmit={handleSubmit} className="space-y-3">
            {saveError && <ErrorBox message={saveError} />}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
              <Field label="Work email" value={form.work_email} onChange={(v) => setForm({ ...form, work_email: v })} />
              <Field label="Department" value={form.department} onChange={(v) => setForm({ ...form, department: v })} />
              <Field label="Job title" value={form.job_title} onChange={(v) => setForm({ ...form, job_title: v })} />
              <Select
                label="Status"
                value={form.status}
                onChange={(v) => setForm({ ...form, status: v })}
                options={[
                  { value: "ACTIVE", label: "ACTIVE" },
                  { value: "INACTIVE", label: "INACTIVE" },
                ]}
              />
            </div>
            <PrimaryButton type="submit" disabled={submitting}>
              {submitting ? "Saving…" : "Save changes"}
            </PrimaryButton>
          </form>
        </Card>
      )}

      <Toast message={toast} onClose={() => setToast(null)} />
    </div>
  );
}

function TabButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
        active ? "border-status-active text-status-active" : "border-transparent text-text-muted hover:text-text-primary"
      }`}
    >
      {children}
    </button>
  );
}

function SmartButton({ label, count, href }) {
  return (
    <Link
      href={href}
      className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-text-primary hover:bg-surface/50"
    >
      {label}: <span className="font-semibold">{count ?? "—"}</span>
    </Link>
  );
}

function ReadOnlyField({ label, value }) {
  return (
    <div>
      <div className="text-xs font-medium text-text-muted">{label}</div>
      <div className="mt-0.5 text-text-primary">{value}</div>
    </div>
  );
}
