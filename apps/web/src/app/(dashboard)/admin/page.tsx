'use client';

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/src/lib/api/client';
import { RequireAuth } from '@/src/components/auth/RequireAuth';
import { PageHeader } from '@/src/components/layout/PageHeader';
import { DataTable, type Column } from '@/src/components/layout/DataTable';
import { StatusBadge } from '@/src/components/layout/StatusBadge';
import { Modal } from '@/src/components/layout/Modal';
import { ConfirmDialog } from '@/src/components/layout/ConfirmDialog';
import { EmptyState } from '@/src/components/layout/EmptyState';
import {
  useUsers,
  useCreateUser,
  useUpdateUser,
  useUpdateUserStatus,
  usePendingApprovals,
  useApproveUser,
  useRejectUser,
  type UserAccount,
  type PendingApproval,
} from '@/src/lib/api/queries';
import type { UserRole } from '@peoplepay360/shared';

const ROLES: UserRole[] = ['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'EMPLOYEE'];

const ROLE_STYLES: Record<string, string> = {
  ADMIN: 'bg-rose-100 text-rose-800',
  HR_MANAGER: 'bg-violet-100 text-violet-800',
  HR_PAYROLL_USER: 'bg-blue-100 text-blue-800',
  HR_PAYROLL_MANAGER: 'bg-indigo-100 text-indigo-800',
  EMPLOYEE: 'bg-slate-100 text-slate-700',
};

function RoleBadge({ role }: { role: UserRole }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        ROLE_STYLES[role] ?? 'bg-slate-100 text-slate-700'
      }`}
    >
      {role}
    </span>
  );
}

function PendingApprovalsSection() {
  const { data: pending = [], isLoading, isError, error } = usePendingApprovals();
  const approveUser = useApproveUser();
  const rejectUser = useRejectUser();
  const [approveTarget, setApproveTarget] = useState<PendingApproval | null>(null);
  const [rejectTarget, setRejectTarget] = useState<PendingApproval | null>(null);
  const [pendingError, setPendingError] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
        Loading pending approvals...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mb-6 rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">
        Error loading pending approvals: {(error as Error).message}
      </div>
    );
  }

  if (pending.length === 0) return null;

  function fullName(u: PendingApproval) {
    if (u.first_name && u.last_name) return `${u.first_name} ${u.last_name}`;
    return u.first_name || u.last_name || u.email;
  }

  function closeDialogs() {
    setApproveTarget(null);
    setRejectTarget(null);
    setPendingError(null);
  }

  return (
    <div className="mb-6 overflow-hidden rounded-xl border border-amber-200 bg-white">
      <div className="flex items-center justify-between border-b border-amber-100 bg-amber-50 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Pending Approvals</h2>
          <p className="text-xs text-slate-500">
            {pending.length} account{pending.length > 1 ? 's' : ''} waiting for approval
          </p>
        </div>
        <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
          {pending.length} pending
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                Name
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                Email
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                Requested Role
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                Requested
              </th>
              <th className="px-4 py-2.5 text-right text-xs font-medium uppercase tracking-wide text-slate-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pending.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3 font-medium text-slate-900">{fullName(u)}</td>
                <td className="px-4 py-3 text-slate-500">{u.email}</td>
                <td className="px-4 py-3">
                  <RoleBadge role={u.requested_role} />
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {new Date(u.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPendingError(null);
                        setApproveTarget(u);
                      }}
                      disabled={approveUser.isPending || rejectUser.isPending}
                      className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPendingError(null);
                        setRejectTarget(u);
                      }}
                      disabled={approveUser.isPending || rejectUser.isPending}
                      className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pendingError && (
        <div className="border-t border-slate-100 px-4 py-3 text-sm text-red-600">
          {pendingError}
        </div>
      )}

      <ConfirmDialog
        open={approveTarget !== null}
        title="Approve Account"
        message={`Approve ${approveTarget ? fullName(approveTarget) : ''} as ${approveTarget?.requested_role ?? ''}? They'll be able to log in immediately.`}
        confirmLabel="Approve"
        cancelLabel="Cancel"
        loading={approveUser.isPending}
        onConfirm={() => {
          if (!approveTarget) return;
          approveUser.mutate(approveTarget.id, {
            onSuccess: closeDialogs,
            onError: (err) =>
              setPendingError((err as Error).message || 'Failed to approve user'),
          });
        }}
        onCancel={closeDialogs}
      />

      <ConfirmDialog
        open={rejectTarget !== null}
        title="Reject Account"
        message={`Reject the signup request for ${rejectTarget ? fullName(rejectTarget) : ''}? They won't be able to log in.`}
        confirmLabel="Reject"
        cancelLabel="Cancel"
        danger
        loading={rejectUser.isPending}
        onConfirm={() => {
          if (!rejectTarget) return;
          rejectUser.mutate(rejectTarget.id, {
            onSuccess: closeDialogs,
            onError: (err) => setPendingError((err as Error).message || 'Failed to reject user'),
          });
        }}
        onCancel={closeDialogs}
      />
    </div>
  );
}

