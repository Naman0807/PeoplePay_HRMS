'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-md rounded-lg border border-red-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
          <span className="text-xl text-red-600">!</span>
        </div>
        <h2 className="mb-2 text-lg font-semibold text-slate-900">Something went wrong</h2>
        <p className="mb-6 text-sm text-slate-500">
          {error.message || 'An unexpected error occurred.'} Please try again.
        </p>
        <button
          onClick={() => reset()}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
