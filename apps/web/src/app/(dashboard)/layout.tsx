'use client';

import { RequireAuth } from '@/src/components/auth/RequireAuth';
import { Sidebar } from '@/src/components/layout/Sidebar';
import { Topbar } from '@/src/components/layout/Topbar';
import { QueryProvider } from '@/src/components/providers/QueryProvider';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <RequireAuth>
        <div className="flex min-h-screen bg-slate-50">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <Topbar />
            <main className="mx-auto w-full max-w-7xl flex-1 p-6">{children}</main>
          </div>
        </div>
      </RequireAuth>
    </QueryProvider>
  );
}