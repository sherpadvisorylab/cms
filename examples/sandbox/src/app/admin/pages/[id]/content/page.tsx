"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { publishVersion, updateStructure } from "../../actions";
import { PageEditorHeader } from "../PageEditorHeader";
import { PublishToggle } from "@/components/admin/PublishToggle";
import { ComponentPickerModal } from "@/components/admin/ComponentPickerModal";
import { ImageUploadField, type ImageValue } from "@/components/admin/ImageUploadField";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { SlideDrawer } from "@/components/admin/SlideDrawer";
import type { ComponentInstance, ComponentSchemaField } from "@sherpacms/domain";
import { validateFieldValue } from "@/components/admin/validators";
import { SaveAsTemplateDialog } from "@/components/admin/SaveAsTemplateDialog";
import { VersionBadge } from "@/components/admin/VersionBadge";

type ComponentMeta = { id: string; name: string; namespace: string | null; type: string; status: string };
type VersionInfo = {
  id: string;
  version: number;
  createdAt: string;
  publishedAt: string | null;
  componentCount: number;
  isCurrent: boolean;
  isPublished: boolean;
};
type Viewport = "desktop" | "tablet" | "mobile";

const VIEWPORT_WIDTH: Record<Viewport, string> = {
  desktop: "100%",
  tablet: "820px",
  mobile: "390px",
};

const COL_SPAN: Record<string, string> = {
  full: "span 12",
  half: "span 6",
  third: "span 4",
};

const TOUR_STEPS = [
  {
    title: "Welcome to the Content Editor",
    body: "Here you edit each component's content fields. Components are defined in the Components section.",
  },
  {
    title: "Add Components",
    body: "Click '+ Add component to end' to add a component to the page, or '+ Insert below' between existing ones.",
  },
  {
    title: "Fill Fields",
    body: "Each component shows its editable fields. Field layout follows the Placement tab from the component editor.",
  },
  {
    title: "Live Preview",
    body: "Toggle the preview pane to see the rendered page. Switch between Desktop, Tablet and Mobile viewports.",
  },
  {
    title: "Save and Publish",
    body: "Save Content creates a new draft version. Publish promotes the latest saved version to the live page.",
  },
] as const;

// VersionBadge is now imported from @/components/admin/VersionBadge

function ButtonSpinner({
  size = 12,
  color = "currentColor",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        border: `2px solid ${color}33`,
        borderTopColor: color,
        display: "inline-block",
        animation: "cms-spin 0.7s linear infinite",
        boxSizing: "border-box",
        flexShrink: 0,
      }}
    />
  );
}

