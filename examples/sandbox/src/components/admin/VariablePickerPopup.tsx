"use client";

import { useState, useEffect, useRef } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────
export interface PickerItem {
  label:  string;   // displayed in the list (e.g. "{{system:bg-primary}}")
  apply:  string;   // inserted into the editor
  detail: string;   // description
}

export interface PickerSection {
  id:     string;
  icon:   string;
  label:  string;
  items:  PickerItem[];
}

interface Props {
  sections:    PickerSection[];
  /** Raw cursor position — the popup will adjust to stay within the viewport */
  position:    { top: number; left: number };
  searchTerm:  string;
  onSelect:    (apply: string) => void;
  onClose:     () => void;
}

const POPUP_W = 380;
const POPUP_H = 380;

function clampPosition(raw: { top: number; left: number }): { top: number; left: number } {
  if (typeof window === "undefined") return raw;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const left = Math.min(raw.left, vw - POPUP_W - 8);
  // Flip above cursor if not enough room below
  const fitsBelow = raw.top + POPUP_H < vh - 8;
  const top = fitsBelow ? raw.top : raw.top - POPUP_H - 28;
  return { top: Math.max(8, top), left: Math.max(8, left) };
}

// ── Component ─────────────────────────────────────────────────────────────────
export function VariablePickerPopup({ sections, position: rawPosition, searchTerm, onSelect, onClose }: Props) {
  const position = clampPosition(rawPosition);
  // All sections open by default
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const popupRef = useRef<HTMLDivElement>(null);

  function toggle(id: string) {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  // Close on outside click or Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    function onMouse(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onMouse);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onMouse);
    };
  }, [onClose]);

  const q = searchTerm.toLowerCase();

  // Filter items within each section by searchTerm
  const filtered = sections.map((s) => ({
    ...s,
    items: q
      ? s.items.filter(
          (i) => i.label.toLowerCase().includes(q) || i.detail.toLowerCase().includes(q)
        )
      : s.items,
  }));

  return (
    <div
      ref={popupRef}
      style={{
        position:    "fixed",
        top:         position.top,
        left:        position.left,
        zIndex:      1050,
        background:  "white",
        border:      "1px solid #e5e7eb",
        borderRadius: 8,
        boxShadow:   "0 8px 24px rgba(0,0,0,0.14)",
        minWidth:    280,
        maxWidth:    380,
        maxHeight:   380,
        overflowY:   "auto",
        fontSize:    "13px",
      }}
    >
      {filtered.map((section) => {
        const isCollapsed = collapsed[section.id] ?? false;
        const hasItems    = section.items.length > 0;

        return (
          <div key={section.id}>
            {/* Section header — always visible */}
            <div
              onClick={() => toggle(section.id)}
              style={{
                display:      "flex",
                alignItems:   "center",
                gap:          8,
                padding:      "7px 12px",
                cursor:       "pointer",
                background:   "#f8fafc",
                borderBottom: "1px solid #e5e7eb",
                userSelect:   "none",
                position:     "sticky",
                top:          0,
                zIndex:       1,
              }}
            >
              <span style={{ fontSize: "0.82rem" }}>{section.icon}</span>
              <span style={{
                flex:          1,
                fontSize:      "0.68rem",
                fontWeight:    700,
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                color:         "#64748b",
              }}>
                {section.label}
              </span>
              {/* Caret */}
              <span style={{
                fontSize:   "0.7rem",
                color:      "#94a3b8",
                transform:  isCollapsed ? "rotate(-90deg)" : "rotate(0deg)",
                transition: "transform 0.15s",
                display:    "inline-block",
              }}>
                ▼
              </span>
            </div>

            {/* Section body — hidden when collapsed */}
            {!isCollapsed && (
              <div>
                {hasItems ? (
                  section.items.map((item) => (
                    <div
                      key={item.apply}
                      onClick={() => { onSelect(item.apply); onClose(); }}
                      style={{
                        display:     "flex",
                        alignItems:  "center",
                        gap:         10,
                        padding:     "7px 14px",
                        cursor:      "pointer",
                        borderBottom: "1px solid #f1f5f9",
                        transition:  "background 0.1s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#eff6ff")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <span style={{
                        fontFamily: "'JetBrains Mono','Fira Code',monospace",
                        color:      "var(--primary,#2E5A97)",
                        fontWeight: 600,
                        fontSize:   "0.8rem",
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                      }}>
                        {item.label}
                      </span>
                      <span style={{
                        color:        "#94a3b8",
                        fontSize:     "0.76rem",
                        whiteSpace:   "nowrap",
                        overflow:     "hidden",
                        textOverflow: "ellipsis",
                        flex:         1,
                      }}>
                        {item.detail}
                      </span>
                    </div>
                  ))
                ) : (
                  <div style={{
                    padding:   "8px 14px",
                    fontSize:  "0.78rem",
                    color:     "#94a3b8",
                    fontStyle: "italic",
                  }}>
                    No items yet
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
