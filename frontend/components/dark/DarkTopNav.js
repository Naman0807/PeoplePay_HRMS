"use client";

import { ChevronDown } from "lucide-react";

const NAV_LINKS = [
  { label: "Employees", dropdown: true },
  { label: "Contracts", dropdown: true, active: true },
  { label: "Attendance", dropdown: false },
  { label: "Time Off", dropdown: true },
  { label: "Payroll", dropdown: false },
];

export default function DarkTopNav() {
  return (
    <nav className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3">
      <div className="flex items-center gap-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-700 text-xs font-bold text-white">
          HR
        </div>
        <div className="hidden items-center gap-5 sm:flex">
          {NAV_LINKS.map((link) => (
            <button
              key={link.label}
              type="button"
              className={`flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium transition-colors ${
                link.active
                  ? "bg-slate-800 text-white"
                  : "text-slate-400 hover:text-slate-100"
              }`}
            >
              {link.label}
              {link.dropdown && <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          ))}
        </div>
      </div>
      <div className="h-8 w-8 rounded-lg bg-[#ff8a7a]" />
    </nav>
  );
}