function serializeStructure(structure: ComponentInstance[]) {
  return JSON.stringify(structure);
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: ComponentSchemaField;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const str = (value ?? field.defaultValue ?? "") as string;

  switch (field.type) {
    case "textarea":
      return (
        <textarea
          className="form-control"
          rows={3}
          value={str}
          onChange={(event) => onChange(event.target.value)}
          placeholder={field.helpText}
        />
      );
    case "richtext":
      return <RichTextEditor value={str} onChange={onChange} placeholder={field.helpText ?? "Write something..."} />;
    case "image_url":
      return <ImageUploadField value={value as ImageValue} onChange={onChange} withAlt accept="image" placeholder={field.helpText} />;
    case "video_url":
      return <ImageUploadField value={value as ImageValue} onChange={onChange} withAlt accept="video" placeholder={field.helpText} />;
    case "color":
      return (
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="color"
            value={str || "#000000"}
            onChange={(event) => onChange(event.target.value)}
            style={{ width: 40, height: 34, padding: 1, borderRadius: 4, border: "1px solid var(--border)", cursor: "pointer" }}
          />
          <input
            className="form-control"
            value={str}
            onChange={(event) => onChange(event.target.value)}
            placeholder="#000000"
            style={{ fontFamily: "monospace", width: 120 }}
          />
        </div>
      );
    case "toggle":
      return (
        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
          <input type="checkbox" checked={!!value} onChange={(event) => onChange(event.target.checked)} />
          <span style={{ fontSize: "0.85rem" }}>{field.helpText ?? field.label}</span>
        </label>
      );
    case "number":
      return (
        <input
          type="number"
          className="form-control"
          value={(value as number) ?? ""}
          onChange={(event) => onChange(Number(event.target.value))}
          placeholder={field.helpText}
        />
      );
    case "select":
      return (
        <select className="form-control" value={str} onChange={(event) => onChange(event.target.value)}>
          <option value="">- Select -</option>
          {(field.options ?? []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    case "list":
      return (
        <ListFieldInput
          field={field}
          value={(value ?? []) as Array<Record<string, unknown>>}
          onChange={onChange}
        />
      );
    default:
      return (
        <input
          type="text"
          className="form-control"
          value={str}
          onChange={(event) => onChange(event.target.value)}
          placeholder={field.helpText}
        />
      );
  }
}

type SchemaFieldWithMeta = ComponentSchemaField & { required?: boolean; validator?: string };

function ValidatedFieldInput({
  field, value, onChange,
}: {
  field: SchemaFieldWithMeta;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const [dirty, setDirty] = useState(false);
  const error = dirty ? validateFieldValue(value, field) : (
    // Always show error for non-empty values that fail the validator
    field.validator && String(value ?? "").trim()
      ? validateFieldValue(value, { validator: field.validator })
      : null
  );
  const hasRequired = field.required && !String(value ?? "").trim();

  return (
    <div>
      <div
        onBlur={() => setDirty(true)}
        style={error ? { borderRadius: 4, outline: "1px solid var(--danger)" } : undefined}
      >
        <FieldInput field={field} value={value} onChange={(v) => { setDirty(true); onChange(v); }} />
      </div>
      {error ? (
        <p style={{ color: "var(--danger)", fontSize: "0.72rem", marginTop: 3, display: "flex", alignItems: "center", gap: 4, margin: "3px 0 0" }}>
          <span aria-hidden>⚠</span> {error}
        </p>
      ) : hasRequired && (
        <p style={{ color: "var(--text-muted)", fontSize: "0.71rem", marginTop: 3, margin: "3px 0 0" }}>
          Required
        </p>
      )}
    </div>
  );
}

/** Returns a short preview string from the first non-empty scalar field of an item. */
function itemPreview(item: Record<string, unknown>, schema: ComponentSchemaField[]): string {
  for (const f of schema) {
    if (f.type === "list" || f.type === "image_url" || f.type === "video_url" || f.type === "richtext") continue;
    const v = String(item[f.key] ?? "").trim();
    if (v) return v.length > 48 ? v.slice(0, 48) + "…" : v;
  }
  return "";
}

/** Compact field label used throughout the page content editor. */
function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <div style={{ fontSize: "0.71rem", fontWeight: 500, color: "var(--text-muted)", marginBottom: 4, display: "flex", alignItems: "center", gap: 3 }}>
      {children}
      {required && <span style={{ color: "var(--danger)" }} title="Required">*</span>}
    </div>
  );
}

function ListFieldInput({
  field,
  value,
  onChange,
}: {
  field: ComponentSchemaField;
  value: Array<Record<string, unknown>>;
  onChange: (value: unknown) => void;
}) {
  const items = Array.isArray(value) ? value : [];
  const childSchema = field.childSchema ?? [];
  const [collapsedItems, setCollapsedItems] = useState<Record<number, boolean>>({});

  function toggleItem(idx: number) {
    setCollapsedItems((prev) => ({ ...prev, [idx]: !prev[idx] }));
  }
  function updateItem(itemIdx: number, key: string, val: unknown) {
    onChange(items.map((item, i) => (i === itemIdx ? { ...item, [key]: val } : item)));
  }
  function addItem() {
    const empty: Record<string, unknown> = {};
    childSchema.forEach((f) => { empty[f.key] = f.defaultValue ?? (f.type === "list" ? [] : ""); });
    onChange([...items, empty]);
  }
  function removeItem(itemIdx: number) {
    onChange(items.filter((_, i) => i !== itemIdx));
  }
  function moveItem(itemIdx: number, direction: -1 | 1) {
    const next = [...items];
    const target = itemIdx + direction;
    if (target < 0 || target >= next.length) return;
    [next[itemIdx], next[target]] = [next[target], next[itemIdx]];
    onChange(next);
  }

  if (childSchema.length === 0) {
    return <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: 0 }}>No item fields defined. Add fields in the component editor.</p>;
  }

  return (
    <div>
      {items.map((item, itemIdx) => {
        const isCollapsed = !!collapsedItems[itemIdx];
        const preview = isCollapsed ? itemPreview(item, childSchema) : "";
        return (
          <div key={itemIdx} style={{ border: "1px solid var(--border)", borderRadius: 6, marginBottom: 6, overflow: "hidden" }}>
            {/* Item header */}
            <div
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 10px", background: "var(--bg-light)", cursor: "pointer", userSelect: "none" }}
              onClick={() => toggleItem(itemIdx)}
            >
              <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", flexShrink: 0 }}>#{itemIdx + 1}</span>
              {preview && (
                <span style={{ fontSize: "0.77rem", color: "var(--text)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {preview}
                </span>
              )}
              <div style={{ display: "flex", gap: 3, marginLeft: "auto" }} onClick={(e) => e.stopPropagation()}>
                <button className="btn-icon" onClick={() => moveItem(itemIdx, -1)} disabled={itemIdx === 0} title="Move up" style={{ fontSize: "0.65rem" }}>▲</button>
                <button className="btn-icon" onClick={() => moveItem(itemIdx, 1)} disabled={itemIdx >= items.length - 1} title="Move down" style={{ fontSize: "0.65rem" }}>▼</button>
                <button className="btn-icon" onClick={() => removeItem(itemIdx)} title="Remove" style={{ color: "var(--danger)", fontSize: "0.65rem" }}>✕</button>
              </div>
              <span style={{ color: "var(--text-muted)", fontSize: "0.68rem", flexShrink: 0 }}>{isCollapsed ? "▶" : "▼"}</span>
            </div>
            {/* Item fields */}
            {!isCollapsed && (
              <div style={{ padding: "10px 12px", display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: "10px 12px" }}>
                {childSchema.map((childField) => (
                  <div key={childField.key} style={{ gridColumn: COL_SPAN[(childField as SchemaFieldWithMeta & { colWidth?: string }).colWidth ?? "full"] ?? "span 12" }}>
                    <FieldLabel required={(childField as SchemaFieldWithMeta).required}>{childField.label}</FieldLabel>
                    <ValidatedFieldInput field={childField as SchemaFieldWithMeta} value={item[childField.key]} onChange={(val) => updateItem(itemIdx, childField.key, val)} />
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
      <button className="btn btn-secondary btn-sm" style={{ width: "100%", marginTop: 4 }} onClick={addItem}>
        + Add item
      </button>
    </div>
  );
}

function ComponentCard({
  instance,
  index,
  total,
  schema,
  componentName,
  namespace,
  onPropChange,
  onMoveUp,
  onMoveDown,
  onRemove,
  onInsertBelow,
}: {
  instance: ComponentInstance;
  index: number;
  total: number;
  schema: ComponentSchemaField[];
  componentName: string;
  namespace: string | null;
  onPropChange: (key: string, value: unknown) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  onInsertBelow: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          cursor: "pointer",
          marginBottom: collapsed ? 0 : schema.length > 0 ? 16 : 0,
        }}
        onClick={() => setCollapsed((current) => !current)}
      >
        <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 700, minWidth: 28 }}>#{index + 1}</span>
        <div style={{ flex: 1 }}>
          <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>{componentName}</span>
          {namespace && <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginLeft: 8 }}>{namespace}</span>}
        </div>
        <div style={{ display: "flex", gap: 4 }} onClick={(event) => event.stopPropagation()}>
          <button className="btn-icon" onClick={onMoveUp} disabled={index === 0} title="Move up">{"\u25B2"}</button>
          <button className="btn-icon" onClick={onMoveDown} disabled={index >= total - 1} title="Move down">{"\u25BC"}</button>
          <button className="btn-icon" onClick={onInsertBelow} style={{ color: "var(--primary)" }} title="Insert below">+</button>
          <button className="btn-icon" onClick={onRemove} style={{ color: "var(--danger)" }} title="Remove">{"\u00D7"}</button>
        </div>
        <span style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}>{collapsed ? "\u25B6" : "\u25BC"}</span>
      </div>

      {!collapsed && (
        schema.length === 0 ? (
          <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", margin: 0 }}>No editable fields.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: "12px 16px" }}>
            {schema.map((field, fieldIdx) => (
              <div
                key={`${field.key}-${fieldIdx}`}
                style={{ gridColumn: COL_SPAN[(field as SchemaFieldWithMeta & { colWidth?: string }).colWidth ?? "full"] ?? "span 12" }}
              >
                <FieldLabel required={(field as SchemaFieldWithMeta).required}>{field.label}</FieldLabel>
                <ValidatedFieldInput field={field as SchemaFieldWithMeta} value={instance.props[field.key]} onChange={(nextValue) => onPropChange(field.key, nextValue)} />
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}

export default function ContentPage() {
  const params = useParams();
  const pageId = params.id as string;

  const [pageTitle,      setPageTitle]      = useState("");
  const [pageSlug,       setPageSlug]       = useState("");
  const [systemPageType, setSystemPageType] = useState<string | null>(null);
  const [isPublished, setIsPublished] = useState(false);
  const [latestVersionId, setLatestVersionId] = useState<string | null>(null);
  const [publishedVersionId, setPublishedVersionId] = useState<string | null>(null);
  const [publishedVersionNumber, setPublishedVersionNumber] = useState<number | null>(null);
  const [editingVersionNumber, setEditingVersionNumber] = useState<number | null>(null);
  const [savedStructureJson, setSavedStructureJson] = useState("[]");
  const [structure, setStructure] = useState<ComponentInstance[]>([]);
  const [schemas, setSchemas] = useState<Record<string, ComponentSchemaField[]>>({});
  const [components, setComponents] = useState<ComponentMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [insertAfter, setInsertAfter] = useState<number | null>(null);
  const [showSaveAsTemplate, setShowSaveAsTemplate] = useState(false);
  const [showSaveMenu,       setShowSaveMenu]       = useState(false);
  const [showPreviewMenu,    setShowPreviewMenu]    = useState(false);
  const saveBtnRef    = useRef<HTMLDivElement>(null);
  const previewBtnRef = useRef<HTMLDivElement>(null);

  const [showPreview, setShowPreview] = useState(false);
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [previewKey, setPreviewKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [showHistory, setShowHistory] = useState(false);
  const [versions, setVersions] = useState<VersionInfo[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [pendingPublishedVersionId, setPendingPublishedVersionId] = useState<string | null>(null);

  const tourKey = `cms.tour.content.v1.${pageId}`;
  const [tourStep, setTourStep] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/admin/pages/${pageId}/content/data`)
      .then((response) => response.json())
      .then((data) => {
        const nextStructure = data.structure ?? [];
        setPageTitle(data.pageTitle ?? "Page");
        setPageSlug(data.pageSlug ?? "");
        setSystemPageType(data.systemPageType ?? null);
        setIsPublished(!!data.isPublished);
        setLatestVersionId(data.latestVersionId ?? null);
        setPublishedVersionId(data.publishedVersionId ?? null);
        setPublishedVersionNumber(data.publishedVersionNumber ?? null);
        setEditingVersionNumber(data.latestVersionNumber ?? null);
        setStructure(nextStructure);
        setSavedStructureJson(serializeStructure(nextStructure));
        setSchemas(data.componentSchemas ?? {});
        setComponents(data.components ?? []);
        setLoading(false);
        if (!localStorage.getItem(tourKey)) setTourStep(0);
      });
  }, [pageId, tourKey]);

  function getComponent(id: string) {
    return components.find((component) => component.id === id);
  }

  function updateProp(idx: number, key: string, value: unknown) {
    setStructure((prev) => prev.map((item, itemIndex) => itemIndex === idx ? { ...item, props: { ...item.props, [key]: value } } : item));
  }

  function moveUp(idx: number) {
    setStructure((prev) => {
      if (idx === 0) return prev;
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  }

  function moveDown(idx: number) {
    setStructure((prev) => {
      if (idx >= prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
  }

  function removeComponent(idx: number) {
    setStructure((prev) => prev.filter((_, itemIndex) => itemIndex !== idx));
  }

  function addComponent(componentId: string) {
    const newItem: ComponentInstance = { componentId, props: {} };

    if (insertAfter !== null) {
      setStructure((prev) => {
        const next = [...prev];
        next.splice(insertAfter + 1, 0, newItem);
        return next;
      });
    } else {
      setStructure((prev) => [...prev, newItem]);
    }

    if (!schemas[componentId]) {
      fetch(`/admin/components/${componentId}/data`)
        .then((response) => response.json())
        .then((data) => setSchemas((prev) => ({ ...prev, [componentId]: data.schemaJson ?? [] })));
    }

    setShowPicker(false);
    setInsertAfter(null);
  }

  useEffect(() => {
    if (!showSaveMenu) return;
    function handler(e: MouseEvent) {
      if (saveBtnRef.current && !saveBtnRef.current.contains(e.target as Node)) setShowSaveMenu(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showSaveMenu]);

  useEffect(() => {
    if (!showPreviewMenu) return;
    function handler(e: MouseEvent) {
      if (previewBtnRef.current && !previewBtnRef.current.contains(e.target as Node)) setShowPreviewMenu(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showPreviewMenu]);

  async function handleSave() {
    setSaving(true);
    try {
      const result = await updateStructure(pageId, JSON.stringify(structure));
      setSaved(true);
      setLatestVersionId(result.versionId);
      setEditingVersionNumber(result.versionNumber);
      setSavedStructureJson(serializeStructure(structure));
      setTimeout(() => setSaved(false), 2500);
      setPreviewKey((current) => current + 1);
    } finally {
      setSaving(false);
    }
  }

  async function openHistory() {
    setShowHistory(true);
    setHistoryLoading(true);
    const response = await fetch(`/admin/pages/${pageId}/versions/data`);
    const data = await response.json();
    setVersions(data.versions ?? []);
    setHistoryLoading(false);
  }

  async function handlePublishVersion(versionId: string) {
    setPendingPublishedVersionId(versionId);
    try {
      const result = await publishVersion(pageId, versionId);
      setPublishedVersionId(result.versionId);
      setPublishedVersionNumber(result.versionNumber);
      setIsPublished(true);
      setShowHistory(false);
      setSaved(true);
      setPreviewKey((current) => current + 1);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setPendingPublishedVersionId(null);
    }
  }

  function startTour() {
    setTourStep(0);
  }

  function nextTourStep() {
    if (tourStep === null) return;
    if (tourStep >= TOUR_STEPS.length - 1) {
      setTourStep(null);
      localStorage.setItem(tourKey, "1");
      return;
    }
    setTourStep(tourStep + 1);
  }

  function closeTour() {
    setTourStep(null);
    localStorage.setItem(tourKey, "1");
  }

  // Compute canonical public URL — system pages use their type URL, not their slug
  const publicPath = systemPageType === "home"
    ? "/"
    : (!pageSlug || pageSlug === "/" ? "/" : `/${pageSlug}`);
  const previewUrl = `${publicPath}?draft=1`;
  const hasUnsavedChanges = serializeStructure(structure) !== savedStructureJson;
  const canPublish = !hasUnsavedChanges && !!latestVersionId && (!isPublished || latestVersionId !== publishedVersionId);

  if (loading) return <div className="empty-state"><p>Loading...</p></div>;

  return (
    <div>
      <style>{`@keyframes cms-spin{to{transform:rotate(360deg)}}`}</style>
      <PageEditorHeader
        id={pageId}
        title={pageTitle}
        isPublished={isPublished}
        badge={<VersionBadge versionNumber={editingVersionNumber} />}
        actions={
          <>
            <button
              type="button"
              onClick={startTour}
              title="Open editor tour"
              style={{
                border: "none",
                background: "transparent",
                color: "var(--text-muted)",
                padding: "6px 4px",
                fontSize: "1rem",
                cursor: "pointer",
              }}
            >
              ?
            </button>
            {/* Preview split button */}
            <div ref={previewBtnRef} style={{ position: "relative", display: "inline-flex" }}>
              <div style={{
                display: "inline-flex", alignItems: "stretch", borderRadius: 6, overflow: "hidden",
                border: showPreview ? "1px solid #bfdbfe" : "1px solid var(--border)",
              }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowPreview((v) => !v)}
                  title={showPreview ? "Hide preview" : "Show inline preview"}
                  style={{
                    borderRadius: 0, borderRight: `1px solid ${showPreview ? "#bfdbfe" : "var(--border)"}`,
                    ...(showPreview ? { background: "#eff6ff", color: "#1d4ed8", fontWeight: 600 } : {}),
                  }}
                >
                  Preview
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowPreviewMenu((v) => !v)}
                  title="More preview options"
                  style={{
                    borderRadius: 0, padding: "0 7px",
                    ...(showPreview ? { background: "#eff6ff", color: "#1d4ed8" } : {}),
                  }}
                >
                  {showPreviewMenu ? "▴" : "▾"}
                </button>
              </div>

              {showPreviewMenu && (
                <div style={{
                  position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 200,
                  background: "#fff", border: "1px solid var(--border)", borderRadius: 8,
                  boxShadow: "0 8px 24px rgba(0,0,0,0.12)", minWidth: 190, overflow: "hidden",
                }}>
                  <a
                    href={publicPath}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => setShowPreviewMenu(false)}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "10px 14px", textDecoration: "none",
                      color: "var(--text)",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-light)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <span>↗</span>
                    <span>
                      <span style={{ display: "block", fontWeight: 600, fontSize: "0.88rem" }}>View public page</span>
                      <span style={{ display: "block", fontSize: "0.72rem", color: "var(--text-muted)" }}>{publicPath}</span>
                    </span>
                  </a>
                </div>
              )}
            </div>
            {saved && <span style={{ fontSize: "0.82rem", color: "var(--success)", fontWeight: 600 }}>Saved</span>}

            {/* Save Content split button */}
            <div ref={saveBtnRef} style={{ position: "relative", display: "inline-flex" }}>
              <div style={{
                display: "inline-flex", alignItems: "stretch", borderRadius: 6,
                overflow: "hidden", border: "1px solid var(--primary-dark, #1d4ed8)",
              }}>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleSave}
                  disabled={saving || !hasUnsavedChanges}
                  style={{ borderRadius: 0, borderRight: "1px solid rgba(255,255,255,0.25)" }}
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    {saving && <ButtonSpinner color="#ffffff" />}
                    {saving ? "Saving..." : "Save Content"}
                  </span>
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => setShowSaveMenu((v) => !v)}
                  title="More save options"
                  style={{ borderRadius: 0, padding: "0 8px" }}
                >
                  {showSaveMenu ? "▴" : "▾"}
                </button>
              </div>

              {showSaveMenu && (
                <div style={{
                  position: "absolute", top: "calc(100% + 4px)", right: 0, zIndex: 200,
                  background: "#fff", border: "1px solid var(--border)", borderRadius: 8,
                  boxShadow: "0 8px 24px rgba(0,0,0,0.12)", minWidth: 200, overflow: "hidden",
                }}>
                  <button
                    onClick={() => { setShowSaveMenu(false); setShowSaveAsTemplate(true); }}
                    style={{
                      display: "flex", alignItems: "center", gap: 10, width: "100%",
                      padding: "10px 14px", textAlign: "left", background: "none",
                      border: "none", cursor: "pointer", fontSize: "0.875rem",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-light)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <span>💾</span>
                    <span>
                      <span style={{ display: "block", fontWeight: 600, color: "var(--text)" }}>Save as Template</span>
                      <span style={{ display: "block", fontSize: "0.72rem", color: "var(--text-muted)" }}>Reuse this layout on new pages</span>
                    </span>
                  </button>
                </div>
              )}
            </div>
            <PublishToggle
              pageId={pageId}
              initialIsPublished={isPublished}
              canPublish={canPublish}
              publishedVersionNumber={publishedVersionNumber}
              pageSlug={pageSlug}
              isSystemPage={!!systemPageType}
              onOpenHistory={openHistory}
              onToggle={(published, info) => {
                setIsPublished(published);
                if (published && info?.versionId) {
                  setLatestVersionId(info.versionId);
                  setPublishedVersionId(info.versionId);
                }
                if (published && info?.versionNumber) {
                  setPublishedVersionNumber(info.versionNumber);
                  setEditingVersionNumber(info.versionNumber);
                }
                if (!published) {
                  setPublishedVersionId(null);
                  setPublishedVersionNumber(null);
                }
                setPreviewKey((current) => current + 1);
              }}
            />
          </>
        }
      />

      <div style={{ display: "grid", gridTemplateColumns: showPreview ? "1fr 420px" : "1fr", gap: 20, alignItems: "start" }}>
        <div>
          {structure.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <p>No components yet. Add your first component.</p>
                <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => { setInsertAfter(null); setShowPicker(true); }}>
                  + Add component
                </button>
              </div>
            </div>
          ) : (
            <>
              {structure.map((instance, idx) => {
                const component = getComponent(instance.componentId);
                const schema = schemas[instance.componentId] ?? [];
                return (
                  <ComponentCard
                    key={`${instance.componentId}-${idx}`}
                    instance={instance}
                    index={idx}
                    total={structure.length}
                    schema={schema}
                    componentName={component?.name ?? instance.componentId}
                    namespace={component?.namespace ?? null}
                    onPropChange={(key, value) => updateProp(idx, key, value)}
                    onMoveUp={() => moveUp(idx)}
                    onMoveDown={() => moveDown(idx)}
                    onRemove={() => removeComponent(idx)}
                    onInsertBelow={() => { setInsertAfter(idx); setShowPicker(true); }}
                  />
                );
              })}
              <button className="btn btn-secondary btn-sm" style={{ marginTop: 4 }} onClick={() => { setInsertAfter(null); setShowPicker(true); }}>
                + Add component to end
              </button>
            </>
          )}
        </div>

        {showPreview && (
          <div style={{ position: "sticky", top: 64 }}>
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "8px 12px", borderBottom: "1px solid var(--border)", background: "var(--bg-light)" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", marginRight: 4 }}>PREVIEW</span>
                {(["desktop", "tablet", "mobile"] as Viewport[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setViewport(mode)}
                    className={`btn btn-sm ${viewport === mode ? "btn-primary" : "btn-secondary"}`}
                    style={{ padding: "3px 8px", fontSize: "0.75rem" }}
                  >
                    {mode === "desktop" ? "Desktop" : mode === "tablet" ? "Tablet" : "Mobile"}
                  </button>
                ))}
                <button className="btn-icon" style={{ marginLeft: "auto" }} title="Refresh preview" onClick={() => setPreviewKey((current) => current + 1)}>{"\u21BB"}</button>
              </div>

              {!isPublished && (
                <div style={{ background: "#fef9c3", color: "#854d0e", fontSize: "0.72rem", padding: "4px 12px", textAlign: "center", fontWeight: 500 }}>
                  Draft - not visible to visitors
                </div>
              )}

              <div style={{ overflow: "auto", background: "#f0f0f0", padding: 8, display: "flex", justifyContent: "center", minHeight: 400 }}>
                {previewUrl ? (
                  <iframe
                    ref={iframeRef}
                    key={previewKey}
                    src={previewUrl}
                    title="Page preview"
                    style={{ width: VIEWPORT_WIDTH[viewport], maxWidth: "100%", minHeight: 500, border: "none", background: "white", borderRadius: 4, boxShadow: "0 2px 8px rgba(0,0,0,0.1)", transition: "width 0.2s" }}
                  />
                ) : (
                  <div style={{ color: "var(--text-muted)", textAlign: "center", padding: 40, fontSize: "0.85rem" }}>
                    No preview available — set a slug in Settings.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {showPicker && (
        <ComponentPickerModal components={components} onSelect={addComponent} onClose={() => { setShowPicker(false); setInsertAfter(null); }} />
      )}

      {showSaveAsTemplate && (
        <SaveAsTemplateDialog
          structure={structure}
          onClose={() => setShowSaveAsTemplate(false)}
        />
      )}

      <SlideDrawer open={showHistory} onClose={() => setShowHistory(false)} title="Version History">
        {historyLoading ? (
          <div className="empty-state"><p>Loading...</p></div>
        ) : versions.length === 0 ? (
          <div className="empty-state"><p>No versions yet.</p></div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {versions.map((version) => {
              const publishing = pendingPublishedVersionId === version.id;

              return (
                <div key={version.id} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "12px 14px", background: "var(--bg-light)" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 4 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, fontSize: "0.88rem" }}>v{version.version}</span>
                        {version.isCurrent && (
                          <span style={{ background: "#dbeafe", color: "#1d4ed8", fontSize: "0.68rem", padding: "1px 6px", borderRadius: 999, fontWeight: 600 }}>
                            current
                          </span>
                        )}
                        {version.id === publishedVersionId && (
                          <span style={{ background: "#dcfce7", color: "#15803d", fontSize: "0.68rem", padding: "1px 6px", borderRadius: 999, fontWeight: 600 }}>
                            live
                          </span>
                        )}
                        {version.isPublished && version.id !== publishedVersionId && (
                          <span style={{ background: "#f1f5f9", color: "#64748b", fontSize: "0.68rem", padding: "1px 6px", borderRadius: 999, fontWeight: 600 }}>
                            was published
                          </span>
                        )}
                      </div>
                      <p style={{ margin: "0 0 4px", fontSize: "0.78rem", color: "var(--text-muted)" }}>
                        {new Date(version.createdAt).toLocaleString()} · {version.componentCount} component{version.componentCount !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        type="button"
                        className="btn-icon"
                        title={version.id === publishedVersionId ? "This version is already live" : "Publish this saved version directly"}
                        onClick={() => void handlePublishVersion(version.id)}
                        disabled={version.id === publishedVersionId || publishing}
                        style={{ opacity: version.id === publishedVersionId || publishing ? 0.35 : 1, cursor: publishing ? "wait" : undefined }}
                      >
                        {publishing ? <ButtonSpinner size={14} color="var(--text)" /> : "↑"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 4 }}>
              Version history is read-only. Use the action button to publish a historical snapshot directly.
            </p>
          </div>
        )}
      </SlideDrawer>

      {tourStep !== null && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "white", borderRadius: 12, maxWidth: 480, width: "100%", padding: 24, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>
                Step {tourStep + 1} of {TOUR_STEPS.length}
              </span>
              <button className="btn-icon" style={{ marginLeft: "auto" }} onClick={closeTour}>{"\u00D7"}</button>
            </div>
            <h3 style={{ margin: "0 0 8px", fontSize: "1rem", fontWeight: 700 }}>{TOUR_STEPS[tourStep].title}</h3>
            <p style={{ margin: "0 0 20px", fontSize: "0.88rem", color: "var(--text-muted)", lineHeight: 1.6 }}>{TOUR_STEPS[tourStep].body}</p>
            <div style={{ display: "flex", gap: 6, marginBottom: 16, justifyContent: "center" }}>
              {TOUR_STEPS.map((_, index) => (
                <div key={index} style={{ width: 7, height: 7, borderRadius: "50%", background: index === tourStep ? "var(--primary)" : "var(--border)" }} />
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="btn btn-secondary" onClick={closeTour}>Skip tour</button>
              <button className="btn btn-primary" onClick={nextTourStep}>
                {tourStep >= TOUR_STEPS.length - 1 ? "Done" : "Next"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