interface UserFormState {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: UserRole;
}

const EMPTY_FORM: UserFormState = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  role: 'EMPLOYEE',
};

interface UserFormModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  initial: UserFormState;
  pending: boolean;
  error?: string | null;
  onSave: (values: UserFormState) => void;
  onClose: () => void;
}

function UserFormModal({ open, mode, initial, pending, error, onSave, onClose }: UserFormModalProps) {
  const [form, setForm] = useState<UserFormState>(initial);

  useEffect(() => {
    if (open) setForm(initial);
  }, [open, initial]);

  const isCreate = mode === 'create';

  function resetAndClose() {
    setForm(initial);
    onClose();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.email || !form.role) return;
    if (isCreate && !form.password) return;
    onSave(form);
  }

  function update<K extends keyof UserFormState>(key: K, value: UserFormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  return (
    <Modal
      open={open}
      onClose={resetAndClose}
      title={isCreate ? 'New User' : 'Edit User'}
      footer={
        <>
          <button
            type="button"
            onClick={resetAndClose}
            disabled={pending}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="user-form"
            disabled={pending}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
          >
            {pending ? (isCreate ? 'Creating...' : 'Saving...') : isCreate ? 'Create User' : 'Save'}
          </button>
        </>
      }
    >
      <form id="user-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="first-name" className="mb-1 block text-sm font-medium text-slate-700">
              First Name
            </label>
            <input
              id="first-name"
              type="text"
              value={form.firstName}
              onChange={(e) => update('firstName', e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
            />
          </div>
          <div>
            <label htmlFor="last-name" className="mb-1 block text-sm font-medium text-slate-700">
              Last Name
            </label>
            <input
              id="last-name"
              type="text"
              value={form.lastName}
              onChange={(e) => update('lastName', e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
            />
          </div>
        </div>

        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
            required
          />
        </div>

        {isCreate ? (
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
              placeholder="Min. 6 characters"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
              required
            />
          </div>
        ) : null}

        <div>
          <label htmlFor="role" className="mb-1 block text-sm font-medium text-slate-700">
            Role
          </label>
          <select
            id="role"
            value={form.role}
            onChange={(e) => update('role', e.target.value as UserRole)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
            required
          >
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {role.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>

        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      </form>
    </Modal>
  );
}

function AdminPageContent() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserAccount | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useUsers({ page, pageSize: 20 });
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const updateUserStatus = useUpdateUserStatus();

  const users = Array.isArray(data) ? data : (data?.items ?? []);
  const meta = Array.isArray(data) ? undefined : data?.meta;
  const totalPages = meta?.totalPages ?? 1;

  function openCreateModal() {
    setEditingUser(null);
    setFormError(null);
    setUserModalOpen(true);
  }

  function openEditModal(user: UserAccount) {
    setEditingUser(user);
    setFormError(null);
    setUserModalOpen(true);
  }

  function closeUserModal() {
    setUserModalOpen(false);
    setEditingUser(null);
    setFormError(null);
  }

  function handleSave(values: UserFormState) {
    setFormError(null);
    if (editingUser) {
      updateUser.mutate(
        {
          id: editingUser.id,
          data: {
            firstName: values.firstName || undefined,
            lastName: values.lastName || undefined,
            email: values.email,
            role: values.role,
          },
        },
        {
          onSuccess: closeUserModal,
          onError: (err) => setFormError((err as Error).message || 'Failed to update user'),
        }
      );
    } else {
      createUser.mutate(
        {
          firstName: values.firstName || undefined,
          lastName: values.lastName || undefined,
          email: values.email,
          password: values.password,
          role: values.role,
        },
        {
          onSuccess: closeUserModal,
          onError: (err) => setFormError((err as Error).message || 'Failed to create user'),
        }
      );
    }
  }

  function handleToggleStatus(user: UserAccount) {
    updateUserStatus.mutate({ id: user.id, isActive: !user.is_active });
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeletePending(true);
    setDeleteError(null);
    try {
      await apiFetch(`/users/${deleteTarget.id}`, { method: 'DELETE' });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError((err as Error).message || 'Failed to delete user');
    } finally {
      setDeletePending(false);
    }
  }

  function fullName(user: UserAccount) {
    if (user.first_name && user.last_name) return `${user.first_name} ${user.last_name}`;
    return user.first_name || user.last_name || user.email;
  }

  const columns: Column<UserAccount>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (row) => (
        <div className="flex items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700">
            {fullName(row)
              .split(' ')
              .slice(0, 2)
              .map((part) => part.charAt(0))
              .join('')
              .toUpperCase()}
          </span>
          <span className="font-medium text-slate-900">{fullName(row)}</span>
        </div>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      render: (row) => <span className="text-slate-500">{row.email}</span>,
    },
    {
      key: 'role',
      header: 'Role',
      render: (row) => <RoleBadge role={row.role} />,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.is_active ? 'ACTIVE' : 'INACTIVE'} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => openEditModal(row)}
            disabled={updateUserStatus.isPending}
            className="rounded-md px-2.5 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => handleToggleStatus(row)}
            disabled={updateUserStatus.isPending}
            className="rounded-md px-2.5 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
          >
            {row.is_active ? 'Deactivate' : 'Activate'}
          </button>
          <button
            type="button"
            onClick={() => {
              setDeleteTarget(row);
              setDeleteError(null);
            }}
            disabled={updateUserStatus.isPending}
            className="rounded-md px-2.5 py-1 text-xs font-medium text-rose-600 transition-colors hover:bg-rose-50 disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="User Management"
        description="Create and manage user accounts and roles"
        actions={
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New User
          </button>
        }
      />

      {isError && (
        <div className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">
          Error loading users: {(error as Error).message}
        </div>
      )}

      <PendingApprovalsSection />

      {users.length === 0 && !isLoading && !isError ? (
        <EmptyState
          icon={
            <svg
              className="h-10 w-10"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          }
          message="No users found. Create your first user account."
        />
      ) : (
        <DataTable
          columns={columns}
          data={users}
          keyExtractor={(row) => row.id}
          loading={isLoading}
          emptyMessage="No users found"
        />
      )}

      {!isLoading && !isError && users.length > 0 && totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Page {page} of {totalPages} · {meta?.total} users
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      <UserFormModal
        open={userModalOpen}
        mode={editingUser ? 'edit' : 'create'}
        initial={
          editingUser
            ? {
                firstName: editingUser.first_name ?? '',
                lastName: editingUser.last_name ?? '',
                email: editingUser.email,
                password: '',
                role: editingUser.role,
              }
            : EMPTY_FORM
        }
        pending={createUser.isPending || updateUser.isPending}
        error={formError}
        onSave={handleSave}
        onClose={closeUserModal}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete User"
        message={`Are you sure you want to delete ${deleteTarget ? fullName(deleteTarget) : ''}? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        danger
        loading={deletePending}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {deleteError ? (
        <div className="mt-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">
          {deleteError}
        </div>
      ) : null}
    </div>
  );
}

export default function AdminPage() {
  return (
    <RequireAuth capability="USER_MANAGEMENT">
      <AdminPageContent />
    </RequireAuth>
  );
}