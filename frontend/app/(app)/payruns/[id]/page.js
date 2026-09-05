"use client";

import { useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import { permissions } from "@/lib/permissions";
import { openPayslipPdf } from "@/lib/downloadPdf";
import {
  BackLink,
  PageHeader,
  Badge,
  statusVariant,
  PrimaryButton,
  SecondaryButton,
  Table,
  ConfirmDialog,
  Toast,
  EmptyState,
  Loading,
  ErrorBox,
} from "@/components/ui";

const formatter = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });

export default function PayrunDetailPage() {
  const perms = permissions();
  // The wizard passes its selection through the query string; absent means everyone.
  const searchParams = useSearchParams();
  const selected = searchParams.get("employees");
  const employeeIds = selected
    ? selected.split(",").map(Number).filter((n) => Number.isInteger(n) && n > 0)
    : null;
  const { id } = useParams();
  // GET /api/payruns/:id includes its payslips, so this is also how already
  // computed/confirmed/paid runs show individual amounts again after a refresh —
  // not only right after clicking Compute in this session.
  const { data: payrun, loading, error, refetch } = useFetch(`/api/payruns/${id}`);
  const payslips = payrun?.payslips ?? null;
  // The payslips embedded in /api/payruns/:id carry employee_id but not the name —
  // look it up from the employee list rather than adding a per-row fetch.
  const { data: employees } = useFetch("/api/employees");
  const employeeName = (employee_id) =>
    employees?.find((e) => e.id === employee_id)?.name ?? `#${employee_id}`;

  const [busy, setBusy] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [toast, setToast] = useState(null);

  async function runAction(action) {
    setConfirm(null);
    setBusy(action);
    setActionError(null);
    try {
      await api.post(
        `/api/payruns/${id}/${action}`,
        action === "compute" && employeeIds ? { employee_ids: employeeIds } : undefined
      );
      refetch();
      if (action === "compute") setToast("Payrun computed");
      else if (action === "confirm") setToast("Payrun confirmed");
      else if (action === "mark-paid") setToast("Payrun marked as paid");
    } catch (err) {
      setActionError(err.response?.data?.message || `Could not ${action} payrun.`);
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} onRetry={refetch} />;
  if (!payrun) return <EmptyState message="Payrun not found." />;

  return (
    <div className="max-w-2xl">
      <BackLink href="/payruns">All payruns</BackLink>
      <div className="mt-3 mb-6">
        <PageHeader
          title={payrun.name}
          actions={<Badge variant={statusVariant(payrun.state)}>{payrun.state}</Badge>}
        />
        <p className="-mt-4 text-sm text-text-muted">
          {payrun.date_start?.slice(0, 10)} → {payrun.date_end?.slice(0, 10)}
        </p>
      </div>

      {actionError && (
        <div className="mb-4">
          <ErrorBox message={actionError} />
        </div>
      )}

      <div className="mb-6 flex gap-2">
        {/* One relevant action per state, not all three every time: Compute while
            there's nothing computed yet (or to recompute), Confirm once computed,
            Mark paid once confirmed — mirrors the DRAFT/COMPUTED/CONFIRMED/PAID
            lifecycle instead of showing every button regardless of state. */}
        {perms.canRunPayroll && ["DRAFT", "COMPUTED"].includes(payrun.state) && (
          <PrimaryButton disabled={busy !== null} onClick={() => runAction("compute")}>
            {busy === "compute" ? "Computing…" : "Compute"}
          </PrimaryButton>
        )}
        {perms.canApprovePayroll && payrun.state === "COMPUTED" && (
          <SecondaryButton disabled={busy !== null} onClick={() => setConfirm("confirm")}>
            {busy === "confirm" ? "Confirming…" : "Confirm"}
          </SecondaryButton>
        )}
        {perms.canApprovePayroll && payrun.state === "CONFIRMED" && (
          <SecondaryButton disabled={busy !== null} onClick={() => setConfirm("mark-paid")}>
            {busy === "mark-paid" ? "Marking paid…" : "Mark paid"}
          </SecondaryButton>
        )}
      </div>

      {payslips?.length > 0 && (
        <Table headers={["Employee", "Payslip", "Gross", "Net", "Warning", "Download"]}>
          {payslips.map((p) => (
            <tr key={p.id}>
              <td className="px-4 py-2 text-text-primary">{employeeName(p.employee_id)}</td>
              <td className="px-4 py-2">
                <Link href={`/payslips/${p.id}`} className="font-medium text-text-primary hover:underline">
                  #{p.id}
                </Link>
              </td>
              <td className="px-4 py-2 text-text-muted">
                {p.gross_amount != null ? formatter.format(p.gross_amount) : "—"}
              </td>
              <td className="px-4 py-2 text-text-muted">
                {p.net_amount != null ? formatter.format(p.net_amount) : "—"}
              </td>
              <td className="px-4 py-2">
                {p.warning_code ? (
                  <Badge variant="warning">{p.warning_code}</Badge>
                ) : (
                  "—"
                )}
              </td>
              <td className="px-4 py-2">
                <button
                  type="button"
                  onClick={() => openPayslipPdf(p.id).catch(() => setActionError("Could not open the PDF."))}
                  className="text-sm font-medium text-text-muted hover:underline"
                >
                  PDF
                </button>
              </td>
            </tr>
          ))}
        </Table>
      )}

      <ConfirmDialog
        open={confirm !== null}
        title={confirm === "confirm" ? "Confirm payrun" : "Mark payrun as paid"}
        message={
          confirm === "confirm"
            ? "Confirming a payrun is financially irreversible. Are you sure you want to continue?"
            : "Marking a payrun as paid is financially irreversible. Are you sure you want to continue?"
        }
        confirmLabel={confirm === "confirm" ? "Confirm" : "Mark as paid"}
        danger
        onConfirm={() => runAction(confirm)}
        onCancel={() => setConfirm(null)}
      />

      <Toast message={toast} onClose={() => setToast(null)} />
    </div>
  );
}
