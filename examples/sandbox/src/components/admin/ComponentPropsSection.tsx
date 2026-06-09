"use client";

import React, { useState } from "react";
import type { ComponentSchemaField } from "@sherpacms/domain";
import { validateFieldValue } from "./validators";

// ── COL_SPAN ──────────────────────────────────────────────────────────────────

const COL_SPAN: Record<string, string> = {
  full: "span 12",
  half: "span 6",
  third: "span 4",
};

// ── FieldLabel ────────────────────────────────────────────────────────────────

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <div style={{ fontSize: "0.71rem", fontWeight: 500, color: "var(--text-muted)", marginBottom: 4, display: "flex", alignItems: "center", gap: 3 }}>
      {children}
      {required && <span style={{ color: "var(--danger)" }} title="Required">*</span>}
    </div>
  );
}

// ── FieldInput ────────────────────────────────────────────────────────────────

function FieldInput({
  field,
  value,
  onChange,
  placeholder,
}: {
  field: ComponentSchemaField;
  value: unknown;
  onChange: (value: unknown) => void;
  placeholder?: string;
}) {
  const str = (value ?? field.defaultValue ?? "") as string;

  switch (field.type) {
    case "textarea":
    case "richtext":
      return (
        <textarea
          className="form-control"
          rows={3}
          value={str}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? field.placeholder ?? field.helpText ?? ""}
        />
      );
    case "toggle":
      return (
        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
          <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
          <span style={{ fontSize: "0.85rem" }}>{field.helpText ?? field.label}</span>
        </label>
      );
    case "number":
      return (
        <input
          type="number"
          className="form-control"
          value={(value as number) ?? ""}
          onChange={(e) => onChange(Number(e.target.value))}
          placeholder={placeholder ?? field.placeholder ?? field.helpText ?? ""}
        />
      );
    case "select":
      return (
        <select className="form-control" value={str} onChange={(e) => onChange(e.target.value)}>
          <option value="">- Select -</option>
          {(field.options ?? []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      );
    case "color":
      return (
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="color" value={str || "#000000"} onChange={(e) => onChange(e.target.value)}
            style={{ width: 40, height: 34, padding: 1, borderRadius: 4, border: "1px solid var(--border)", cursor: "pointer" }} />
          <input className="form-control" value={str} onChange={(e) => onChange(e.target.value)}
            placeholder="#000000" style={{ fontFamily: "monospace", width: 120 }} />
        </div>
      );
    default:
      return (
        <input
          type="text"
          className="form-control"
          value={str}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? field.placeholder ?? field.helpText ?? ""}
        />
      );
  }
}

// ── ValidatedFieldInput ───────────────────────────────────────────────────────

function ValidatedFieldInput({
  field,
  value,
  onChange,
  placeholder,
}: {
  field: ComponentSchemaField;
  value: unknown;
  onChange: (value: unknown) => void;
  placeholder?: string;
}) {
  const [dirty, setDirty] = useState(false);
  const error = dirty
    ? validateFieldValue(value, field)
    : field.validator && String(value ?? "").trim()
      ? validateFieldValue(value, { validator: field.validator })
      : null;
  const hasRequired = field.required && !String(value ?? "").trim();

  return (
    <div>
      <div
        onBlur={() => setDirty(true)}
        style={error ? { borderRadius: 4, outline: "1px solid var(--danger)" } : undefined}
      >
        <FieldInput field={field} value={value} onChange={(v) => { setDirty(true); onChange(v); }} placeholder={placeholder} />
      </div>
      {error ? (
        <p style={{ color: "var(--danger)", fontSize: "0.72rem", marginTop: 3, margin: "3px 0 0" }}>
          <span aria-hidden>⚠</span> {error}
        </p>
      ) : hasRequired ? (
        <p style={{ color: "var(--text-muted)", fontSize: "0.71rem", marginTop: 3, margin: "3px 0 0" }}>Required</p>
      ) : null}
    </div>
  );
}

// ── ComponentPropsSection ─────────────────────────────────────────────────────

interface ComponentPropsSectionProps {
  /** Display name shown in the collapsible header */
  title: string;
  schema: ComponentSchemaField[];
  values: Record<string, unknown>;
  onChange: (updated: Record<string, unknown>) => void;
  /**
   * Optional: per-field placeholder text (e.g. the collection default value shown
   * as a placeholder when editing a per-record override).
   */
  placeholders?: Record<string, string>;
  /** When true the section starts collapsed */
  defaultCollapsed?: boolean;
}

export function ComponentPropsSection({
  title,
  schema,
  values,
  onChange,
  placeholders,
  defaultCollapsed = false,
}: ComponentPropsSectionProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  if (schema.length === 0) return null;

  function set(key: string, val: unknown) {
    onChange({ ...values, [key]: val });
  }

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
      {/* Header */}
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        style={{
          width: "100%", textAlign: "left", padding: "10px 14px",
          background: "var(--bg-light, #f8fafc)", border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", gap: 8,
        }}
      >
        <span style={{ fontSize: "0.78rem", fontWeight: 700, flex: 1 }}>🧩 {title}</span>
        <span style={{ color: "var(--text-muted)", fontSize: "0.68rem", display: "inline-block", transform: collapsed ? "none" : "rotate(90deg)", transition: "transform 0.15s" }}>▶</span>
      </button>

      {/* Fields */}
      {!collapsed && (
        <div style={{ padding: "12px 14px", display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: "10px 14px" }}>
          {schema.map((field) => (
            <div
              key={field.key}
              style={{ gridColumn: COL_SPAN[field.colWidth ?? "full"] ?? "span 12" }}
            >
              <FieldLabel required={field.required}>{field.label}</FieldLabel>
              <ValidatedFieldInput
                field={field}
                value={values[field.key]}
                onChange={(val) => set(field.key, val)}
                placeholder={placeholders?.[field.key]}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
