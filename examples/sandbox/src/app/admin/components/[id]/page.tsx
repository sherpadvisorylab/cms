"use client";

import { Fragment, useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AdminEditorHeader } from "@/components/admin/AdminEditorHeader";
import { FloatInput, FloatTextarea, FloatSelect } from "@/components/admin/FloatField";
import { PREDEFINED_VALIDATORS } from "@/components/admin/validators";
import { createComponent, updateComponent, deleteComponent, createVersion } from "../actions";
import { CodeEditor, type FormEmbed, type AutocompleteVar, type ComponentEmbed, type LocalVar } from "@/components/admin/CodeEditor";
import {
  COMPONENT_CATEGORIES_BY_TYPE,
  SCHEMA_FIELD_TYPES,
  type ComponentSchemaField,
  type SchemaFieldType,
  type ComponentType,
} from "@sherpacms/domain";

type Tab = "template" | "css" | "js" | "schema" | "settings";
type BackendTab = "variables" | "placement";

type SchemaField = ComponentSchemaField & {
  colWidth?: string;
  loopAlias?: string;
  required?: boolean;
  validator?: string; // predefined key (e.g. "email") or custom regex (/pattern/flags)
};

function parseSchema(raw: unknown): SchemaField[] {
  if (Array.isArray(raw)) return raw as SchemaField[];
  if (typeof raw === "string") {
    try { const p = JSON.parse(raw); return Array.isArray(p) ? p : []; } catch { return []; }
  }
  return [];
}

function fieldsToJson(fields: SchemaField[]): string {
  return JSON.stringify(fields, null, 2);
}

function slugifyComponentFilename(value: string) {
  return value
    .toLowerCase()
    .replace(/[–—]/g, "-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ── Variable name helpers (ported from prototype) ─────────────────────────────

const MAX_VAR_LENGTH = 28;

function toVariableName(text: string, maxLen = MAX_VAR_LENGTH): string {
  const t = text.trim().replace(/\s+/g, " ");
  if (!t.length) return "var";
  let slug = t.toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  if (!slug.length) slug = "var";
  if (slug.length <= maxLen) return slug;
  const first = slug.slice(0, Math.min(16, slug.length));
  const last = slug.length > 20 ? slug.slice(-8) : "";
  const out = (first + (last ? "_" + last : "")).replace(/_+/g, "_").replace(/^_|_$/g, "");
  return out.slice(0, maxLen);
}

function htmlToLiquidVariables(htmlString: string): {
  html: string;
  labelByVar: Record<string, string>;
} {
  // Protect existing Liquid syntax before DOM parsing so it is never treated
  // as plain text. Both block tags {% ... %} and output tags {{ ... }} are
  // replaced with unique sentinels and restored after the walk.
  const liquidBlocks: string[] = [];
  const protected_ = htmlString.replace(
    /(\{%-?[\s\S]*?-?%\}|\{\{[\s\S]*?\}\})/g,
    (match) => {
      const idx = liquidBlocks.length;
      liquidBlocks.push(match);
      return `​__LQ${idx}__​`; // zero-width space ensures sentinel is isolated
    }
  );

  const div = document.createElement("div");
  div.innerHTML = protected_;
  const used: Record<string, string> = {};
  const labelByVar: Record<string, string> = {};

  function ensureUnique(base: string, originalText: string): string {
    let counter = 0;
    let key = base;
    while (used[key] !== undefined && used[key] !== originalText) {
      counter++;
      key = `${base}_${counter}`;
    }
    used[key] = originalText;
    return key;
  }

  function walk(node: Node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const raw = node.textContent ?? "";
      // Skip text nodes that contain a Liquid sentinel — preserve them as-is
      if (raw.includes("__LQ") && raw.includes("__")) return;
      const text = raw.trim();
      if (text.length > 0) {
        const baseName = toVariableName(text);
        const varName = ensureUnique(baseName, text);
        labelByVar[varName] = text;
        node.textContent = `{{ ${varName} }}`;
      }
      return;
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element;
      if (el.tagName === "SCRIPT" || el.tagName === "STYLE") return;
      Array.from(el.childNodes).forEach(walk);
    }
  }

  walk(div);

  // Restore Liquid blocks
  let html = div.innerHTML;
  liquidBlocks.forEach((block, idx) => {
    html = html.replace(`​__LQ${idx}__​`, block);
  });

  return { html, labelByVar };
}

/**
 * Extract user-defined variable names from a Liquid template string.
 *
 * Naming convention enforced here:
 *   system:key   → system/settings variables (e.g. {{system:bg-primary}})  → excluded
 *   form:key     → CMS form embeds                                          → excluded
 *   navigation:id → navigation block embeds                                 → excluded
 *   page.title   → page/site context vars                                   → excluded
 *   heading      → component instance variable                              → included ✅
 *
 * Rule: only names matching /^[a-z_][a-z0-9_]*$/i (letters/digits/underscore only)
 * are treated as user-editable component variables.
 * Any name containing ":" or "." is a CMS-managed reference and must NEVER
 * appear in the Variables panel.
 */
/** Returns only top-level variable keys (used by auto-add useEffect). */
function extractTemplateVars(template: string): string[] {
  return extractTemplateSchema(template).map((f) => f.key);
}

/**
 * Auto-fix nested for loops to use dot notation.
 * `{% for icon in icons %}` inside `{% for article in articles %}`
 *   → `{% for icon in article.icons %}`
 *
 * LiquidJS requires the parent alias prefix to access nested array fields.
 * Returns the fixed template and whether any changes were made.
 */
function fixNestedLoopSyntax(template: string): { template: string; fixed: boolean } {
  const allLoops = parseAllForLoops(template);
  let result = template;
  let fixed = false;

  for (const loop of allLoops) {
    if (loop.collection.includes(".")) continue; // already dot notation

    // Find the parent loop whose body contains this loop's for-tag
    for (const parent of allLoops) {
      if (parent === loop) continue;
      const inParent = new RegExp(
        `\\{%-?\\s*for\\s+${loop.alias}\\s+in\\s+${loop.collection}\\s*-?%\\}`
      ).test(parent.body);
      if (!inParent) continue;

      // Replace all occurrences of `{% for alias in collection %}` with dot notation
      const re = new RegExp(
        `(\\{%-?\\s*for\\s+${loop.alias}\\s+in\\s+)${loop.collection}(\\s*-?%\\})`,
        "g"
      );
      const next = result.replace(re, `$1${parent.alias}.${loop.collection}$2`);
      if (next !== result) { result = next; fixed = true; }
      break;
    }
  }

  return { template: result, fixed };
}

interface ParsedLoop { alias: string; collection: string; body: string }

/**
 * Stack-based parser: correctly handles nested for loops.
 * Non-greedy regex would stop at the FIRST endfor (inner loop's),
 * producing a truncated body. This parser counts depth instead.
 */
function parseAllForLoops(template: string): ParsedLoop[] {
  const result: ParsedLoop[] = [];
  // Match any {% for ... %} or {% endfor %} tag
  const tagRe = /\{%-?\s*(for\s+(\w+)\s+in\s+([a-z_][a-z0-9_.]*)(?:\s[^%]*)?\s*|endfor\s*)-?%\}/gi;
  const stack: { alias: string; collection: string; bodyStart: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(template)) !== null) {
    const inner = m[1].trim();
    if (inner.startsWith("for ")) {
      const fm = /^for\s+(\w+)\s+in\s+([a-z_][a-z0-9_.]*)/.exec(inner);
      if (fm) stack.push({ alias: fm[1], collection: fm[2], bodyStart: m.index + m[0].length });
    } else {
      const top = stack.pop();
      if (top) result.push({ alias: top.alias, collection: top.collection, body: template.slice(top.bodyStart, m.index) });
    }
  }
  return result;
}

