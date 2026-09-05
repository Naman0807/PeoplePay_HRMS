"use client";

import { useState } from "react";
import api from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import { Loading, ErrorBox, Empty } from "@/components/StatusStates";

const EMPTY_FORM = { check_in: "", check_out: "", status: "PRESENT", notes: "" };

export default function AttendancePage() {
  const { data: employees, loading: empLoading, error: empError } = useFetch("/api/employees");
  const [employeeId, setEmployeeId] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  const url = employeeId ? `/api/attendances?employee_id=${employeeId}` : null;
  const { data, loading, error, refetch } = useFetch(url);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      await api.post("/api/attendances", {
        employee_id: Number(employeeId),
        check_in: new Date(form.check_in).toISOString(),
        check_out: form.check_out ? new Date(form.check_out).toISOString() : null,
        status: form.status,
        notes: form.notes || null,
      });
      setForm(EMPTY_FORM);
      setShowForm(false);
      refetch();
    } catch (err) {
      setFormError(err.response?.data?.message || "Could not save attendance record.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Attendance</h1>
        {employeeId && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white"
          >
            {showForm ? "Cancel" : "Add entry"}
          </button>
        )}
      </div>

      <div className="mb-4">
        <label className="block text-xs font-medium text-gray-600">Employee</label>
        {empLoading && <Loading />}
        {empError && <ErrorBox message={empError} />}
        {employees && (
          <select
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            className="mt-1 w-full max-w-xs rounded-md border border-gray-300 px-3 py-1.5 text-sm"
          >
            <option value="">Select an employee…</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 space-y-3 rounded-lg border border-gray-200 bg-white p-5">
          {formError && <ErrorBox message={formError} />}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Check in" type="datetime-local" value={form.check_in} onChange={(v) => setForm({ ...form, check_in: v })} required />
            <Field label="Check out" type="datetime-local" value={form.check_out} onChange={(v) => setForm({ ...form, check_out: v })} />
            <div>
              <label className="block text-xs font-medium text-gray-600">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
              >
                <option value="PRESENT">PRESENT</option>
                <option value="ABSENT">ABSENT</option>
              </select>
            </div>
            <Field label="Notes" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {submitting ? "Saving…" : "Save entry"}
          </button>
        </form>
      )}

      {!employeeId && <Empty message="Select an employee to view attendance." />}
      {employeeId && loading && <Loading />}
      {employeeId && error && <ErrorBox message={error} onRetry={refetch} />}
      {employeeId && !loading && !error && data?.length === 0 && <Empty message="No attendance records yet." />}

      {employeeId && !loading && !error && data?.length > 0 && (
        <table className="w-full border-collapse overflow-hidden rounded-lg border border-gray-200 bg-white text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2">Check in</th>
              <th className="px-4 py-2">Check out</th>
              <th className="px-4 py-2">Worked hours</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Notes</th>
            </tr>
          </thead>
          <tbody>
            {data.map((a) => (
              <tr key={a.id} className="border-t border-gray-100">
                <td className="px-4 py-2 text-gray-600">{new Date(a.check_in).toLocaleString()}</td>
                <td className="px-4 py-2 text-gray-600">{a.check_out ? new Date(a.check_out).toLocaleString() : "—"}</td>
                <td className="px-4 py-2 text-gray-600">{a.worked_hours ?? "—"}</td>
                <td className="px-4 py-2 text-gray-600">{a.status}</td>
                <td className="px-4 py-2 text-gray-600">{a.notes || "—"}</td>
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
