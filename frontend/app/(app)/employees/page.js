"use client";

import { useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import { Loading, ErrorBox, Empty } from "@/components/StatusStates";

const EMPTY_FORM = { name: "", work_email: "", department: "", job_title: "" };

export default function EmployeesPage() {
  const { data, loading, error, refetch } = useFetch("/api/employees");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      await api.post("/api/employees", form);
      setForm(EMPTY_FORM);
      setShowForm(false);
      refetch();
    } catch (err) {
      setFormError(err.response?.data?.message || "Could not create employee.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Employees</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white"
        >
          {showForm ? "Cancel" : "Add employee"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 space-y-3 rounded-lg border border-gray-200 bg-white p-5">
          {formError && <ErrorBox message={formError} />}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
            <Field
              label="Work email"
              type="email"
              value={form.work_email}
              onChange={(v) => setForm({ ...form, work_email: v })}
              required
            />
            <Field label="Department" value={form.department} onChange={(v) => setForm({ ...form, department: v })} />
            <Field label="Job title" value={form.job_title} onChange={(v) => setForm({ ...form, job_title: v })} />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {submitting ? "Saving…" : "Save employee"}
          </button>
        </form>
      )}

      {loading && <Loading />}
      {error && <ErrorBox message={error} onRetry={refetch} />}
      {!loading && !error && data?.length === 0 && <Empty message="No employees yet." />}

      {!loading && !error && data?.length > 0 && (
        <table className="w-full border-collapse overflow-hidden rounded-lg border border-gray-200 bg-white text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Work email</th>
              <th className="px-4 py-2">Department</th>
              <th className="px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.map((emp) => (
              <tr key={emp.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-2">
                  <Link href={`/employees/${emp.id}`} className="font-medium text-gray-900 hover:underline">
                    {emp.name}
                  </Link>
                </td>
                <td className="px-4 py-2 text-gray-600">{emp.work_email}</td>
                <td className="px-4 py-2 text-gray-600">{emp.department || "—"}</td>
                <td className="px-4 py-2 text-gray-600">{emp.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function Field({ label, value, onChange, type = "text", required = false }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600">{label}</label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
      />
    </div>
  );
}
