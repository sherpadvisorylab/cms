"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createComponent, updateComponent, deleteComponent, createVersion } from "../actions";
import { CodeEditor } from "@/components/admin/CodeEditor";
import {
  BODY_SYSTEM_VARS,
  COMPONENT_CATEGORIES_BY_TYPE,
  SCHEMA_FIELD_TYPES,
  type ComponentSchemaField,
  type SchemaFieldType,
  type ComponentType,
} from "@cms/domain";

type Tab = "template" | "css" | "js" | "settings";
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

  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");

  const rightPanelRef = useRef<HTMLDivElement>(null);

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
      setLoading(false);
    });
  }, [id, isNew]);

  async function handleSaveVersion() {
    setSaving(true);
    try {
      await createVersion(id, { templateLiquid, schemaJson: fieldsToJson(fields), css, js });
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

  // ── Editor ────────────────────────────────────────────────────────────────
  return (
    <div>
      <div className="page-header">
        <h1>{name}</h1>
        <div className="actions-row">
          <span style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>v{currentVersion}</span>
          <Link href="/admin/components" className="btn btn-secondary">← Back</Link>
        </div>
      </div>

      <div className="tabs">
        {(["template", "css", "js", "settings"] as Tab[]).map((t) => (
          <button key={t} className={`tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
            {t === "template" ? "<> Template" : t === "css" ? "CSS" : t === "js" ? "⚡ JS" : "⚙ Settings"}
          </button>
        ))}
      </div>

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
              autocompleteVars={BODY_SYSTEM_VARS}
              minHeight={420}
            />
            <div style={{ marginTop: 12 }}>
              <button className="btn btn-primary" onClick={handleSaveVersion} disabled={saving}>
                {saving ? "Saving…" : "💾 Save New Version"}
              </button>
            </div>
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
                      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                        {fields.map((field, idx) => (
                          <div key={idx} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", border: "1px solid var(--border)", borderRadius: 6, background: "var(--bg-light)" }}>
                            <div style={{ flex: 1, fontSize: "0.8rem" }}>
                              <span style={{ fontFamily: "monospace", color: "var(--primary)", fontSize: "0.75rem" }}>{`{{${field.key}}}`}</span>
                              <span style={{ color: "var(--text-muted)", marginLeft: 6, fontSize: "0.75rem" }}>{field.label}</span>
                            </div>
                            <select
                              className="form-control"
                              style={{ width: 85, fontSize: "0.76rem", padding: "3px 5px" }}
                              value={field.colWidth ?? "full"}
                              onChange={(e) => updateField(idx, { colWidth: e.target.value })}
                            >
                              <option value="full">Full</option>
                              <option value="half">Half</option>
                              <option value="third">Third</option>
                            </select>
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
          <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={handleSaveVersion} disabled={saving}>
            {saving ? "Saving…" : "💾 Save New Version"}
          </button>
        </div>
      )}

      {/* ── JS tab ───────────────────────────────────────────────────────────── */}
      {tab === "js" && (
        <div className="card">
          <label className="form-label" style={{ display: "block", marginBottom: 8 }}>Component JavaScript</label>
          <CodeEditor value={js} onChange={setJs} language="js" minHeight={320} />
          <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={handleSaveVersion} disabled={saving}>
            {saving ? "Saving…" : "💾 Save New Version"}
          </button>
        </div>
      )}

      {/* ── Settings tab ─────────────────────────────────────────────────────── */}
      {tab === "settings" && (
        <div className="card">
          <form action={updateComponent.bind(null, id)}>
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
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button type="submit" className="btn btn-primary">💾 Save Settings</button>
              <button type="button" className="btn btn-danger" onClick={async () => {
                if (!confirm("Delete this component? This cannot be undone.")) return;
                await deleteComponent(id);
              }}>
                🗑 Delete Component
              </button>
            </div>
          </form>
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
                Paste an HTML or Tailwind template below. It will be loaded into the editor — you can then replace text values with <code style={{ background: "#f1f5f9", padding: "0 3px", borderRadius: 3 }}>{"{{variable}}"}</code> placeholders.
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
                  onClick={() => { setTemplateLiquid(importText); setImportText(""); setShowImport(false); setTab("template"); }}
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
