'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/src/store/authStore';
import { useUIStore } from '@/src/store/uiStore';
import { can, type Capability } from '@peoplepay360/shared';

interface NavItem {
  href: string;
  label: string;
  capability: Capability;
  icon: (active: boolean) => React.ReactNode;
}

function Icon({ active, path }: { active: boolean; path: string }) {
  return (
    <svg
      className={`h-5 w-5 ${active ? 'text-slate-900' : 'text-slate-400'}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
  );
}

const NAV_ITEMS: NavItem[] = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    capability: 'VIEW_OWN_EMPLOYEE',
    icon: (active) => (
      <Icon
        active={active}
        path="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
      />
    ),
  },
  {
    href: '/employees',
    label: 'Employees',
    capability: 'VIEW_ALL_EMPLOYEES',
    icon: (active) => (
      <Icon
        active={active}
        path="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
      />
    ),
  },
  {
    href: '/team',
    label: 'Team',
    capability: 'VIEW_TEAM_DIRECTORY',
    icon: (active) => (
      <Icon
        active={active}
        path="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
      />
    ),
  },
  {
    href: '/contracts',
    label: 'Contracts',
    capability: 'MANAGE_CONTRACTS_SCHEDULES',
    icon: (active) => (
      <Icon
        active={active}
        path="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    ),
  },
  {
    href: '/schedules',
    label: 'Schedules',
    capability: 'MANAGE_CONTRACTS_SCHEDULES',
    icon: (active) => (
      <Icon
        active={active}
        path="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    ),
  },
  {
    href: '/attendance',
    label: 'Attendance',
    capability: 'VIEW_OWN_ATTENDANCE',
    icon: (active) => (
      <Icon
        active={active}
        path="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    ),
  },
  {
    href: '/time-off',
    label: 'Time Off',
    capability: 'CREATE_TIME_OFF_REQUEST',
    icon: (active) => (
      <Icon
        active={active}
        path="M8 7V3m8 4V3M3 11h18M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    ),
  },
  {
    href: '/salary',
    label: 'Salary',
    capability: 'VIEW_SALARY_STRUCTURES',
    icon: (active) => (
      <Icon
        active={active}
        path="M3 10h18M7 15h2m4 0h4m-14 5h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    ),
  },
  {
    href: '/payroll',
    label: 'Payroll',
    capability: 'VIEW_PAYRUNS',
    icon: (active) => (
      <Icon
        active={active}
        path="M9 7h6m-3 -3v6m6 -3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    ),
  },
  {
    href: '/payslips',
    label: 'Payslips',
    capability: 'VIEW_OWN_PAYSLIPS',
    icon: (active) => (
      <Icon
        active={active}
        path="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 13h6"
      />
    ),
  },
  {
    href: '/admin',
    label: 'Admin',
    capability: 'USER_MANAGEMENT',
    icon: (active) => (
      <Icon
        active={active}
        path="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
      />
    ),
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const { sidebarOpen, setSidebarOpen, activeNav, setActiveNav } = useUIStore();

  const visibleItems = NAV_ITEMS.filter((item) => user && can(user.role, item.capability));

  if (!sidebarOpen) {
    return (
      <aside className="sticky top-0 self-start flex h-screen w-16 shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="flex h-14 items-center justify-center border-b border-slate-200">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="rounded-md p-2 text-slate-500 transition-colors hover:bg-slate-100"
            aria-label="Expand sidebar"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
        <nav className="flex flex-1 flex-col items-center gap-1 p-2">
          {visibleItems.map((item) => {
            const active = pathname.startsWith(item.href) || activeNav === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setActiveNav(item.href)}
                className="rounded-lg p-2.5 transition-colors hover:bg-slate-100"
                title={item.label}
                aria-label={item.label}
              >
                {item.icon(active)}
              </Link>
            );
          })}
        </nav>
      </aside>
    );
  }

  return (
    <aside className="sticky top-0 self-start flex h-screen w-60 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="flex h-14 items-center justify-between border-b border-slate-200 px-4">
        <Link href="/dashboard" className="text-lg font-bold text-slate-900">
          PeoplePay360
        </Link>
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100"
          aria-label="Collapse sidebar"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {visibleItems.map((item) => {
          const active = pathname.startsWith(item.href) || activeNav === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setActiveNav(item.href)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {item.icon(active)}
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-slate-200 p-3 text-xs text-slate-400">
        PeoplePay360 v1.0
      </div>
    </aside>
  );
}