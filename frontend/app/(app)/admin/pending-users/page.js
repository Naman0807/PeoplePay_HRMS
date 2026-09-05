"use client";

import { useState } from "react";
import api from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import { permissions } from "@/lib/permissions";
import {
  PageHeader,
  Table,
  Badge,
  ConfirmDialog,
  Toast,
  Loading,
  ErrorBox,
  EmptyState,
} from "@/components/ui";

const ROLE_LABELS = {
  HR_MANAGER: "HR Manager",
  HR_PAYROLL_USER: "HR Payroll User",
  HR_PAYROLL_MANAGER: "HR Payroll Manager",
  EMPLOYEE: "Employee",
};

export default function PendingUsersPage() {
  const perms = permissions();
  const { data, loading, error, refetch } = useFetch(perms.canApproveSignups ? "/api/admin/pending-users" : null);
  const [actingId, setActingId] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [toast, setToast] = useState(null);

  async function handleAction(id, action) {
    setConfirm(null);
    setActingId(id);
    setActionError(null);
    try {
      await api.patch(`/api/admin/pending-users/${id}/${action}`);
      refetch();
      setToast(action === "approve" ? "Account approved" : "Request rejected");
    } catch (err) {
      setActionError(err.response?.data?.message || `Could not ${action} this account.`);
    } finally {
      setActingId(null);
    }
  }

  if (!perms.canApproveSignups) {
    return (
      <div>
        <PageHeader title="Pending sign-ups" />
        <EmptyState message="Only an admin can approve account requests." />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Pending sign-ups" />
      <p className="-mt-4 mb-6 text-sm text-text-muted">
        Accounts that signed up requesting HR or payroll access — nothing here can log in until approved.
      </p>

      {actionError && (
        <div className="mb-4">
          <ErrorBox message={actionError} />
        </div>
      )}

      {loading && <Loading />}
      {error && <ErrorBox message={error} onRetry={refetch} />}
      {!loading && !error && data?.length === 0 && <EmptyState message="No pending requests." />}

      {!loading && !error && data?.length > 0 && (
        <Table headers={["Name", "Login", "Requested role", "Actions"]}>
          {data.map((u) => (
            <tr key={u.id}>
              <td className="px-4 py-2 font-medium text-text-primary">{u.name}</td>
              <td className="px-4 py-2 text-text-muted">{u.login}</td>
              <td className="px-4 py-2">
                <Badge variant="warning">{ROLE_LABELS[u.role] || u.role}</Badge>
              </td>
              <td className="px-4 py-2">
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={actingId === u.id}
                    onClick={() => setConfirm({ id: u.id, action: "approve" })}
                    className="rounded bg-status-success/20 px-2 py-1 text-xs font-medium text-status-success transition-colors hover:bg-status-success/30 disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={actingId === u.id}
                    onClick={() => setConfirm({ id: u.id, action: "reject" })}
                    className="rounded bg-status-error/20 px-2 py-1 text-xs font-medium text-status-error transition-colors hover:bg-status-error/30 disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </Table>
      )}

      <ConfirmDialog
        open={confirm !== null}
        title={confirm?.action === "approve" ? "Approve account" : "Reject account"}
        message={
          confirm?.action === "approve"
            ? `Grant this account ${ROLE_LABELS[data?.find((u) => u.id === confirm?.id)?.role] || "the requested role"} access?`
            : "This deletes the sign-up request permanently. The person can sign up again if this is a mistake."
        }
        confirmLabel={confirm?.action === "approve" ? "Approve" : "Reject"}
        danger={confirm?.action === "reject"}
        onConfirm={() => handleAction(confirm.id, confirm.action)}
        onCancel={() => setConfirm(null)}
      />

      <Toast message={toast} onClose={() => setToast(null)} />
    </div>
  );
}
