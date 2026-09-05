"use client";

import { useState } from "react";
import api from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import {
  PageHeader,
  Field,
  Select,
  Card,
  PrimaryButton,
  Table,
  Badge,
  statusVariant,
  Toast,
  EmptyState,
  Loading,
  ErrorBox,
} from "@/components/ui";

const EMPTY_FORM = { check_in: "", check_out: "", status: "PRESENT", notes: "" };

export default function AttendancePage() {
  const { data: employees, loading: empLoading, error: empError } = useFetch("/api/employees");
  const [employeeId, setEmployeeId] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [toast, setToast] = useState(null);

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
      setToast("Attendance record saved");
    } catch (err) {
      setFormError(err.response?.data?.message || "Could not save attendance record.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Attendance"
        actions={
          <PrimaryButton onClick={() => setShowForm((v) => !v)}>
            {showForm ? "Cancel" : "Add entry"}
          </PrimaryButton>
        }
      />

      <div className="mb-4 max-w-xs">
        {empLoading && <Loading />}
        {empError && <ErrorBox message={empError} />}
        {employees && (
          <Select
            label="Employee"
            value={employeeId}
            onChange={(v) => {
              setEmployeeId(v);
              setShowForm(false);
            }}
            options={employees.map((e) => ({ value: String(e.id), label: e.name }))}
          />
        )}
      </div>

      {showForm && employeeId && (
        <Card className="mb-6">
          <form onSubmit={handleSubmit} className="space-y-3">
            {formError && <ErrorBox message={formError} />}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Check in" type="datetime-local" value={form.check_in} onChange={(v) => setForm({ ...form, check_in: v })} required />
              <Field label="Check out" type="datetime-local" value={form.check_out} onChange={(v) => setForm({ ...form, check_out: v })} />
              <Select
                label="Status"
                value={form.status}
                onChange={(v) => setForm({ ...form, status: v })}
                options={[
                  { value: "PRESENT", label: "PRESENT" },
                  { value: "ABSENT", label: "ABSENT" },
                ]}
              />
              <Field label="Notes" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} />
            </div>
            <PrimaryButton type="submit" disabled={submitting}>
              {submitting ? "Saving…" : "Save entry"}
            </PrimaryButton>
          </form>
        </Card>
      )}

      {!employeeId && <EmptyState message="Select an employee to view attendance." />}
      {employeeId && loading && <Loading />}
      {employeeId && error && <ErrorBox message={error} onRetry={refetch} />}
      {employeeId && !loading && !error && data?.length === 0 && <EmptyState message="No attendance records yet." />}

      {employeeId && !loading && !error && data?.length > 0 && (
        <Table headers={["Check in", "Check out", "Worked hours", "Status", "Notes"]}>
          {data.map((a) => (
            <tr key={a.id} className="border-t border-gray-100">
              <td className="px-4 py-2 text-gray-600">{new Date(a.check_in).toLocaleString()}</td>
              <td className="px-4 py-2 text-gray-600">{a.check_out ? new Date(a.check_out).toLocaleString() : "—"}</td>
              <td className="px-4 py-2 text-gray-600">{a.worked_hours ?? "—"}</td>
              <td className="px-4 py-2 text-gray-600">
                <Badge variant={statusVariant(a.status)}>{a.status}</Badge>
              </td>
              <td className="px-4 py-2 text-gray-600">{a.notes || "—"}</td>
            </tr>
          ))}
        </Table>
      )}

      <Toast message={toast} onClose={() => setToast(null)} />
    </div>
  );
}
