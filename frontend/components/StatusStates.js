export function Loading() {
  return (
    <div className="flex items-center gap-2 py-6 text-sm text-text-muted">
      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-border border-t-text-muted"></span>
      Loading…
    </div>
  );
}

export function ErrorBox({ message, onRetry }) {
  return (
    <div
      role="alert"
      className="flex items-center justify-between rounded-md border border-status-error/30 bg-status-error/10 px-3 py-2 text-sm text-status-error"
    >
      <span>{message}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="ml-3 rounded bg-status-error/20 px-2 py-1 text-xs font-medium text-status-error hover:bg-status-error/30"
        >
          Retry
        </button>
      )}
    </div>
  );
}

export function Empty({ message = "Nothing here yet." }) {
  return <div className="py-6 text-sm text-text-muted">{message}</div>;
}
