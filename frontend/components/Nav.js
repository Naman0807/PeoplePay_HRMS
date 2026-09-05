"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getUser, logout } from "@/lib/auth";
import { permissions } from "@/lib/permissions";

const LINKS = [
  { href: "/employees", label: "Employees" },
  { href: "/contracts", label: "Contracts" },
  { href: "/attendance", label: "Attendance" },
  { href: "/time-off", label: "Time Off" },
  // Payroll and Dashboard return 403 for an EMPLOYEE, so they are not offered.
  { href: "/payruns", label: "Payroll", requires: "canViewPayroll" },
  { href: "/dashboard", label: "Dashboard", requires: "canViewDashboard" },
  { href: "/admin/pending-users", label: "Approvals", requires: "canApproveSignups" },
];

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
    `text-sm font-medium transition-colors ${
      isActive(href) ? "text-status-active" : "text-text-muted hover:text-text-primary"
    }`;

  return (
    <nav
      aria-label="Main navigation"
      className="sticky top-0 z-30 flex items-center justify-between rounded-2xl border border-border bg-surface px-6 py-3"
    >
      <div className="flex items-center gap-5">
        <span className="text-sm font-semibold text-text-primary">PeoplePay360</span>
        <div className="hidden items-center gap-5 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={isActive(l.href) ? "page" : undefined}
              className={linkClass(l.href)}
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="hidden items-center gap-3 text-sm text-text-muted md:flex">
        {user && (
          <span>
            {user.name} · {user.role}
          </span>
        )}
        <button
          type="button"
          onClick={handleLogout}
          className="rounded bg-primary px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-primary-hover"
        >
          Log out
        </button>
      </div>

      <div className="flex items-center gap-3 md:hidden">
        {user && (
          <span className="text-sm text-text-muted">
            {user.name} · {user.role}
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
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            {menuOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>
      </div>

      {menuOpen && (
        <div
          id="mobile-menu"
          className="absolute left-0 right-0 top-full rounded-b-2xl border border-t-0 border-border bg-surface px-6 py-3 shadow-md md:hidden"
        >
          <div className="flex flex-col gap-1">
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
