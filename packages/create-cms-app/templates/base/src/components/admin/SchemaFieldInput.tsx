"use client";

import React, { useEffect, useRef, useState } from "react";
import type { ComponentSchemaField } from "@sherpacms/domain";
import { ImageUploadField, type ImageValue } from "./ImageUploadField";
import { RichTextEditor } from "./RichTextEditor";
import { validateFieldValue } from "./validators";
import { getCollectionRecordsForRelationPicker } from "@/app/admin/collections/actions";

export type SchemaFieldWithMeta = ComponentSchemaField & { required?: boolean; validator?: string };

export const COL_SPAN: Record<string, string> = {
  full: "span 12",
  half: "span 6",
  third: "span 4",
};

export function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <div style={{ fontSize: "0.71rem", fontWeight: 500, color: "var(--text-muted)", marginBottom: 4, display: "flex", alignItems: "center", gap: 3 }}>
      {children}
      {required && <span style={{ color: "var(--danger)" }} title="Required">*</span>}
    </div>
  );
}

/**
 * Renders a single schema-driven field, keyed off `field.type`. This is the single
 * source of truth for field rendering — used by the page-content component editor,
 * component prop overrides, and collection record fields alike, so the same field
 * type always looks and behaves the same everywhere it's edited.
 */
export function FieldInput({
  field,
  value,
  onChange,
  placeholder,
}: {
  field: SchemaFieldWithMeta;
  value: unknown;
  onChange: (value: unknown) => void;
  placeholder?: string;
}) {
  const str = (value ?? field.defaultValue ?? "") as string;
  const ph = placeholder ?? field.placeholder ?? field.helpText;

  switch (field.type) {
    case "textarea":
      return (
        <textarea
          className="form-control"
          rows={3}
          value={str}
          onChange={(event) => onChange(event.target.value)}
          placeholder={ph}
        />
      );
    case "richtext":
      return <RichTextEditor value={str} onChange={onChange} placeholder={ph ?? "Write something..."} />;
    case "image_url":
      return <ImageUploadField value={value as ImageValue} onChange={onChange} withAlt accept="image" placeholder={ph} />;
    case "video_url":
      return <ImageUploadField value={value as ImageValue} onChange={onChange} withAlt accept="video" placeholder={ph} />;
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
          placeholder={ph}
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
    case "relation":
      return <RelationFieldInput field={field} value={value} onChange={onChange} />;
    default:
      return (
        <input
          type="text"
          className="form-control"
          value={str}
          onChange={(event) => onChange(event.target.value)}
          placeholder={ph}
        />
      );
  }
}

export function ValidatedFieldInput({
  field,
  value,
  onChange,
  placeholder,
}: {
  field: SchemaFieldWithMeta;
  value: unknown;
  onChange: (value: unknown) => void;
  placeholder?: string;
}) {
  const [dirty, setDirty] = useState(false);
  const error = dirty ? validateFieldValue(value, field) : (
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
        <FieldInput field={field} value={value} onChange={(v) => { setDirty(true); onChange(v); }} placeholder={placeholder} />
      </div>
      {error ? (
        <p style={{ color: "var(--danger)", fontSize: "0.72rem", marginTop: 3, display: "flex", alignItems: "center", gap: 4, margin: "3px 0 0" }}>
          <span aria-hidden>⚠</span> {error}
        </p>
      ) : hasRequired ? (
        <p style={{ color: "var(--text-muted)", fontSize: "0.71rem", marginTop: 3, margin: "3px 0 0" }}>Required</p>
      ) : null}
    </div>
  );
}

/** Returns a short preview string from the first non-empty scalar field of an item. */
export function itemPreview(item: Record<string, unknown>, schema: ComponentSchemaField[]): string {
  for (const f of schema) {
    if (f.type === "list" || f.type === "image_url" || f.type === "video_url" || f.type === "richtext" || f.type === "relation") continue;
    const v = String(item[f.key] ?? "").trim();
    if (v) return v.length > 48 ? v.slice(0, 48) + "…" : v;
  }
  return "";
}

