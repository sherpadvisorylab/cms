"use client";

import { useState, useRef, useTransition } from "react";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { SlideDrawer } from "@/components/admin/SlideDrawer";
import {
  COMPONENT_STATUSES,
  COMPONENT_TYPE_LABELS,
  COMPONENT_CATEGORIES_BY_TYPE,
  type ComponentType,
  type ComponentStatus,
} from "@sherpacms/domain";
import { quickUpdateComponent, importComponent } from "./actions";
import { useRouter } from "next/navigation";

const VISIBLE_COMPONENT_TYPES: ComponentType[] = ["page", "ui"];

const CATEGORY_ICONS: Record<string, string> = {
  Hero: "▶",
  "Content block": "≡",
  Features: "☑",
  Testimonials: "❝",
  CTA: "📣",
  Team: "👥",
  Pricing: "🏷",
  FAQ: "?",
  Contact: "✉",
  Footer: "▁",
  Gallery: "🖼",
  Stats: "📊",
  Newsletter: "📰",
  Map: "📍",
  Container: "□",
  Wrapper: "⬜",
  Grid: "⊞",
  Columns: "⫿",
  Spacer: "↕",
  Divider: "—",
  "Layout block": "▣",
  "Fixed block": "📌",
  Decorative: "🎨",
  Header: "H",
  Navbar: "☰",
  Breadcrumb: "›",
  Sidebar: "⫿",
  Tabs: "📁",
  Pagination: "…",
  Menu: "☰",
};

function getCategoryIcon(category: string | null | undefined): string {
  return CATEGORY_ICONS[category ?? ""] ?? "◇";
}

export type ComponentRow = {
  id: string;
  name: string;
  namespace: string | null;
  category: string | null;
  type: ComponentType;
  status: ComponentStatus;
};

type SeedImportPayload = {
  name: string;
  namespace?: string;
  type?: "page" | "ui";
  category?: string;
  description?: string;
  status?: "draft" | "published";
  version?: {
    templateLiquid?: string;
    schema?: unknown[];
    css?: string;
    js?: string;
    schemaOrgTemplate?: string;
  };
};

function parseSeedImportPayload(payload: Record<string, unknown>) {
  if (!payload.name || typeof payload.name !== "string") {
    throw new Error("Missing required field: name");
  }

  const parsed = payload as SeedImportPayload;

  if (!parsed.version || typeof parsed.version !== "object") {
    throw new Error("Missing required field: version");
  }

  if (typeof parsed.version.templateLiquid !== "string") {
    throw new Error("Missing required field: version.templateLiquid");
  }

  return {
    name: parsed.name,
    namespace: parsed.namespace,
    type: parsed.type ?? "page",
    category: parsed.category,
    description: parsed.description,
    status: parsed.status,
    templateLiquid: parsed.version.templateLiquid,
    schema: Array.isArray(parsed.version.schema) ? parsed.version.schema : [],
    css: parsed.version.css ?? "",
    js: parsed.version.js ?? "",
    schemaOrgTemplate: parsed.version.schemaOrgTemplate ?? "",
  };
}

