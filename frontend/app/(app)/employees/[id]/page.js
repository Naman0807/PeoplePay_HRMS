"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import {
  BackLink,
  PageHeader,
  Field,
  Select,
  Card,
  PrimaryButton,
  Toast,
  Loading,
  ErrorBox,
} from "@/components/ui";

export default function EmployeeDetailPage() {
  const { id } = useParams();
  const { data: employee, loading, error, refetch } = useFetch(`/api/employees/${id}`);
  const [form, setForm] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (employee) {
      setForm({
        name: employee.name,
        work_email: employee.work_email,
        department: employee.department || "",
        job_title: employee.job_title || "",
        status: employee.status,
      });
    }
  }, [employee]);

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

  return (
    <div className="max-w-lg">
      <div className="mb-4">
        <BackLink href="/employees">Back to employees</BackLink>
      </div>

      <PageHeader
        title={employee.name}
        actions={
          <Link href={`/employees/${id}/contracts`} className="text-sm font-medium text-gray-700 hover:underline">
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
