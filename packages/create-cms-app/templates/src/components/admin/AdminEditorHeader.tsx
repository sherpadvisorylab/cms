"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";

interface Props {
  /** href for the ← back link */
  backHref:  string;
  /** label of the back link, e.g. "Pages" or "Components" */
  backLabel: string;
  /** Optional callback instead of navigating to backHref */
  onBack?:   () => void;
  /** Main title */
  title?:    string;
  /** Optional badge next to the title, e.g. a version chip */
  badge?:    React.ReactNode;
  /** Right-side action buttons */
  actions?:  React.ReactNode;
  /** Tab navigation rendered below the sticky bar (scrolls away) */
  tabs?:     React.ReactNode;
}

export function AdminEditorHeader({ backHref, backLabel, onBack, title, badge, actions, tabs }: Props) {
  const barRef              = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const el = barRef.current;
    if (!el) return;

    function findScrollParent(node: Element | null): Element | null {
      if (!node) return null;
      const style = getComputedStyle(node);
      if (style.overflow === "auto" || style.overflow === "scroll"
        || style.overflowY === "auto" || style.overflowY === "scroll") {
        return node;
      }
      return findScrollParent(node.parentElement);
    }

    const container = findScrollParent(el.parentElement);
    if (!container) return;

    function onScroll() { setScrolled(container!.scrollTop > 2); }
    container.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => container.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      {/* ── Sticky top bar ─────────────────────────────────────────────────── */}
      <div
        ref={barRef}
        style={{
          position:     "sticky",
          top:          0,
          zIndex:       20,
          background:   "var(--bg)",
          borderBottom: scrolled ? "1px solid var(--border)" : "1px solid transparent",
          transition:   "border-color 0.15s",
          display:      "flex",
          alignItems:   "center",
          gap:          8,
          height:       "var(--header-h)",
          marginLeft:   "-1.5rem",
          marginRight:  "-1.5rem",
          paddingLeft:  "1.5rem",
          paddingRight: "1.5rem",
        }}
      >
        <Link
          href={onBack ? "#" : backHref}
          onClick={onBack ? (e) => { e.preventDefault(); onBack(); } : undefined}
          style={{ fontSize: "0.85rem", color: "var(--text-muted)",
            textDecoration: "none", flexShrink: 0 }}
        >
          &#8592; {backLabel}
        </Link>

        {title && (
          <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text)",
            marginLeft: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {title}
          </span>
        )}

        {badge && (
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)",
            background: "var(--bg-light)", border: "1px solid var(--border)",
            borderRadius: 4, padding: "1px 7px", flexShrink: 0 }}>
            {badge}
          </span>
        )}

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
          {actions}
        </div>
      </div>

      {/* ── Tab navigation (scrolls away, not sticky) ──────────────────────── */}
      {tabs && (
        <div className="tabs" style={{ marginTop: 4, marginBottom: 20 }}>
          {tabs}
        </div>
      )}
    </>
  );
}
