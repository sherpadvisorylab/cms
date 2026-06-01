"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { updateStructure } from "../../actions";
import { ComponentPickerModal } from "@/components/admin/ComponentPickerModal";
import { ImageUploadField, type ImageValue, getImageUrl } from "@/components/admin/ImageUploadField";
import type { ComponentInstance, ComponentSchemaField } from "@cms/domain";

type ComponentMeta = { id: string; name: string; namespace: string | null; type: string; status: string };

// ── Field renderer ────────────────────────────────────────────────────────────
function FieldInput({
  field,
  value,
  onChange,
}: {
  field: ComponentSchemaField;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const str = (value ?? field.defaultValue ?? "") as string;

  switch (field.type) {
    case "textarea":
      return (
        <textarea
          className="form-control"
          rows={3}
          value={str}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.helpText}
        />
      );
    case "richtext":
      return (
        <textarea
          className="form-control"
          rows={5}
          value={str}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.helpText ?? "HTML allowed"}
        />
      );
    case "image_url":
      return (
        <ImageUploadField
          value={value as ImageValue}
          onChange={(v) => onChange(v)}
          withAlt
          accept="image"
          placeholder={field.helpText}
        />
      );
    case "video_url":
      return (
        <ImageUploadField
          value={value as ImageValue}
          onChange={(v) => onChange(v)}
          withAlt
          accept="video"
          placeholder={field.helpText}
        />
      );
    case "color":
      return (
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="color" value={str || "#000000"}
            onChange={(e) => onChange(e.target.value)}
            style={{ width: 40, height: 34, padding: 1, borderRadius: 4, border: "1px solid var(--border)", cursor: "pointer" }} />
          <input className="form-control" value={str}
            onChange={(e) => onChange(e.target.value)} placeholder="#000000"
            style={{ fontFamily: "monospace", width: 120 }} />
        </div>
      );
    case "toggle":
      return (
        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
          <input type="checkbox" checked={!!value}
            onChange={(e) => onChange(e.target.checked)} />
          <span style={{ fontSize: "0.85rem" }}>{field.helpText ?? field.label}</span>
        </label>
      );
    case "number":
      return (
        <input type="number" className="form-control"
          value={value as number ?? ""}
          onChange={(e) => onChange(Number(e.target.value))}
          placeholder={field.helpText} />
      );
    case "select":
      return (
        <select className="form-control" value={str}
          onChange={(e) => onChange(e.target.value)}>
          <option value="">— Select —</option>
          {(field.options ?? []).map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      );
    default: // text, url, email, etc.
      return (
        <input type="text" className="form-control" value={str}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.helpText} />
      );
  }
}

