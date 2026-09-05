'use client';

import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/src/store/authStore';

export function Topbar() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  function handleLogout() {
    logout();
    router.push('/login');
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-6">
      <div className="text-sm text-slate-500">
        {user ? `Welcome back, ${user.email}` : ''}
      </div>
      <div className="flex items-center gap-3">
        {user ? (
          <span className="inline-flex items-center gap-2">
            <span className="text-sm text-slate-600">{user.email}</span>
            <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-slate-700">
              {user.role}
            </span>
          </span>
        ) : null}
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-md border border-slate-300 px-3 py-1 text-sm text-slate-600 transition-colors hover:bg-slate-50"
        >
          Logout
        </button>
      </div>
    </header>
  );
}