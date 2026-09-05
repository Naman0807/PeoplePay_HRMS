"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import { permissions } from "@/lib/permissions";
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

const formatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

// No GET /api/payruns/:id in the contract — only the list endpoint — so the
// current payrun's state is read out of the /api/payruns list by id.
export default function PayrunDetailPage() {
  const perms = permissions();
  const { id } = useParams();
  const { data: payruns, loading, error, refetch } = useFetch("/api/payruns");
  const payrun = payruns?.find((p) => String(p.id) === String(id));

  const [busy, setBusy] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [payslips, setPayslips] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [toast, setToast] = useState(null);

  async function runAction(action) {
    setConfirm(null);
    setBusy(action);
    setActionError(null);
    try {
      const res = await api.post(`/api/payruns/${id}/${action}`);
      // compute returns { payrun_id, state, payslip_count, warnings, payslips: [...] },
      // so the array is nested — res.data.data is the wrapper, not the list.
      if (action === "compute") setPayslips(res.data.data.payslips);
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
        <p className="-mt-4 text-sm text-gray-500">
          {payrun.date_start?.slice(0, 10)} → {payrun.date_end?.slice(0, 10)}
        </p>
      </div>

      {actionError && (
        <div className="mb-4">
          <ErrorBox message={actionError} />
        </div>
      )}

      <div className="mb-6 flex gap-2">
        {perms.canRunPayroll && (
        <PrimaryButton disabled={busy !== null} onClick={() => runAction("compute")}>
          {busy === "compute" ? "Computing…" : "Compute"}
        </PrimaryButton>
        )}
        {perms.canApprovePayroll && (
        <>
        <SecondaryButton disabled={busy !== null} onClick={() => setConfirm("confirm")}>
          {busy === "confirm" ? "Confirming…" : "Confirm"}
        </SecondaryButton>
        <SecondaryButton disabled={busy !== null} onClick={() => setConfirm("mark-paid")}>
          {busy === "mark-paid" ? "Marking paid…" : "Mark paid"}
        </SecondaryButton>
        </>
        )}
      </div>

      {payslips?.length > 0 && (
        <Table headers={["Payslip", "Gross", "Net", "Warning"]}>
          {payslips.map((p) => (
            <tr key={p.id} className="border-t border-gray-100">
              <td className="px-4 py-2">
                <Link href={`/payslips/${p.id}`} className="font-medium text-gray-900 hover:underline">
                  #{p.id}
                </Link>
              </td>
              <td className="px-4 py-2 text-gray-600">
                {p.gross_amount != null ? formatter.format(p.gross_amount) : "—"}
              </td>
              <td className="px-4 py-2 text-gray-600">
                {p.net_amount != null ? formatter.format(p.net_amount) : "—"}
              </td>
              <td className="px-4 py-2">
                {p.warning_code ? (
                  <Badge variant="warning">{p.warning_code}</Badge>
                ) : (
                  "—"
                )}
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
