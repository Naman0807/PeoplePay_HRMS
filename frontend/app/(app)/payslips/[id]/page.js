"use client";

import { useParams } from "next/navigation";
import api from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import { Loading, ErrorBox } from "@/components/StatusStates";

export default function PayslipPage() {
  const { id } = useParams();
  const { data: payslip, loading, error, refetch } = useFetch(`/api/payslips/${id}`);

  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} onRetry={refetch} />;
  if (!payslip) return null;

  const pdfUrl = `${api.defaults.baseURL}/api/payslips/${id}/pdf`;

  return (
    <div className="max-w-xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Payslip #{payslip.id}</h1>
        <a href={pdfUrl} target="_blank" rel="noreferrer" className="text-sm font-medium text-gray-700 hover:underline">
          Download PDF →
        </a>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 rounded-lg border border-gray-200 bg-white p-4 text-sm">
        <div>
          <div className="text-xs text-gray-500">Period</div>
          <div>{payslip.date_from?.slice(0, 10)} → {payslip.date_to?.slice(0, 10)}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">State</div>
          <div>{payslip.state}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Gross</div>
          <div>{payslip.gross_amount ?? "—"}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Net</div>
          <div>{payslip.net_amount ?? "—"}</div>
        </div>
        {payslip.warning_code && (
          <div className="col-span-2">
            <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
              {payslip.warning_code}
            </span>
          </div>
        )}
      </div>

      {/* line_ids arrives in the sequence the salary rule engine produced it — never re-sorted here. */}
      <table className="w-full border-collapse overflow-hidden rounded-lg border border-gray-200 bg-white text-sm">
        <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
          <tr>
            <th className="px-4 py-2">Rule</th>
            <th className="px-4 py-2">Amount</th>
          </tr>
        </thead>
        <tbody>
          {payslip.line_ids?.map((line) => (
            <tr key={line.id} className="border-t border-gray-100">
              <td className="px-4 py-2 text-gray-800">
                {line.rule_name} <span className="text-xs text-gray-400">({line.rule_code})</span>
              </td>
              <td className="px-4 py-2 text-gray-600">{line.amount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
