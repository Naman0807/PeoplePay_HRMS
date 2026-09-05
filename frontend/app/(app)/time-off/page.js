"use client";

import { useState } from "react";
import api from "@/lib/api";
import { getUser } from "@/lib/auth";
import { useFetch } from "@/lib/useFetch";
import { Loading, ErrorBox, Empty } from "@/components/StatusStates";

const EMPTY_FORM = { leave_type_id: "", date_from: "", date_to: "", number_of_days: "", reason: "" };
const CAN_APPROVE_ROLES = ["HR_MANAGER", "HR_PAYROLL_MANAGER", "ADMIN"];

export default function TimeOffPage() {
  const { data: employees, loading: empLoading, error: empError } = useFetch("/api/employees");
  const [employeeId, setEmployeeId] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [actingId, setActingId] = useState(null);

  const user = getUser();
  const canApprove = user && CAN_APPROVE_ROLES.includes(user.role);

  const url = employeeId ? `/api/leave-requests?employee_id=${employeeId}` : "/api/leave-requests";
  const { data, loading, error, refetch } = useFetch(url);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      await api.post("/api/leave-requests", {
        employee_id: Number(employeeId),
        leave_type_id: Number(form.leave_type_id),
        date_from: form.date_from,
        date_to: form.date_to,
        number_of_days: Number(form.number_of_days),
        reason: form.reason || null,
      });
      setForm(EMPTY_FORM);
      setShowForm(false);
      refetch();
    } catch (err) {
      setFormError(err.response?.data?.message || "Could not submit leave request.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAction(id, action) {
    setActingId(id);
    setActionError(null);
    try {
      await api.patch(`/api/leave-requests/${id}/${action}`);
      refetch();
    } catch (err) {
      setActionError(err.response?.data?.message || `Could not ${action} request.`);
    } finally {
      setActingId(null);
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Time Off</h1>
        {employeeId && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white"
          >
            {showForm ? "Cancel" : "Request leave"}
          </button>
        )}
      </div>

      <div className="mb-4">
        <label className="block text-xs font-medium text-gray-600">Filter by employee (optional)</label>
        {empLoading && <Loading />}
        {empError && <ErrorBox message={empError} />}
        {employees && (
          <select
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            className="mt-1 w-full max-w-xs rounded-md border border-gray-300 px-3 py-1.5 text-sm"
          >
            <option value="">All employees</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {showForm && employeeId && (
        <form onSubmit={handleSubmit} className="mb-6 space-y-3 rounded-lg border border-gray-200 bg-white p-5">
          {formError && <ErrorBox message={formError} />}
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Leave type ID"
              type="number"
              value={form.leave_type_id}
              onChange={(v) => setForm({ ...form, leave_type_id: v })}
              required
              hint="Seeded leave type ID — check with backend for valid values."
            />
            <Field label="Number of days" type="number" value={form.number_of_days} onChange={(v) => setForm({ ...form, number_of_days: v })} required />
            <Field label="From" type="date" value={form.date_from} onChange={(v) => setForm({ ...form, date_from: v })} required />
            <Field label="To" type="date" value={form.date_to} onChange={(v) => setForm({ ...form, date_to: v })} required />
            <Field label="Reason" value={form.reason} onChange={(v) => setForm({ ...form, reason: v })} />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Submit request"}
          </button>
        </form>
      )}

      {actionError && <div className="mb-3"><ErrorBox message={actionError} /></div>}

      {loading && <Loading />}
      {error && <ErrorBox message={error} onRetry={refetch} />}
      {!loading && !error && data?.length === 0 && <Empty message="No leave requests yet." />}

      {!loading && !error && data?.length > 0 && (
        <table className="w-full border-collapse overflow-hidden rounded-lg border border-gray-200 bg-white text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2">From</th>
              <th className="px-4 py-2">To</th>
              <th className="px-4 py-2">Days</th>
              <th className="px-4 py-2">State</th>
              {canApprove && <th className="px-4 py-2">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {data.map((r) => (
              <tr key={r.id} className="border-t border-gray-100">
                <td className="px-4 py-2 text-gray-600">{r.date_from?.slice(0, 10)}</td>
                <td className="px-4 py-2 text-gray-600">{r.date_to?.slice(0, 10)}</td>
                <td className="px-4 py-2 text-gray-600">{r.number_of_days}</td>
                <td className="px-4 py-2 text-gray-600">{r.state}</td>
                {canApprove && (
                  <td className="px-4 py-2">
                    {r.state === "TO_APPROVE" ? (
                      <div className="flex gap-2">
                        <button
                          disabled={actingId === r.id}
                          onClick={() => handleAction(r.id, "approve")}
                          className="rounded bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-800 disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          disabled={actingId === r.id}
                          onClick={() => handleAction(r.id, "refuse")}
                          className="rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-800 disabled:opacity-50"
                        >
                          Refuse
                        </button>
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                )}
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