function extractChildSchema(alias: string, body: string, allLoops: ParsedLoop[]): ComponentSchemaField[] {
  const children: SchemaField[] = [];
  const seenKeys = new Set<string>();
  let m: RegExpExecArray | null;

  // Find for-loop opening tags inside the body
  const innerForRe = /\{%-?\s*for\s+(\w+)\s+in\s+([a-z_][a-z0-9_.]*)\s*(?:[^%]*)?\s*-?%\}/gi;
  while ((m = innerForRe.exec(body)) !== null) {
    const innerAlias = m[1];
    const rawCollection = m[2];
    // Normalise: strip "alias." prefix → nested key
    const nestedKey = rawCollection.startsWith(`${alias}.`)
      ? rawCollection.slice(alias.length + 1)
      : rawCollection;
    if (seenKeys.has(nestedKey)) continue;
    seenKeys.add(nestedKey);
    const innerLoop = allLoops.find((l) => l.alias === innerAlias);
    children.push({
      key: nestedKey, label: nestedKey.replace(/_/g, " "), type: "list",
      loopAlias: innerAlias,
      childSchema: innerLoop ? extractChildSchema(innerAlias, innerLoop.body, allLoops) : [],
    });
  }

  // Simple fields: {{ alias.field }}
  const simpleRe = new RegExp(`\\{\\{\\s*${alias}\\.([a-z_][a-z0-9_]*)\\s*\\}\\}`, "gi");
  while ((m = simpleRe.exec(body)) !== null) {
    if (!seenKeys.has(m[1])) {
      seenKeys.add(m[1]);
      children.push({ key: m[1], label: m[1].replace(/_/g, " "), type: "text" });
    }
  }

  return children as ComponentSchemaField[];
}

/** Richer extraction used by the sync button: detects list fields + child schemas (infinite nesting) */
function extractTemplateSchema(template: string): SchemaField[] {
  const allLoops = parseAllForLoops(template);

  // Collections that appear inside another loop body are nested → skip at top level
  const nestedCollections = new Set<string>();
  for (const loop of allLoops) {
    // Capture full dotted path (e.g. "article.icons") AND its base key ("icons")
    const innerRe = /\{%-?\s*for\s+\w+\s+in\s+([a-z_][a-z0-9_.]*)\s*-?%\}/gi;
    let m: RegExpExecArray | null;
    while ((m = innerRe.exec(loop.body)) !== null) {
      const coll = m[1];
      nestedCollections.add(coll);
      if (coll.includes(".")) nestedCollections.add(coll.split(".").pop()!);
    }
  }

  const result: SchemaField[] = [];
  const seenKeys = new Set<string>();

  for (const { alias, collection, body } of allLoops) {
    // Always skip dotted collections (e.g. article.icons) — they are child fields of a parent loop
    if (seenKeys.has(collection) || nestedCollections.has(collection) || collection.includes(".")) continue;
    seenKeys.add(collection);
    result.push({
      key: collection, label: collection.replace(/_/g, " "), type: "list",
      loopAlias: alias,
      childSchema: extractChildSchema(alias, body, allLoops),
    });
  }

  // Simple {{ varName }} variables
  let m: RegExpExecArray | null;
  const reVar = /\{\{([^}]+)\}\}/g;
  while ((m = reVar.exec(template)) !== null) {
    const key = m[1].trim();
    if (/^[a-z_][a-z0-9_]*$/i.test(key) && !seenKeys.has(key)) {
      seenKeys.add(key);
      result.push({ key, label: key.replace(/_/g, " "), type: "text" });
    }
  }

  return result;
}

// ── Placement tab: recursive field rows with indentation ─────────────────────
const VALIDATOR_OPTIONS = [
  { value: "", label: "None" },
  ...Object.entries(PREDEFINED_VALIDATORS).map(([k, v]) => ({ value: k, label: v.label })),
  { value: "__custom__", label: "Custom regex…" },
];

