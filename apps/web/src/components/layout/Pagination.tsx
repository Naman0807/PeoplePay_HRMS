'use client';

interface PaginationProps {
  page: number;
  totalPages: number;
  total?: number;
  /** Plural noun for the total count, e.g. "employees". */
  label: string;
  onChange: (page: number) => void;
}

export function Pagination({ page, totalPages, total, label, onChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="mt-4 flex items-center justify-between">
      <p className="text-sm text-slate-500">
        Page {page} of {totalPages}
        {total === undefined ? '' : ` · ${total} ${label}`}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
        >
          Previous
        </button>
        <button
          type="button"
          onClick={() => onChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}
