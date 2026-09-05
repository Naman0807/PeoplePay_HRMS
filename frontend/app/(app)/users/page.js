"use client";

import { useState } from "react";
import api from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import { permissions } from "@/lib/permissions";
import {
  PageHeader,
  PrimaryButton,
  Field,
  Select,
  Card,
  Table,
  Badge,
  Toast,
  EmptyState,
  Loading,
  ErrorBox,
} from "@/components/ui";

const ROLES = ["EMPLOYEE", "HR_MANAGER", "HR_PAYROLL_USER", "HR_PAYROLL_MANAGER", "ADMIN"];
const EMPTY_FORM = { name: "", login: "", password: "", role: "EMPLOYEE", employee_id: "" };

export default function UsersPage() {
  const perms = permissions();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  const { data: users, loading, error: listError, refetch } = useFetch("/api/users");
  const { data: employees } = useFetch("/api/employees?limit=100");

  // Employees with no login yet — the reason this screen exists. Creating an employee
  // does not create an account, so without this they cannot sign in at all.
  const linked = new Set((users || []).map((u) => u.employee_id).filter(Boolean));
  const unlinked = (employees || []).filter((e) => !linked.has(e.id));

  async function createUser(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.post("/api/users", {
        name: form.name,
        login: form.login,
        password: form.password,
        role: form.role,
        ...(form.employee_id ? { employee_id: Number(form.employee_id) } : {}),
      });
      setForm(EMPTY_FORM);
      setShowForm(false);
      setToast("Account created");
      refetch();
    } catch (err) {
      const data = err.response?.data;
      setError(data?.details?.[0]?.issue || data?.message || "Could not create the account.");
    } finally {
      setBusy(false);
    }
  }

  async function changeRole(id, role) {
    setError(null);
    try {
      await api.patch(`/api/users/${id}`, { role });
      setToast("Role updated");
      refetch();
    } catch (err) {
      const data = err.response?.data;
      setError(data?.details?.[0]?.issue || data?.message || "Could not change the role.");
      refetch();
    }
  }

  if (!perms.user || perms.user.role !== "ADMIN") {
    return (
      <div>
        <PageHeader title="Users" />
        <ErrorBox message="User administration is available to administrators only." />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Users"
        actions={
          <PrimaryButton onClick={() => setShowForm((v) => !v)}>
            {showForm ? "Cancel" : "New account"}
          </PrimaryButton>
        }
      />

      {error && <ErrorBox message={error} />}

      {unlinked.length > 0 && (
        <p className="mb-4 text-sm text-amber-700">
          {unlinked.length} employee{unlinked.length === 1 ? "" : "s"} have no login yet and cannot
          sign in.
        </p>
      )}

      {showForm && (
        <Card className="mb-6">
          <form onSubmit={createUser} className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
              <Field label="Login" type="email" value={form.login} onChange={(v) => setForm({ ...form, login: v })} required hint="Used to sign in" />
              <Field label="Password" type="password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} required hint="At least 8 characters" />
              <Select label="Role" value={form.role} onChange={(v) => setForm({ ...form, role: v })} options={ROLES.map((r) => ({ value: r, label: r }))} />
              <Select
                label="Linked employee (optional)"
                value={form.employee_id}
                onChange={(v) => setForm({ ...form, employee_id: v })}
                options={(employees || []).map((e) => ({ value: String(e.id), label: e.name }))}
                hint="Leave empty for an operator account with no employee record"
              />
            </div>
            <PrimaryButton type="submit" disabled={busy}>
              {busy ? "Creating…" : "Create account"}
            </PrimaryButton>
          </form>
        </Card>
      )}

      {loading && <Loading />}
      {listError && <ErrorBox message={listError} onRetry={refetch} />}
      {!loading && users?.length === 0 && <EmptyState message="No accounts yet." />}

      {users?.length > 0 && (
        <Table headers={["Name", "Login", "Role", "Status", "Employee"]}>
          {users.map((u) => (
            <tr key={u.id} className="border-t border-gray-100">
              <td className="px-4 py-2 font-medium">{u.name}</td>
              <td className="px-4 py-2 text-gray-600">{u.login}</td>
              <td className="px-4 py-2">
                <Select
                  label=""
                  value={u.role}
                  onChange={(v) => changeRole(u.id, v)}
                  options={ROLES.map((r) => ({ value: r, label: r }))}
                />
              </td>
              <td className="px-4 py-2">
                <Badge variant={u.status === "ACTIVE" ? "success" : "default"}>{u.status}</Badge>
              </td>
              <td className="px-4 py-2 text-gray-600">{u.employee_id ?? "—"}</td>
            </tr>
          ))}
        </Table>
      )}

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
