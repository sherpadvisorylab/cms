"use client";

import { useState } from "react";
import Link from "next/link";
import { SlideDrawer } from "@/components/admin/SlideDrawer";
import {
  COMPONENT_TYPES,
  COMPONENT_STATUSES,
  COMPONENT_TYPE_LABELS,
  COMPONENT_CATEGORIES_BY_TYPE,
  type ComponentType,
  type ComponentStatus,
} from "@cms/domain";
import { quickUpdateComponent } from "./actions";

// ── Category icons ────────────────────────────────────────────────────────────
const CATEGORY_ICONS: Record<string, string> = {
  "Hero": "▶", "Content block": "≡", "Features": "☑", "Testimonials": "❝",
  "CTA": "📣", "Team": "👥", "Pricing": "🏷", "FAQ": "?", "Contact": "✉",
  "Footer": "▁", "Gallery": "🖼", "Stats": "📊", "Newsletter": "📰", "Map": "📍",
  "Container": "□", "Wrapper": "⬜", "Grid": "⊞", "Columns": "⫿", "Spacer": "↕",
  "Divider": "—", "Layout block": "▣", "Fixed block": "📌", "Decorative": "🎨",
  "Header": "H", "Navbar": "☰", "Breadcrumb": "›", "Sidebar": "⫿",
  "Footer nav": "🔗", "Tabs": "📁", "Pagination": "…", "Menu": "☰",
};
function getCategoryIcon(cat: string | null | undefined): string {
  return CATEGORY_ICONS[cat ?? ""] ?? "◇";
}

// ── Types ─────────────────────────────────────────────────────────────────────
export type ComponentRow = {
  id: string;
  name: string;
  namespace: string | null;
  type: ComponentType;
  status: ComponentStatus;
};

// ── Main browser ──────────────────────────────────────────────────────────────
export function ComponentsBrowser({ components }: { components: ComponentRow[] }) {
  const [activeType,     setActiveType]     = useState<string>("page");
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [drawerComp,     setDrawerComp]     = useState<ComponentRow | null>(null);
  const [saving,         setSaving]         = useState(false);
  const [editName,       setEditName]       = useState("");
  const [editNamespace,  setEditNamespace]  = useState("");
  const [editType,       setEditType]       = useState("");
  const [editStatus,     setEditStatus]     = useState("");

  const categories = COMPONENT_CATEGORIES_BY_TYPE[activeType as ComponentType] ?? [];

  const filtered = components.filter(
    (c) => c.type === activeType && (activeCategory === "" || c.namespace === activeCategory)
  );

  function handleTypeChange(type: string) {
    setActiveType(type);
    setActiveCategory("");
  }

  function openDrawer(comp: ComponentRow) {
    setDrawerComp(comp);
    setEditName(comp.name);
    setEditNamespace(comp.namespace ?? "");
    setEditType(comp.type);
    setEditStatus(comp.status);
  }

  async function handleSave() {
    if (!drawerComp) return;
    setSaving(true);
    try {
      await quickUpdateComponent(drawerComp.id, {
        name: editName, namespace: editNamespace || null,
        status: editStatus, type: editType,
      });
      setDrawerComp(null);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {/* Type tabs + Add button */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div className="tabs" style={{ marginBottom: 0, flex: 1 }}>
          {COMPONENT_TYPES.map((type) => (
            <button
              key={type}
              className={`tab ${activeType === type ? "active" : ""}`}
              onClick={() => handleTypeChange(type)}
            >
              {type === "page" ? "📄 " : type === "ui" ? "🧩 " : "🧭 "}
              {COMPONENT_TYPE_LABELS[type]}
            </button>
          ))}
        </div>
        <Link href="/admin/components/new" className="btn btn-primary" style={{ marginLeft: 16 }}>
          + Add component
        </Link>
      </div>

      {/* Two-panel layout */}
      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 20, minHeight: "calc(100vh - 260px)" }}>
        {/* Category sidebar */}
        <div className="card" style={{ padding: 12, overflowY: "auto" }}>
          <p style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: 10 }}>
            Categories
          </p>
          {/* All */}
          <CategoryItem
            label="All"
            icon="◈"
            count={components.filter((c) => c.type === activeType).length}
            active={activeCategory === ""}
            onClick={() => setActiveCategory("")}
          />
          {categories.map((cat: string) => (
            <CategoryItem
              key={cat}
              label={cat}
              icon={getCategoryIcon(cat)}
              count={components.filter((c) => c.type === activeType && c.namespace === cat).length}
              active={activeCategory === cat}
              onClick={() => setActiveCategory(cat)}
            />
          ))}
        </div>

        {/* Component card grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gridAutoRows: 190, gap: 14, alignContent: "start" }}>
          {filtered.length === 0 ? (
            <div className="empty-state" style={{ gridColumn: "1/-1" }}>
              <p style={{ fontSize: "2.5rem", marginBottom: 8 }}>◇</p>
              <p>{activeCategory ? `No components in "${activeCategory}".` : `No ${activeType} components yet.`}</p>
              <Link href="/admin/components/new" className="btn btn-primary btn-sm" style={{ marginTop: 12 }}>
                Add component
              </Link>
            </div>
          ) : (
            filtered.map((comp) => (
              <ComponentCard key={comp.id} comp={comp} onSettings={() => openDrawer(comp)} />
            ))
          )}
        </div>
      </div>

      {/* Quick-settings drawer */}
      <SlideDrawer open={!!drawerComp} onClose={() => setDrawerComp(null)} title={drawerComp?.name ?? "Component settings"}>
        {drawerComp && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Name</label>
              <input className="form-control" value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-control" value={editNamespace} onChange={(e) => setEditNamespace(e.target.value)}>
                <option value="">— None —</option>
                {(COMPONENT_CATEGORIES_BY_TYPE[editType as ComponentType] ?? []).map((cat: string) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Type</label>
                <select className="form-control" value={editType} onChange={(e) => { setEditType(e.target.value); setEditNamespace(""); }}>
                  {COMPONENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-control" value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
                  {COMPONENT_STATUSES.map((s: string) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, paddingTop: 8 }}>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving || !editName}>
                {saving ? "Saving…" : "Save changes"}
              </button>
              <Link href={`/admin/components/${drawerComp.id}`} className="btn btn-secondary" onClick={() => setDrawerComp(null)}>
                Open editor
              </Link>
            </div>
          </div>
        )}
      </SlideDrawer>
    </>
  );
}

