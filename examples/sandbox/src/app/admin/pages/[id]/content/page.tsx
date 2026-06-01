"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { updateStructure } from "../../actions";
import { PageEditorHeader } from "../PageEditorHeader";
import { PublishToggle } from "@/components/admin/PublishToggle";
import { ComponentPickerModal } from "@/components/admin/ComponentPickerModal";
import { ImageUploadField, type ImageValue } from "@/components/admin/ImageUploadField";
import { SlideDrawer } from "@/components/admin/SlideDrawer";
import type { ComponentInstance, ComponentSchemaField } from "@cms/domain";

// ── Types ─────────────────────────────────────────────────────────────────────
type ComponentMeta = { id: string; name: string; namespace: string | null; type: string };
type VersionInfo = { id: string; version: number; createdAt: string; publishedAt: string | null;
                     componentCount: number; isCurrent: boolean; isPublished: boolean };
type Viewport = "desktop" | "tablet" | "mobile";

const VIEWPORT_WIDTH: Record<Viewport, string> = {
  desktop: "100%",
  tablet:  "820px",
  mobile:  "390px",
};

// ── Placement col widths ───────────────────────────────────────────────────────
const COL_SPAN: Record<string, string> = {
  full:  "span 12",
  half:  "span 6",
  third: "span 4",
};

// ── Guided tour steps ──────────────────────────────────────────────────────────
const TOUR_STEPS = [
  { title: "Welcome to the Content Editor",
    body:  "Here you edit each component's content fields. Components are defined in the Components section." },
  { title: "Add Components",
    body:  "Click '+ Add component to end' to add a component to the page, or '+ Insert below' between existing ones." },
  { title: "Fill Fields",
    body:  "Each component shows its editable fields. Field layout follows the Placement tab from the component editor." },
  { title: "Live Preview",
    body:  "Toggle the preview pane to see the rendered page. Switch between Desktop, Tablet and Mobile viewports." },
  { title: "Save & Publish",
    body:  "Click 'Save Content' to save a new draft version. Use the Settings tab to publish the page." },
];

