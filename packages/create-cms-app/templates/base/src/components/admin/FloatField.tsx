"use client";

import { useState } from "react";

// ── Shared floating-label field components ────────────────────────────────────
// Label starts as placeholder inside the input; on focus or when a value is
// present it animates to the top-left corner at a smaller size (0.15s ease).
// Usage:
//   <FloatInput  label="Name"    value={v} onChange={setV} />
//   <FloatSelect label="Status"  value={v} onChange={setV}>...</FloatSelect>
//   <FloatTextarea label="Notes" value={v} onChange={setV} rows={3} />

function labelStyle(floated: boolean, focused: boolean): React.CSSProperties {
  return {
    position: "absolute",
    left: 8,
    pointerEvents: "none",
    transition: "top 0.15s ease, font-size 0.15s ease, color 0.15s ease",
    top: floated ? 4 : "50%",
    transform: floated ? "none" : "translateY(-50%)",
    fontSize: floated ? "0.58rem" : "0.77rem",
    color: focused ? "var(--primary)" : "var(--text-muted)",
    lineHeight: 1,
    whiteSpace: "nowrap",
  };
}

export function FloatInput({
  label, value, onChange, title, monospace, style, type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  title?: string;
  monospace?: boolean;
  style?: React.CSSProperties;
  type?: string;
}) {
  const [focused, setFocused] = useState(false);
  const floated = focused || (value ?? "").length > 0;
  return (
    <div style={{ position: "relative", ...style }}>
      <input
        type={type}
        className="form-control"
        value={value}
        title={title}
        placeholder=" "
        style={{
          paddingTop: 16, paddingBottom: 3,
          fontFamily: monospace ? "monospace" : undefined,
          fontSize: "0.76rem",
          width: "100%",
          boxSizing: "border-box",
        }}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      <span style={labelStyle(floated, focused)}>{label}</span>
    </div>
  );
}

export function FloatTextarea({
  label, value, onChange, title, rows = 2, style,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  title?: string;
  rows?: number;
  style?: React.CSSProperties;
}) {
  const [focused, setFocused] = useState(false);
  const floated = focused || (value ?? "").length > 0;
  return (
    <div style={{ position: "relative", ...style }}>
      <textarea
        className="form-control"
        value={value}
        title={title}
        placeholder=" "
        rows={rows}
        style={{
          paddingTop: 16, paddingBottom: 3,
          fontSize: "0.74rem",
          resize: "vertical",
          width: "100%",
          boxSizing: "border-box",
        }}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      <span style={{ ...labelStyle(floated, focused), top: floated ? 4 : 8, transform: "none" }}>
        {label}
      </span>
    </div>
  );
}

export function FloatSelect({
  label, value, onChange, title, children, style,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  title?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ position: "relative", ...style }}>
      <select
        className="form-control"
        value={value}
        title={title}
        style={{
          paddingTop: 16, paddingBottom: 3,
          fontSize: "0.75rem",
          width: "100%",
          boxSizing: "border-box",
        }}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      >
        {children}
      </select>
      <span style={{ ...labelStyle(true, focused), pointerEvents: "none" }}>{label}</span>
    </div>
  );
}