function PlacementFieldRow({
  field, onUpdate, onUpdateChild, collapseSignal, expandSignal,
}: {
  field: SchemaField;
  onUpdate: (patch: Partial<SchemaField>) => void;
  onUpdateChild?: (cIdx: number, patch: Partial<SchemaField>) => void;
  collapseSignal?: number;
  expandSignal?: number;
}) {
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => { if (collapseSignal) setCollapsed(true); }, [collapseSignal]);
  useEffect(() => { if (expandSignal) setCollapsed(false); }, [expandSignal]);
  const isCustomValidator = !!field.validator && !PREDEFINED_VALIDATORS[field.validator];
  const validatorSelectValue = isCustomValidator ? "__custom__" : (field.validator ?? "");

  const isList = field.type === "list";
  // For list fields show "alias fields" label instead of {{key}} (no real template variable)
  const displayKey = isList
    ? (field.loopAlias ? `${field.loopAlias} fields` : "item fields")
    : `{{${field.key}}}`;
  const keyStyle: React.CSSProperties = isList
    ? { fontSize: "0.71rem", color: "var(--text-muted)", fontStyle: "italic" }
    : { fontFamily: "monospace", color: "var(--primary)", fontSize: "0.74rem" };

  return (
    <div style={{ padding: "8px 0" }}>
      {/* Row 1: clickable header — key/label + Width select + collapse toggle */}
      <div
        style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", userSelect: "none" }}
        onClick={() => setCollapsed((c) => !c)}
      >
        <span style={{ ...keyStyle, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {displayKey}
        </span>
        <select
          className="form-control"
          style={{ width: "auto", minWidth: 60, fontSize: "0.73rem", padding: "2px 4px", flexShrink: 0 }}
          value={field.colWidth ?? "full"}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => { e.stopPropagation(); onUpdate({ colWidth: e.target.value }); }}
        >
          <option value="full">Full</option>
          <option value="half">Half</option>
          <option value="third">Third</option>
        </select>
        <span style={{ color: "var(--text-muted)", fontSize: "0.68rem", flexShrink: 0 }}>
          {collapsed ? "▶" : "▼"}
        </span>
      </div>
      {/* Row 2: required + validator — non-list, expanded only */}
      {!collapsed && !isList && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer", userSelect: "none", flexShrink: 0 }}
            title="When enabled, editors must fill this field before saving">
            <div onClick={() => onUpdate({ required: !field.required })}
              style={{ width: 28, height: 16, borderRadius: 8, background: field.required ? "var(--primary)" : "var(--border)", position: "relative", cursor: "pointer", transition: "background 0.15s" }}>
              <div style={{ position: "absolute", top: 2, left: field.required ? 14 : 2, width: 12, height: 12, borderRadius: "50%", background: "white", transition: "left 0.15s", boxShadow: "0 1px 2px rgba(0,0,0,0.2)" }} />
            </div>
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Required</span>
          </label>
          <FloatSelect label="Validator" value={validatorSelectValue} style={{ flex: 1 }}
            title="Validate the field value against a predefined pattern or custom regex"
            onChange={(v) => {
              if (v === "") onUpdate({ validator: undefined });
              else if (v === "__custom__") onUpdate({ validator: "/" });
              else onUpdate({ validator: v });
            }}>
            {VALIDATOR_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </FloatSelect>
          {isCustomValidator && (
            <FloatInput label="Regex (e.g. /^\\d+$/)" value={field.validator ?? ""} style={{ flex: 2 }}
              title="Custom regular expression — e.g. /^\\d{4}$/ or /^[A-Z]+$/i"
              onChange={(v) => onUpdate({ validator: v })} />
          )}
        </div>
      )}
      {/* Nested children — hidden when collapsed */}
      {!collapsed && isList && (field.childSchema ?? []).length > 0 && (
        <div style={{ paddingLeft: 10, borderLeft: "2px solid var(--border)", marginTop: 2 }}>
          {(field.childSchema ?? []).map((child, cIdx) => (
            <Fragment key={`${child.key}-${cIdx}`}>
              {cIdx > 0 && <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "2px 0" }} />}
              <PlacementFieldRow
                field={child as SchemaField}
                collapseSignal={collapseSignal}
                expandSignal={expandSignal}
                onUpdate={(patch) => {
                  const ch = [...(field.childSchema ?? [])];
                  ch[cIdx] = { ...ch[cIdx], ...patch };
                  onUpdate({ childSchema: ch });
                }}
                onUpdateChild={(gcIdx, patch) => {
                  const ch = [...(field.childSchema ?? [])];
                  const grandchildren = [...(ch[cIdx].childSchema ?? [])];
                  grandchildren[gcIdx] = { ...grandchildren[gcIdx], ...patch };
                  ch[cIdx] = { ...ch[cIdx], childSchema: grandchildren };
                  onUpdate({ childSchema: ch });
                }}
              />
            </Fragment>
          ))}
        </div>
      )}
    </div>
  );
}

function PlacementRows({
  fields, onUpdate, collapseSignal, expandSignal,
}: {
  fields: SchemaField[];
  onUpdate: (idx: number, patch: Partial<SchemaField>) => void;
  collapseSignal?: number;
  expandSignal?: number;
}) {
  if (fields.length === 0) return null;
  return (
    <>
      {fields.map((field, idx) => (
        <Fragment key={`${field.key}-${idx}`}>
          {idx > 0 && <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "2px 0" }} />}
          <PlacementFieldRow
            field={field}
            collapseSignal={collapseSignal}
            expandSignal={expandSignal}
            onUpdate={(patch) => onUpdate(idx, patch)}
            onUpdateChild={(cIdx, patch) => {
              const ch = [...(field.childSchema ?? [])];
              ch[cIdx] = { ...ch[cIdx], ...patch };
              onUpdate(idx, { childSchema: ch });
            }}
          />
        </Fragment>
      ))}
    </>
  );
}

