export function Loading() {
  return <div className="animate-pulse py-6 text-sm text-gray-400">Loading…</div>;
}

export function ErrorBox({ message, onRetry }) {
  return (
    <div className="flex items-center justify-between rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
      <span>{message}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="ml-3 rounded bg-red-100 px-2 py-1 text-xs font-medium hover:bg-red-200"
        >
          Retry
        </button>
      )}
    </div>
  );
}

export function Empty({ message = "Nothing here yet." }) {
  return <div className="py-6 text-sm text-gray-400">{message}</div>;
}