export function ComponentsBrowser({ components }: { components: ComponentRow[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [activeType, setActiveType] = useState<string>("page");
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [drawerComp, setDrawerComp] = useState<ComponentRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editType, setEditType] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importModal, setImportModal] = useState(false);
  const [importJson, setImportJson] = useState("");
  const [importError, setImportError] = useState("");
  const [importing, setImporting] = useState(false);

  const categories = COMPONENT_CATEGORIES_BY_TYPE[activeType as ComponentType] ?? [];
  const filtered = components.filter(
    (component) => component.type === activeType && (activeCategory === "" || component.category === activeCategory),
  );

  function handleTypeChange(type: string) {
    setActiveType(type);
    setActiveCategory("");
  }

  function openDrawer(component: ComponentRow) {
    setDrawerComp(component);
    setEditName(component.name);
    setEditCategory(component.category ?? "");
    setEditType(component.type);
    setEditStatus(component.status);
  }

  async function handleSave() {
    if (!drawerComp) {
      return;
    }

    setSaving(true);
    try {
      await quickUpdateComponent(drawerComp.id, {
        name: editName,
        category: editCategory || null,
        status: editStatus,
        type: editType,
      });
      setDrawerComp(null);
    } finally {
      setSaving(false);
    }
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      setImportJson((loadEvent.target?.result as string) ?? "");
      setImportError("");
      setImportModal(true);
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  function handleImport() {
    setImportError("");

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(importJson);
    } catch {
      setImportError("Invalid JSON. Check the file content.");
      return;
    }

    let parsedPayload: ReturnType<typeof parseSeedImportPayload>;
    try {
      parsedPayload = parseSeedImportPayload(payload);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "Invalid component seed file.");
      return;
    }

    setImporting(true);
    startTransition(async () => {
      const newId = await importComponent(parsedPayload);
      setImporting(false);
      setImportModal(false);
      setImportJson("");
      router.push(`/admin/components/${newId}`);
    });
  }

  return (
    <>
      <AdminPageHeader
        title="Components"
        actions={
          <div style={{ display: "flex", gap: 8 }}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              style={{ display: "none" }}
              onChange={handleFileChange}
            />
            <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()}>
              ↑ Import
            </button>
            <Link href="/admin/components/new" className="btn btn-primary">
              + Add component
            </Link>
          </div>
        }
        tabs={VISIBLE_COMPONENT_TYPES.map((type) => (
          <button
            key={type}
            className={`tab ${activeType === type ? "active" : ""}`}
            onClick={() => handleTypeChange(type)}
          >
            {type === "page" ? "📄 " : type === "ui" ? "🧩 " : "🧭 "}
            {COMPONENT_TYPE_LABELS[type]}
          </button>
        ))}
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "220px 1fr",
          gap: 20,
          minHeight: "calc(100vh - 260px)",
        }}
      >
        <div className="card" style={{ padding: 12, overflowY: "auto" }}>
          <p
            style={{
              fontSize: "0.7rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "var(--text-muted)",
              marginBottom: 10,
            }}
          >
            Categories
          </p>
          <CategoryItem
            label="All"
            icon="◈"
            count={components.filter((component) => component.type === activeType).length}
            active={activeCategory === ""}
            onClick={() => setActiveCategory("")}
          />
          {categories.map((category: string) => (
            <CategoryItem
              key={category}
              label={category}
              icon={getCategoryIcon(category)}
              count={components.filter((component) => component.type === activeType && component.category === category).length}
              active={activeCategory === category}
              onClick={() => setActiveCategory(category)}
            />
          ))}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))",
            gridAutoRows: 190,
            gap: 14,
            alignContent: "start",
          }}
        >
          {filtered.length === 0 ? (
            <div className="empty-state" style={{ gridColumn: "1/-1" }}>
              <p style={{ fontSize: "2.5rem", marginBottom: 8 }}>◇</p>
              <p>{activeCategory ? `No components in "${activeCategory}".` : `No ${activeType} components yet.`}</p>
              <Link href="/admin/components/new" className="btn btn-primary btn-sm" style={{ marginTop: 12 }}>
                Add component
              </Link>
            </div>
          ) : (
            filtered.map((component) => (
              <ComponentCard key={component.id} comp={component} onSettings={() => openDrawer(component)} />
            ))
          )}
        </div>
      </div>

      <SlideDrawer open={!!drawerComp} onClose={() => setDrawerComp(null)} title={drawerComp?.name ?? "Component settings"}>
        {drawerComp && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Name</label>
              <input className="form-control" value={editName} onChange={(event) => setEditName(event.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-control" value={editCategory} onChange={(event) => setEditCategory(event.target.value)}>
                <option value="">- None -</option>
                {(COMPONENT_CATEGORIES_BY_TYPE[editType as ComponentType] ?? []).map((category: string) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Type</label>
                <select
                  className="form-control"
                  value={editType}
                  onChange={(event) => {
                    setEditType(event.target.value);
                    setEditCategory("");
                  }}
                >
                  {VISIBLE_COMPONENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-control" value={editStatus} onChange={(event) => setEditStatus(event.target.value)}>
                  {COMPONENT_STATUSES.map((status: string) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, paddingTop: 8 }}>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving || !editName}>
                {saving ? "Saving..." : "Save changes"}
              </button>
              <Link href={`/admin/components/${drawerComp.id}`} className="btn btn-secondary" onClick={() => setDrawerComp(null)}>
                Open editor
              </Link>
            </div>
          </div>
        )}
      </SlideDrawer>

      {importModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            zIndex: 500,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => {
            setImportModal(false);
            setImportJson("");
            setImportError("");
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: 12,
              padding: 28,
              width: 560,
              boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700 }}>Import Component</h3>
              <button
                type="button"
                style={{ background: "none", border: "none", fontSize: "1.2rem", cursor: "pointer" }}
                onClick={() => {
                  setImportModal(false);
                  setImportJson("");
                  setImportError("");
                }}
              >
                ×
              </button>
            </div>
            <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-muted)" }}>
              Paste a seed-format component JSON file, or load a <code>.component.json</code> file.
            </p>
            <textarea
              value={importJson}
              onChange={(event) => {
                setImportJson(event.target.value);
                setImportError("");
              }}
              rows={12}
              style={{
                fontFamily: "monospace",
                fontSize: "0.78rem",
                resize: "vertical",
                border: "1px solid var(--border)",
                borderRadius: 6,
                padding: "8px 10px",
              }}
              placeholder={'{"name":"My Component","type":"page","version":{"templateLiquid":"<div></div>"}}'}
            />
            {importError && (
              <p
                style={{
                  margin: 0,
                  fontSize: "0.82rem",
                  color: "var(--danger)",
                  background: "#fef2f2",
                  padding: "8px 12px",
                  borderRadius: 6,
                }}
              >
                ⚠ {importError}
              </p>
            )}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => fileInputRef.current?.click()}>
                Load file...
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setImportModal(false);
                  setImportJson("");
                  setImportError("");
                }}
              >
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={handleImport} disabled={!importJson.trim() || importing}>
                {importing ? "Importing..." : "↑ Import component"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function CategoryItem({
  label,
  icon,
  count,
  active,
  onClick,
}: {
  label: string;
  icon: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: "9px 10px",
        borderRadius: 6,
        cursor: "pointer",
        marginBottom: 2,
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontSize: "0.875rem",
        background: active ? "var(--primary)" : "transparent",
        color: active ? "white" : "var(--text-muted)",
        transition: "all 0.12s",
      }}
    >
      <span style={{ opacity: 0.8, width: 18, textAlign: "center" }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      {count > 0 && (
        <span
          style={{
            fontSize: "0.68rem",
            borderRadius: 10,
            padding: "1px 6px",
            minWidth: 18,
            textAlign: "center",
            background: active ? "rgba(255,255,255,0.25)" : "var(--bg-light)",
            color: active ? "white" : "var(--text-muted)",
          }}
        >
          {count}
        </span>
      )}
    </div>
  );
}

