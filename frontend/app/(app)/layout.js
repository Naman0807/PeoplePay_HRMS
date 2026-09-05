"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUser } from "@/lib/auth";
import Sidebar from "@/components/Sidebar";

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
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="min-w-0 flex-1 px-6 py-8">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
