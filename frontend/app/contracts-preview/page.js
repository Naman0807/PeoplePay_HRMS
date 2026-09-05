"use client";

import { Plus, Search } from "lucide-react";
import DarkTopNav from "@/components/dark/DarkTopNav";

const CONTRACTS = [
  {
    reference: "CON/2026/004",
    employee: "Aarav Mehta",
    start: "01-Jan-26",
    end: "—",
    wage: "₹85,000",
    status: "Running",
  },
  {
    reference: "CON/2025/001",
    employee: "Aarav Mehta",
    start: "01-Jul-25",
    end: "31-Dec-25",
    wage: "₹78,000",
    status: "Expired",
  },
  {
    reference: "CON/2026/003",
    employee: "Sara Khan",
    start: "01-Jan-26",
    end: "—",
    wage: "₹95,000",
    status: "Running",
  },
];

const STATUS_STYLES = {
  Running: "text-emerald-400",
  Expired: "text-orange-400",
};

export default function ContractsPreviewPage() {
  return (
    <div className="min-h-screen bg-slate-950 px-4 py-6 font-sans text-slate-100 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <DarkTopNav />

        <header className="mt-8">
          <h1 className="text-3xl font-bold text-white">Contracts</h1>
          <p className="mt-1 text-sm text-slate-400">List view of employee contracts</p>
        </header>

        <ActionBar />

        <ContractsTable />

        <p className="mt-6 text-sm text-slate-500">
          Useful note: retain contract history, but make the active Running contract obvious
          because payroll depends on it.
        </p>
      </div>
    </div>
  );
}

function ActionBar() {
  return (
    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
      <button
        type="button"
        className="flex items-center gap-1.5 rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-400"
      >
        <Plus className="h-4 w-4" />
        New
      </button>
      <div className="relative w-full sm:max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          placeholder="Search contracts..."
          className="w-full rounded-lg border border-slate-700 bg-slate-900 py-2 pl-9 pr-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-slate-500 focus:outline-none"
        />
      </div>
    </div>
  );
}

function ContractsTable() {
  return (
    <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-800">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-500">
            <th className="px-4 py-3 font-medium">Contract</th>
            <th className="px-4 py-3 font-medium">Employee</th>
            <th className="px-4 py-3 font-medium">Start</th>
            <th className="px-4 py-3 font-medium">End</th>
            <th className="px-4 py-3 font-medium">Wage / Month</th>
            <th className="px-4 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {CONTRACTS.map((c, i) => (
            <tr
              key={c.reference}
              className={i !== CONTRACTS.length - 1 ? "border-b border-slate-800" : ""}
            >
              <td className="px-4 py-3 font-medium text-slate-100">{c.reference}</td>
              <td className="px-4 py-3 text-slate-300">{c.employee}</td>
              <td className="px-4 py-3 text-slate-300">{c.start}</td>
              <td className="px-4 py-3 text-slate-300">{c.end}</td>
              <td className="px-4 py-3 text-slate-300">{c.wage}</td>
              <td className={`px-4 py-3 font-medium ${STATUS_STYLES[c.status]}`}>{c.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
