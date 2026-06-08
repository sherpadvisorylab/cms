"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

type PageTemplate = { id: string; name: string };

export function NewPageButton() {
  const router  = useRouter();
  const ref     = useRef<HTMLDivElement>(null);
  const [open,      setOpen]      = useState(false);
  const [templates, setTemplates] = useState<PageTemplate[] | null>(null);
  const [loading,   setLoading]   = useState(false);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  async function handleCaretClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (open) { setOpen(false); return; }
    setOpen(true);
    setLoading(true);
    try {
      const res  = await fetch("/api/admin/page-templates", { cache: "no-store" });
      const data = await res.json() as { templates?: PageTemplate[] };
      setTemplates(data.templates ?? []);
    } catch {
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-flex" }}>
      {/* Main button */}
      <button
        className="btn btn-primary"
        onClick={() => router.push("/admin/pages/new")}
        style={{ borderRadius: "6px 0 0 6px", borderRight: "1px solid rgba(255,255,255,0.25)" }}
      >
        + New Page
      </button>

      {/* Caret */}
      <button
        className="btn btn-primary"
        onClick={handleCaretClick}
        title="Create from template"
        style={{ borderRadius: "0 6px 6px 0", padding: "0 10px" }}
      >
        {open ? "▲" : "▼"}
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", right: 0, zIndex: 200,
          background: "#fff", border: "1px solid var(--border)", borderRadius: 8,
          boxShadow: "0 8px 24px rgba(0,0,0,0.12)", minWidth: 220, overflow: "hidden",
        }}>
          <div style={{ padding: "8px 12px 6px", fontSize: "0.72rem", fontWeight: 700,
            color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em",
            borderBottom: "1px solid var(--border)" }}>
            From template
          </div>

          {loading && (
            <div style={{ padding: "12px 14px", fontSize: "0.85rem", color: "var(--text-muted)" }}>
              Loading…
            </div>
          )}

          {!loading && templates?.length === 0 && (
            <div style={{ padding: "12px 14px", fontSize: "0.82rem", color: "var(--text-muted)", fontStyle: "italic" }}>
              No templates yet. Save a page as template from the content editor.
            </div>
          )}

          {!loading && templates && templates.length > 0 && templates.map((tpl) => (
            <button
              key={tpl.id}
              onClick={() => { setOpen(false); router.push(`/admin/pages/new?template=${tpl.id}`); }}
              style={{
                display: "block", width: "100%", textAlign: "left",
                padding: "9px 14px", fontSize: "0.875rem", fontWeight: 500,
                background: "transparent", border: "none", cursor: "pointer",
                borderBottom: "1px solid var(--bg-light)",
                transition: "background 0.1s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-light)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              📄 {tpl.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
