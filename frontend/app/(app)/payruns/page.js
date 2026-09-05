"use client";

import Link from "next/link";
import { useFetch } from "@/lib/useFetch";
import { Loading, ErrorBox, Empty } from "@/components/StatusStates";

export default function PayrunsPage() {
  const { data, loading, error, refetch } = useFetch("/api/payruns");

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Payroll</h1>
        <Link href="/payruns/new" className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white">
          New payrun
        </Link>
      </div>

      {loading && <Loading />}
      {error && <ErrorBox message={error} onRetry={refetch} />}
      {!loading && !error && data?.length === 0 && <Empty message="No payruns yet." />}

      {!loading && !error && data?.length > 0 && (
        <table className="w-full border-collapse overflow-hidden rounded-lg border border-gray-200 bg-white text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Period</th>
              <th className="px-4 py-2">State</th>
            </tr>
          </thead>
          <tbody>
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
                <td className="px-4 py-2 text-gray-600">{p.state}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
