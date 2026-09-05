"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import { Loading, ErrorBox } from "@/components/StatusStates";

export default function EmployeeDetailPage() {
  const { id } = useParams();
  const { data: employee, loading, error, refetch } = useFetch(`/api/employees/${id}`);
  const [form, setForm] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [saveError, setSaveError] = useState(null);

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
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">{employee.name}</h1>
        <Link href={`/employees/${id}/contracts`} className="text-sm font-medium text-gray-700 hover:underline">
          Contracts →
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-gray-200 bg-white p-5">
        {saveError && <ErrorBox message={saveError} />}
        <Field label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
        <Field label="Work email" value={form.work_email} onChange={(v) => setForm({ ...form, work_email: v })} />
        <Field label="Department" value={form.department} onChange={(v) => setForm({ ...form, department: v })} />
        <Field label="Job title" value={form.job_title} onChange={(v) => setForm({ ...form, job_title: v })} />
        <div>
          <label className="block text-xs font-medium text-gray-600">Status</label>
          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
          >
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {submitting ? "Saving…" : "Save changes"}
        </button>
      </form>
    </div>
  );
}

function Field({ label, value, onChange }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
      />
    </div>
  );
}
