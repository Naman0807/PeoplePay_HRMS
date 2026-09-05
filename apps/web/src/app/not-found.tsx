'use client';

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-md rounded-lg border bg-white p-8 text-center shadow-sm">
        <p className="mb-2 text-6xl font-bold text-slate-200">404</p>
        <h2 className="mb-2 text-lg font-semibold text-slate-900">Page Not Found</h2>
        <p className="mb-6 text-sm text-slate-500">
          The page you are looking for does not exist or has been moved.
        </p>
        <Link
          href="/dashboard"
          className="inline-block rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
