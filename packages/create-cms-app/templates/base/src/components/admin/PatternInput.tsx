"use client";

import React, { useRef, useState } from "react";

interface PatternVar {
  key: string;     // e.g. "name", "record.slug", "site.name"
  label: string;
  example?: string;
}

interface Props {
  label: string;
  value: string;
  onChange: (v: string) => void;
  vars: PatternVar[];
  placeholder?: string;
  hint?: string;
  style?: React.CSSProperties;
}

export function PatternInput({ label, value, onChange, vars, placeholder, hint, style }: Props) {
  const [open, setOpen] = useState(false);
  const [cursorPos, setCursorPos] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    const pos = e.target.selectionStart ?? val.length;
    onChange(val);
    setCursorPos(pos);
    // Open dropdown when user just typed "{"
    const charBefore = val[pos - 1];
    setOpen(charBefore === "{");
  }

  function insertVar(key: string) {
    const before = value.slice(0, cursorPos);
    const after = value.slice(cursorPos);
    // If the char before cursor is "{", replace it; otherwise just insert
    const hasBrace = before.endsWith("{");
    const newVal = (hasBrace ? before.slice(0, -1) : before) + `{${key}}` + after;
    onChange(newVal);
    setOpen(false);
    // Restore focus
    setTimeout(() => {
      if (inputRef.current) {
        const newPos = (hasBrace ? before.length - 1 : before.length) + key.length + 2;
        inputRef.current.focus();
        inputRef.current.setSelectionRange(newPos, newPos);
      }
    }, 0);
  }

  return (
    <div style={{ position: "relative", ...style }}>
      <label className="form-label">{label}</label>
      <input
        ref={inputRef}
        className="form-control"
        value={value}
        onChange={handleChange}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onFocus={() => {
          if (inputRef.current) setCursorPos(inputRef.current.selectionStart ?? value.length);
        }}
        onClick={() => {
          if (inputRef.current) setCursorPos(inputRef.current.selectionStart ?? value.length);
        }}
        placeholder={placeholder}
        style={{ fontFamily: "monospace", fontSize: "0.82rem" }}
      />
      {hint && <span className="form-hint" style={{ fontSize: "0.72rem" }}>{hint}</span>}

      {open && vars.length > 0 && (
        <div style={{
          position: "absolute", top: "calc(100% + 2px)", left: 0, zIndex: 400,
          background: "white", border: "1px solid var(--border)", borderRadius: 8,
          boxShadow: "0 8px 24px rgba(0,0,0,0.12)", minWidth: 260, maxHeight: 240,
          overflowY: "auto",
        }}>
          {vars.map((v) => (
            <button
              key={v.key}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); insertVar(v.key); }}
              style={{
                display: "flex", alignItems: "baseline", gap: 10, width: "100%",
                padding: "8px 14px", background: "none", border: "none",
                cursor: "pointer", textAlign: "left", fontSize: "0.82rem",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-light, #f8fafc)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <code style={{ color: "var(--primary)", fontWeight: 600, fontSize: "0.78rem" }}>{`{${v.key}}`}</code>
              <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", flex: 1 }}>{v.label}</span>
              {v.example && <span style={{ color: "var(--text-muted)", fontSize: "0.68rem", fontFamily: "monospace", opacity: 0.7 }}>{v.example}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
