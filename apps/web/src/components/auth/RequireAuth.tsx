'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/src/store/authStore';
import { can, type Capability } from '@peoplepay360/shared';
import { LoadingSpinner } from '@/src/components/layout/LoadingSpinner';

interface RequireAuthProps {
  children: React.ReactNode;
  capability?: Capability;
}

export function RequireAuth({ children, capability }: RequireAuthProps) {
  const router = useRouter();
  const { isAuthenticated, hasHydrated, user } = useAuthStore();

  useEffect(() => {
    if (!hasHydrated) return;

    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }

    if (capability && user && !can(user.role, capability)) {
      router.replace('/dashboard');
    }
  }, [hasHydrated, isAuthenticated, capability, user, router]);

  if (!hasHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <LoadingSpinner label="Loading..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (capability && user && !can(user.role, capability)) {
    return null;
  }

  return <>{children}</>;
}