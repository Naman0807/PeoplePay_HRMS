"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/auth";
import { Field, PrimaryButton, Card } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(loginId, password);
      router.push("/employees");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-sm space-y-5 shadow-md border-t-4 border-t-primary">
        <div className="text-center">
          <div className="text-xl font-semibold tracking-tight text-text-primary">PeoplePay360</div>
          <p className="mt-1 text-sm text-text-muted">HR &amp; Payroll Platform</p>
        </div>

        {error && (
          <div role="alert" className="rounded-md border border-status-error/30 bg-status-error/10 px-3 py-2 text-sm text-status-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field
            id="login"
            label="Login"
            value={loginId}
            onChange={setLoginId}
            autoComplete="username"
            autoFocus
            required
          />

          <Field
            id="password"
            type="password"
            label="Password"
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
            required
          />

          <PrimaryButton type="submit" disabled={submitting} className="w-full">
            {submitting ? "Signing in…" : "Sign in"}
          </PrimaryButton>
        </form>
      </Card>
    </main>
  );
}
