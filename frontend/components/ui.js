"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loading, ErrorBox } from "@/components/StatusStates";

const VARIANT_CLASSES = {
  success: "text-status-success",
  danger: "text-status-error",
  warning: "text-status-warning",
  info: "text-status-active",
  neutral: "text-text-muted",
  default: "text-text-muted",
};

export function statusVariant(status) {
  const value = String(status || "").toUpperCase();
  // RUNNING is a contract's "money is flowing" state — success/green, matching the
  // design system's "Running"/"Active"/"Present" -> text-status-success rule.
  if (["ACTIVE", "PRESENT", "PAID", "CONFIRMED", "APPROVED", "RUNNING"].includes(value)) {
    return "success";
  }
  if (["INACTIVE", "ABSENT", "REFUSED"].includes(value)) {
    return "danger";
  }
  // EXPIRED needs attention (payroll depends on Running, not Expired, contracts) —
  // warning/orange, per "Expired" -> text-status-warning. CANCELLED stays neutral.
  if (["EXPIRED", "DRAFT", "TO_APPROVE", "PENDING"].includes(value)) {
    return "warning";
  }
  if (value === "CANCELLED") {
    return "neutral";
  }
  return "neutral";
}

export function Badge({ children, variant = "default" }) {
  const cls = VARIANT_CLASSES[variant] || VARIANT_CLASSES.default;
  return <span className={`inline-block text-xs font-medium ${cls}`}>{children}</span>;
}

function slugify(label) {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  hint,
  id,
  className = "",
  ...rest
}) {
  const inputId = id || slugify(label);
  const describedBy = hint ? `${inputId}-hint` : undefined;
  return (
    <div className={className}>
      <label htmlFor={inputId} className="block text-xs font-medium text-text-muted">
        {label}
        {required ? " *" : ""}
      </label>
      <input
        id={inputId}
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-describedby={describedBy}
        className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-text-primary transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
        {...rest}
      />
      {hint && (
        <p id={describedBy} className="mt-1 text-xs text-text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}

export function Select({
  label,
  value,
  onChange,
  options,
  required = false,
  hint,
  id,
  className = "",
  ...rest
}) {
  const inputId = id || slugify(label);
  const describedBy = hint ? `${inputId}-hint` : undefined;
  return (
    <div className={className}>
      <label htmlFor={inputId} className="block text-xs font-medium text-text-muted">
        {label}
        {required ? " *" : ""}
      </label>
      <select
        id={inputId}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-describedby={describedBy}
        className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-text-primary transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
        {...rest}
      >
        <option value="">Select…</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {hint && (
        <p id={describedBy} className="mt-1 text-xs text-text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}

export function PrimaryButton({ children, className = "", ...props }) {
  return (
    <button
      {...props}
      className={`rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-all hover:bg-primary-hover active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none ${className}`}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({ children, className = "", ...props }) {
  return (
    <button
      {...props}
      className={`rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-text-primary transition-all hover:bg-surface/50 active:scale-[0.98] disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

export function Card({ children, className = "" }) {
  return <div className={`rounded-lg border border-border bg-surface p-5 ${className}`}>{children}</div>;
}

export function PageHeader({ title, actions }) {
  return (
    <div className="mb-6 flex items-center justify-between">
      <h1 className="text-xl font-semibold text-text-primary">{title}</h1>
      {actions && <div>{actions}</div>}
    </div>
  );
}

export function BackLink({ href, children }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-text-primary hover:underline"
    >
      ← {children}
    </Link>
  );
}

export function Table({ headers, children }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead className="bg-surface text-left text-xs uppercase text-text-muted">
          <tr>
            {headers.map((h) => (
              <th key={h} className="px-4 py-2 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&>tr]:border-b [&>tr]:border-border/50 [&>tr:last-child]:border-b-0 [&>tr:hover]:bg-surface/50">
          {children}
        </tbody>
      </table>
    </div>
  );
}

export function Toast({ message, type = "success", onClose }) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div
      role="alert"
      className={`animate-slide-in-up fixed bottom-4 right-4 z-50 rounded-md border border-border bg-surface px-4 py-3 text-sm text-text-primary shadow-lg border-l-4 ${
        type === "error" ? "border-l-status-error" : "border-l-status-success"
      }`}
    >
      <div className="flex items-center gap-3">
        <span>{message}</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss notification"
          className="text-text-muted hover:text-text-primary"
        >
          ×
        </button>
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  danger = false,
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/60"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="mx-4 w-full max-w-sm rounded-lg border border-border bg-surface p-6 shadow-xl"
      >
        <h2 className="mb-2 text-lg font-semibold text-text-primary">{title}</h2>
        <p className="mb-6 text-sm text-text-muted">{message}</p>
        <div className="flex justify-end gap-2">
          <SecondaryButton onClick={onCancel}>{cancelLabel}</SecondaryButton>
          <button
            type="button"
            onClick={onConfirm}
            autoFocus
            className={`rounded-md px-4 py-2 text-sm font-medium text-white transition-all active:scale-[0.98] ${
              danger
                ? "bg-status-error hover:bg-status-error/80"
                : "bg-primary hover:bg-primary-hover"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function EmptyState({ message, actionLabel, onAction }) {
  return (
    <div className="py-10 text-center">
      <p className="mb-4 text-sm text-text-muted">{message}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-all hover:bg-primary-hover active:scale-[0.98]"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export { Loading, ErrorBox };
