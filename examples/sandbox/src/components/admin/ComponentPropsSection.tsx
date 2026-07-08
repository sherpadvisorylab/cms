"use client";

import { useState } from "react";
import type { ComponentSchemaField } from "@sherpacms/domain";
import { COL_SPAN, FieldLabel, ValidatedFieldInput } from "./SchemaFieldInput";

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
