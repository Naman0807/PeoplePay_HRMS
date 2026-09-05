"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import { Loading, ErrorBox, Empty } from "@/components/StatusStates";

const EMPTY_FORM = {
  reference: "",
  wage: "",
  start_date: "",
  end_date: "",
  state: "DRAFT",
  resource_calendar_id: "",
};

export default function EmployeeContractsPage() {
  const { id } = useParams();
  const { data, loading, error, refetch } = useFetch(`/api/employees/${id}/contracts`);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  // Overlap conflicts (409 CONTRACT_OVERLAP) carry a details[] array — surfaced separately
  // from a generic form error so the demo can point at exactly what's blocking it.
  const [formError, setFormError] = useState(null);
  const [overlapDetail, setOverlapDetail] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    setOverlapDetail(null);
    try {
      await api.post("/api/contracts", {
        employee_id: Number(id),
        reference: form.reference,
        wage: Number(form.wage),
        start_date: form.start_date,
        end_date: form.end_date || null,
        state: form.state,
        resource_calendar_id: form.resource_calendar_id ? Number(form.resource_calendar_id) : null,
      });
      setForm(EMPTY_FORM);
      setShowForm(false);
      refetch();
    } catch (err) {
      const body = err.response?.data;
      if (body?.error === "CONTRACT_OVERLAP") {
        setOverlapDetail(body.details?.[0]?.issue || body.message);
      } else {
        setFormError(body?.message || "Could not create contract.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link href={`/employees/${id}`} className="text-xs text-gray-500 hover:underline">
            ← Back to employee
          </Link>
          <h1 className="text-xl font-semibold text-gray-900">Contracts</h1>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white"
        >
          {showForm ? "Cancel" : "New contract"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 space-y-3 rounded-lg border border-gray-200 bg-white p-5">
          {formError && <ErrorBox message={formError} />}
          {overlapDetail && (
            <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <b>Contract overlap (409):</b> {overlapDetail}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Reference" value={form.reference} onChange={(v) => setForm({ ...form, reference: v })} required />
            <Field label="Wage" type="number" value={form.wage} onChange={(v) => setForm({ ...form, wage: v })} required />
            <Field
              label="Start date"
              type="date"
              value={form.start_date}
              onChange={(v) => setForm({ ...form, start_date: v })}
              required
            />
            <Field label="End date" type="date" value={form.end_date} onChange={(v) => setForm({ ...form, end_date: v })} />
            <div>
              <label className="block text-xs font-medium text-gray-600">State</label>
              <select
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
              >
                <option value="DRAFT">DRAFT</option>
                <option value="RUNNING">RUNNING</option>
                <option value="EXPIRED">EXPIRED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
              <p className="mt-1 text-xs text-gray-400">Overlap check (409) only runs when state is RUNNING.</p>
            </div>
            <Field
              label="Resource calendar ID (optional)"
              type="number"
              value={form.resource_calendar_id}
              onChange={(v) => setForm({ ...form, resource_calendar_id: v })}
              hint="Blank falls back to the employee's own calendar."
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {submitting ? "Saving…" : "Save contract"}
          </button>
        </form>
      )}

      {loading && <Loading />}
      {error && <ErrorBox message={error} onRetry={refetch} />}
      {!loading && !error && data?.length === 0 && <Empty message="No contracts yet." />}

      {!loading && !error && data?.length > 0 && (
        <table className="w-full border-collapse overflow-hidden rounded-lg border border-gray-200 bg-white text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2">Reference</th>
              <th className="px-4 py-2">Wage</th>
              <th className="px-4 py-2">Start</th>
              <th className="px-4 py-2">End</th>
              <th className="px-4 py-2">State</th>
            </tr>
          </thead>
          <tbody>
            {data.map((c) => (
              <tr key={c.id} className="border-t border-gray-100">
                <td className="px-4 py-2 font-medium text-gray-900">{c.reference}</td>
                <td className="px-4 py-2 text-gray-600">{c.wage}</td>
                <td className="px-4 py-2 text-gray-600">{c.start_date?.slice(0, 10)}</td>
                <td className="px-4 py-2 text-gray-600">{c.end_date?.slice(0, 10) || "—"}</td>
                <td className="px-4 py-2 text-gray-600">{c.state}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function Field({ label, value, onChange, type = "text", required = false, hint }) {
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
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}
