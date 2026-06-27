"use client";

/**
 * Shared editor for the extra admin-facing properties of a ComponentSchemaField:
 * placeholder, required, colWidth, validator.
 *
 * Used by the Collection schema editor and (eventually) the Component placement tab.
 * Renders inline — no wrapping card — so the parent controls layout.
 */

import React from "react";
import type { ComponentSchemaField } from "@sherpacms/domain";
import { FloatInput, FloatSelect } from "./FloatField";
import { PREDEFINED_VALIDATORS } from "./validators";

const VALIDATOR_OPTIONS = [
  { value: "", label: "None" },
  ...Object.entries(PREDEFINED_VALIDATORS).map(([k, v]) => ({ value: k, label: v.label })),
  { value: "__custom__", label: "Custom regex…" },
];

const COL_WIDTH_OPTIONS = [
  { value: "full", label: "Full width" },
  { value: "half", label: "Half (1/2)" },
  { value: "third", label: "Third (1/3)" },
];

interface Props {
  field: ComponentSchemaField;
  onChange: (patch: Partial<ComponentSchemaField>) => void;
}

export function SchemaFieldEditor({ field, onChange }: Props) {
  const isCustomValidator = !!field.validator && !PREDEFINED_VALIDATORS[field.validator];
  const validatorSelectValue = isCustomValidator ? "__custom__" : (field.validator ?? "");
  const isList = field.type === "list";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

      {/* Row 1: placeholder + width */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "end" }}>
        {!isList ? (
          <FloatInput
            label="Placeholder"
            value={field.placeholder ?? ""}
            onChange={(v) => onChange({ placeholder: v || undefined })}
            style={{ width: "100%" }}
          />
        ) : (
          <div />
        )}
        <FloatSelect
          label="Width"
          value={field.colWidth ?? "full"}
          onChange={(v) => onChange({ colWidth: (v || "full") as ComponentSchemaField["colWidth"] })}
          style={{ minWidth: 120 }}
        >
          {COL_WIDTH_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </FloatSelect>
      </div>

      {/* Row 2: required toggle + validator */}
      {!isList && (
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {/* Required toggle */}
          <label
            style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", userSelect: "none", flexShrink: 0 }}
            title="Editors must fill this field before saving"
          >
            <div
              onClick={() => onChange({ required: !field.required })}
              style={{
                width: 28, height: 16, borderRadius: 8,
                background: field.required ? "var(--primary)" : "var(--border)",
                position: "relative", cursor: "pointer", transition: "background 0.15s",
              }}
            >
              <div style={{
                position: "absolute", top: 2,
                left: field.required ? 14 : 2,
                width: 12, height: 12, borderRadius: "50%",
                background: "white", transition: "left 0.15s",
                boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
              }} />
            </div>
            <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>Required</span>
          </label>

          {/* Validator select */}
          <FloatSelect
            label="Validator"
            value={validatorSelectValue}
            onChange={(v) => {
              if (v === "") onChange({ validator: undefined });
              else if (v === "__custom__") onChange({ validator: "/" });
              else onChange({ validator: v });
            }}
            style={{ flex: 1 }}
          >
            {VALIDATOR_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </FloatSelect>

          {/* Custom regex input */}
          {isCustomValidator && (
            <FloatInput
              label="Regex (e.g. /^\d+$/)"
              value={field.validator ?? ""}
              onChange={(v) => onChange({ validator: v })}
              style={{ flex: 2 }}
              title="Custom regular expression — e.g. /^\d{4}$/ or /^[A-Z]+$/i"
            />
          )}
        </div>
      )}
    </div>
  );
}