function ComponentCard({ comp, onSettings }: { comp: ComponentRow; onSettings: () => void }) {
  const isPublished = comp.status === "published";
  const icon = getCategoryIcon(comp.category);

  return (
    <div
      className="component-card"
      style={{
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
        borderRadius: 10,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        height: 190,
        cursor: "pointer",
        transition: "all 0.18s",
        position: "relative",
      }}
      onClick={() => {
        window.location.href = `/admin/components/${comp.id}`;
      }}
      onMouseEnter={(event) => {
        const element = event.currentTarget as HTMLDivElement;
        element.style.borderColor = "var(--primary)";
        element.style.background = "#fff";
        element.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
        element.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(event) => {
        const element = event.currentTarget as HTMLDivElement;
        element.style.borderColor = "#e2e8f0";
        element.style.background = "#f8fafc";
        element.style.boxShadow = "none";
        element.style.transform = "none";
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 10,
          right: 10,
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: isPublished ? "var(--success)" : "var(--warning)",
          border: "2px solid white",
        }}
        title={comp.status}
      />

      <button
        className="card-settings-btn"
        onClick={(event) => {
          event.stopPropagation();
          onSettings();
        }}
        style={{
          position: "absolute",
          top: 8,
          right: 22,
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "var(--text-muted)",
          padding: "2px 4px",
          opacity: 0,
          transition: "opacity 0.15s",
        }}
        title="Quick settings"
      >
        ⋮
      </button>

      <div
        style={{
          height: 105,
          background: "#f1f5f9",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          fontSize: "2rem",
        }}
      >
        {icon}
      </div>

      <div
        style={{
          padding: "10px 12px",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <h3
          style={{
            fontSize: "0.9rem",
            fontWeight: 700,
            color: "var(--text)",
            margin: "0 0 3px",
            lineHeight: 1.25,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {comp.name}
        </h3>
        <p style={{ fontSize: "0.72rem", color: "#94a3b8", margin: 0 }}>{comp.category ?? comp.type}</p>
      </div>
    </div>
  );
}
