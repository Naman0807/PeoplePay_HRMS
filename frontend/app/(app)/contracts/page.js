"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import api from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import {
  PageHeader,
  Table,
  Badge,
  statusVariant,
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
  }, [employees]);

  return {
    contracts,
    loading: employeesLoading || loading,
    error: employeesError || error,
  };
}

export default function ContractsPage() {
  const { contracts, loading, error } = useAllContracts();
  const [search, setSearch] = useState("");

  const filtered = (contracts || []).filter((c) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return c.reference.toLowerCase().includes(q) || c.employee_name.toLowerCase().includes(q);
  });

  return (
    <div>
      <PageHeader title="Contracts" />
      <p className="-mt-4 mb-6 text-sm text-text-muted">List view of employee contracts</p>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Link
          href="/employees"
          className="flex w-fit items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover"
          title="Pick an employee to add a contract under"
        >
          <Plus className="h-4 w-4" />
          New
        </Link>
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

      {loading && <Loading />}
      {error && <ErrorBox message={error} />}
      {!loading && !error && filtered.length === 0 && (
        <EmptyState message={search ? "No contracts match your search." : "No contracts yet."} />
      )}

      {!loading && !error && filtered.length > 0 && (
        <Table headers={["Contract", "Employee", "Start", "End", "Wage / Month", "Status"]}>
          {filtered.map((c) => (
            <tr key={c.id}>
              <td className="px-4 py-3 font-medium text-text-primary">{c.reference}</td>
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
    </div>
  );
}
