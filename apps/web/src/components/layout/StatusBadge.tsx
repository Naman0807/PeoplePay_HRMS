export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    DRAFT: 'bg-slate-100 text-slate-700',
    PENDING: 'bg-amber-100 text-amber-800',
    ACTIVE: 'bg-emerald-100 text-emerald-800',
    INACTIVE: 'bg-slate-200 text-slate-600',
    COMPUTED: 'bg-blue-100 text-blue-800',
    VALIDATED: 'bg-indigo-100 text-indigo-800',
    PAID: 'bg-emerald-100 text-emerald-800',
    APPROVED: 'bg-emerald-100 text-emerald-800',
    REJECTED: 'bg-rose-100 text-rose-800',
    REFUSED: 'bg-rose-100 text-rose-800',
    SUBMITTED: 'bg-amber-100 text-amber-800',
    RUNNING: 'bg-blue-100 text-blue-800',
    EXPIRED: 'bg-slate-200 text-slate-600',
    CANCELLED: 'bg-rose-100 text-rose-800',
    NORMAL: 'bg-emerald-100 text-emerald-800',
    EXCEPTION: 'bg-rose-100 text-rose-800',
    MANUALLY_EDITED: 'bg-amber-100 text-amber-800',
    BASIC: 'bg-emerald-100 text-emerald-800',
    ALLOWANCE: 'bg-blue-100 text-blue-800',
    GROSS: 'bg-indigo-100 text-indigo-800',
    DEDUCTION: 'bg-rose-100 text-rose-800',
    NET: 'bg-slate-200 text-slate-600',
  };

  const base = styles[status] ?? 'bg-slate-100 text-slate-700';

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${base}`}
    >
      {status}
    </span>
  );
}