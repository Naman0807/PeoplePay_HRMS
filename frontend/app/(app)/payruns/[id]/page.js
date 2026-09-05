"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import { Loading, ErrorBox, Empty } from "@/components/StatusStates";

// No GET /api/payruns/:id in the contract — only the list endpoint — so the
// current payrun's state is read out of the /api/payruns list by id.
export default function PayrunDetailPage() {
  const { id } = useParams();
  const { data: payruns, loading, error, refetch } = useFetch("/api/payruns");
  const payrun = payruns?.find((p) => String(p.id) === String(id));

  const [busy, setBusy] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [payslips, setPayslips] = useState(null);

  async function runAction(action) {
    setBusy(action);
    setActionError(null);
    try {
      const res = await api.post(`/api/payruns/${id}/${action}`);
      if (action === "compute") setPayslips(res.data.data);
      refetch();
    } catch (err) {
      setActionError(err.response?.data?.message || `Could not ${action} payrun.`);
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} onRetry={refetch} />;
  if (!payrun) return <Empty message="Payrun not found." />;

  return (
    <div className="max-w-2xl">
      <Link href="/payruns" className="text-xs text-gray-500 hover:underline">
        ← All payruns
      </Link>
      <h1 className="mb-1 text-xl font-semibold text-gray-900">{payrun.name}</h1>
      <p className="mb-6 text-sm text-gray-500">
        {payrun.date_start?.slice(0, 10)} → {payrun.date_end?.slice(0, 10)} · state: {payrun.state}
      </p>

      {actionError && <div className="mb-4"><ErrorBox message={actionError} /></div>}

      <div className="mb-6 flex gap-2">
        <button
          disabled={busy !== null}
          onClick={() => runAction("compute")}
          className="rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy === "compute" ? "Computing…" : "Compute"}
        </button>
        <button
          disabled={busy !== null}
          onClick={() => runAction("confirm")}
          className="rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-800 disabled:opacity-50"
        >
          {busy === "confirm" ? "Confirming…" : "Confirm"}
        </button>
        <button
          disabled={busy !== null}
          onClick={() => runAction("mark-paid")}
          className="rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-800 disabled:opacity-50"
        >
          {busy === "mark-paid" ? "Marking paid…" : "Mark paid"}
        </button>
      </div>

      {payslips?.length > 0 && (
        <table className="w-full border-collapse overflow-hidden rounded-lg border border-gray-200 bg-white text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2">Payslip</th>
              <th className="px-4 py-2">Gross</th>
              <th className="px-4 py-2">Net</th>
              <th className="px-4 py-2">Warning</th>
            </tr>
          </thead>
          <tbody>
            {payslips.map((p) => (
              <tr key={p.id} className="border-t border-gray-100">
                <td className="px-4 py-2">
                  <Link href={`/payslips/${p.id}`} className="font-medium text-gray-900 hover:underline">
                    #{p.id}
                  </Link>
                </td>
                <td className="px-4 py-2 text-gray-600">{p.gross_amount ?? "—"}</td>
                <td className="px-4 py-2 text-gray-600">{p.net_amount ?? "—"}</td>
                <td className="px-4 py-2">
                  {p.warning_code ? (
                    <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                      {p.warning_code}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
