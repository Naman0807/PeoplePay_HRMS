"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getUser, logout } from "@/lib/auth";

const LINKS = [
  { href: "/employees", label: "Employees" },
  { href: "/attendance", label: "Attendance" },
  { href: "/time-off", label: "Time Off" },
  { href: "/payruns", label: "Payroll" },
  { href: "/dashboard", label: "Dashboard" },
];

export default function Nav() {
  const router = useRouter();
  const pathname = usePathname();
  const user = getUser();
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
      isActive(href) ? "text-gray-900" : "text-gray-500 hover:text-gray-900"
    }`;

  return (
    <nav
      aria-label="Main navigation"
      className="sticky top-0 z-30 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3"
    >
      <div className="flex items-center gap-5">
        <span className="text-sm font-semibold text-gray-900">PeoplePay360</span>
        <div className="hidden items-center gap-5 md:flex">
          {LINKS.map((l) => (
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

      <div className="hidden items-center gap-3 text-sm text-gray-500 md:flex">
        {user && (
          <span>
            {user.name} · {user.role}
          </span>
        )}
        <button
          type="button"
          onClick={handleLogout}
          className="rounded bg-gray-100 px-3 py-1 text-xs font-medium transition-colors hover:bg-gray-200"
        >
          Log out
        </button>
      </div>

      <div className="flex items-center gap-3 md:hidden">
        {user && (
          <span className="text-sm text-gray-500">
            {user.name} · {user.role}
          </span>
        )}
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Toggle navigation menu"
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          className="rounded p-1 text-gray-700 hover:bg-gray-100"
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
          className="absolute left-0 right-0 top-full border-b border-gray-200 bg-white px-6 py-3 shadow-md md:hidden"
        >
          <div className="flex flex-col gap-1">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setMenuOpen(false)}
                aria-current={isActive(l.href) ? "page" : undefined}
                className={`rounded px-2 py-2 transition-colors ${
                  isActive(l.href)
                    ? "bg-gray-50 text-gray-900"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                {l.label}
              </Link>
            ))}
            <button
              type="button"
              onClick={handleLogout}
              className="mt-2 rounded bg-gray-100 px-2 py-2 text-left text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
            >
              Log out
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
