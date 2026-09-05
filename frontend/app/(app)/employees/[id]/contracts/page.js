"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import api from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import {
  BackLink,
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

const EMPTY_FORM = {
  reference: "",
  wage: "",
  start_date: "",
  end_date: "",
  state: "DRAFT",
  resource_calendar_id: "",
};

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

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
  const [toast, setToast] = useState(null);

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
      setToast("Contract created successfully");
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
      <div className="mb-4">
        <BackLink href={`/employees/${id}`}>Back to employee</BackLink>
      </div>

      <PageHeader
        title="Contracts"
        actions={
          <PrimaryButton onClick={() => setShowForm((v) => !v)}>
            {showForm ? "Cancel" : "New contract"}
          </PrimaryButton>
        }
      />

      {showForm && (
        <Card className="mb-6">
          <form onSubmit={handleSubmit} className="space-y-3">
            {formError && <ErrorBox message={formError} />}
            {overlapDetail && (
              <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                <b>Contract overlap (409):</b> {overlapDetail}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              <Select
                label="State"
                value={form.state}
                onChange={(v) => setForm({ ...form, state: v })}
                options={[
                  { value: "DRAFT", label: "DRAFT" },
                  { value: "RUNNING", label: "RUNNING" },
                  { value: "EXPIRED", label: "EXPIRED" },
                  { value: "CANCELLED", label: "CANCELLED" },
                ]}
                hint="Overlap check (409) only runs when state is RUNNING."
              />
              <Field
                label="Resource calendar ID (optional)"
                type="number"
                value={form.resource_calendar_id}
                onChange={(v) => setForm({ ...form, resource_calendar_id: v })}
                hint="Blank falls back to the employee's own calendar."
              />
            </div>
            <PrimaryButton type="submit" disabled={submitting}>
              {submitting ? "Saving…" : "Save contract"}
            </PrimaryButton>
          </form>
        </Card>
      )}

      {loading && <Loading />}
      {error && <ErrorBox message={error} onRetry={refetch} />}
      {!loading && !error && data?.length === 0 && <EmptyState message="No contracts yet." />}

      {!loading && !error && data?.length > 0 && (
        <Table headers={["Reference", "Wage", "Start", "End", "State"]}>
          {data.map((c) => (
            <tr key={c.id} className="border-t border-gray-100">
              <td className="px-4 py-2 font-medium text-gray-900">{c.reference}</td>
              <td className="px-4 py-2 text-gray-600">{currency.format(c.wage)}</td>
              <td className="px-4 py-2 text-gray-600">{c.start_date?.slice(0, 10)}</td>
              <td className="px-4 py-2 text-gray-600">{c.end_date?.slice(0, 10) || "—"}</td>
              <td className="px-4 py-2 text-gray-600">
                <Badge variant={statusVariant(c.state)}>{c.state}</Badge>
              </td>
            </tr>
          ))}
        </Table>
      )}

      <Toast message={toast} onClose={() => setToast(null)} />
    </div>
  );
}
