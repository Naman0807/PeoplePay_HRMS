"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getUser, logout } from "@/lib/auth";
import { permissions } from "@/lib/permissions";

const LINKS = [
  // Dashboard and Payroll return 403 for an EMPLOYEE, so they are not offered.
  { href: "/dashboard", label: "Dashboard", requires: "canViewDashboard" },
  { href: "/employees", label: "Employees" },
  { href: "/contracts", label: "Contracts" },
  { href: "/attendance", label: "Attendance" },
  { href: "/time-off", label: "Time Off" },
  { href: "/payruns", label: "Payroll", requires: "canViewPayroll" },
  { href: "/admin/pending-users", label: "Approvals", requires: "canApproveSignups" },
];

function initials(name) {
  return (name || "")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function Nav() {
  const router = useRouter();
  const pathname = usePathname();
  const user = getUser();
  const perms = permissions(user);
  const links = LINKS.filter((l) => !l.requires || perms[l.requires]);
  const [menuOpen, setMenuOpen] = useState(false);

  function isActive(href) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  const linkClass = (href) =>
    `rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
      isActive(href) ? "bg-primary/15 text-status-active" : "text-text-muted hover:bg-surface/60 hover:text-text-primary"
    }`;

  return (
    <nav
      aria-label="Main navigation"
      className="sticky top-0 z-30 flex items-center justify-between rounded-2xl border border-border bg-surface px-4 py-2.5 shadow-sm shadow-black/20"
    >
      <div className="flex items-center gap-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-xs font-bold text-white">
            PP
          </span>
          <span className="hidden text-sm font-semibold tracking-tight text-text-primary sm:inline">
            PeoplePay360
          </span>
        </Link>
        <div className="hidden h-6 w-px bg-border md:block" />
        <div className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} aria-current={isActive(l.href) ? "page" : undefined} className={linkClass(l.href)}>
              {l.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="hidden items-center gap-3 md:flex">
        {user && (
          <div className="flex items-center gap-2 rounded-md border border-border bg-background/40 py-1 pl-1 pr-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#ff8a7a] text-[10px] font-bold text-white">
              {initials(user.name)}
            </span>
            <span className="text-xs text-text-muted">
              <span className="font-medium text-text-primary">{user.name}</span> · {user.role}
            </span>
          </div>
        )}
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          Log out
        </button>
      </div>

      <div className="flex items-center gap-3 md:hidden">
        {user && (
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#ff8a7a] text-[10px] font-bold text-white">
            {initials(user.name)}
          </span>
        )}
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Toggle navigation menu"
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          className="rounded p-1 text-text-primary hover:bg-surface/50"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
            {menuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {menuOpen && (
        <div
          id="mobile-menu"
          className="absolute left-0 right-0 top-full rounded-b-2xl border border-t-0 border-border bg-surface px-4 py-3 shadow-md md:hidden"
        >
          <div className="flex flex-col gap-1">
            {user && (
              <div className="mb-1 px-2 text-xs text-text-muted">
                <span className="font-medium text-text-primary">{user.name}</span> · {user.role}
              </div>
            )}
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setMenuOpen(false)}
                aria-current={isActive(l.href) ? "page" : undefined}
                className={`rounded px-2 py-2 transition-colors ${
                  isActive(l.href)
                    ? "bg-background text-status-active"
                    : "text-text-muted hover:bg-background hover:text-text-primary"
                }`}
              >
                {l.label}
              </Link>
            ))}
            <button
              type="button"
              onClick={handleLogout}
              className="mt-2 rounded bg-primary px-2 py-2 text-left text-sm font-medium text-white transition-colors hover:bg-primary-hover"
            >
              Log out
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
