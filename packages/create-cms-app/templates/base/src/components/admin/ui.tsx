"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

// ── PageHeader ────────────────────────────────────────────────────────────────
export function PageHeader({
  title,
  action,
}: {
  title: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
      {action && (
        <Link
          href={action.href}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}

// ── BackLink ──────────────────────────────────────────────────────────────────
export function BackLink({ href, label = "Back" }: { href: string; label?: string }) {
  return (
    <Link href={href} className="inline-flex items-center text-sm text-gray-500 hover:text-gray-800 mb-4">
      ← {label}
    </Link>
  );
}

// ── StatusBadge ───────────────────────────────────────────────────────────────
const STATUS_STYLES: Record<string, string> = {
  published: "bg-green-100 text-green-700",
  active:    "bg-green-100 text-green-700",
  draft:     "bg-yellow-100 text-yellow-700",
  inactive:  "bg-gray-100 text-gray-500",
  archived:  "bg-gray-100 text-gray-500",
  invited:   "bg-blue-100 text-blue-700",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[status] ?? "bg-gray-100 text-gray-600"}`}>
      {status}
    </span>
  );
}

// ── EmptyState ────────────────────────────────────────────────────────────────
export function EmptyState({ message = "No items yet." }: { message?: string }) {
  return <p className="text-gray-400 text-sm py-8 text-center">{message}</p>;
}

// ── FormCard ──────────────────────────────────────────────────────────────────
export function FormCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-5 max-w-2xl">
      {children}
    </div>
  );
}

// ── Field ─────────────────────────────────────────────────────────────────────
export function Field({
  label,
  name,
  defaultValue = "",
  type = "text",
  required = false,
  hint,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  type?: string;
  required?: boolean;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        required={required}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

// ── TextareaField ─────────────────────────────────────────────────────────────
export function TextareaField({
  label,
  name,
  defaultValue = "",
  rows = 4,
  hint,
  mono = false,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  rows?: number;
  hint?: string;
  mono?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <textarea
        name={name}
        defaultValue={defaultValue}
        rows={rows}
        className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y ${mono ? "font-mono" : ""}`}
      />
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

// ── SelectField ───────────────────────────────────────────────────────────────
export function SelectField({
  label,
  name,
  defaultValue = "",
  options,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <select
        name={name}
        defaultValue={defaultValue}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// ── SubmitRow ─────────────────────────────────────────────────────────────────
export function SubmitRow({ cancelHref }: { cancelHref: string }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <button
        type="submit"
        className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
      >
        Save
      </button>
      <Link href={cancelHref} className="text-sm text-gray-500 hover:text-gray-800">
        Cancel
      </Link>
    </div>
  );
}

// ── DeleteButton ──────────────────────────────────────────────────────────────
export function DeleteButton({ action }: { action: () => Promise<void> }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    if (!confirm("Are you sure you want to delete this item?")) return;
    startTransition(async () => {
      await action();
      router.back();
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
    >
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}

// ── Table helpers ─────────────────────────────────────────────────────────────
export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}

export function Thead({ cols }: { cols: string[] }) {
  return (
    <thead className="bg-gray-50 border-b border-gray-200">
      <tr>
        {cols.map((c) => (
          <th key={c} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {c}
          </th>
        ))}
      </tr>
    </thead>
  );
}
