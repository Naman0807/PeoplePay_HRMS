"use client";

import { useParams } from "next/navigation";
import { useFetch } from "@/lib/useFetch";
import { BackLink, PageHeader, Card, Badge, statusVariant, Loading, ErrorBox } from "@/components/ui";

const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  return `${String(d.getUTCDate()).padStart(2, "0")}-${MONTHS[d.getUTCMonth()]}-${d.getUTCFullYear()}`;
}

export default function ContractDetailPage() {
  const { id } = useParams();
  const { data: contract, loading: contractLoading, error: contractError } = useFetch(`/api/contracts/${id}`);
  // GET /api/contracts/:id doesn't include the employee relation, so department/job
  // title come from a second fetch. Working schedule isn't shown here for the same
  // reason a value would have to be invented: there's no GET /api/resource-calendars/:id
  // to resolve resource_calendar_id into hours/days — that's a real backend gap, not
  // something guessed at on the frontend.
  const employeeUrl = contract ? `/api/employees/${contract.employee_id}` : null;
  const { data: employee, loading: employeeLoading, error: employeeError } = useFetch(employeeUrl);

  const loading = contractLoading || (Boolean(contract) && employeeLoading);
  const error = contractError || employeeError;

  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} />;
  if (!contract) return null;

  return (
    <div>
      <BackLink href="/contracts">Contracts</BackLink>
      <div className="mt-3 mb-6">
        <PageHeader title={`Contract / ${contract.reference}`} />
        <p className="-mt-4 text-sm text-text-muted">Form view of one contract</p>
      </div>

      <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
        <div className="flex flex-col gap-4">
          <ReadOnlyField label="Employee" value={employee?.name ?? "—"} />
          <ReadOnlyField label="Start Date" value={formatDate(contract.start_date)} />
          <ReadOnlyField label="End Date" value={formatDate(contract.end_date)} />
          <ReadOnlyField label="Status" value={<Badge variant={statusVariant(contract.state)}>{contract.state}</Badge>} />
        </div>
        <div className="flex flex-col gap-4">
          <ReadOnlyField label="Department" value={employee?.department || "—"} />
          <ReadOnlyField label="Job Position" value={employee?.job_title || "—"} />
          <ReadOnlyField label="Wage / Month" value={currency.format(contract.wage)} />
          <ReadOnlyField
            label="Working Schedule"
            value={contract.resource_calendar_id ? `Calendar #${contract.resource_calendar_id}` : "—"}
          />
        </div>
      </div>

      <Card className="mt-6">
        <div className="text-sm text-text-muted">Salary Structure / Notes</div>
        <p className="mt-2 text-sm leading-relaxed text-text-primary">
          Structure Type: Employee Salary
          <br />
          This {contract.state === "RUNNING" ? "running" : contract.state.toLowerCase()} contract is the source
          for payroll calculation in the active period.
        </p>
      </Card>
    </div>
  );
}

function ReadOnlyField({ label, value }) {
  return (
    <div className="flex items-center gap-4">
      <div className="w-36 shrink-0 text-sm text-text-muted">{label}</div>
      <div className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary">
        {value}
      </div>
    </div>
  );
}
