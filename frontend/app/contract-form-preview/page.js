"use client";

import DarkTopNav from "@/components/dark/DarkTopNav";

const LEFT_FIELDS = [
  { label: "Employee", value: "Aarav Mehta" },
  { label: "Start Date", value: "01-Jan-2026" },
  { label: "End Date", value: "—" },
  { label: "Status", value: "Running" },
];

const RIGHT_FIELDS = [
  { label: "Department", value: "Finance" },
  { label: "Job Position", value: "Payroll Specialist" },
  { label: "Wage / Month", value: "₹85,000" },
  { label: "Working Schedule", value: "40 Hours / Week" },
];

export default function ContractFormPreviewPage() {
  return (
    <div className="min-h-screen bg-slate-950 px-4 py-6 font-sans text-slate-100 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <DarkTopNav />

        <header className="mt-8">
          <h1 className="text-3xl font-bold text-white">Contract / CON/2026/0042</h1>
          <p className="mt-1 text-sm text-slate-400">Form view of one contract</p>
        </header>

        <div className="mt-6 grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
          <div className="flex flex-col gap-4">
            {LEFT_FIELDS.map((field) => (
              <FormField key={field.label} {...field} />
            ))}
          </div>
          <div className="flex flex-col gap-4">
            {RIGHT_FIELDS.map((field) => (
              <FormField key={field.label} {...field} />
            ))}
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="text-sm text-slate-400">Salary Structure / Notes</div>
          <p className="mt-2 text-sm leading-relaxed text-slate-100">
            Structure Type: Employee Salary
            <br />
            This running contract is the source for payroll calculation in the active period.
          </p>
        </div>

        <p className="mt-6 text-sm text-slate-500">
          Useful note: for the problem statement, one employee should not have multiple Running
          contracts for the same period.
        </p>
      </div>
    </div>
  );
}

function FormField({ label, value }) {
  return (
    <div className="flex items-center gap-4">
      <div className="w-36 shrink-0 text-sm text-slate-400">{label}</div>
      <div className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100">
        {value}
      </div>
    </div>
  );
}
