"use client";

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

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  return (
    <nav className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
      <div className="flex gap-5">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`text-sm font-medium ${
              pathname.startsWith(l.href) ? "text-gray-900" : "text-gray-500 hover:text-gray-900"
            }`}
          >
            {l.label}
          </Link>
        ))}
      </div>
      <div className="flex items-center gap-3 text-sm text-gray-500">
        {user && (
          <span>
            {user.name} · {user.role}
          </span>
        )}
        <button
          onClick={handleLogout}
          className="rounded bg-gray-100 px-3 py-1 text-xs font-medium hover:bg-gray-200"
        >
          Log out
        </button>
      </div>
    </nav>
  );
}
