"use client";

import { useState, useEffect } from "react";
import { COMPONENT_TYPE_LABELS, type ComponentType } from "@sherpacms/domain";

type ComponentMeta = { id: string; name: string; namespace: string | null; type: string; status: string };
type CollectionMeta = { slug: string; name: string; views: { slug: string; name: string }[] };

type Tab = "components" | "collections";

interface Props {
  components: ComponentMeta[];
  collections?: CollectionMeta[];
  onSelect: (componentId: string) => void;
  onSelectCollection?: (slug: string, viewSlug?: string) => void;
  onClose: () => void;
}

export function ComponentPickerModal({ components, collections = [], onSelect, onSelectCollection, onClose }: Props) {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<Tab>("components");

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const q = search.toLowerCase();
  const filteredComponents = components.filter(
    (c) =>
      c.status !== "inactive" &&
      (!q || c.name.toLowerCase().includes(q) || (c.namespace ?? "").toLowerCase().includes(q))
  );
  const filteredCollections = collections.filter(
    (c) => !q || c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q)
  );

  // Group components by type
  const grouped: Record<string, ComponentMeta[]> = {};
  for (const c of filteredComponents) {
    const t = c.type || "page";
    if (!grouped[t]) grouped[t] = [];
    grouped[t].push(c);
  }
  const typeOrder: ComponentType[] = ["page", "ui"];

  const hasCollections = collections.length > 0;

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
            {tab === "components" ? "🧩 Add Component" : "🗃️ Add Collection"}
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

        {/* Tab bar */}
        {hasCollections && (
          <div style={{ display: "flex", borderBottom: "1px solid var(--border)", padding: "0 16px" }}>
            {(["components", "collections"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  padding: "10px 16px", fontSize: "0.82rem", fontWeight: tab === t ? 700 : 400,
                  background: "none", border: "none", cursor: "pointer",
                  borderBottom: tab === t ? "2px solid var(--primary)" : "2px solid transparent",
                  color: tab === t ? "var(--primary)" : "var(--text-muted)",
                  textTransform: "capitalize",
                }}
              >
                {t === "components" ? `Components (${components.length})` : `Collections (${collections.length})`}
              </button>
            ))}
          </div>
        )}

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>

          {/* ── COMPONENTS TAB ── */}
          {tab === "components" && (
            filteredComponents.length === 0 ? (
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
            )
          )}

          {/* ── COLLECTIONS TAB ── */}
          {tab === "collections" && (
            filteredCollections.length === 0 ? (
              <div className="empty-state"><p>No collections found.</p></div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {filteredCollections.map((col) => (
                  <div key={col.slug}>
                    <p style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase",
                      letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: 8 }}>
                      {col.name}
                      <span style={{ fontFamily: "monospace", fontWeight: 400, marginLeft: 6 }}>({col.slug})</span>
                    </p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
                      {/* Default view card */}
                      <button
                        onClick={() => { onSelectCollection?.(col.slug, undefined); onClose(); }}
                        style={collectionCardStyle}
                        onMouseEnter={(e) => applyHover(e, true)}
                        onMouseLeave={(e) => applyHover(e, false)}
                      >
                        <p style={{ margin: 0, fontWeight: 600, fontSize: "0.875rem" }}>Default view</p>
                        <p style={{ margin: "3px 0 0", fontSize: "0.72rem", color: "var(--text-muted)", fontFamily: "monospace" }}>
                          {`{{collection:${col.slug}}}`}
                        </p>
                      </button>
                      {/* Per-view cards */}
                      {col.views.map((v) => (
                        <button
                          key={v.slug}
                          onClick={() => { onSelectCollection?.(col.slug, v.slug); onClose(); }}
                          style={collectionCardStyle}
                          onMouseEnter={(e) => applyHover(e, true)}
                          onMouseLeave={(e) => applyHover(e, false)}
                        >
                          <p style={{ margin: 0, fontWeight: 600, fontSize: "0.875rem" }}>{v.name}</p>
                          <p style={{ margin: "3px 0 0", fontSize: "0.72rem", color: "var(--text-muted)", fontFamily: "monospace" }}>
                            {`{{collection:${col.slug}:${v.slug}}}`}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

const collectionCardStyle: React.CSSProperties = {
  background: "#f0fdf4", border: "1px solid #bbf7d0",
  borderRadius: 8, padding: "12px 14px", cursor: "pointer",
  textAlign: "left", transition: "all 0.15s",
};

function applyHover(e: React.MouseEvent<HTMLButtonElement>, hovering: boolean) {
  (e.currentTarget as HTMLButtonElement).style.borderColor = hovering ? "#16a34a" : "#bbf7d0";
  (e.currentTarget as HTMLButtonElement).style.background = hovering ? "white" : "#f0fdf4";
}