function ListFieldInput({
  field,
  value,
  onChange,
}: {
  field: SchemaFieldWithMeta;
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
                  <div key={childField.key} style={{ gridColumn: COL_SPAN[(childField as SchemaFieldWithMeta).colWidth ?? "full"] ?? "span 12" }}>
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

/**
 * Autocomplete multi-select for `relation` fields. Stores an ordered array of record IDs
 * from `field.relationTarget`; the actual data (all fields, or a rendered nested view) is
 * resolved server-side at render time — see `resolveRelationFields` in `@sherpacms/cms`.
 */
function RelationFieldInput({
  field,
  value,
  onChange,
}: {
  field: SchemaFieldWithMeta;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const ids = Array.isArray(value) ? (value as unknown[]).filter((v): v is string => typeof v === "string") : [];
  const [records, setRecords] = useState<{ id: string; data: Record<string, unknown> }[]>([]);
  const [schema, setSchema] = useState<ComponentSchemaField[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    if (!field.relationTarget) return;
    getCollectionRecordsForRelationPicker(field.relationTarget).then((data) => {
      if (cancelled) return;
      setRecords(data.records);
      setSchema(data.schema);
      setLoaded(true);
    });
    return () => { cancelled = true; };
  }, [field.relationTarget]);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (!field.relationTarget) {
    return <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: 0 }}>No related collection configured for this field.</p>;
  }

  const byId = new Map(records.map((r) => [r.id, r]));
  const recordLabel = (r: { id: string; data: Record<string, unknown> }) => itemPreview(r.data, schema) || r.id;

  const selectedItems = ids.map((id) => ({ id, record: byId.get(id) ?? null }));
  const availableRecords = records.filter((r) => !ids.includes(r.id));
  const filtered = query.trim()
    ? availableRecords.filter((r) => recordLabel(r).toLowerCase().includes(query.trim().toLowerCase()))
    : availableRecords;

  function addRecord(id: string) {
    onChange([...ids, id]);
    setQuery("");
    setOpen(false);
  }
  function removeRecord(id: string) {
    onChange(ids.filter((x) => x !== id));
  }
  function moveRecord(idx: number, direction: -1 | 1) {
    const next = [...ids];
    const target = idx + direction;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange(next);
  }

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      {selectedItems.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 6 }}>
          {selectedItems.map(({ id, record }, idx) => (
            <div
              key={id}
              style={{
                display: "flex", alignItems: "center", gap: 6, padding: "4px 8px",
                border: "1px solid var(--border)", borderRadius: 6,
                background: record ? "var(--bg-light, #f8fafc)" : "#fff5f5",
              }}
            >
              <span style={{
                fontSize: "0.82rem", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis",
                whiteSpace: "nowrap", color: record ? "inherit" : "var(--danger)",
              }}>
                {record ? recordLabel(record) : `⚠ record not found (${id})`}
              </span>
              <button type="button" className="btn-icon" onClick={() => moveRecord(idx, -1)} disabled={idx === 0} title="Move up" style={{ fontSize: "0.65rem" }}>▲</button>
              <button type="button" className="btn-icon" onClick={() => moveRecord(idx, 1)} disabled={idx === selectedItems.length - 1} title="Move down" style={{ fontSize: "0.65rem" }}>▼</button>
              <button type="button" className="btn-icon" onClick={() => removeRecord(id)} title="Remove" style={{ color: "var(--danger)", fontSize: "0.65rem" }}>✕</button>
            </div>
          ))}
        </div>
      )}

      <input
        className="form-control"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder={loaded ? "Search records to link…" : "Loading…"}
        disabled={!loaded}
      />

      {open && loaded && (
        <div style={{
          position: "absolute", zIndex: 10, top: "100%", left: 0, right: 0, marginTop: 2,
          background: "#fff", border: "1px solid var(--border)", borderRadius: 6, maxHeight: 220,
          overflowY: "auto", boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        }}>
          {filtered.length === 0 ? (
            <div style={{ padding: "8px 10px", fontSize: "0.8rem", color: "var(--text-muted)" }}>No matching records.</div>
          ) : (
            filtered.map((r) => (
              <div
                key={r.id}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => addRecord(r.id)}
                style={{ padding: "6px 10px", fontSize: "0.82rem", cursor: "pointer" }}
              >
                {recordLabel(r)}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
