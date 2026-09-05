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
  Badge,
  statusVariant,
  Toast,
  Loading,
  ErrorBox,
} from "@/components/ui";

export default function EmployeeDetailPage() {
  const perms = permissions();
  const { id } = useParams();
  const { data: employee, loading, error, refetch } = useFetch(`/api/employees/${id}`);
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
    } catch (err) {
      setSaveError(err.response?.data?.message || "Could not save changes.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} onRetry={refetch} />;
  if (!form) return null;

  // Editing (including flipping status) is HR_MANAGER-only on the backend, for every
  // employee record — including the signed-in user's own. Everyone else gets a
  // read-only view instead of a form that would 403 on save.
  if (!perms.canManageEmployees) {
    return (
      <div className="max-w-lg">
        <div className="mb-4">
          <BackLink href="/employees">Back to employees</BackLink>
        </div>
        <PageHeader
          title={employee.name}
          actions={
            <Link href={`/employees/${id}/contracts`} className="text-sm font-medium text-text-muted hover:underline">
              Contracts →
            </Link>
          }
        />
        <Card className="space-y-3 text-sm">
          <ReadOnlyField label="Name" value={employee.name} />
          <ReadOnlyField label="Work email" value={employee.work_email} />
          <ReadOnlyField label="Department" value={employee.department || "—"} />
          <ReadOnlyField label="Job title" value={employee.job_title || "—"} />
          <div>
            <div className="text-xs font-medium text-text-muted">Status</div>
            <div className="mt-1">
              <Badge variant={statusVariant(employee.status)}>{employee.status}</Badge>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-lg">
      <div className="mb-4">
        <BackLink href="/employees">Back to employees</BackLink>
      </div>

      <PageHeader
        title={employee.name}
        actions={
          <Link href={`/employees/${id}/contracts`} className="text-sm font-medium text-text-muted hover:underline">
            Contracts →
          </Link>
        }
      />

      <Card>
        <form onSubmit={handleSubmit} className="space-y-3">
          {saveError && <ErrorBox message={saveError} />}
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
          <PrimaryButton type="submit" disabled={submitting}>
            {submitting ? "Saving…" : "Save changes"}
          </PrimaryButton>
        </form>
      </Card>

      <Toast message={toast} onClose={() => setToast(null)} />
    </div>
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
