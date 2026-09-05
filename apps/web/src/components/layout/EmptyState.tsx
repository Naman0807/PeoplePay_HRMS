interface EmptyStateProps {
  icon?: React.ReactNode;
  message: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, message, action }: EmptyStateProps) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
      {icon ? <div className="text-slate-400">{icon}</div> : null}
      <p className="text-sm text-slate-500">{message}</p>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}