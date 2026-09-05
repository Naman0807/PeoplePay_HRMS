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
  // Employees left ticked when Continue is pressed. Passed to compute as employee_ids,
  // which the backend honours; an empty selection is refused there and here.
  const [excluded, setExcluded] = useState(() => new Set());

  const eligibleUrl = payrunId ? `/api/payruns/${payrunId}/eligible-employees` : null;
  const { data: eligible, loading: eligLoading, error: eligError, refetch } = useFetch(eligibleUrl);

  // Everything still ticked. A full selection sends no filter at all, so the common
  // case stays the plain "compute for everyone" request.
  const selectedIds = (eligible || [])
    .map((e) => e.employee_id)
    .filter((id) => !excluded.has(id));

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
                <li key={e.employee_id} className="border-b border-gray-100 py-1.5 last:border-0">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={!excluded.has(e.employee_id)}
                      onChange={() =>
                        setExcluded((prev) => {
                          const next = new Set(prev);
                          if (next.has(e.employee_id)) next.delete(e.employee_id);
                          else next.add(e.employee_id);
                          return next;
                        })
                      }
                    />
                    <span>{e.name}</span>
                    <span className="text-gray-500">· {e.department || "—"}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
          {selectedIds.length === 0 && eligible?.length > 0 && (
            <p role="alert" className="mt-2 text-sm text-red-700">
              Select at least one employee to continue.
            </p>
          )}
          <PrimaryButton
            disabled={selectedIds.length === 0}
            onClick={() =>
              router.push(
                `/payruns/${payrunId}${
                  selectedIds.length === eligible.length ? "" : `?employees=${selectedIds.join(",")}`
                }`
              )
            }
          >
            Continue to compute →
          </PrimaryButton>
        </Card>
      )}

      <Toast message={toast} onClose={() => setToast(null)} />
    </div>
  );
}
