'use client';

import { useState } from 'react';
import type { ComputationType, CreateSalaryRuleDTO, SalaryRuleCategory } from '@peoplepay360/shared';
import {
  useCreateSalaryRule,
  useCreateSalaryStructure,
  useUpdateSalaryStructure,
  useDeleteSalaryStructure,
  useDeleteSalaryRule,
  useEmployees,
  useSalaryRules,
  useSalaryStructures,
  useUpdateSalaryRule,
  listOf,
} from '@/src/lib/api/queries';
import type { SalaryRule, SalaryStructure } from '@/src/lib/api/queries';
import type { Column } from '@/src/components/layout/DataTable';
import { Pagination } from '@/src/components/layout/Pagination';
import { useAuthStore } from '@/src/store/authStore';
import { can } from '@peoplepay360/shared';
import { RequireAuth } from '@/src/components/auth/RequireAuth';
import { DataTable } from '@/src/components/layout/DataTable';
import { EmptyState } from '@/src/components/layout/EmptyState';
import { LoadingSpinner } from '@/src/components/layout/LoadingSpinner';
import { Modal } from '@/src/components/layout/Modal';
import { ConfirmDialog } from '@/src/components/layout/ConfirmDialog';
import { PageHeader } from '@/src/components/layout/PageHeader';
import { StatCard } from '@/src/components/layout/StatCard';
import { StatusBadge } from '@/src/components/layout/StatusBadge';

function PlusIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
      />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
      />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19 7l-1 14H6L5 7m5-4h4a1 1 0 011 1v1H8V4a1 1 0 011-1zM3 7h18"
      />
    </svg>
  );
}

const inputClass =
  'w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900';
const labelClass = 'mb-1 block text-sm font-medium text-slate-700';

const CATEGORIES: SalaryRuleCategory[] = ['BASIC', 'ALLOWANCE', 'GROSS', 'DEDUCTION', 'NET'];
const COMPUTATION_TYPES: ComputationType[] = ['FIXED', 'PERCENTAGE', 'FORMULA'];

function formatMoney(value: number | null | undefined) {
  if (value === null || value === undefined) return '—';
  return `$${Number(value).toLocaleString()}`;
}

function ruleValue(rule: SalaryRule) {
  if (rule.computation_type === 'FIXED') return formatMoney(rule.amount_fixed);
  if (rule.computation_type === 'PERCENTAGE')
    return `${Number(rule.percentage_rate ?? 0).toLocaleString()}%`;
  return rule.formula_string ?? '—';
}

interface RuleFormState {
  name: string;
  code: string;
  category: SalaryRuleCategory | '';
  computationType: ComputationType | '';
  value: string;
  sequence: string;
}

const EMPTY_RULE_FORM: RuleFormState = {
  name: '',
  code: '',
  category: '',
  computationType: '',
  value: '',
  sequence: '',
};

function formStateFromRule(rule: SalaryRule): RuleFormState {
  let value = '';
  if (rule.computation_type === 'FIXED') value = rule.amount_fixed != null ? String(rule.amount_fixed) : '';
  else if (rule.computation_type === 'PERCENTAGE')
    value = rule.percentage_rate != null ? String(rule.percentage_rate) : '';
  else value = rule.formula_string ?? '';

  return {
    name: rule.name,
    code: rule.code,
    category: rule.category as SalaryRuleCategory,
    computationType: rule.computation_type as ComputationType,
    value,
    sequence: String(rule.sequence),
  };
}