// ── Shared field editor row (self-contained, infinitely recursive) ────────────
function SchemaFieldRow({
  field, onUpdate, onRemove, onMoveUp, onMoveDown, disableMoveUp, disableMoveDown,
  collapseSignal, expandSignal,
}: {
  field: SchemaField;
  onUpdate: (patch: Partial<SchemaField>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  disableMoveUp: boolean;
  disableMoveDown: boolean;
  collapseSignal?: number;
  expandSignal?: number;
}) {
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => { if (collapseSignal) setCollapsed(true); }, [collapseSignal]);
  useEffect(() => { if (expandSignal) setCollapsed(false); }, [expandSignal]);

  function addChild() {
    const len = field.childSchema?.length ?? 0;
    onUpdate({ childSchema: [...(field.childSchema ?? []), { key: `field_${len + 1}`, label: "New Field", type: "text" as SchemaFieldType }] });
  }
  function updateChild(cIdx: number, patch: Partial<SchemaField>) {
    const ch = [...(field.childSchema ?? [])];
    ch[cIdx] = { ...ch[cIdx], ...patch };
    onUpdate({ childSchema: ch });
  }
  function removeChild(cIdx: number) {
    onUpdate({ childSchema: (field.childSchema ?? []).filter((_, i) => i !== cIdx) });
  }
  function moveChild(cIdx: number, dir: -1 | 1) {
    const ch = [...(field.childSchema ?? [])];
    const t = cIdx + dir;
    if (t < 0 || t >= ch.length) return;
    [ch[cIdx], ch[t]] = [ch[t], ch[cIdx]];
    onUpdate({ childSchema: ch });
  }

  return (
    <div style={{ padding: "9px 0" }}>
      {/* Row 1: KEY (full width) + icons + collapse */}
      <div style={{ display: "flex", gap: 4, alignItems: "center", marginBottom: collapsed ? 0 : 5 }}>
        <FloatInput label="Key" value={field.key} monospace
          title="Variable key — used in Liquid template as {{ key }}"
          style={{ flex: 1 }}
          onChange={(v) => onUpdate({ key: v.replace(/\s+/g, "_").toLowerCase() })} />
        <button className="btn-icon" onClick={onMoveUp} disabled={disableMoveUp} title="Move up" style={{ fontSize: "0.65rem" }}>▲</button>
        <button className="btn-icon" onClick={onMoveDown} disabled={disableMoveDown} title="Move down" style={{ fontSize: "0.65rem" }}>▼</button>
        <button className="btn-icon" onClick={onRemove} title="Remove field" style={{ color: "var(--danger)", fontSize: "0.65rem" }}>✕</button>
        <button className="btn-icon" onClick={() => setCollapsed((c) => !c)} title={collapsed ? "Expand field" : "Collapse field"} style={{ fontSize: "0.65rem" }}>
          {collapsed ? "▶" : "▼"}
        </button>
      </div>

      {!collapsed && (
        <>
          {/* Row 2: LABEL (full width) + TYPE */}
          <div style={{ display: "flex", gap: 4, marginBottom: 5 }}>
            <FloatInput label="Label" value={field.label}
              title="Display label shown to editors in the content form"
              style={{ flex: 1 }}
              onChange={(v) => onUpdate({ label: v })} />
            <FloatSelect label="Type" value={field.type}
              title="Field type — determines the input widget in the page editor"
              style={{ width: 96 }}
              onChange={(v) => onUpdate({ type: v as SchemaFieldType })}>
              {SCHEMA_FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </FloatSelect>
          </div>

          {/* Row 3: HELP TEXT / PLACEHOLDER */}
          <FloatTextarea label="Help text / placeholder"
            value={field.helpText ?? ""}
            title="Tooltip or placeholder text displayed to editors in the content form"
            rows={2}
            onChange={(v) => onUpdate({ helpText: v })} />

          {/* Select options */}
          {field.type === "select" && (
            <div style={{ marginTop: 6, paddingLeft: 10, borderLeft: "2px solid var(--border)" }}>
              <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginBottom: 4 }}>Dropdown options</div>
              {(field.options ?? []).map((opt, oIdx) => (
                <div key={oIdx} style={{ display: "flex", gap: 4, marginBottom: 3 }}>
                  <input className="form-control" style={{ flex: 1, fontSize: "0.72rem" }} value={opt.label} placeholder="Label"
                    onChange={(e) => { const opts = [...(field.options ?? [])]; opts[oIdx] = { ...opts[oIdx], label: e.target.value }; onUpdate({ options: opts }); }} />
                  <input className="form-control" style={{ flex: 1, fontSize: "0.72rem", fontFamily: "monospace" }} value={opt.value} placeholder="value"
                    onChange={(e) => { const opts = [...(field.options ?? [])]; opts[oIdx] = { ...opts[oIdx], value: e.target.value }; onUpdate({ options: opts }); }} />
                  <button className="btn-icon" style={{ color: "var(--danger)", fontSize: "0.67rem" }}
                    onClick={() => onUpdate({ options: (field.options ?? []).filter((_, i) => i !== oIdx) })}>✕</button>
                </div>
              ))}
              <button className="btn btn-secondary btn-sm" style={{ width: "100%", marginTop: 2, fontSize: "0.71rem" }}
                onClick={() => onUpdate({ options: [...(field.options ?? []), { label: "", value: "" }] })}>
                + Add option
              </button>
            </div>
          )}

          {/* List child schema */}
          {field.type === "list" && (
            <div style={{ marginTop: 8, paddingLeft: 10, borderLeft: "2px solid var(--border)" }}>
              <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginBottom: 2 }}>
                {field.loopAlias ? `${field.loopAlias} fields` : "item fields"}
              </div>
              {(field.childSchema ?? []).map((child, cIdx) => (
                <Fragment key={cIdx}>
                  {cIdx > 0 && <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "2px 0" }} />}
                  <SchemaFieldRow
                    field={child as SchemaField}
                    onUpdate={(patch) => updateChild(cIdx, patch)}
                    onRemove={() => removeChild(cIdx)}
                    onMoveUp={() => moveChild(cIdx, -1)}
                    onMoveDown={() => moveChild(cIdx, 1)}
                    disableMoveUp={cIdx === 0}
                    disableMoveDown={cIdx >= (field.childSchema?.length ?? 0) - 1}
                  />
                </Fragment>
              ))}
              <button className="btn btn-secondary btn-sm" style={{ width: "100%", marginTop: 4, fontSize: "0.71rem" }}
                onClick={addChild}>+ Add field</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function ComponentEditorPage() {
  const params = useParams();
  const id = params.id as string;
  const isNew = id === "new";

  const [tab,         setTab]         = useState<Tab>(isNew ? "settings" : "template");
  const [backendTab,  setBackendTab]  = useState<BackendTab>("variables");
  const [loading,     setLoading]     = useState(!isNew);
  const [saving,      setSaving]      = useState(false);

  const [name,            setName]            = useState("");
  const [category,        setCategory]        = useState("");
  const [componentType,   setComponentType]   = useState("page");
  const [status,          setStatus]          = useState("draft");
  const [newType,         setNewType]         = useState("page");

  const [templateLiquid,  setTemplateLiquid]  = useState("");
  const [fields,          setFields]          = useState<SchemaField[]>([]);
  const [varCollapseAll,  setVarCollapseAll]  = useState(0);
  const [varExpandAll,    setVarExpandAll]    = useState(0);
  const [plcCollapseAll,  setPlcCollapseAll]  = useState(0);
  const [plcExpandAll,    setPlcExpandAll]    = useState(0);
  const [css,             setCss]             = useState("");
  const [js,              setJs]              = useState("");
  const [currentVersion,  setCurrentVersion]  = useState(0);
  const [formEmbeds,        setFormEmbeds]        = useState<FormEmbed[]>([]);
  const [styleVars,         setStyleVars]         = useState<AutocompleteVar[]>([]);
  const [componentEmbeds,   setComponentEmbeds]   = useState<ComponentEmbed[]>([]);
  const [schemaOrgTemplate, setSchemaOrgTemplate] = useState("");

  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");

  const rightPanelRef = useRef<HTMLDivElement>(null);

  // ── Sync variables from template ─────────────────────────────────────────────
  // Full sync on every template change: adds new vars, removes stale ones,
  // upgrades types (text→list), merges child schemas. Preserves user settings
  // (label, helpText, colWidth, required, validator) for keys that survive.
  useEffect(() => {
    const trimmed = templateLiquid.trim();
    if (!trimmed) return;
    const detected = extractTemplateSchema(trimmed);
    if (detected.length === 0) return; // partial edit — don't wipe everything
    setFields((prev) => {
      const byKey = Object.fromEntries(prev.map((f) => [f.key, f]));
      const synced = detected.map((d) => {
        const existing = byKey[d.key];
        if (!existing) return d;
        if (d.type === "list" && existing.type !== "list") return { ...d, label: existing.label };
        if (d.type === "list" && existing.type === "list") {
          const existingByKey = Object.fromEntries((existing.childSchema ?? []).map((c) => [c.key, c]));
          return { ...existing, loopAlias: d.loopAlias ?? existing.loopAlias, childSchema: (d.childSchema ?? []).map((c) => existingByKey[c.key] ?? c) };
        }
        return existing;
      });
      return JSON.stringify(synced) !== JSON.stringify(prev) ? synced : prev;
    });
  }, [templateLiquid]);

  useEffect(() => {
    if (isNew) return;
    fetch(`/admin/components/${id}/data`).then((r) => r.json()).then((data) => {
      setName(data.name ?? "");
      setCategory(data.category ?? "");
      setComponentType(data.componentType ?? "page");
      setStatus(data.status ?? "draft");
      setTemplateLiquid(data.templateLiquid ?? "");
      setFields(parseSchema(data.schemaJson));
      setCss(data.css ?? "");
      setJs(data.js ?? "");
      setCurrentVersion(data.version ?? 0);
      setFormEmbeds(data.forms ?? []);
      setStyleVars(data.styleVars ?? []);
      setComponentEmbeds(data.components ?? []);
      setSchemaOrgTemplate(data.schemaOrgTemplate ?? "");
      setLoading(false);
    });
  }, [id, isNew]);

  async function handleSaveVersion() {
    setSaving(true);
    try {
      const { template: fixedTemplate, fixed } = fixNestedLoopSyntax(templateLiquid);
      if (fixed) setTemplateLiquid(fixedTemplate);
      await createVersion(id, { templateLiquid: fixed ? fixedTemplate : templateLiquid, schemaJson: fieldsToJson(fields), schemaOrgTemplate, css, js });
      setCurrentVersion((v) => v + 1);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to save version");
    } finally {
      setSaving(false);
    }
  }

  // ── Variable management ───────────────────────────────────────────────────
  function addField() {
    setFields([...fields, { key: `field_${fields.length + 1}`, label: "New Field", type: "text" }]);
  }
  function updateField(idx: number, patch: Partial<SchemaField>) {
    setFields(fields.map((f, i) => (i === idx ? { ...f, ...patch } : f)));
  }
  function removeField(idx: number) {
    setFields(fields.filter((_, i) => i !== idx));
  }
  function moveFieldUp(idx: number) {
    if (idx === 0) return;
    const next = [...fields];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    setFields(next);
  }
  function moveFieldDown(idx: number) {
    if (idx >= fields.length - 1) return;
    const next = [...fields];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    setFields(next);
  }
  function addChildField(idx: number) {
    const child = fields[idx].childSchema ?? [];
    updateField(idx, { childSchema: [...child, { key: `field_${child.length + 1}`, label: "New Field", type: "text" as SchemaFieldType }] });
  }
  function updateChildField(idx: number, cIdx: number, patch: Partial<ComponentSchemaField>) {
    const child = [...(fields[idx].childSchema ?? [])];
    child[cIdx] = { ...child[cIdx], ...patch };
    updateField(idx, { childSchema: child });
  }
  function removeChildField(idx: number, cIdx: number) {
    updateField(idx, { childSchema: (fields[idx].childSchema ?? []).filter((_, i) => i !== cIdx) });
  }
  function syncFieldsFromTemplate() {
    // Auto-fix nested loops to dot notation before extracting schema
    const { template: fixedTemplate, fixed } = fixNestedLoopSyntax(templateLiquid);
    if (fixed) setTemplateLiquid(fixedTemplate);
    const detected = extractTemplateSchema(fixed ? fixedTemplate : templateLiquid);
    setFields((prev) => {
      const byKey = Object.fromEntries(prev.map((f) => [f.key, f]));
      return detected.map((d) => {
        const existing = byKey[d.key];
        if (!existing) return d;
        // Upgrade text→list when detection recognises a loop collection
        if (d.type === "list" && existing.type !== "list") {
          return { ...d, label: existing.label };
        }
        // Replace child schema with detected structure; preserve existing settings for matching keys
        if (d.type === "list" && existing.type === "list") {
          const existingByKey = Object.fromEntries((existing.childSchema ?? []).map((c) => [c.key, c]));
          return {
            ...existing,
            loopAlias: d.loopAlias ?? existing.loopAlias,
            // Map over DETECTED children (not existing) → stale children are dropped automatically
            childSchema: (d.childSchema ?? []).map((c) => existingByKey[c.key] ?? c),
          };
        }
        return existing;
      });
    });
  }
  function moveChildFieldUp(idx: number, cIdx: number) {
    if (cIdx === 0) return;
    const child = [...(fields[idx].childSchema ?? [])];
    [child[cIdx - 1], child[cIdx]] = [child[cIdx], child[cIdx - 1]];
    updateField(idx, { childSchema: child });
  }
  function moveChildFieldDown(idx: number, cIdx: number) {
    const child = [...(fields[idx].childSchema ?? [])];
    if (cIdx >= child.length - 1) return;
    [child[cIdx], child[cIdx + 1]] = [child[cIdx + 1], child[cIdx]];
    updateField(idx, { childSchema: child });
  }

  if (loading) return <div className="empty-state"><p>Loading component…</p></div>;

  // ── New component form ────────────────────────────────────────────────────
  if (isNew) {
    return (
      <div>
        <div className="page-header">
          <h1>New Component</h1>
          <Link href="/admin/components" className="btn btn-secondary">← Back</Link>
        </div>
        <div className="card">
          <form action={createComponent}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Name</label>
                <input name="name" className="form-control" required placeholder="e.g. Hero Banner" />
              </div>
              <div className="form-group">
                <label className="form-label">Component Type</label>
                <select name="componentType" className="form-control" value={newType} onChange={(e) => setNewType(e.target.value)}>
                  <option value="page">Page component — editable variables</option>
                  <option value="ui">UI component — layout only</option>
                  <option value="navigation">Navigation component — nav items</option>
                </select>
              </div>
            </div>
            <div className="form-group" style={{ maxWidth: 320 }}>
              <label className="form-label">Category</label>
              <select name="category" className="form-control">
                <option value="">— None —</option>
                {(COMPONENT_CATEGORIES_BY_TYPE[newType as ComponentType] ?? []).map((cat: string) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <span className="form-hint">Groups the component in the sidebar.</span>
            </div>
            <button type="submit" className="btn btn-primary" style={{ marginTop: 8 }}>
              + Create Component
            </button>
          </form>
        </div>
      </div>
    );
  }

  const TAB_LABELS: Record<Tab, string> = {
    template: "<> Template",
    css:      "CSS",
    js:       "⚡ JS",
    schema:   "🔖 Schema",
    settings: "⚙ Settings",
  };

  // ── Export ────────────────────────────────────────────────────────────────
  function handleExport() {
    const payload = {
      name,
      category: category || undefined,
      type:              componentType,
      status,
      version: {
        templateLiquid,
        schema: fields,
        css,
        js,
        schemaOrgTemplate,
      },
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `${slugifyComponentFilename(name)}.component.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Editor ────────────────────────────────────────────────────────────────
  return (
    <div>
      <AdminEditorHeader
        backHref="/admin/components"
        backLabel="Components"
        title={name}
        badge={`v${currentVersion}`}
        actions={
          tab === "settings" ? (
            <button type="submit" form="component-settings-form" className="btn btn-primary">
              💾 Save Settings
            </button>
          ) : (
            <>
              {saving && <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>Saving…</span>}
              {!isNew && (
                <button className="btn btn-secondary" onClick={handleExport} title="Export component as JSON">
                  ↓ Export
                </button>
              )}
              <button className="btn btn-primary" onClick={handleSaveVersion} disabled={saving}>
                💾 Save New Version
              </button>
            </>
          )
        }
        tabs={(["template", "css", "js", "schema", "settings"] as Tab[]).map((t) => (
          <button key={t} className={`tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
            {TAB_LABELS[t]}
          </button>
        ))}
      />

      {/* ── Template tab ───────────────────────────────────────────────────── */}
      {tab === "template" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20, alignItems: "start" }}>
          {/* Left: code editor */}
          <div className="card" style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <label className="form-label" style={{ margin: 0 }}>Liquid Template</label>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowImport(true)}>
                ↑ Import HTML
              </button>
            </div>
            <CodeEditor
              value={templateLiquid}
              onChange={setTemplateLiquid}
              language="liquid"
              styleVars={styleVars}
              formEmbeds={formEmbeds}
              componentEmbeds={componentEmbeds}
              localVars={fields.map((f) => ({ key: f.key, label: f.label, type: f.type }))}
              minHeight={420}
            />
          </div>

          {/* Right: Variables / Placement panel */}
          <div ref={rightPanelRef} style={{ position: "sticky", top: 80 }}>
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div className="tabs" style={{ margin: 0, padding: "0 4px", borderBottom: "1px solid var(--border)", marginBottom: 0, display: "flex", alignItems: "center" }}>
                {(["variables", "placement"] as BackendTab[]).map((bt) => (
                  <button
                    key={bt}
                    className={`tab ${backendTab === bt ? "active" : ""}`}
                    style={{ fontSize: "0.8rem", padding: "9px 12px" }}
                    onClick={() => setBackendTab(bt)}
                  >
                    {bt === "variables" ? "⊟ Variables" : "⊞ Placement"}
                  </button>
                ))}
                <button
                  className="btn-icon"
                  title="Sync variables from template (keeps existing settings, removes unused vars)"
                  style={{ marginLeft: "auto", marginRight: 6, fontSize: "1rem", color: "var(--text-muted)" }}
                  onClick={syncFieldsFromTemplate}
                >
                  ↺
                </button>
              </div>

              <div style={{ padding: 14, maxHeight: "calc(100vh - 230px)", overflowY: "auto" }}>
                {backendTab === "variables" && (
                  <>
                    <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: 12 }}>
                      Define editable variables. Use <code style={{ background: "#f1f5f9", padding: "0 3px", borderRadius: 3 }}>{"{{key}}"}</code> in the template.
                      {fields.length > 0 && <span style={{ float: "right", display: "flex", gap: 8, fontSize: "0.72rem" }}>
                        <button className="btn-link" style={{ color: "var(--primary)", background: "none", border: "none", cursor: "pointer", padding: 0 }} onClick={() => setVarCollapseAll(c => c + 1)}>Collapse all</button>
                        <button className="btn-link" style={{ color: "var(--primary)", background: "none", border: "none", cursor: "pointer", padding: 0 }} onClick={() => setVarExpandAll(c => c + 1)}>Expand all</button>
                      </span>}
                    </p>
                    {fields.length === 0 ? (
                      <div style={{ color: "var(--text-muted)", fontSize: "0.83rem", textAlign: "center", padding: "14px 0" }}>No variables defined</div>
                    ) : (
                      <div style={{ marginBottom: 8 }}>
                        {fields.map((field, idx) => (
                          <Fragment key={idx}>
                            {idx > 0 && <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "2px 0" }} />}
                            <SchemaFieldRow
                              field={field}
                              onUpdate={(patch) => updateField(idx, patch)}
                              onRemove={() => removeField(idx)}
                              onMoveUp={() => moveFieldUp(idx)}
                              onMoveDown={() => moveFieldDown(idx)}
                              disableMoveUp={idx === 0}
                              disableMoveDown={idx >= fields.length - 1}
                              collapseSignal={varCollapseAll}
                              expandSignal={varExpandAll}
                            />
                          </Fragment>
                        ))}
                      </div>
                    )}
                    <button className="btn btn-secondary btn-sm" onClick={addField} style={{ width: "100%" }}>
                      + Add Variable
                    </button>
                  </>
                )}

                {backendTab === "placement" && (
                  <>
                    <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: 12 }}>
                      Set the column width for each variable in the edit form.
                      {fields.length > 0 && <span style={{ float: "right", display: "flex", gap: 8, fontSize: "0.72rem" }}>
                        <button className="btn-link" style={{ color: "var(--primary)", background: "none", border: "none", cursor: "pointer", padding: 0 }} onClick={() => setPlcCollapseAll(c => c + 1)}>Collapse all</button>
                        <button className="btn-link" style={{ color: "var(--primary)", background: "none", border: "none", cursor: "pointer", padding: 0 }} onClick={() => setPlcExpandAll(c => c + 1)}>Expand all</button>
                      </span>}
                    </p>
                    {fields.length === 0 ? (
                      <div style={{ color: "var(--text-muted)", fontSize: "0.83rem", textAlign: "center", padding: "14px 0" }}>Add variables first</div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <PlacementRows
                          fields={fields}
                          onUpdate={(idx, patch) => updateField(idx, patch)}
                          collapseSignal={plcCollapseAll}
                          expandSignal={plcExpandAll}
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── CSS tab ──────────────────────────────────────────────────────────── */}
      {tab === "css" && (
        <div className="card">
          <label className="form-label" style={{ display: "block", marginBottom: 8 }}>Component CSS</label>
          <CodeEditor value={css} onChange={setCss} language="css" minHeight={320} />
        </div>
      )}

      {/* ── JS tab ───────────────────────────────────────────────────────────── */}
      {tab === "js" && (
        <div className="card">
          <label className="form-label" style={{ display: "block", marginBottom: 8 }}>Component JavaScript</label>
          <CodeEditor value={js} onChange={setJs} language="js" minHeight={320} />
        </div>
      )}

      {/* ── Schema tab ───────────────────────────────────────────────────────── */}
      {tab === "schema" && (
        <ComponentSchemaOrgTab
          value={schemaOrgTemplate}
          onChange={setSchemaOrgTemplate}
          localVars={fields.map((f) => ({ key: f.key, label: f.label, type: f.type }))}
          styleVars={styleVars}
          onSave={handleSaveVersion}
          saving={saving}
        />
      )}

      {/* ── Settings tab ─────────────────────────────────────────────────────── */}
      {tab === "settings" && (
        <div className="card">
          <form id="component-settings-form" action={updateComponent.bind(null, id)}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Name</label>
                <input name="name" className="form-control" defaultValue={name} required />
              </div>
              <div className="form-group">
                <label className="form-label">Component Type</label>
                <select name="componentType" className="form-control" value={componentType}
                  onChange={(e) => { setComponentType(e.target.value); setCategory(""); }}>
                  <option value="page">Page component — has custom variables</option>
                  <option value="ui">UI component — layout only</option>
                  <option value="navigation">Navigation component — nav items</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Category</label>
                <select name="category" className="form-control" value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="">— None —</option>
                  {(COMPONENT_CATEGORIES_BY_TYPE[componentType as ComponentType] ?? []).map((cat: string) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <span className="form-hint">Groups the component in the browser sidebar.</span>
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select name="status" className="form-control" value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </div>
            </div>
            {/* Save via header button (form id) */}
            <input type="hidden" name="_settings" value="1" />
          </form>

          {/* Delete — bottom right, destructive action intentionally separate */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20,
            paddingTop: 16, borderTop: "1px solid var(--border)" }}>
            <button type="button" className="btn btn-danger" onClick={async () => {
              if (!confirm("Delete this component? This cannot be undone.")) return;
              await deleteComponent(id);
            }}>
              🗑 Delete Component
            </button>
          </div>
        </div>
      )}

      {/* ── Import HTML modal ─────────────────────────────────────────────────── */}
      {showImport && (
        <div className="modal-overlay" onClick={() => setShowImport(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <h2 className="modal-title">Import HTML Template</h2>
              <button className="btn-icon" onClick={() => setShowImport(false)}>✕</button>
            </div>
            <div style={{ padding: "16px 24px 24px" }}>
              <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", marginBottom: 12 }}>
                Paste HTML or Tailwind. All text content will be automatically converted to <code style={{ background: "#f1f5f9", padding: "0 3px", borderRadius: 3 }}>{"{{variable}}"}</code> Liquid placeholders with smart names derived from the original text. Variables will appear in the Variables panel.
              </p>
              <textarea
                className="form-control code-editor"
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder={'<div class="card p-6">\n  <h2 class="text-xl font-bold">Heading here</h2>\n  <p>Body text here</p>\n</div>'}
                style={{ minHeight: 220, fontSize: "0.82rem" }}
              />
              <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "flex-end" }}>
                <button className="btn btn-secondary" onClick={() => setShowImport(false)}>Cancel</button>
                <button
                  className="btn btn-primary"
                  disabled={!importText.trim()}
                  onClick={() => {
                    const { html, labelByVar } = htmlToLiquidVariables(importText);
                    setTemplateLiquid(html);
                    // Add extracted variables to fields, preserving existing ones
                    setFields((prev) => {
                      const existingKeys = new Set(prev.map((f) => f.key));
                      const newFields: SchemaField[] = Object.entries(labelByVar)
                        .filter(([k]) => !existingKeys.has(k))
                        .map(([k, originalText]) => ({
                          key: k,
                          label: k.replace(/_/g, " "),
                          type: "text" as const,
                          helpText: originalText.length <= 60 ? originalText : originalText.slice(0, 60) + "…",
                        }));
                      return [...prev, ...newFields];
                    });
                    setImportText("");
                    setShowImport(false);
                    setTab("template");
                  }}
                >
                  Load into editor
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Schema.org tab ────────────────────────────────────────────────────────────

const SCHEMA_PRESETS: { label: string; type: string; template: string }[] = [
  {
    label: "WebPage",
    type:  "WebPage",
    template: `{
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "{{ title }}",
  "description": "{{ description }}",
  "url": "{{ url }}"
}`,
  },
  {
    label: "Article",
    type:  "Article",
    template: `{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "{{ headline }}",
  "description": "{{ description }}",
  "author": { "@type": "Person", "name": "{{ author }}" },
  "datePublished": "{{ date_published }}",
  "image": "{{ image_url }}"
}`,
  },
  {
    label: "Product",
    type:  "Product",
    template: `{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "{{ name }}",
  "description": "{{ description }}",
  "image": "{{ image_url }}",
  "offers": {
    "@type": "Offer",
    "price": "{{ price }}",
    "priceCurrency": "{{ currency }}"
  }
}`,
  },
  {
    label: "FAQPage",
    type:  "FAQPage",
    template: `{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "{{ question_1 }}",
      "acceptedAnswer": { "@type": "Answer", "text": "{{ answer_1 }}" }
    }
  ]
}`,
  },
  {
    label: "Event",
    type:  "Event",
    template: `{
  "@context": "https://schema.org",
  "@type": "Event",
  "name": "{{ title }}",
  "startDate": "{{ start_date }}",
  "endDate": "{{ end_date }}",
  "location": { "@type": "Place", "name": "{{ location }}" },
  "image": "{{ image_url }}"
}`,
  },
];

function ComponentSchemaOrgTab({
  value,
  onChange,
  localVars,
  styleVars,
  onSave,
  saving,
}: {
  value:     string;
  onChange:  (v: string) => void;
  localVars: LocalVar[];
  styleVars: AutocompleteVar[];
  onSave:    () => void;
  saving:    boolean;
}) {
  const [showPresets, setShowPresets] = useState(false);

  return (
    <>
      {/* CR-003 developer notice — outside the card, between tabs and content */}
      <div style={{
        display: "flex", alignItems: "flex-start", gap: 10,
        background: "#fffbeb", border: "1px solid #fde68a",
        borderRadius: 6, padding: "10px 14px", marginBottom: 14,
      }}>
        <span style={{ fontSize: "1rem", flexShrink: 0, marginTop: 1 }}>⚠️</span>
        <div>
          <span style={{ fontWeight: 700, fontSize: "0.82rem", color: "#78350f" }}>
            CR-003 — Engine support pending
          </span>
          <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "#92400e" }}>
            This template will be injected as{" "}
            <code style={{ background: "#fef3c7", padding: "0 3px", borderRadius: 3 }}>
              {"<script type=\"application/ld+json\">"}
            </code>{" "}
            in the page head once CR-003 is implemented in the CMS engine.
          </p>
        </div>
      </div>

      {/* Card */}
      <div className="card">
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <div style={{ flex: 1 }}>
            <label className="form-label" style={{ margin: 0 }}>Schema.org JSON-LD Template</label>
            <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: "var(--text-muted)" }}>
              Use{" "}
              <code style={{ background: "#f1f5f9", padding: "0 3px", borderRadius: 3 }}>{"{{ varname }}"}</code>
              {" "}to reference variables. Type{" "}
              <code style={{ background: "#f1f5f9", padding: "0 3px", borderRadius: 3 }}>{"{{"}</code>
              {" "}to open the variable picker.
            </p>
          </div>

          {/* Preset loader */}
          <div style={{ position: "relative", flexShrink: 0 }}>
            <button className="btn btn-secondary btn-sm"
              onClick={() => setShowPresets((v) => !v)}>
              📋 Load preset ▾
            </button>
            {showPresets && (
              <div style={{
                position: "absolute", top: "100%", right: 0, zIndex: 100,
                background: "white", border: "1px solid var(--border)", borderRadius: 8,
                boxShadow: "0 4px 16px rgba(0,0,0,0.1)", minWidth: 160, marginTop: 4,
              }}>
                {SCHEMA_PRESETS.map((p) => (
                  <button
                    key={p.type}
                    className="btn-icon"
                    style={{ display: "block", width: "100%", textAlign: "left",
                      padding: "9px 14px", fontSize: "0.85rem", borderRadius: 0 }}
                    onClick={() => { onChange(p.template); setShowPresets(false); }}
                  >
                    {p.label}
                  </button>
                ))}
                <div style={{ borderTop: "1px solid var(--border)", padding: "6px 14px 8px",
                  fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  or write from scratch below
                </div>
              </div>
            )}
          </div>
        </div>

        <CodeEditor
          value={value}
          onChange={onChange}
          language="liquid"
          localVars={localVars}
          styleVars={styleVars}
          hideComponentEmbeds
          minHeight={320}
        />
      </div>
    </>
  );
}
