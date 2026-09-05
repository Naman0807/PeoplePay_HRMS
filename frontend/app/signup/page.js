"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signup } from "@/lib/auth";
import { Field, PrimaryButton, Card } from "@/components/ui";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setSubmitting(true);
    try {
      await signup({ name, login: loginId, password, employee_id: employeeId });
      router.push("/employees");
    } catch (err) {
      setError(err.response?.data?.message || "Could not create your account. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-sm space-y-5 shadow-md border-t-4 border-t-primary">
        <div className="text-center">
          <div className="text-xl font-semibold tracking-tight text-text-primary">PeoplePay360</div>
          <p className="mt-1 text-sm text-text-muted">Create your account</p>
        </div>

        {error && (
          <div role="alert" className="rounded-md border border-status-error/30 bg-status-error/10 px-3 py-2 text-sm text-status-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field id="name" label="Name" value={name} onChange={setName} autoComplete="name" autoFocus required />

          <Field
            id="signup-login"
            label="Login"
            value={loginId}
            onChange={setLoginId}
            autoComplete="username"
            hint="Your work email, or any unique login your HR team gave you."
            required
          />

          <Field
            id="signup-password"
            type="password"
            label="Password"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            hint="At least 8 characters."
            required
          />

          <Field
            id="confirm-password"
            type="password"
            label="Confirm password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            autoComplete="new-password"
            required
          />

          <Field
            id="employee-id"
            type="number"
            label="Employee ID (optional)"
            value={employeeId}
            onChange={setEmployeeId}
            hint="Only if HR already gave you one — otherwise leave blank and ask HR to link your account later."
          />

          <PrimaryButton type="submit" disabled={submitting} className="w-full">
            {submitting ? "Creating account…" : "Sign up"}
          </PrimaryButton>
        </form>

        <p className="text-center text-sm text-text-muted">
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </Card>
    </main>
  );
}
