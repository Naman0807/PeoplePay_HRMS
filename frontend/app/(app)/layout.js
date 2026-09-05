"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUser } from "@/lib/auth";
import Nav from "@/components/Nav";

export default function AppLayout({ children }) {
  const router = useRouter();
  const [ready] = useState(() => !!getUser());

  useEffect(() => {
    if (!getUser()) {
      router.replace("/login");
    }
  }, [router]);

  if (!ready) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-6 pt-6">
        <Nav />
      </div>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