// ── Component card ────────────────────────────────────────────────────────────
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
  instance:      ComponentInstance;
  index:         number;
  total:         number;
  schema:        ComponentSchemaField[];
  componentName: string;
  namespace:     string | null;
  onPropChange:  (key: string, value: unknown) => void;
  onMoveUp:      () => void;
  onMoveDown:    () => void;
  onRemove:      () => void;
  onInsertBelow: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="card" style={{ marginBottom: 12 }}>
      {/* Card header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: collapsed ? 0 : 16,
        cursor: "pointer" }}
        onClick={() => setCollapsed((c) => !c)}>
        <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 700,
          minWidth: 24 }}>#{index + 1}</span>
        <div style={{ flex: 1 }}>
          <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>{componentName}</span>
          {namespace && (
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)",
              marginLeft: 8 }}>{namespace}</span>
          )}
        </div>
        <div style={{ display: "flex", gap: 4 }} onClick={(e) => e.stopPropagation()}>
          <button className="btn-icon" onClick={onMoveUp} disabled={index === 0}
            title="Move up">▲</button>
          <button className="btn-icon" onClick={onMoveDown} disabled={index >= total - 1}
            title="Move down">▼</button>
          <button className="btn-icon" onClick={onInsertBelow}
            style={{ color: "var(--primary)" }} title="Insert below">+</button>
          <button className="btn-icon" onClick={onRemove}
            style={{ color: "var(--danger)" }} title="Remove">✕</button>
        </div>
        <span style={{ color: "var(--text-muted)", fontSize: "0.7rem", marginLeft: 4 }}>
          {collapsed ? "▶" : "▼"}
        </span>
      </div>

      {/* Fields */}
      {!collapsed && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {schema.length === 0 ? (
            <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", margin: 0 }}>
              No editable fields — this component has no schema variables.
            </p>
          ) : (
            schema.map((field) => (
              <div key={field.key} className="form-group">
                <label className="form-label" style={{ marginBottom: 4, display: "block" }}>
                  {field.label}
                  {field.helpText && (
                    <span style={{ fontSize: "0.72rem", color: "var(--text-muted)",
                      marginLeft: 6, fontWeight: 400 }}>
                      — {field.helpText}
                    </span>
                  )}
                </label>
                <FieldInput
                  field={field}
                  value={instance.props[field.key]}
                  onChange={(v) => onPropChange(field.key, v)}
                />
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ContentPage() {
  const params = useParams();
  const pageId = params.id as string;

  const [pageTitle,   setPageTitle]   = useState("");
  const [structure,   setStructure]   = useState<ComponentInstance[]>([]);
  const [schemas,     setSchemas]     = useState<Record<string, ComponentSchemaField[]>>({});
  const [components,  setComponents]  = useState<ComponentMeta[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [saved,       setSaved]       = useState(false);
  const [showPicker,  setShowPicker]  = useState(false);
  const [insertAfter, setInsertAfter] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/admin/pages/${pageId}/content/data`)
      .then((r) => r.json())
      .then((d) => {
        setPageTitle(d.pageTitle ?? "Page");
        setStructure(d.structure ?? []);
        setSchemas(d.componentSchemas ?? {});
        setComponents(d.components ?? []);
        setLoading(false);
      });
  }, [pageId]);

  function getComp(id: string) { return components.find((c) => c.id === id); }

  function updateProp(idx: number, key: string, value: unknown) {
    setStructure((prev) => prev.map((item, i) =>
      i === idx ? { ...item, props: { ...item.props, [key]: value } } : item
    ));
  }

  function moveUp(idx: number) {
    if (idx === 0) return;
    setStructure((prev) => {
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
    setStructure((prev) => prev.filter((_, i) => i !== idx));
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
    // Fetch schema if not already loaded
    if (!schemas[componentId]) {
      fetch(`/admin/components/${componentId}/data`)
        .then((r) => r.json())
        .then((d) => {
          setSchemas((prev) => ({ ...prev, [componentId]: d.schemaJson ?? [] }));
        });
    }
    setShowPicker(false);
    setInsertAfter(null);
  }

  async function handleSave() {
    setSaving(true);
    // Normalise image_url fields to store plain URL strings in props
    const normalised = structure.map((item) => {
      const schema = schemas[item.componentId] ?? [];
      const props: Record<string, unknown> = { ...item.props };
      for (const field of schema) {
        if ((field.type === "image_url" || field.type === "video_url") && props[field.key]) {
          const v = props[field.key] as { url?: string; alt?: string } | string;
          if (typeof v === "object" && v !== null) {
            props[field.key] = v; // keep object — CMS engine handles {url,alt}
          }
        }
      }
      return { ...item, props };
    });
    await updateStructure(pageId, JSON.stringify(normalised));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  if (loading) return <div className="empty-state"><p>Loading…</p></div>;

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 600 }}>{pageTitle} — Content</h2>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {saved && <span style={{ fontSize: "0.82rem", color: "var(--success)", fontWeight: 600 }}>✓ Saved</span>}
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "💾 Save Content"}
          </button>
        </div>
      </div>

      {/* Component list */}
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
                instance={instance}
                index={idx}
                total={structure.length}
                schema={schema}
                componentName={comp?.name ?? instance.componentId}
                namespace={comp?.namespace ?? null}
                onPropChange={(key, value) => updateProp(idx, key, value)}
                onMoveUp={() => moveUp(idx)}
                onMoveDown={() => moveDown(idx)}
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

      {showPicker && (
        <ComponentPickerModal
          components={components}
          onSelect={addComponent}
          onClose={() => { setShowPicker(false); setInsertAfter(null); }}
        />
      )}
    </div>
  );
}
