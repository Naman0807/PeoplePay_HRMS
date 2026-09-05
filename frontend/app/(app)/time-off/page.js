"use client";

import { useState } from "react";
import api from "@/lib/api";
import { getUser } from "@/lib/auth";
import { permissions } from "@/lib/permissions";
import { useFetch } from "@/lib/useFetch";
import {
  PageHeader,
  PrimaryButton,
  Select,
  Field,
  Card,
  Table,
  Badge,
  statusVariant,
  ConfirmDialog,
  Toast,
  EmptyState,
  Loading,
  ErrorBox,
} from "@/components/ui";

const EMPTY_FORM = { leave_type_id: "", date_from: "", date_to: "", number_of_days: "", reason: "" };
const CAN_APPROVE_ROLES = ["HR_MANAGER", "HR_PAYROLL_MANAGER", "ADMIN"];

export default function TimeOffPage() {
  const perms = permissions();
  const { data: employees, loading: empLoading, error: empError } = useFetch("/api/employees");
  // An employee files only for themselves, so preselect them. Leaving this empty
  // meant the form posted whichever person the dropdown happened to land on, and the
  // API correctly refused it with 403.
  const [employeeId, setEmployeeId] = useState(() =>
    perms.isEmployee && perms.user?.employee_id ? String(perms.user.employee_id) : ""
  );
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [actingId, setActingId] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [toast, setToast] = useState(null);

  const user = getUser();
  const canApprove = user && CAN_APPROVE_ROLES.includes(user.role);

  const { data: leaveTypes } = useFetch("/api/leave-requests/types");
  const selectedType = (leaveTypes || []).find(
    (t) => String(t.id) === String(form.leave_type_id)
  );
  // "Other" is not self-explanatory, so a reason is required for it.
  const reasonRequired = selectedType?.name === "Other";

  const url = employeeId ? `/api/leave-requests?employee_id=${employeeId}` : "/api/leave-requests";
  const { data, loading, error, refetch } = useFetch(url);

  /** Whole days inclusive of both ends, matching the backend's own calculation. */
  function daysBetween(from, to) {
    if (!from || !to) return "";
    const days = Math.round((new Date(to) - new Date(from)) / 86400000) + 1;
    return days > 0 ? String(days) : "";
  }

  // Changing either date refills the day count. It stays editable for half days and
  // similar cases, and the backend derives it again if left blank.
  function setDate(field, value) {
    const next = { ...form, [field]: value };
    next.number_of_days = daysBetween(
      field === "date_from" ? value : form.date_from,
      field === "date_to" ? value : form.date_to
    );
    setForm(next);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      await api.post("/api/leave-requests", {
        employee_id: Number(employeeId),
        leave_type_id: Number(form.leave_type_id),
        date_from: form.date_from,
        date_to: form.date_to,
        number_of_days: Number(form.number_of_days),
        reason: form.reason || null,
      });
      setForm(EMPTY_FORM);
      setShowForm(false);
      refetch();
      setToast("Leave request submitted");
    } catch (err) {
      setFormError(err.response?.data?.message || "Could not submit leave request.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAction(id, action) {
    setConfirm(null);
    setActingId(id);
    setActionError(null);
    try {
      await api.patch(`/api/leave-requests/${id}/${action}`);
      refetch();
      setToast(action === "approve" ? "Request approved" : "Request refused");
    } catch (err) {
      setActionError(err.response?.data?.message || `Could not ${action} request.`);
    } finally {
      setActingId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Time Off"
        actions={
          employeeId && (
            <PrimaryButton onClick={() => setShowForm((v) => !v)}>
              {showForm ? "Cancel" : "Request leave"}
            </PrimaryButton>
          )
        }
      />

      <div className="mb-4 max-w-xs">
        {empLoading && <Loading />}
        {empError && <ErrorBox message={empError} />}
        {/* Only staff who may file on someone else's behalf get to choose a person. */}
        {employees && !perms.isEmployee && (
          <Select
            label="Filter by employee (optional)"
            value={employeeId}
            onChange={setEmployeeId}
            options={employees.map((e) => ({ value: String(e.id), label: e.name }))}
            hint=""
          />
        )}
      </div>

      {showForm && employeeId && (
        <Card className="mb-6">
          <form onSubmit={handleSubmit} className="space-y-3">
            {formError && <ErrorBox message={formError} />}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select
                label="Leave type"
                value={form.leave_type_id}
                onChange={(v) => setForm({ ...form, leave_type_id: v })}
                options={(leaveTypes || []).map((t) => ({
                  value: String(t.id),
                  label: t.requires_allocation ? t.name : `${t.name} (unpaid)`,
                }))}
                required
              />
              <Field label="From" type="date" value={form.date_from} onChange={(v) => setDate("date_from", v)} required />
              <Field label="To" type="date" value={form.date_to} onChange={(v) => setDate("date_to", v)} required />
              <Field
                label="Number of days"
                type="number"
                value={form.number_of_days}
                onChange={(v) => setForm({ ...form, number_of_days: v })}
                required
                hint="Filled in from the dates. Edit it for a half day."
              />
              <Field
                label={reasonRequired ? "Reason (required)" : "Reason"}
                value={form.reason}
                onChange={(v) => setForm({ ...form, reason: v })}
                required={reasonRequired}
                hint={reasonRequired ? "Say what this time off is for." : ""}
              />
            </div>
            <PrimaryButton type="submit" disabled={submitting}>
              {submitting ? "Submitting…" : "Submit request"}
            </PrimaryButton>
          </form>
        </Card>
      )}

      {actionError && (
        <div className="mb-3">
          <ErrorBox message={actionError} />
        </div>
      )}

      {loading && <Loading />}
      {error && <ErrorBox message={error} onRetry={refetch} />}
      {!loading && !error && data?.length === 0 && <EmptyState message="No leave requests yet." />}

      {!loading && !error && data?.length > 0 && (
        <Table
          headers={[
            ...(!perms.isEmployee ? ["Employee"] : []),
            "From",
            "To",
            "Days",
            "Reason",
            "State",
            ...(canApprove ? ["Actions"] : []),
          ]}
        >
          {data.map((r) => (
            <tr key={r.id} className="border-t border-gray-100">
              {!perms.isEmployee && (
                <td className="px-4 py-2 font-medium text-gray-900">{r.employee?.name || "—"}</td>
              )}
              <td className="px-4 py-2 text-gray-600">{r.date_from?.slice(0, 10)}</td>
              <td className="px-4 py-2 text-gray-600">{r.date_to?.slice(0, 10)}</td>
              <td className="px-4 py-2 text-gray-600">{r.number_of_days}</td>
              <td className="px-4 py-2 text-gray-600">{r.reason || "—"}</td>
              <td className="px-4 py-2 text-gray-600">
                <Badge variant={statusVariant(r.state)}>{r.state}</Badge>
              </td>
              {canApprove && (
                <td className="px-4 py-2">
                  {r.state === "TO_APPROVE" ? (
                    <div className="flex gap-2">
                      <button
                        disabled={actingId === r.id}
                        onClick={() => setConfirm({ id: r.id, action: "approve" })}
                        className="rounded bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-800 transition-colors hover:bg-emerald-200 disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        disabled={actingId === r.id}
                        onClick={() => setConfirm({ id: r.id, action: "refuse" })}
                        className="rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-800 transition-colors hover:bg-red-200 disabled:opacity-50"
                      >
                        Refuse
                      </button>
                    </div>
                  ) : (
                    "—"
                  )}
                </td>
              )}
            </tr>
          ))}
        </Table>
      )}

      <ConfirmDialog
        open={confirm !== null}
        title={confirm?.action === "approve" ? "Approve request" : "Refuse request"}
        message={
          confirm?.action === "approve"
            ? "Are you sure you want to approve this leave request?"
            : "Are you sure you want to refuse this leave request?"
        }
        confirmLabel={confirm?.action === "approve" ? "Approve" : "Refuse"}
        danger={confirm?.action === "refuse"}
        onConfirm={() => handleAction(confirm.id, confirm.action)}
        onCancel={() => setConfirm(null)}
      />

      <Toast message={toast} onClose={() => setToast(null)} />
    </div>
  );
}