function SalaryPageContent() {
  const [newStructureOpen, setNewStructureOpen] = useState(false);
  const [structureName, setStructureName] = useState('');
  const [structureCode, setStructureCode] = useState('');

  const [selectedStructure, setSelectedStructure] = useState<SalaryStructure | null>(null);
  const [ruleFormOpen, setRuleFormOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<SalaryRule | null>(null);
  const [ruleForm, setRuleForm] = useState<RuleFormState>(EMPTY_RULE_FORM);
  const [deleteRuleId, setDeleteRuleId] = useState<string | null>(null);

  const authUser = useAuthStore((s) => s.user);
  const canManage = !!authUser && can(authUser.role, 'MANAGE_SALARY_RULES');

  const [structuresPage, setStructuresPage] = useState(1);
  const structuresQuery = useSalaryStructures({ page: structuresPage, pageSize: 20 });
  const rulesQuery = useSalaryRules(selectedStructure?.id);
  const employeesQuery = useEmployees();

  const createStructure = useCreateSalaryStructure();
  const updateStructure = useUpdateSalaryStructure();
  const deleteStructure = useDeleteSalaryStructure();
  const [editingStructureId, setEditingStructureId] = useState<string | null>(null);
  const [deletingStructure, setDeletingStructure] = useState<SalaryStructure | null>(null);
  const createRule = useCreateSalaryRule(selectedStructure?.id ?? '');
  const updateRule = useUpdateSalaryRule(selectedStructure?.id ?? '');
  const deleteRule = useDeleteSalaryRule(selectedStructure?.id ?? '');

  const structures = listOf(structuresQuery.data);
  const rules = rulesQuery.data ?? [];
  const employeeCount = Array.isArray(employeesQuery.data) ? employeesQuery.data.length : (employeesQuery.data?.meta.total ?? employeesQuery.data?.items.length ?? 0);

  const totalRules = structures.reduce((sum, s) => sum + (s._count?.rules ?? 0), 0);
  const activeStructures = structures.filter((s) => s.is_active).length;

  const loading = structuresQuery.isLoading || employeesQuery.isLoading;
  const hasError = structuresQuery.isError || employeesQuery.isError || rulesQuery.isError;

  function openEditStructure(structure: SalaryStructure) {
    setEditingStructureId(structure.id);
    setStructureName(structure.name);
    setStructureCode(structure.code);
    setNewStructureOpen(true);
  }

  function closeStructureModal() {
    setNewStructureOpen(false);
    setEditingStructureId(null);
    setStructureName('');
    setStructureCode('');
  }

  function handleCreateStructure() {
    if (!structureName.trim() || !structureCode.trim()) return;
    const data = { name: structureName.trim(), code: structureCode.trim() };
    const done = { onSuccess: closeStructureModal };

    if (editingStructureId) {
      updateStructure.mutate({ id: editingStructureId, data }, done);
    } else {
      createStructure.mutate(data, done);
    }
  }

  function openNewRule() {
    setEditingRule(null);
    setRuleForm(EMPTY_RULE_FORM);
    setRuleFormOpen(true);
  }

  function openEditRule(rule: SalaryRule) {
    setEditingRule(rule);
    setRuleForm(formStateFromRule(rule));
    setRuleFormOpen(true);
  }

  function handleSubmitRule() {
    if (
      !selectedStructure ||
      !ruleForm.name.trim() ||
      !ruleForm.code.trim() ||
      !ruleForm.category ||
      !ruleForm.computationType ||
      ruleForm.sequence === '' ||
      ruleForm.value.trim() === ''
    ) {
      return;
    }

    const data: CreateSalaryRuleDTO = {
      name: ruleForm.name.trim(),
      code: ruleForm.code.trim(),
      category: ruleForm.category,
      sequence: Number(ruleForm.sequence),
      computation_type: ruleForm.computationType,
    };
    if (ruleForm.computationType === 'FIXED') data.amount_fixed = Number(ruleForm.value);
    else if (ruleForm.computationType === 'PERCENTAGE') data.percentage_rate = Number(ruleForm.value);
    else data.formula_string = ruleForm.value.trim();

    const onSuccess = () => {
      setRuleFormOpen(false);
      setEditingRule(null);
      setRuleForm(EMPTY_RULE_FORM);
    };

    if (editingRule) {
      updateRule.mutate({ id: editingRule.id, data }, { onSuccess });
    } else {
      createRule.mutate(data, { onSuccess });
    }
  }

  function handleDeleteRule() {
    if (!deleteRuleId) return;
    deleteRule.mutate(deleteRuleId, {
      onSuccess: () => setDeleteRuleId(null),
    });
  }

  function valueLabel() {
    if (ruleForm.computationType === 'FIXED') return 'Fixed amount ($)';
    if (ruleForm.computationType === 'PERCENTAGE') return 'Rate (%)';
    if (ruleForm.computationType === 'FORMULA') return 'Formula string';
    return 'Value';
  }

  const structureColumns: Column<SalaryStructure>[] = [
    { key: 'name', header: 'Name', render: (row) => row.name },
    { key: 'code', header: 'Code', render: (row) => row.code },
    {
      key: 'rules',
      header: 'Rules',
      render: (row) => (row._count?.rules ?? 0), 
    },
    {
      key: 'active',
      header: 'Status',
      render: (row) => <StatusBadge status={row.is_active ? 'ACTIVE' : 'INACTIVE'} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <button
          type="button"
          onClick={() => setSelectedStructure(row)}
          className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
            selectedStructure?.id === row.id
              ? 'bg-slate-900 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <EyeIcon />
          View rules
        </button>
      ),
    },
    ...(canManage
      ? [
          {
            key: 'manage',
            header: '',
            render: (row: SalaryStructure) => (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => openEditStructure(row)}
                  className="text-xs font-medium text-slate-600 hover:text-slate-900"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => setDeletingStructure(row)}
                  className="text-xs font-medium text-rose-600 hover:text-rose-700"
                >
                  Delete
                </button>
              </div>
            ),
          },
        ]
      : []),
  ];

  const ruleColumns: Column<SalaryRule>[] = [
    { key: 'name', header: 'Name', render: (row) => row.name },
    { key: 'code', header: 'Code', render: (row) => row.code },
    {
      key: 'category',
      header: 'Category',
      render: (row) => <StatusBadge status={row.category} />,
    },
    {
      key: 'computation_type',
      header: 'Computation',
      render: (row) => row.computation_type,
    },
    { key: 'value', header: 'Value', render: (row) => ruleValue(row) },
    { key: 'sequence', header: 'Sort order', render: (row) => row.sequence },
    ...(canManage
      ? [
          {
            key: 'actions',
            header: 'Actions',
            render: (row: SalaryRule) => (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openEditRule(row)}
                  className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-200"
                >
                  <PencilIcon />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteRuleId(row.id)}
                  className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-100"
                >
                  <TrashIcon />
                  Delete
                </button>
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <div>
      <PageHeader
        title="Salary"
        description="Manage salary structures and their computation rules."
        actions={
          canManage ? (
            <button
              type="button"
              onClick={() => setNewStructureOpen(true)}
              className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800"
            >
              <PlusIcon />
              New Structure
            </button>
          ) : null
        }
      />

      {hasError && (
        <div className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">
          Something went wrong while loading salary data. Please try again.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Structures" value={structures.length} icon={<GridIcon />} />
        <StatCard label="Active structures" value={activeStructures} icon={<GridIcon />} />
        <StatCard label="Total rules" value={totalRules} icon={<GridIcon />} />
        <StatCard label="Employees" value={employeeCount} icon={<GridIcon />} />
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Structures</h2>
        {loading ? (
          <div className="flex min-h-40 items-center justify-center rounded-xl border border-slate-200 bg-white">
            <LoadingSpinner label="Loading structures..." />
          </div>
        ) : structures.length === 0 ? (
          <EmptyState icon={<GridIcon />} message="No salary structures yet. Create one to get started." />
        ) : (
          <>
            <DataTable columns={structureColumns} data={structures} keyExtractor={(row) => row.id} />
            <Pagination
              page={structuresPage}
              totalPages={structuresQuery.data?.meta?.totalPages ?? 1}
              total={structuresQuery.data?.meta?.total}
              label="structures"
              onChange={setStructuresPage}
            />
          </>
        )}
      </section>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            {selectedStructure
              ? `Rules — ${selectedStructure.name}`
              : 'Rules'}
          </h2>
          {selectedStructure && canManage ? (
            <button
              type="button"
              onClick={openNewRule}
              className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-slate-800"
            >
              <PlusIcon />
              New Rule
            </button>
          ) : null}
        </div>

        {!selectedStructure ? (
          <EmptyState icon={<GridIcon />} message="Select a structure to view its rules." />
        ) : rulesQuery.isLoading ? (
          <div className="flex min-h-40 items-center justify-center rounded-xl border border-slate-200 bg-white">
            <LoadingSpinner label="Loading rules..." />
          </div>
        ) : rules.length === 0 ? (
          <EmptyState icon={<GridIcon />} message="No rules in this structure yet." />
        ) : (
          <DataTable columns={ruleColumns} data={rules} keyExtractor={(row) => row.id} />
        )}
      </section>

      <Modal
        open={newStructureOpen}
        onClose={closeStructureModal}
        title={editingStructureId ? 'Edit Salary Structure' : 'New Salary Structure'}
        footer={
          <>
            <button
              type="button"
              onClick={closeStructureModal}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreateStructure}
              disabled={
                !structureName.trim() ||
                !structureCode.trim() ||
                createStructure.isPending ||
                updateStructure.isPending
              }
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
            >
              {createStructure.isPending || updateStructure.isPending
                ? 'Saving...'
                : editingStructureId
                  ? 'Save Changes'
                  : 'Create Structure'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className={labelClass} htmlFor="structure-name">
              Name
            </label>
            <input
              id="structure-name"
              type="text"
              value={structureName}
              onChange={(e) => setStructureName(e.target.value)}
              placeholder="e.g. Standard Monthly"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="structure-code">
              Code
            </label>
            <input
              id="structure-code"
              type="text"
              value={structureCode}
              onChange={(e) => setStructureCode(e.target.value)}
              placeholder="e.g. STD-MONTHLY"
              className={inputClass}
            />
          </div>
          {createStructure.isError && (
            <p className="text-sm text-rose-600">Failed to create salary structure.</p>
          )}
        </div>
      </Modal>

      <Modal
        open={ruleFormOpen}
        onClose={() => setRuleFormOpen(false)}
        title={editingRule ? 'Edit Rule' : 'New Rule'}
        footer={
          <>
            <button
              type="button"
              onClick={() => setRuleFormOpen(false)}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmitRule}
              disabled={
                !ruleForm.name.trim() ||
                !ruleForm.code.trim() ||
                !ruleForm.category ||
                !ruleForm.computationType ||
                ruleForm.sequence === '' ||
                ruleForm.value.trim() === '' ||
                createRule.isPending ||
                updateRule.isPending
              }
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
            >
              {createRule.isPending || updateRule.isPending ? 'Saving...' : 'Save Rule'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="rule-name">
                Name
              </label>
              <input
                id="rule-name"
                type="text"
                value={ruleForm.name}
                onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })}
                placeholder="e.g. Basic Salary"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="rule-code">
                Code
              </label>
              <input
                id="rule-code"
                type="text"
                value={ruleForm.code}
                onChange={(e) => setRuleForm({ ...ruleForm, code: e.target.value })}
                placeholder="e.g. BASIC"
                className={inputClass}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="rule-category">
                Category
              </label>
              <select
                id="rule-category"
                value={ruleForm.category}
                onChange={(e) =>
                  setRuleForm({ ...ruleForm, category: e.target.value as SalaryRuleCategory })
                }
                className={inputClass}
              >
                <option value="">Select category</option>
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="rule-computation">
                Computation type
              </label>
              <select
                id="rule-computation"
                value={ruleForm.computationType}
                onChange={(e) =>
                  setRuleForm({
                    ...ruleForm,
                    computationType: e.target.value as ComputationType,
                    value: '',
                  })
                }
                className={inputClass}
              >
                <option value="">Select type</option>
                {COMPUTATION_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="rule-value">
                {valueLabel()}
              </label>
              <input
                id="rule-value"
                type={ruleForm.computationType === 'FORMULA' ? 'text' : 'number'}
                value={ruleForm.value}
                onChange={(e) => setRuleForm({ ...ruleForm, value: e.target.value })}
                placeholder={
                  ruleForm.computationType === 'FORMULA'
                    ? 'e.g. BASIC + ALLOWANCE'
                    : ruleForm.computationType === 'PERCENTAGE'
                      ? 'e.g. 20'
                      : 'e.g. 2500'
                }
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="rule-sequence">
                Sort order
              </label>
              <input
                id="rule-sequence"
                type="number"
                min={1}
                value={ruleForm.sequence}
                onChange={(e) => setRuleForm({ ...ruleForm, sequence: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>
          {(createRule.isError || updateRule.isError) && (
            <p className="text-sm text-rose-600">Failed to save salary rule.</p>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteRuleId !== null}
        title="Delete rule?"
        message="Are you sure you want to delete this rule? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        danger
        loading={deleteRule.isPending}
        onConfirm={handleDeleteRule}
        onCancel={() => setDeleteRuleId(null)}
      />

      <ConfirmDialog
        open={!!deletingStructure}
        title="Delete salary structure?"
        message={`Delete "${deletingStructure?.name ?? ''}" and its rules? This cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        danger
        loading={deleteStructure.isPending}
        onConfirm={() => {
          if (!deletingStructure) return;
          deleteStructure.mutate(deletingStructure.id, {
            onSuccess: () => {
              if (selectedStructure?.id === deletingStructure.id) setSelectedStructure(null);
              setDeletingStructure(null);
            },
          });
        }}
        onCancel={() => setDeletingStructure(null)}
      />
    </div>
  );
}

export default function SalaryPage() {
  return (
    <RequireAuth capability="VIEW_SALARY_STRUCTURES">
      <SalaryPageContent />
    </RequireAuth>
  );
}