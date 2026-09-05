export function Loading() {
  return (
    <div className="flex items-center gap-2 py-6 text-sm text-gray-400">
      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600"></span>
      Loading…
    </div>
  );
}

export function ErrorBox({ message, onRetry }) {
  return (
    <div
      role="alert"
      className="flex items-center justify-between rounded-md bg-red-50 px-3 py-2 text-sm text-red-700"
    >
      <span>{message}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="ml-3 rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-800 hover:bg-red-200"
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
