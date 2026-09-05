"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import api from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import { permissions } from "@/lib/permissions";
import {
  PageHeader,
  Card,
  Field,
  Select,
  PrimaryButton,
  Table,
  Badge,
  statusVariant,
  Toast,
  Loading,
  ErrorBox,
  EmptyState,
} from "@/components/ui";

const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  return `${String(d.getUTCDate()).padStart(2, "0")}-${MONTHS[d.getUTCMonth()]}-${String(d.getUTCFullYear()).slice(2)}`;
}

// There's no GET /api/contracts (list-all) endpoint — only GET /api/employees/:id/contracts
// (per-employee) and GET /api/contracts/:id (single). This fetches every employee, then
// each one's contracts, and flattens the result — an N+1 stopgap for a handful of
// employees, not something to do against a large org without a real list endpoint.
function useAllContracts() {
  const { data: employees, loading: employeesLoading, error: employeesError } = useFetch("/api/employees");
  const [contracts, setContracts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Bumped to re-run the aggregation below after creating a contract — the employees
  // list itself doesn't change, so useFetch's own refetch wouldn't re-trigger this.
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!employees) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all(
      employees.map((emp) =>
        api
          .get(`/api/employees/${emp.id}/contracts`)
          .then((res) => res.data.data.map((c) => ({ ...c, employee_name: emp.name })))
      )
    )
      .then((results) => {
        if (cancelled) return;
        setContracts(results.flat().sort((a, b) => new Date(b.start_date) - new Date(a.start_date)));
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.response?.data?.message || "Could not load contracts.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [employees, version]);

  return {
    contracts,
    employees,
    loading: employeesLoading || loading,
    error: employeesError || error,
    refetch: () => setVersion((v) => v + 1),
  };
}

const EMPTY_FORM = {
  employee_id: "",
  reference: "",
  wage: "",
  start_date: "",
  end_date: "",
  state: "DRAFT",
  resource_calendar_id: "",
};

export default function ContractsPage() {
  const perms = permissions();
  const { contracts, employees, loading, error, refetch } = useAllContracts();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [overlapDetail, setOverlapDetail] = useState(null);
  const [toast, setToast] = useState(null);

  const filtered = (contracts || []).filter((c) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return c.reference.toLowerCase().includes(q) || c.employee_name.toLowerCase().includes(q);
  });

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    setOverlapDetail(null);
    try {
      await api.post("/api/contracts", {
        employee_id: Number(form.employee_id),
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
      <PageHeader title="Contracts" />
      <p className="-mt-4 mb-6 text-sm text-text-muted">List view of employee contracts</p>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        {perms.canManageContracts && (
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="flex w-fit items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover"
          >
            <Plus className="h-4 w-4" />
            {showForm ? "Cancel" : "New"}
          </button>
        )}
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contracts..."
            className="w-full rounded-md border border-border bg-surface py-2 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none"
          />
        </div>
      </div>

      {showForm && (
        <Card className="mb-6">
          <form onSubmit={handleSubmit} className="space-y-3">
            {formError && <ErrorBox message={formError} />}
            {overlapDetail && (
              <div className="rounded-md border border-status-warning/30 bg-status-warning/10 px-3 py-2 text-sm text-status-warning">
                <b>Contract overlap (409):</b> {overlapDetail}
              </div>
            )}
            <Select
              label="Employee"
              value={form.employee_id}
              onChange={(v) => setForm({ ...form, employee_id: v })}
              options={(employees || []).map((e) => ({ value: String(e.id), label: e.name }))}
              required
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
      {error && <ErrorBox message={error} />}
      {!loading && !error && filtered.length === 0 && (
        <EmptyState message={search ? "No contracts match your search." : "No contracts yet."} />
      )}

      {!loading && !error && filtered.length > 0 && (
        <Table headers={["Contract", "Employee", "Start", "End", "Wage / Month", "Status"]}>
          {filtered.map((c) => (
            <tr key={c.id}>
              <td className="px-4 py-3 font-medium text-text-primary">
                <Link href={`/contracts/${c.id}`} className="hover:underline">
                  {c.reference}
                </Link>
              </td>
              <td className="px-4 py-3 text-text-primary">
                <Link href={`/employees/${c.employee_id}/contracts`} className="hover:underline">
                  {c.employee_name}
                </Link>
              </td>
              <td className="px-4 py-3 text-text-muted">{formatDate(c.start_date)}</td>
              <td className="px-4 py-3 text-text-muted">{formatDate(c.end_date)}</td>
              <td className="px-4 py-3 text-text-muted">{currency.format(c.wage)}</td>
              <td className="px-4 py-3">
                <Badge variant={statusVariant(c.state)}>{c.state}</Badge>
              </td>
            </tr>
          ))}
        </Table>
      )}

      <p className="mt-6 text-sm text-text-muted">
        Useful note: retain contract history, but make the active Running contract obvious
        because payroll depends on it.
      </p>

      <Toast message={toast} onClose={() => setToast(null)} />
    </div>
  );
}
