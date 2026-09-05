"use client";

import { useState } from "react";
import api from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import { permissions } from "@/lib/permissions";
import {
  PageHeader,
  PrimaryButton,
  SecondaryButton,
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

const CATEGORIES = ["BASIC", "ALLOWANCE", "GROSS", "DEDUCTION", "NET"];
const AMOUNT_SELECTS = ["FIXED", "PERCENT", "FORMULA"];
const EMPTY_RULE = {
  code: "",
  name: "",
  sequence: "",
  category: "BASIC",
  amount_select: "FIXED",
  amount_fixed: "",
  amount_percent: "",
  percent_base_code: "",
  formula: "",
};

export default function SalaryStructuresPage() {
  const perms = permissions();
  const [structureId, setStructureId] = useState("");
  const [showStructure, setShowStructure] = useState(false);
  const [showRule, setShowRule] = useState(false);
  const [structureName, setStructureName] = useState("");
  const [rule, setRule] = useState(EMPTY_RULE);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  const { data: structures, loading, error: listError, refetch } = useFetch("/api/salary-structures");
  const {
    data: detail,
    loading: detailLoading,
    refetch: refetchDetail,
  } = useFetch(structureId ? `/api/salary-structures/${structureId}` : null);

  async function createStructure(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api.post("/api/salary-structures", { name: structureName });
      setStructureName("");
      setShowStructure(false);
      setStructureId(String(res.data.data.id));
      setToast("Structure created");
      refetch();
    } catch (err) {
      setError(err.response?.data?.message || "Could not create the structure.");
    } finally {
      setBusy(false);
    }
  }

  async function createRule(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      // Only send the fields the chosen computation method uses; the API rejects a
      // rule whose method and fields disagree.
      const body = {
        structure_id: Number(structureId),
        code: rule.code.toUpperCase(),
        name: rule.name,
        sequence: Number(rule.sequence),
        category: rule.category,
        amount_select: rule.amount_select,
      };
      if (rule.amount_select === "FIXED") body.amount_fixed = Number(rule.amount_fixed);
      if (rule.amount_select === "PERCENT") {
        body.amount_percent = Number(rule.amount_percent);
        body.percent_base_code = rule.percent_base_code.toUpperCase();
      }
      if (rule.amount_select === "FORMULA") body.formula = rule.formula;

      await api.post("/api/salary-rules", body);
      setRule(EMPTY_RULE);
      setShowRule(false);
      setToast("Rule added");
      refetchDetail();
      refetch();
    } catch (err) {
      const data = err.response?.data;
      setError(
        data?.details?.[0]?.issue || data?.message || "Could not add the rule."
      );
    } finally {
      setBusy(false);
    }
  }

  async function deleteRule(id) {
    setError(null);
    try {
      await api.delete(`/api/salary-rules/${id}`);
      setToast("Rule removed");
      refetchDetail();
      refetch();
    } catch (err) {
      const data = err.response?.data;
      setError(data?.details?.[0]?.issue || data?.message || "Could not remove the rule.");
    }
  }

  return (
    <div>
      <PageHeader
        title="Salary structures"
        actions={
          perms.canConfigurePayroll && (
            <PrimaryButton onClick={() => setShowStructure((v) => !v)}>
              {showStructure ? "Cancel" : "New structure"}
            </PrimaryButton>
          )
        }
      />

      {!perms.canConfigurePayroll && (
        <p className="mb-4 text-sm text-gray-600">
          Read-only. Editing salary structures and rules is limited to a payroll manager.
        </p>
      )}
      {error && <ErrorBox message={error} />}

      {showStructure && (
        <Card className="mb-6">
          <form onSubmit={createStructure} className="flex items-end gap-3">
            <div className="flex-1">
              <Field label="Structure name" value={structureName} onChange={setStructureName} required />
            </div>
            <PrimaryButton type="submit" disabled={busy}>
              {busy ? "Saving…" : "Create"}
            </PrimaryButton>
          </form>
        </Card>
      )}

      {loading && <Loading />}
      {listError && <ErrorBox message={listError} onRetry={refetch} />}
      {!loading && structures?.length === 0 && <EmptyState message="No salary structures yet." />}

      {structures?.length > 0 && (
        <Table headers={["Structure", "Rules", "Contracts", "Status", ""]}>
          {structures.map((s) => (
            <tr key={s.id} className="border-t border-gray-100">
              <td className="px-4 py-2 font-medium">{s.name}</td>
              <td className="px-4 py-2 text-gray-600">{s._count?.salary_rules ?? 0}</td>
              <td className="px-4 py-2 text-gray-600">{s._count?.contracts ?? 0}</td>
              <td className="px-4 py-2">
                <Badge variant={s.active ? "success" : "default"}>
                  {s.active ? "Active" : "Inactive"}
                </Badge>
              </td>
              <td className="px-4 py-2 text-right">
                <SecondaryButton
                  onClick={() => setStructureId(String(s.id) === structureId ? "" : String(s.id))}
                >
                  {String(s.id) === structureId ? "Hide rules" : "View rules"}
                </SecondaryButton>
              </td>
            </tr>
          ))}
        </Table>
      )}

      {structureId && (
        <Card className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">
              Rules — {detail?.name} <span className="font-normal text-gray-500">in sequence order</span>
            </h2>
            {perms.canConfigurePayroll && (
              <SecondaryButton onClick={() => setShowRule((v) => !v)}>
                {showRule ? "Cancel" : "Add rule"}
              </SecondaryButton>
            )}
          </div>

          {showRule && (
            <form onSubmit={createRule} className="mb-4 space-y-3 rounded-lg border border-gray-200 p-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Field label="Code" value={rule.code} onChange={(v) => setRule({ ...rule, code: v })} required hint="e.g. HRA" />
                <Field label="Name" value={rule.name} onChange={(v) => setRule({ ...rule, name: v })} required />
                <Field label="Sequence" type="number" value={rule.sequence} onChange={(v) => setRule({ ...rule, sequence: v })} required hint="Lower runs first" />
                <Select label="Category" value={rule.category} onChange={(v) => setRule({ ...rule, category: v })} options={CATEGORIES.map((c) => ({ value: c, label: c }))} />
                <Select label="Computation" value={rule.amount_select} onChange={(v) => setRule({ ...rule, amount_select: v })} options={AMOUNT_SELECTS.map((a) => ({ value: a, label: a }))} />
              </div>

              {rule.amount_select === "FIXED" && (
                <Field label="Fixed amount" type="number" value={rule.amount_fixed} onChange={(v) => setRule({ ...rule, amount_fixed: v })} required />
              )}
              {rule.amount_select === "PERCENT" && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Percentage" type="number" value={rule.amount_percent} onChange={(v) => setRule({ ...rule, amount_percent: v })} required />
                  <Field label="Of which code" value={rule.percent_base_code} onChange={(v) => setRule({ ...rule, percent_base_code: v })} required hint="A code computed earlier, or WAGE" />
                </div>
              )}
              {rule.amount_select === "FORMULA" && (
                <Field
                  label="Formula"
                  value={rule.formula}
                  onChange={(v) => setRule({ ...rule, formula: v })}
                  required
                  hint="Codes computed earlier, plus WAGE, WORKED_DAYS, PERIOD_DAYS. e.g. GROSS - PT - PF"
                />
              )}

              <PrimaryButton type="submit" disabled={busy}>
                {busy ? "Saving…" : "Add rule"}
              </PrimaryButton>
            </form>
          )}

          {detailLoading && <Loading />}
          {detail?.salary_rules?.length === 0 && <EmptyState message="This structure has no rules yet." />}
          {detail?.salary_rules?.length > 0 && (
            <Table headers={["Seq", "Code", "Name", "Category", "Computation", ""]}>
              {detail.salary_rules.map((r) => (
                <tr key={r.id} className="border-t border-gray-100">
                  <td className="px-4 py-2 text-gray-600">{r.sequence}</td>
                  <td className="px-4 py-2 font-mono text-xs">{r.code}</td>
                  <td className="px-4 py-2">{r.name}</td>
                  <td className="px-4 py-2"><Badge>{r.category || "—"}</Badge></td>
                  <td className="px-4 py-2 text-gray-600">
                    {r.amount_select === "FIXED" && `Fixed ${r.amount_fixed}`}
                    {r.amount_select === "PERCENT" && `${r.amount_percent}% of ${r.percent_base_code}`}
                    {r.amount_select === "FORMULA" && <span className="font-mono text-xs">{r.formula}</span>}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {perms.canConfigurePayroll && (
                      <SecondaryButton onClick={() => deleteRule(r.id)}>Remove</SecondaryButton>
                    )}
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
      )}

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
