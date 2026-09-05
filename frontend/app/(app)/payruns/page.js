"use client";

import Link from "next/link";
import { useFetch } from "@/lib/useFetch";
import { permissions } from "@/lib/permissions";
import {
  PageHeader,
  PrimaryButton,
  Table,
  Badge,
  statusVariant,
  EmptyState,
  Loading,
  ErrorBox,
} from "@/components/ui";

const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export default function PayrunsPage() {
  const perms = permissions();
  const { data, loading, error, refetch } = useFetch("/api/payruns");

  return (
    <div>
      <PageHeader
        title="Payroll"
        actions={
          <Link href="/payruns/new">
            {perms.canRunPayroll && <PrimaryButton>New payrun</PrimaryButton>}
          </Link>
        }
      />

      {loading && <Loading />}
      {error && <ErrorBox message={error} onRetry={refetch} />}
      {!loading && !error && data?.length === 0 && <EmptyState message="No payruns yet." />}

      {!loading && !error && data?.length > 0 && (
        <Table headers={["Name", "Period", "Amount", "State"]}>
          {data.map((p) => (
            <PayrunRow key={p.id} payrun={p} />
          ))}
        </Table>
      )}
    </div>
  );
}

// The list endpoint has no amount field, only /api/payruns/:id does (it embeds
// the payslips) — each row fetches its own detail rather than adding a new
// aggregate endpoint. Small payrun counts, own loading state per row.
function PayrunRow({ payrun: p }) {
  const { data: detail, loading } = useFetch(`/api/payruns/${p.id}`);
  const total = detail?.payslips?.reduce((sum, ps) => sum + Number(ps.gross_amount ?? 0), 0);

  return (
    <tr>
      <td className="px-4 py-2">
        <Link href={`/payruns/${p.id}`} className="font-medium text-text-primary hover:underline">
          {p.name}
        </Link>
      </td>
      <td className="px-4 py-2 text-text-muted">
        {p.date_start?.slice(0, 10)} → {p.date_end?.slice(0, 10)}
      </td>
      <td className="px-4 py-2 text-text-muted">
        {loading ? "…" : detail?.payslips?.length ? currency.format(total) : "—"}
      </td>
      <td className="px-4 py-2 text-text-muted">
        <Badge variant={statusVariant(p.state)}>{p.state}</Badge>
      </td>
    </tr>
  );
}
