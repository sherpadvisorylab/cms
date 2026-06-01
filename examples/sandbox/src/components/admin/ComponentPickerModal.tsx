"use client";

import { useState, useEffect } from "react";
import { COMPONENT_TYPE_LABELS, type ComponentType } from "@cms/domain";

type ComponentMeta = { id: string; name: string; namespace: string | null; type: string; status: string };

interface Props {
  components: ComponentMeta[];
  onSelect:   (componentId: string) => void;
  onClose:    () => void;
}

export function ComponentPickerModal({ components, onSelect, onClose }: Props) {
  const [search, setSearch] = useState("");

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const q = search.toLowerCase();
  const filtered = components.filter(
    (c) =>
      c.status !== "inactive" &&
      (!q || c.name.toLowerCase().includes(q) || (c.namespace ?? "").toLowerCase().includes(q))
  );

  // Group by type
  const grouped: Record<string, ComponentMeta[]> = {};
  for (const c of filtered) {
    const t = c.type || "page";
    if (!grouped[t]) grouped[t] = [];
    grouped[t].push(c);
  }
  const typeOrder: ComponentType[] = ["page", "ui", "navigation"];

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.5)",
               display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: "white", borderRadius: 12, width: 640, maxWidth: "95vw",
                    maxHeight: "80vh", display: "flex", flexDirection: "column",
                    boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}>
        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)",
                      display: "flex", alignItems: "center", gap: 12 }}>
          <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, flex: 1 }}>
            🧩 Add Component
          </h3>
          <input
            className="form-control"
            style={{ width: 200, fontSize: "0.85rem" }}
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
          <button className="btn-icon" onClick={onClose} style={{ fontSize: "1.1rem" }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
          {filtered.length === 0 ? (
            <div className="empty-state"><p>No components found.</p></div>
          ) : (
            typeOrder
              .filter((t) => grouped[t]?.length)
              .map((type) => (
                <div key={type} style={{ marginBottom: 20 }}>
                  <p style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase",
                    letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: 10 }}>
                    {COMPONENT_TYPE_LABELS[type] ?? type}
                  </p>
                  <div style={{ display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
                    {grouped[type].sort((a, b) => a.name.localeCompare(b.name)).map((comp) => (
                      <button
                        key={comp.id}
                        onClick={() => { onSelect(comp.id); onClose(); }}
                        style={{
                          background: "#f8fafc", border: "1px solid var(--border)",
                          borderRadius: 8, padding: "12px 14px", cursor: "pointer",
                          textAlign: "left", transition: "all 0.15s",
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--primary)";
                          (e.currentTarget as HTMLButtonElement).style.background = "white";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)";
                          (e.currentTarget as HTMLButtonElement).style.background = "#f8fafc";
                        }}
                      >
                        <p style={{ margin: 0, fontWeight: 600, fontSize: "0.875rem" }}>{comp.name}</p>
                        {comp.namespace && (
                          <p style={{ margin: "2px 0 0", fontSize: "0.72rem",
                            color: "var(--text-muted)", fontFamily: "monospace" }}>
                            {comp.namespace}
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))
          )}
        </div>
      </div>
    </div>
  );
}