// ── Category item ─────────────────────────────────────────────────────────────
function CategoryItem({ label, icon, count, active, onClick }: {
  label: string; icon: string; count: number; active: boolean; onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: "9px 10px", borderRadius: 6, cursor: "pointer", marginBottom: 2,
        display: "flex", alignItems: "center", gap: 8, fontSize: "0.875rem",
        background: active ? "var(--primary)" : "transparent",
        color: active ? "white" : "var(--text-muted)",
        transition: "all 0.12s",
      }}
    >
      <span style={{ opacity: 0.8, width: 18, textAlign: "center" }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      {count > 0 && (
        <span style={{
          fontSize: "0.68rem", borderRadius: 10, padding: "1px 6px", minWidth: 18, textAlign: "center",
          background: active ? "rgba(255,255,255,0.25)" : "var(--bg-light)",
          color: active ? "white" : "var(--text-muted)",
        }}>{count}</span>
      )}
    </div>
  );
}

// ── Component card ────────────────────────────────────────────────────────────
function ComponentCard({ comp, onSettings }: { comp: ComponentRow; onSettings: () => void }) {
  const isPublished = comp.status === "active" || comp.status === "published";
  const icon = getCategoryIcon(comp.namespace);

  return (
    <div
      className="component-card"
      style={{
        background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10,
        overflow: "hidden", display: "flex", flexDirection: "column",
        height: 190, cursor: "pointer", transition: "all 0.18s", position: "relative",
      }}
      onClick={() => (window.location.href = `/admin/components/${comp.id}`)}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "var(--primary)";
        (e.currentTarget as HTMLDivElement).style.background = "#fff";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "#e2e8f0";
        (e.currentTarget as HTMLDivElement).style.background = "#f8fafc";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
        (e.currentTarget as HTMLDivElement).style.transform = "none";
      }}
    >
      {/* Status dot */}
      <div style={{
        position: "absolute", top: 10, right: 10, width: 8, height: 8,
        borderRadius: "50%", background: isPublished ? "var(--success)" : "var(--warning)", border: "2px solid white",
      }} title={comp.status} />

      {/* Settings button */}
      <button
        className="card-settings-btn"
        onClick={(e) => { e.stopPropagation(); onSettings(); }}
        style={{
          position: "absolute", top: 8, right: 22, background: "none", border: "none",
          cursor: "pointer", color: "var(--text-muted)", padding: "2px 4px", opacity: 0, transition: "opacity 0.15s",
        }}
        title="Quick settings"
      >⋮</button>

      {/* Icon area */}
      <div style={{ height: 105, background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "2rem" }}>
        {icon}
      </div>

      {/* Name + category */}
      <div style={{ padding: "10px 12px", flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <h3 style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text)", margin: "0 0 3px", lineHeight: 1.25, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {comp.name}
        </h3>
        <p style={{ fontSize: "0.72rem", color: "#94a3b8", margin: 0 }}>
          {comp.namespace ?? comp.type}
        </p>
      </div>
    </div>
  );
}