// ── FieldInput ────────────────────────────────────────────────────────────────
function FieldInput({ field, value, onChange }: {
  field: ComponentSchemaField; value: unknown; onChange: (v: unknown) => void;
}) {
  const str = (value ?? field.defaultValue ?? "") as string;
  switch (field.type) {
    case "textarea":
      return <textarea className="form-control" rows={3} value={str}
        onChange={(e) => onChange(e.target.value)} placeholder={field.helpText} />;
    case "richtext":
      return <textarea className="form-control" rows={5} value={str}
        onChange={(e) => onChange(e.target.value)} placeholder={field.helpText ?? "HTML allowed"} />;
    case "image_url":
      return <ImageUploadField value={value as ImageValue} onChange={onChange} withAlt accept="image"
        placeholder={field.helpText} />;
    case "video_url":
      return <ImageUploadField value={value as ImageValue} onChange={onChange} withAlt accept="video"
        placeholder={field.helpText} />;
    case "color":
      return <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input type="color" value={str || "#000000"} onChange={(e) => onChange(e.target.value)}
          style={{ width: 40, height: 34, padding: 1, borderRadius: 4, border: "1px solid var(--border)", cursor: "pointer" }} />
        <input className="form-control" value={str} onChange={(e) => onChange(e.target.value)}
          placeholder="#000000" style={{ fontFamily: "monospace", width: 120 }} />
      </div>;
    case "toggle":
      return <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
        <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
        <span style={{ fontSize: "0.85rem" }}>{field.helpText ?? field.label}</span>
      </label>;
    case "number":
      return <input type="number" className="form-control" value={value as number ?? ""}
        onChange={(e) => onChange(Number(e.target.value))} placeholder={field.helpText} />;
    case "select":
      return <select className="form-control" value={str} onChange={(e) => onChange(e.target.value)}>
        <option value="">— Select —</option>
        {(field.options ?? []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>;
    default:
      return <input type="text" className="form-control" value={str}
        onChange={(e) => onChange(e.target.value)} placeholder={field.helpText} />;
  }
}

// ── ComponentCard ─────────────────────────────────────────────────────────────
function ComponentCard({ instance, index, total, schema, componentName, namespace,
  onPropChange, onMoveUp, onMoveDown, onRemove, onInsertBelow }: {
  instance: ComponentInstance; index: number; total: number;
  schema: ComponentSchemaField[]; componentName: string; namespace: string | null;
  onPropChange: (key: string, value: unknown) => void;
  onMoveUp: () => void; onMoveDown: () => void;
  onRemove: () => void; onInsertBelow: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
        marginBottom: collapsed ? 0 : (schema.length > 0 ? 16 : 0) }}
        onClick={() => setCollapsed((c) => !c)}>
        <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 700, minWidth: 28 }}>
          #{index + 1}
        </span>
        <div style={{ flex: 1 }}>
          <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>{componentName}</span>
          {namespace && <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginLeft: 8 }}>{namespace}</span>}
        </div>
        <div style={{ display: "flex", gap: 4 }} onClick={(e) => e.stopPropagation()}>
          <button className="btn-icon" onClick={onMoveUp} disabled={index === 0}>▲</button>
          <button className="btn-icon" onClick={onMoveDown} disabled={index >= total - 1}>▼</button>
          <button className="btn-icon" onClick={onInsertBelow} style={{ color: "var(--primary)" }}>+</button>
          <button className="btn-icon" onClick={onRemove} style={{ color: "var(--danger)" }}>✕</button>
        </div>
        <span style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}>{collapsed ? "▶" : "▼"}</span>
      </div>

      {!collapsed && (
        schema.length === 0
          ? <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", margin: 0 }}>No editable fields.</p>
          : (
            /* Placement-aware 12-column grid */
            <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: "12px 16px" }}>
              {schema.map((field) => (
                <div key={field.key} style={{
                  gridColumn: COL_SPAN[(field as ComponentSchemaField & { colWidth?: string }).colWidth ?? "full"] ?? "span 12",
                }}>
                  <label className="form-label" style={{ display: "block", marginBottom: 4 }}>
                    {field.label}
                  </label>
                  <FieldInput field={field} value={instance.props[field.key]}
                    onChange={(v) => onPropChange(field.key, v)} />
                </div>
              ))}
            </div>
          )
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ContentPage() {
  const params = useParams();
  const pageId = params.id as string;

  const [pageTitle,    setPageTitle]    = useState("");
  const [pageSlug,     setPageSlug]     = useState("");
  const [pageArea,     setPageArea]     = useState("");
  const [isPublished,  setIsPublished]  = useState(false);
  const [structure,   setStructure]   = useState<ComponentInstance[]>([]);
  const [schemas,     setSchemas]     = useState<Record<string, ComponentSchemaField[]>>({});
  const [components,  setComponents]  = useState<ComponentMeta[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [saved,       setSaved]       = useState(false);
  const [showPicker,  setShowPicker]  = useState(false);
  const [insertAfter, setInsertAfter] = useState<number | null>(null);

  // Preview
  const [showPreview,   setShowPreview]   = useState(false);
  const [viewport,      setViewport]      = useState<Viewport>("desktop");
  const [previewKey,    setPreviewKey]    = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // History
  const [showHistory,  setShowHistory]  = useState(false);
  const [versions,     setVersions]     = useState<VersionInfo[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Tour
  const TOUR_KEY = `cms.tour.content.v1.${pageId}`;
  const [tourStep, setTourStep] = useState<number | null>(null);

  // ── Load page data ───────────────────────────────────────────────────────────
  useEffect(() => {
    fetch(`/admin/pages/${pageId}/content/data`)
      .then((r) => r.json())
      .then((d) => {
        setPageTitle(d.pageTitle ?? "Page");
        setPageSlug(d.pageSlug ?? "");
        setPageArea(d.pageArea ?? "");
        setIsPublished(!!d.isPublished);
        setStructure(d.structure ?? []);
        setSchemas(d.componentSchemas ?? {});
        setComponents(d.components ?? []);
        setLoading(false);
        // Show tour on first visit
        if (!localStorage.getItem(TOUR_KEY)) setTourStep(0);
      });
  }, [pageId, TOUR_KEY]);

  // ── Structure helpers ────────────────────────────────────────────────────────
  function getComp(id: string) { return components.find((c) => c.id === id); }

  function updateProp(idx: number, key: string, value: unknown) {
    setStructure((prev) => prev.map((item, i) =>
      i === idx ? { ...item, props: { ...item.props, [key]: value } } : item));
  }

  function moveUp(idx: number) {
    setStructure((prev) => {
      if (idx === 0) return prev;
      const next = [...prev]; [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]; return next;
    });
  }

  function moveDown(idx: number) {
    setStructure((prev) => {
      if (idx >= prev.length - 1) return prev;
      const next = [...prev]; [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]; return next;
    });
  }

  function removeComponent(idx: number) {
    setStructure((prev) => prev.filter((_, i) => i !== idx));
  }

  function addComponent(componentId: string) {
    const newItem: ComponentInstance = { componentId, props: {} };
    if (insertAfter !== null) {
      setStructure((prev) => { const next = [...prev]; next.splice(insertAfter + 1, 0, newItem); return next; });
    } else {
      setStructure((prev) => [...prev, newItem]);
    }
    if (!schemas[componentId]) {
      fetch(`/admin/components/${componentId}/data`).then((r) => r.json())
        .then((d) => setSchemas((prev) => ({ ...prev, [componentId]: d.schemaJson ?? [] })));
    }
    setShowPicker(false); setInsertAfter(null);
  }

  // ── Save ─────────────────────────────────────────────────────────────────────
  async function handleSave() {
    setSaving(true);
    await updateStructure(pageId, JSON.stringify(structure));
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    setPreviewKey((k) => k + 1); // refresh preview after save
  }

  // ── History ──────────────────────────────────────────────────────────────────
  async function openHistory() {
    setShowHistory(true);
    setHistoryLoading(true);
    const r = await fetch(`/admin/pages/${pageId}/versions/data`);
    const d = await r.json();
    setVersions(d.versions ?? []);
    setHistoryLoading(false);
  }

  async function restoreVersion(versionId: string) {
    const r = await fetch(`/admin/pages/${pageId}/versions/${versionId}/data`);
    const d = await r.json();
    if (d.structure) {
      setStructure(d.structure);
      setShowHistory(false);
      setSaved(false);
    }
  }

  // ── Tour ─────────────────────────────────────────────────────────────────────
  function startTour() { setTourStep(0); }
  function nextTourStep() {
    if (tourStep === null) return;
    if (tourStep >= TOUR_STEPS.length - 1) {
      setTourStep(null); localStorage.setItem(TOUR_KEY, "1");
    } else {
      setTourStep(tourStep + 1);
    }
  }
  function closeTour() { setTourStep(null); localStorage.setItem(TOUR_KEY, "1"); }

  // ── Preview URL — always load draft so unsaved/unpublished content is visible ──
  const previewUrl = pageSlug ? `/${pageSlug}?draft=1` : null;

  if (loading) return <div className="empty-state"><p>Loading…</p></div>;

  return (
    <div>
      <PageEditorHeader
        id={pageId}
        title={pageTitle}
        isPublished={isPublished}
        actions={
          <>
            <button className="btn btn-secondary btn-sm" onClick={startTour}>? Tour</button>
            <button className="btn btn-secondary btn-sm" onClick={openHistory}>⏱ History</button>
            <button
              className="btn btn-sm"
              onClick={() => setShowPreview((v) => !v)}
              title={showPreview ? "Hide preview" : "Show preview"}
              style={showPreview ? {
                background: "#eff6ff",
                color: "#1d4ed8",
                border: "1px solid #bfdbfe",
                fontWeight: 600,
              } : undefined}
            >
              👁 Preview
            </button>
            <PublishToggle
              pageId={pageId}
              initialIsPublished={isPublished}
              pageSlug={pageSlug}
              onToggle={(published) => {
                setIsPublished(published);
                setPreviewKey((k) => k + 1);
              }}
            />
            {saved && <span style={{ fontSize: "0.82rem", color: "var(--success)", fontWeight: 600 }}>✓</span>}
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "💾 Save Content"}
            </button>
          </>
        }
      />

      {/* ── Main split layout ────────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: showPreview ? "1fr 420px" : "1fr",
        gap: 20, alignItems: "start" }}>

        {/* ── Editor column ────────────────────────────────────────────────── */}
        <div>
          {structure.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <p>No components yet. Add your first component.</p>
                <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }}
                  onClick={() => { setInsertAfter(null); setShowPicker(true); }}>
                  + Add component
                </button>
              </div>
            </div>
          ) : (
            <>
              {structure.map((instance, idx) => {
                const comp   = getComp(instance.componentId);
                const schema = schemas[instance.componentId] ?? [];
                return (
                  <ComponentCard
                    key={`${instance.componentId}-${idx}`}
                    instance={instance} index={idx} total={structure.length}
                    schema={schema}
                    componentName={comp?.name ?? instance.componentId}
                    namespace={comp?.namespace ?? null}
                    onPropChange={(key, value) => updateProp(idx, key, value)}
                    onMoveUp={() => moveUp(idx)} onMoveDown={() => moveDown(idx)}
                    onRemove={() => removeComponent(idx)}
                    onInsertBelow={() => { setInsertAfter(idx); setShowPicker(true); }}
                  />
                );
              })}
              <button className="btn btn-secondary btn-sm" style={{ marginTop: 4 }}
                onClick={() => { setInsertAfter(null); setShowPicker(true); }}>
                + Add component to end
              </button>
            </>
          )}
        </div>

        {/* ── Preview column ───────────────────────────────────────────────── */}
        {showPreview && (
          <div style={{ position: "sticky", top: 64 }}>
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              {/* Viewport toolbar */}
              <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "8px 12px",
                borderBottom: "1px solid var(--border)", background: "var(--bg-light)" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)",
                  marginRight: 4 }}>PREVIEW</span>
                {(["desktop", "tablet", "mobile"] as Viewport[]).map((v) => (
                  <button key={v} onClick={() => setViewport(v)}
                    className={`btn btn-sm ${viewport === v ? "btn-primary" : "btn-secondary"}`}
                    style={{ padding: "3px 8px", fontSize: "0.75rem" }}>
                    {v === "desktop" ? "🖥" : v === "tablet" ? "⬜" : "📱"}
                  </button>
                ))}
                <button className="btn-icon" style={{ marginLeft: "auto" }}
                  title="Refresh preview" onClick={() => setPreviewKey((k) => k + 1)}>↺</button>
              </div>

              {/* Status notice */}
              {!isPublished && (
                <div style={{ background: "#fef9c3", color: "#854d0e", fontSize: "0.72rem",
                  padding: "4px 12px", textAlign: "center", fontWeight: 500 }}>
                  Draft — not visible to visitors
                </div>
              )}

              {/* iframe */}
              <div style={{ overflow: "auto", background: "#f0f0f0", padding: 8,
                display: "flex", justifyContent: "center", minHeight: 400 }}>
                {previewUrl ? (
                  <iframe
                    ref={iframeRef}
                    key={previewKey}
                    src={previewUrl}
                    title="Page preview"
                    style={{ width: VIEWPORT_WIDTH[viewport], maxWidth: "100%",
                      minHeight: 500, border: "none", background: "white", borderRadius: 4,
                      boxShadow: "0 2px 8px rgba(0,0,0,0.1)", transition: "width 0.2s" }}
                  />
                ) : (
                  <div style={{ color: "var(--text-muted)", textAlign: "center", padding: 40,
                    fontSize: "0.85rem" }}>
                    Save the page first to enable preview.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Component picker ─────────────────────────────────────────────────── */}
      {showPicker && (
        <ComponentPickerModal components={components} onSelect={addComponent}
          onClose={() => { setShowPicker(false); setInsertAfter(null); }} />
      )}

      {/* ── History drawer ───────────────────────────────────────────────────── */}
      <SlideDrawer open={showHistory} onClose={() => setShowHistory(false)} title="Version History">
        {historyLoading ? (
          <div className="empty-state"><p>Loading…</p></div>
        ) : versions.length === 0 ? (
          <div className="empty-state"><p>No versions yet.</p></div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {versions.map((v) => (
              <div key={v.id} style={{ border: "1px solid var(--border)", borderRadius: 8,
                padding: "12px 14px", background: "var(--bg-light)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, fontSize: "0.88rem" }}>v{v.version}</span>
                  {v.isCurrent && (
                    <span style={{ background: "#dbeafe", color: "#1d4ed8", fontSize: "0.68rem",
                      padding: "1px 6px", borderRadius: 999, fontWeight: 600 }}>current</span>
                  )}
                  {v.isPublished && (
                    <span style={{ background: "#dcfce7", color: "#15803d", fontSize: "0.68rem",
                      padding: "1px 6px", borderRadius: 999, fontWeight: 600 }}>published</span>
                  )}
                </div>
                <p style={{ margin: "0 0 4px", fontSize: "0.78rem", color: "var(--text-muted)" }}>
                  {new Date(v.createdAt).toLocaleString()} · {v.componentCount} component{v.componentCount !== 1 ? "s" : ""}
                </p>
                {!v.isCurrent && (
                  <button className="btn btn-secondary btn-sm" style={{ marginTop: 6 }}
                    onClick={() => restoreVersion(v.id)}>
                    ↩ Restore into editor
                  </button>
                )}
              </div>
            ))}
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 4 }}>
              Restoring loads the version into the editor. Click Save Content to commit it.
            </p>
          </div>
        )}
      </SlideDrawer>

      {/* ── Guided tour overlay ──────────────────────────────────────────────── */}
      {tourStep !== null && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.45)",
          display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "white", borderRadius: 12, maxWidth: 480, width: "100%",
            padding: 24, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>
                Step {tourStep + 1} of {TOUR_STEPS.length}
              </span>
              <button className="btn-icon" style={{ marginLeft: "auto" }} onClick={closeTour}>✕</button>
            </div>
            <h3 style={{ margin: "0 0 8px", fontSize: "1rem", fontWeight: 700 }}>
              {TOUR_STEPS[tourStep].title}
            </h3>
            <p style={{ margin: "0 0 20px", fontSize: "0.88rem", color: "var(--text-muted)",
              lineHeight: 1.6 }}>
              {TOUR_STEPS[tourStep].body}
            </p>
            {/* Progress dots */}
            <div style={{ display: "flex", gap: 6, marginBottom: 16, justifyContent: "center" }}>
              {TOUR_STEPS.map((_, i) => (
                <div key={i} style={{ width: 7, height: 7, borderRadius: "50%",
                  background: i === tourStep ? "var(--primary)" : "var(--border)" }} />
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="btn btn-secondary" onClick={closeTour}>Skip tour</button>
              <button className="btn btn-primary" onClick={nextTourStep}>
                {tourStep >= TOUR_STEPS.length - 1 ? "Done ✓" : "Next →"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
