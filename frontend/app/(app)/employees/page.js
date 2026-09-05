"use client";

import { useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import { permissions } from "@/lib/permissions";
import { Loading, ErrorBox } from "@/components/StatusStates";
import {
  Badge,
  statusVariant,
  Field,
  PrimaryButton,
  Card,
  PageHeader,
  Table,
  Toast,
  EmptyState,
} from "@/components/ui";

const EMPTY_FORM = { name: "", work_email: "", department: "", job_title: "" };

export default function EmployeesPage() {
  const perms = permissions();
  const { data, loading, error, refetch } = useFetch("/api/employees");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [toast, setToast] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      await api.post("/api/employees", form);
      setForm(EMPTY_FORM);
      setShowForm(false);
      setToast("Employee created successfully");
      refetch();
    } catch (err) {
      setFormError(err.response?.data?.message || "Could not create employee.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Employees"
        actions={
          perms.canManageEmployees && (
          <PrimaryButton onClick={() => setShowForm((v) => !v)}>
            {showForm ? "Cancel" : "Add employee"}
          </PrimaryButton>
          )
        }
      />

      {showForm && (
        <Card className="mb-6">
          <form onSubmit={handleSubmit} className="space-y-3">
            {formError && (
              <div role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                {formError}
              </div>
            )}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
              <Field
                label="Work email"
                type="email"
                value={form.work_email}
                onChange={(v) => setForm({ ...form, work_email: v })}
                required
              />
              <Field
                label="Department"
                value={form.department}
                onChange={(v) => setForm({ ...form, department: v })}
              />
              <Field
                label="Job title"
                value={form.job_title}
                onChange={(v) => setForm({ ...form, job_title: v })}
              />
            </div>
            <PrimaryButton type="submit" disabled={submitting}>
              {submitting ? "Saving…" : "Save employee"}
            </PrimaryButton>
          </form>
        </Card>
      )}

      {loading && <Loading />}
      {error && <ErrorBox message={error} onRetry={refetch} />}
      {!loading && !error && data?.length === 0 && (
        <EmptyState
          message="No employees yet."
          actionLabel="Add your first employee"
          onAction={() => setShowForm(true)}
        />
      )}

      {!loading && !error && data?.length > 0 && (
        <Table headers={["Name", "Work email", "Department", "Status"]}>
          {data.map((emp) => (
            <tr key={emp.id} className="border-t border-gray-100 hover:bg-gray-50">
              <td className="px-4 py-2">
                <Link href={`/employees/${emp.id}`} className="font-medium text-gray-900 hover:underline">
                  {emp.name}
                </Link>
              </td>
              <td className="px-4 py-2 text-gray-600">{emp.work_email}</td>
              <td className="px-4 py-2 text-gray-600">{emp.department || "—"}</td>
              <td className="px-4 py-2">
                <Badge variant={statusVariant(emp.status)}>{emp.status}</Badge>
              </td>
            </tr>
          ))}
        </Table>
      )}

      <Toast message={toast} onClose={() => setToast(null)} />
    </div>
  );
}
