'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/src/store/authStore';
import type { UserRole } from '@peoplepay360/shared';

interface RequireRoleProps {
  children: React.ReactNode;
  roles: UserRole[];
}

export function RequireRole({ children, roles }: RequireRoleProps) {
  const router = useRouter();
  const { hasHydrated, user } = useAuthStore();

  const rolesKey = roles.join(',');

  useEffect(() => {
    if (!hasHydrated || !user) return;
    if (!roles.includes(user.role)) {
      router.replace('/dashboard');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHydrated, user, rolesKey, router]);

  if (!hasHydrated || !user) return null;

  if (!roles.includes(user.role)) return null;

  return <>{children}</>;
}