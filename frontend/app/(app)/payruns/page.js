"use client";

import Link from "next/link";
import { useFetch } from "@/lib/useFetch";
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

export default function PayrunsPage() {
  const { data, loading, error, refetch } = useFetch("/api/payruns");

  return (
    <div>
      <PageHeader
        title="Payroll"
        actions={
          <Link href="/payruns/new">
            <PrimaryButton>New payrun</PrimaryButton>
          </Link>
        }
      />

      {loading && <Loading />}
      {error && <ErrorBox message={error} onRetry={refetch} />}
      {!loading && !error && data?.length === 0 && <EmptyState message="No payruns yet." />}

      {!loading && !error && data?.length > 0 && (
        <Table headers={["Name", "Period", "State"]}>
          {data.map((p) => (
            <tr key={p.id} className="border-t border-gray-100 hover:bg-gray-50">
              <td className="px-4 py-2">
                <Link href={`/payruns/${p.id}`} className="font-medium text-gray-900 hover:underline">
                  {p.name}
                </Link>
              </td>
              <td className="px-4 py-2 text-gray-600">
                {p.date_start?.slice(0, 10)} → {p.date_end?.slice(0, 10)}
              </td>
              <td className="px-4 py-2 text-gray-600">
                <Badge variant={statusVariant(p.state)}>{p.state}</Badge>
              </td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
