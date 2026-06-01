"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AdminEditorHeader } from "@/components/admin/AdminEditorHeader";
import { createComponent, updateComponent, deleteComponent, createVersion } from "../actions";
import { CodeEditor, type FormEmbed, type AutocompleteVar, type ComponentEmbed, type LocalVar } from "@/components/admin/CodeEditor";
import {
  COMPONENT_CATEGORIES_BY_TYPE,
  SCHEMA_FIELD_TYPES,
  type ComponentSchemaField,
  type SchemaFieldType,
  type ComponentType,
} from "@cms/domain";

type Tab = "template" | "css" | "js" | "schema" | "settings";
type BackendTab = "variables" | "placement";

type SchemaField = ComponentSchemaField & { colWidth?: string };

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
  const div = document.createElement("div");
  div.innerHTML = htmlString;
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
      const text = (node.textContent ?? "").trim();
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
  return { html: div.innerHTML, labelByVar };
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
function extractTemplateVars(template: string): string[] {
  const re = /\{\{([^}]+)\}\}/g;
  const found = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(template)) !== null) {
    const key = m[1].trim();
    if (/^[a-z_][a-z0-9_]*$/i.test(key)) found.add(key);
  }
  return Array.from(found);
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
  const [namespace,       setNamespace]       = useState("");
  const [componentType,   setComponentType]   = useState("page");
  const [status,          setStatus]          = useState("active");
  const [newType,         setNewType]         = useState("page");

  const [templateLiquid,  setTemplateLiquid]  = useState("");
  const [fields,          setFields]          = useState<SchemaField[]>([]);
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

  // ── Sync variables from template ────────────────────────────────────────────
  // When the template content changes, scan for {{ varName }} and add any new
  // variables not already in the fields array. Never removes existing fields.
  useEffect(() => {
    const keys = extractTemplateVars(templateLiquid);
    if (keys.length === 0) return;
    setFields((prev) => {
      const existingKeys = new Set(prev.map((f) => f.key));
      const newFields: SchemaField[] = keys
        .filter((k) => !existingKeys.has(k))
        .map((k) => ({ key: k, label: k.replace(/_/g, " "), type: "text" as const }));
      return newFields.length > 0 ? [...prev, ...newFields] : prev;
    });
  }, [templateLiquid]);

  useEffect(() => {
    if (isNew) return;
    fetch(`/admin/components/${id}/data`).then((r) => r.json()).then((data) => {
      setName(data.name ?? "");
      setNamespace(data.namespace ?? "");
      setComponentType(data.componentType ?? "page");
      setStatus(data.status ?? "active");
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
      await createVersion(id, { templateLiquid, schemaJson: fieldsToJson(fields), schemaOrgTemplate, css, js });
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
              <select name="namespace" className="form-control">
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
      namespace:         namespace || undefined,
      type:              componentType,
      templateLiquid,
      schema:            fields,
      css,
      js,
      schemaOrgTemplate,
      exportedAt:        new Date().toISOString(),
      exportVersion:     1,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `${name.toLowerCase().replace(/\s+/g, "-")}.component.json`;
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
              <div className="tabs" style={{ margin: 0, padding: "0 4px", borderBottom: "1px solid var(--border)", marginBottom: 0 }}>
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
              </div>

              <div style={{ padding: 14, maxHeight: "calc(100vh - 230px)", overflowY: "auto" }}>
                {backendTab === "variables" && (
                  <>
                    <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: 12 }}>
                      Define editable variables. Use <code style={{ background: "#f1f5f9", padding: "0 3px", borderRadius: 3 }}>{"{{key}}"}</code> in the template.
                    </p>
                    {fields.length === 0 ? (
                      <div style={{ color: "var(--text-muted)", fontSize: "0.83rem", textAlign: "center", padding: "14px 0" }}>No variables defined</div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
                        {fields.map((field, idx) => (
                          <div key={idx} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "10px 11px", background: "var(--bg-light)" }}>
                            {/* Key + label row */}
                            <div style={{ display: "flex", gap: 5, marginBottom: 6 }}>
                              <input
                                className="form-control"
                                style={{ maxWidth: 90, fontFamily: "monospace", fontSize: "0.76rem" }}
                                value={field.key}
                                onChange={(e) => updateField(idx, { key: e.target.value.replace(/\s+/g, "_").toLowerCase() })}
                                placeholder="key"
                              />
                              <input
                                className="form-control"
                                style={{ flex: 1, fontSize: "0.78rem" }}
                                value={field.label}
                                onChange={(e) => updateField(idx, { label: e.target.value })}
                                placeholder="Label"
                              />
                            </div>
                            {/* Type + actions */}
                            <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                              <select
                                className="form-control"
                                style={{ flex: 1, fontSize: "0.77rem" }}
                                value={field.type}
                                onChange={(e) => updateField(idx, { type: e.target.value as SchemaFieldType })}
                              >
                                {SCHEMA_FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                              </select>
                              <button className="btn-icon" onClick={() => moveFieldUp(idx)} disabled={idx === 0} style={{ fontSize: "0.68rem" }}>▲</button>
                              <button className="btn-icon" onClick={() => moveFieldDown(idx)} disabled={idx >= fields.length - 1} style={{ fontSize: "0.68rem" }}>▼</button>
                              <button className="btn-icon" onClick={() => removeField(idx)} style={{ color: "var(--danger)", fontSize: "0.68rem" }}>✕</button>
                            </div>
                            {/* Help text */}
                            <div style={{ marginTop: 5 }}>
                              <input
                                className="form-control"
                                style={{ fontSize: "0.75rem" }}
                                value={field.helpText ?? ""}
                                onChange={(e) => updateField(idx, { helpText: e.target.value })}
                                placeholder="Help text (tooltip in the editor)"
                              />
                            </div>
                            {/* Select options */}
                            {field.type === "select" && (
                              <div style={{ marginTop: 8, borderTop: "1px solid var(--border)", paddingTop: 8 }}>
                                <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: 5 }}>Dropdown options</div>
                                {(field.options ?? []).map((opt, oIdx) => (
                                  <div key={oIdx} style={{ display: "flex", gap: 4, marginBottom: 3 }}>
                                    <input className="form-control" style={{ flex: 1, fontSize: "0.73rem" }} value={opt.label} placeholder="Label"
                                      onChange={(e) => { const opts = [...(field.options ?? [])]; opts[oIdx] = { ...opts[oIdx], label: e.target.value }; updateField(idx, { options: opts }); }} />
                                    <input className="form-control" style={{ flex: 1, fontSize: "0.73rem", fontFamily: "monospace" }} value={opt.value} placeholder="value"
                                      onChange={(e) => { const opts = [...(field.options ?? [])]; opts[oIdx] = { ...opts[oIdx], value: e.target.value }; updateField(idx, { options: opts }); }} />
                                    <button className="btn-icon" style={{ color: "var(--danger)", fontSize: "0.68rem" }}
                                      onClick={() => updateField(idx, { options: (field.options ?? []).filter((_, i) => i !== oIdx) })}>✕</button>
                                  </div>
                                ))}
                                <button className="btn btn-secondary btn-sm" style={{ width: "100%", marginTop: 2, fontSize: "0.72rem" }}
                                  onClick={() => updateField(idx, { options: [...(field.options ?? []), { label: "", value: "" }] })}>
                                  + Add option
                                </button>
                              </div>
                            )}
                          </div>
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
                    </p>
                    {fields.length === 0 ? (
                      <div style={{ color: "var(--text-muted)", fontSize: "0.83rem", textAlign: "center", padding: "14px 0" }}>Add variables first</div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        {fields.map((field, idx) => (
                          <div key={idx} style={{ padding: "7px 10px", border: "1px solid var(--border)", borderRadius: 6, background: "var(--bg-light)" }}>
                            {/* key + select on same row, key truncated */}
                            <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                              <span style={{
                                fontFamily: "monospace", color: "var(--primary)", fontSize: "0.73rem",
                                flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                              }}>
                                {`{{${field.key}}}`}
                              </span>
                              <select
                                className="form-control"
                                style={{ width: 74, fontSize: "0.74rem", padding: "2px 4px", flexShrink: 0 }}
                                value={field.colWidth ?? "full"}
                                onChange={(e) => updateField(idx, { colWidth: e.target.value })}
                              >
                                <option value="full">Full</option>
                                <option value="half">Half</option>
                                <option value="third">Third</option>
                              </select>
                            </div>
                            {/* label below, truncated */}
                            <div style={{
                              fontSize: "0.7rem", color: "var(--text-muted)", marginTop: 2,
                              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                            }}>
                              {field.label}
                            </div>
                          </div>
                        ))}
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
                  onChange={(e) => { setComponentType(e.target.value); setNamespace(""); }}>
                  <option value="page">Page component — has custom variables</option>
                  <option value="ui">UI component — layout only</option>
                  <option value="navigation">Navigation component — nav items</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Category</label>
                <select name="namespace" className="form-control" value={namespace} onChange={(e) => setNamespace(e.target.value)}>
                  <option value="">— None —</option>
                  {(COMPONENT_CATEGORIES_BY_TYPE[componentType as ComponentType] ?? []).map((cat: string) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <span className="form-hint">Groups the component in the browser sidebar.</span>
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select name="status" className="form-control" defaultValue={status}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
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
