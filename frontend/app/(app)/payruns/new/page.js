"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import { Loading, ErrorBox, Empty } from "@/components/StatusStates";

export default function NewPayrunPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [payrunId, setPayrunId] = useState(null);
  const [form, setForm] = useState({ name: "", structure_id: "1", date_start: "", date_end: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

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
    } catch (err) {
      setError(err.response?.data?.message || "Could not create payrun.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="mb-6 text-xl font-semibold text-gray-900">New payrun — step {step} of 2</h1>

      {step === 1 && (
        <form onSubmit={handleCreate} className="space-y-3 rounded-lg border border-gray-200 bg-white p-5">
          {error && <ErrorBox message={error} />}
          <Field label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
          <Field
            label="Structure ID"
            type="number"
            value={form.structure_id}
            onChange={(v) => setForm({ ...form, structure_id: v })}
            required
            hint="Seeded payroll structure ID (default 1 from the seed script)."
          />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Period start" type="date" value={form.date_start} onChange={(v) => setForm({ ...form, date_start: v })} required />
            <Field label="Period end" type="date" value={form.date_end} onChange={(v) => setForm({ ...form, date_end: v })} required />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {submitting ? "Creating…" : "Create & review eligible employees"}
          </button>
        </form>
      )}

      {step === 2 && (
        <div className="space-y-4">
          {eligLoading && <Loading />}
          {eligError && <ErrorBox message={eligError} onRetry={refetch} />}
          {!eligLoading && !eligError && eligible?.length === 0 && <Empty message="No eligible employees for this period." />}
          {!eligLoading && !eligError && eligible?.length > 0 && (
            <ul className="rounded-lg border border-gray-200 bg-white p-4 text-sm">
              {eligible.map((e) => (
                <li key={e.id} className="border-b border-gray-100 py-1.5 last:border-0">
                  {e.name}
                </li>
              ))}
            </ul>
          )}
          <button
            onClick={() => router.push(`/payruns/${payrunId}`)}
            className="rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white"
          >
            Continue to compute →
          </button>
        </div>
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
