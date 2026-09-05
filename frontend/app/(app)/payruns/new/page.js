"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import {
  PageHeader,
  Badge,
  Field,
  Card,
  PrimaryButton,
  Toast,
  EmptyState,
  Loading,
  ErrorBox,
} from "@/components/ui";

export default function NewPayrunPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [payrunId, setPayrunId] = useState(null);
  const [form, setForm] = useState({ name: "", structure_id: "1", date_start: "", date_end: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  const eligibleUrl = payrunId ? `/api/payruns/${payrunId}/eligible-employees` : null;
  const { data: eligible, loading: eligLoading, error: eligError, refetch } = useFetch(eligibleUrl);

  async function handleCreate(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.post("/api/payruns", {
        name: form.name,
        structure_id: Number(form.structure_id),
        date_start: form.date_start,
        date_end: form.date_end,
      });
      setPayrunId(res.data.data.id);
      setStep(2);
      setToast("Payrun created");
    } catch (err) {
      setError(err.response?.data?.message || "Could not create payrun.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-xl">
      <PageHeader
        title="New payrun"
        actions={<Badge variant="info">Step {step} of 2</Badge>}
      />

      {step === 1 && (
        <Card>
          <form onSubmit={handleCreate} className="space-y-3">
            {error && <ErrorBox message={error} />}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
              <Field
                label="Structure ID"
                type="number"
                value={form.structure_id}
                onChange={(v) => setForm({ ...form, structure_id: v })}
                required
                hint="Seeded payroll structure ID (default 1 from the seed script)."
              />
              <Field label="Period start" type="date" value={form.date_start} onChange={(v) => setForm({ ...form, date_start: v })} required />
              <Field label="Period end" type="date" value={form.date_end} onChange={(v) => setForm({ ...form, date_end: v })} required />
            </div>
            <PrimaryButton type="submit" disabled={submitting}>
              {submitting ? "Creating…" : "Create & review eligible employees"}
            </PrimaryButton>
          </form>
        </Card>
      )}

      {step === 2 && (
        <Card className="space-y-4">
          {eligLoading && <Loading />}
          {eligError && <ErrorBox message={eligError} onRetry={refetch} />}
          {!eligLoading && !eligError && eligible?.length === 0 && <EmptyState message="No eligible employees for this period." />}
          {!eligLoading && !eligError && eligible?.length > 0 && (
            <ul className="rounded-lg border border-gray-200 p-2 text-sm">
              {eligible.map((e) => (
                <li key={e.id} className="border-b border-gray-100 py-1.5 last:border-0">
                  {e.name}
                </li>
              ))}
            </ul>
          )}
          <PrimaryButton onClick={() => router.push(`/payruns/${payrunId}`)}>
            Continue to compute →
          </PrimaryButton>
        </Card>
      )}

      <Toast message={toast} onClose={() => setToast(null)} />
    </div>
  );
}
