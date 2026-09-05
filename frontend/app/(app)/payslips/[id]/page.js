"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useFetch } from "@/lib/useFetch";
import { openPayslipPdf } from "@/lib/downloadPdf";
import {
  BackLink,
  PageHeader,
  Card,
  Badge,
  statusVariant,
  Table,
  Loading,
  ErrorBox,
} from "@/components/ui";

const formatter = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });

export default function PayslipPage() {
  const { id } = useParams();
  const { data: payslip, loading, error, refetch } = useFetch(`/api/payslips/${id}`);
  const [pdfError, setPdfError] = useState(null);

  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} onRetry={refetch} />;
  if (!payslip) return null;

  async function handleDownload() {
    setPdfError(null);
    try {
      await openPayslipPdf(id);
    } catch (err) {
      setPdfError(err.response?.data?.message || "Could not open the PDF.");
    }
  }

  return (
    <div className="max-w-xl">
      <BackLink href="/payruns">Back to payrun</BackLink>
      <div className="mt-3 mb-6">
        <PageHeader
          title={`Payslip #${payslip.id}`}
          actions={
            <button
              type="button"
              onClick={handleDownload}
              className="text-sm font-medium text-text-muted hover:underline"
            >
              Download PDF →
            </button>
          }
        />
        {pdfError && <ErrorBox message={pdfError} />}
      </div>

      <Card className="mb-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-xs text-text-muted">Period</div>
            <div className="mt-0.5">{payslip.date_from?.slice(0, 10)} → {payslip.date_to?.slice(0, 10)}</div>
          </div>
          <div>
            <div className="text-xs text-text-muted">State</div>
            <div className="mt-1">
              <Badge variant={statusVariant(payslip.state)}>{payslip.state}</Badge>
            </div>
          </div>
          <div>
            <div className="text-xs text-text-muted">Gross</div>
            <div className="mt-0.5">{payslip.gross_amount != null ? formatter.format(payslip.gross_amount) : "—"}</div>
          </div>
          <div>
            <div className="text-xs text-text-muted">Net</div>
            <div className="mt-0.5">{payslip.net_amount != null ? formatter.format(payslip.net_amount) : "—"}</div>
          </div>
          {payslip.warning_code && (
            <div className="col-span-2">
              <Badge variant="warning">{payslip.warning_code}</Badge>
            </div>
          )}
        </div>
      </Card>

      {/* line_ids arrives in the sequence the salary rule engine produced it — never re-sorted here. */}
      <Table headers={["Rule", "Amount"]}>
        {payslip.line_ids?.map((line) => (
          <tr key={line.id}>
            <td className="px-4 py-2 text-text-primary">
              {line.rule_name} <span className="text-xs text-text-muted">({line.rule_code})</span>
            </td>
            <td className="px-4 py-2 text-text-muted">
              {line.amount != null ? formatter.format(line.amount) : "—"}
            </td>
          </tr>
        ))}
      </Table>
    </div>
  );
}