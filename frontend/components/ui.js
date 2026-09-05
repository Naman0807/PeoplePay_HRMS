"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loading, ErrorBox } from "@/components/StatusStates";

const VARIANT_CLASSES = {
  success: "bg-emerald-100 text-emerald-800",
  danger: "bg-red-100 text-red-800",
  warning: "bg-amber-100 text-amber-800",
  info: "bg-blue-100 text-blue-800",
  neutral: "bg-gray-100 text-gray-700",
  default: "bg-gray-100 text-gray-600",
};

export function statusVariant(status) {
  const value = String(status || "").toUpperCase();
  if (["ACTIVE", "PRESENT", "PAID", "CONFIRMED", "APPROVED"].includes(value)) {
    return "success";
  }
  if (["INACTIVE", "ABSENT", "REFUSED"].includes(value)) {
    return "danger";
  }
  if (["CANCELLED", "EXPIRED"].includes(value)) {
    return "neutral";
  }
  if (["DRAFT", "TO_APPROVE", "PENDING"].includes(value)) {
    return "warning";
  }
  if (value === "RUNNING") {
    return "info";
  }
  return "neutral";
}

export function Badge({ children, variant = "default" }) {
  const cls = VARIANT_CLASSES[variant] || VARIANT_CLASSES.default;
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${cls}`}>
      {children}
    </span>
  );
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
  ...rest
}) {
  const inputId = id || slugify(label);
  const describedBy = hint ? `${inputId}-hint` : undefined;
  return (
    <div>
      <label htmlFor={inputId} className="block text-xs font-medium text-gray-600">
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
        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm transition-colors focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 focus:outline-none"
        {...rest}
      />
      {hint && (
        <p id={describedBy} className="mt-1 text-xs text-gray-400">
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
  ...rest
}) {
  const inputId = id || slugify(label);
  const describedBy = hint ? `${inputId}-hint` : undefined;
  return (
    <div>
      <label htmlFor={inputId} className="block text-xs font-medium text-gray-600">
        {label}
        {required ? " *" : ""}
      </label>
      <select
        id={inputId}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-describedby={describedBy}
        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm transition-colors focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 focus:outline-none"
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
        <p id={describedBy} className="mt-1 text-xs text-gray-400">
          {hint}
        </p>
      )}
    </div>
  );
}

export function PrimaryButton({ children, ...props }) {
  return (
    <button
      {...props}
      className="rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white transition-all hover:bg-gray-800 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
    >
      {children}
    </button>
  );
}

export function SecondaryButton({ children, ...props }) {
  return (
    <button
      {...props}
      className="rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-800 transition-all hover:bg-gray-200 active:scale-[0.98] disabled:opacity-50"
    >
      {children}
    </button>
  );
}

export function Card({ children, className = "" }) {
  return <div className={`rounded-lg border border-gray-200 bg-white p-5 ${className}`}>{children}</div>;
}

export function PageHeader({ title, actions }) {
  return (
    <div className="mb-6 flex items-center justify-between">
      <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
      {actions && <div>{actions}</div>}
    </div>
  );
}

export function BackLink({ href, children }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 hover:underline"
    >
      ← {children}
    </Link>
  );
}

export function Table({ headers, children }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
          <tr>
            {headers.map((h) => (
              <th key={h} className="px-4 py-2 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
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
      className={`animate-slide-in-up fixed bottom-4 right-4 z-50 rounded-md bg-white px-4 py-3 text-sm text-gray-800 shadow-lg border-l-4 ${
        type === "error" ? "border-red-500" : "border-emerald-500"
      }`}
    >
      <div className="flex items-center gap-3">
        <span>{message}</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss notification"
          className="text-gray-400 hover:text-gray-600"
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
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="mx-4 w-full max-w-sm rounded-lg bg-white p-6 shadow-xl"
      >
        <h2 className="mb-2 text-lg font-semibold text-gray-900">{title}</h2>
        <p className="mb-6 text-sm text-gray-600">{message}</p>
        <div className="flex justify-end gap-2">
          <SecondaryButton onClick={onCancel}>{cancelLabel}</SecondaryButton>
          <button
            type="button"
            onClick={onConfirm}
            autoFocus
            className={`rounded-md px-3 py-2 text-sm font-medium text-white transition-all active:scale-[0.98] ${
              danger
                ? "bg-red-600 hover:bg-red-700"
                : "bg-gray-900 hover:bg-gray-800"
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
      <p className="mb-4 text-sm text-gray-400">{message}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white transition-all hover:bg-gray-800 active:scale-[0.98]"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export { Loading, ErrorBox };
