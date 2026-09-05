export function LoadingSpinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3" role="status" aria-live="polite">
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
      {label ? <span className="text-sm text-slate-500">{label}</span> : null}
    </div>
  );
}