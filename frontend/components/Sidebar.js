"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  FileText,
  Clock,
  CalendarDays,
  Wallet,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { getUser, logout } from "@/lib/auth";
import { permissions } from "@/lib/permissions";

const LINKS = [
  // Dashboard and Payroll return 403 for an EMPLOYEE, so they are not offered.
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, requires: "canViewDashboard" },
  { href: "/employees", label: "Employees", icon: Users },
  { href: "/contracts", label: "Contracts", icon: FileText },
  { href: "/attendance", label: "Attendance", icon: Clock },
  { href: "/time-off", label: "Time Off", icon: CalendarDays },
  { href: "/payruns", label: "Payroll", icon: Wallet, requires: "canViewPayroll" },
  { href: "/admin/pending-users", label: "Approvals", icon: ShieldCheck, requires: "canApproveSignups" },
];

const COLLAPSE_KEY = "sidebar-collapsed";

function initials(name) {
  return (name || "")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const user = getUser();
  const perms = permissions(user);
  const links = LINKS.filter((l) => !l.requires || perms[l.requires]);
  const [mobileOpen, setMobileOpen] = useState(false);
  // Desktop-only: collapses to an icon rail. Remembered per browser — a per-viewer
  // convenience, not data that needs to sync anywhere, so localStorage is fine here.
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {
      // Private browsing / storage blocked — just stay expanded.
    }
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      } catch {
        // Ignore — nothing to persist to, the toggle still works for this session.
      }
      return next;
    });
  }

  function isActive(href) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  const linkClass = (href, isCollapsed) =>
    `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
      isCollapsed ? "justify-center px-2" : ""
    } ${
      isActive(href) ? "bg-primary/15 text-status-active" : "text-text-muted hover:bg-background/60 hover:text-text-primary"
    }`;

  const NavLinks = ({ isCollapsed = false }) => (
    <nav className="flex flex-1 flex-col gap-1 px-3">
      {links.map((l) => {
        const Icon = l.icon;
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={isActive(l.href) ? "page" : undefined}
            onClick={() => setMobileOpen(false)}
            title={isCollapsed ? l.label : undefined}
            className={linkClass(l.href, isCollapsed)}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {!isCollapsed && l.label}
          </Link>
        );
      })}
    </nav>
  );

  const UserFooter = ({ isCollapsed = false }) => (
    <div className="border-t border-border p-3">
      {user && (
        <div
          className={`mb-2 flex items-center gap-2 rounded-md border border-border bg-background/40 p-2 ${
            isCollapsed ? "justify-center" : ""
          }`}
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#ff8a7a] text-[10px] font-bold text-white">
            {initials(user.name)}
          </span>
          {!isCollapsed && (
            <div className="min-w-0">
              <div className="truncate text-xs font-medium text-text-primary">{user.name}</div>
              <div className="truncate text-[11px] text-text-muted">{user.role}</div>
            </div>
          )}
        </div>
      )}
      <button
        type="button"
        onClick={handleLogout}
        title={isCollapsed ? "Log out" : undefined}
        className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-primary-hover"
      >
        <LogOut className="h-3.5 w-3.5" />
        {!isCollapsed && "Log out"}
      </button>
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-surface px-4 py-3 md:hidden">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-xs font-bold text-white">PP</span>
          <span className="text-sm font-semibold text-text-primary">PeoplePay360</span>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Toggle navigation menu"
          aria-expanded={mobileOpen}
          className="rounded p-1 text-text-primary hover:bg-background/50"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div
            className="absolute left-0 top-0 flex h-full w-64 flex-col border-r border-border bg-surface py-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center gap-2 px-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-xs font-bold text-white">PP</span>
              <span className="text-sm font-semibold text-text-primary">PeoplePay360</span>
            </div>
            <NavLinks />
            <UserFooter />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside
        className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r border-border bg-surface py-4 transition-all md:flex ${
          collapsed ? "w-16" : "w-60"
        }`}
      >
        <div className={`mb-6 flex items-center px-3 ${collapsed ? "justify-center" : "justify-between"}`}>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-xs font-bold text-white">
              PP
            </span>
            {!collapsed && <span className="text-sm font-semibold tracking-tight text-text-primary">PeoplePay360</span>}
          </div>
          {!collapsed && (
            <button
              type="button"
              onClick={toggleCollapsed}
              aria-label="Collapse sidebar"
              className="rounded p-1 text-text-muted hover:bg-background/60 hover:text-text-primary"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
        </div>

        {collapsed && (
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label="Expand sidebar"
            className="mx-3 mb-4 flex items-center justify-center rounded-md p-1.5 text-text-muted hover:bg-background/60 hover:text-text-primary"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}

        <NavLinks isCollapsed={collapsed} />
        <UserFooter isCollapsed={collapsed} />
      </aside>
    </>
  );
}
