"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AdminEditorHeader } from "@/components/admin/AdminEditorHeader";
import { CodeEditor } from "@/components/admin/CodeEditor";
import type { CmsNavigation, CmsNavigationItem } from "@sherpacms/domain";
import { saveNavigationFull, deleteNavigation } from "../actions";

interface Props {
  nav: CmsNavigation;
  navComponents: { id: string; name: string; templateLiquid: string }[];
  pages: { id: string; title: string; slug: string; areaKey: string }[];
}

export function NavigationEditorClient({ nav, navComponents, pages }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Fields
  const [name,        setName]        = useState(nav.name);
  const [slug,        setSlug]        = useState(nav.slug ?? "");
  const [items,       setItems]       = useState<CmsNavigationItem[]>(nav.items ?? []);
  const [template,    setTemplate]    = useState(nav.template ?? "");
  const [css,         setCss]         = useState(nav.additionalCss ?? "");
  const [js,          setJs]          = useState(nav.additionalJs ?? "");

  // UI state
  const [cssOpen,     setCssOpen]     = useState(false);
  const [jsOpen,      setJsOpen]      = useState(false);
  const [loadModal,   setLoadModal]   = useState(false);
  const [addModal,    setAddModal]    = useState<"page" | "custom" | null>(null);
  const [editItemIdx, setEditItemIdx] = useState<number | null>(null);
  const [delConfirm,  setDelConfirm]  = useState(false);

  // New item form state
  const [newLabel,  setNewLabel]  = useState("");
  const [newUrl,    setNewUrl]    = useState("");

  function handleSave() {
    setSaving(true);
    startTransition(async () => {
      await saveNavigationFull(nav.id, { name, slug, items, template, additionalCss: css, additionalJs: js });
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      router.refresh();
    });
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteNavigation(nav.id);
      router.push("/admin/navigation");
    });
  }

  function addItem(type: "page" | "custom") {
    if (!newLabel.trim() || !newUrl.trim()) return;
    if (editItemIdx !== null) {
      setItems(items.map((it, i) => i === editItemIdx ? { ...it, label: newLabel, url: newUrl, type } : it));
      setEditItemIdx(null);
    } else {
      setItems([...items, { type, label: newLabel, url: newUrl }]);
    }
    setNewLabel(""); setNewUrl(""); setAddModal(null);
  }

  function removeItem(idx: number) {
    setItems(items.filter((_, i) => i !== idx));
  }

  function moveItem(idx: number, dir: -1 | 1) {
    const next = [...items];
    const swap = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    setItems(next);
  }

  function openEdit(idx: number) {
    const item = items[idx];
    setNewLabel(item.label); setNewUrl(item.url);
    setEditItemIdx(idx);
    setAddModal(item.type as "page" | "custom");
  }

  const saveLabel = saved ? "✓ Saved" : saving ? "Saving…" : "Save";

  return (
    <div>
      <AdminEditorHeader
        backHref="/admin/navigation"
        backLabel="Navigation"
        title={name || "Untitled navigation"}
        actions={
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {!delConfirm ? (
              <button type="button" className="btn btn-danger btn-sm" onClick={() => setDelConfirm(true)}>
                Delete
              </button>
            ) : (
              <>
                <span style={{ fontSize: "0.82rem", color: "var(--danger)" }}>Delete?</span>
                <button type="button" className="btn btn-danger btn-sm" onClick={handleDelete}>Confirm</button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setDelConfirm(false)}>Cancel</button>
              </>
            )}
            <button type="button" className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
              {saveLabel}
            </button>
          </div>
        }
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingTop: 16 }}>

        {/* Name + Slug */}
        <div className="card">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Name</label>
              <input className="form-control" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Slug</label>
              <input className="form-control" value={slug} onChange={(e) => setSlug(e.target.value)}
                placeholder="e.g. navbar" />
              <span className="form-hint">
                Embed: <code style={{ fontSize: "0.72rem" }}>{`{{navigation:${nav.id}}}`}</code>
              </span>
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="card">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: "0.88rem" }}>Items</p>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className="btn btn-secondary btn-sm"
                onClick={() => { setEditItemIdx(null); setNewLabel(""); setNewUrl(""); setAddModal("page"); }}>
                + Page
              </button>
              <button type="button" className="btn btn-secondary btn-sm"
                onClick={() => { setEditItemIdx(null); setNewLabel(""); setNewUrl(""); setAddModal("custom"); }}>
                + Custom link
              </button>
            </div>
          </div>

          {items.length === 0 ? (
            <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", margin: 0 }}>
              No items yet. Add a page link or custom link.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {items.map((item, idx) => (
                <div key={idx} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "8px 12px", border: "1px solid var(--border)", borderRadius: 6,
                  background: "#fafafa",
                }}>
                  <span style={{ fontSize: "0.72rem", background: item.type === "page" ? "#eff6ff" : "#f0fdf4",
                    color: item.type === "page" ? "var(--primary)" : "#16a34a",
                    padding: "1px 6px", borderRadius: 10, fontWeight: 600 }}>
                    {item.type}
                  </span>
                  <span style={{ fontWeight: 600, fontSize: "0.88rem", flex: 1 }}>{item.label}</span>
                  <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontFamily: "monospace" }}>{item.url}</span>
                  <div style={{ display: "flex", gap: 4, marginLeft: "auto" }}>
                    <button type="button" className="btn-icon" title="Move up" onClick={() => moveItem(idx, -1)} disabled={idx === 0}>↑</button>
                    <button type="button" className="btn-icon" title="Move down" onClick={() => moveItem(idx, 1)} disabled={idx === items.length - 1}>↓</button>
                    <button type="button" className="btn-icon" title="Edit" onClick={() => openEdit(idx)}>✏️</button>
                    <button type="button" className="btn-icon" title="Remove" style={{ color: "var(--danger)" }} onClick={() => removeItem(idx)}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Display Template */}
        <div className="card">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: "0.88rem" }}>Display Template</p>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setLoadModal(true)}>
              Load from component ▾
            </button>
          </div>
          <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: 10 }}>
            Liquid template rendered when this navigation is embedded via{" "}
            <code style={{ background: "#f1f5f9", padding: "0 3px", borderRadius: 3 }}>{`{{navigation:${nav.id}}}`}</code>.
            {" "}Use <code style={{ background: "#f1f5f9", padding: "0 3px", borderRadius: 3 }}>{"{% for item in menu %}"}</code> to iterate items.
          </p>
          <CodeEditor
            value={template}
            onChange={setTemplate}
            language="html"
            minHeight={220}
            hideComponentEmbeds
          />

          {/* Additional CSS — collapsible */}
          <div style={{ marginTop: 12, border: "1px solid var(--border)", borderRadius: 6 }}>
            <button type="button"
              style={{ width: "100%", textAlign: "left", padding: "10px 14px", background: "none",
                border: "none", cursor: "pointer", display: "flex", justifyContent: "space-between",
                fontWeight: 600, fontSize: "0.82rem" }}
              onClick={() => setCssOpen(!cssOpen)}>
              Additional CSS
              <span style={{ color: "var(--text-muted)", transition: "transform 0.2s",
                transform: cssOpen ? "rotate(180deg)" : "none" }}>▾</span>
            </button>
            {cssOpen && (
              <div style={{ padding: "0 14px 14px" }}>
                <CodeEditor value={css} onChange={setCss} language="css" minHeight={140} hideComponentEmbeds />
              </div>
            )}
          </div>

          {/* Additional JS — collapsible */}
          <div style={{ marginTop: 8, border: "1px solid var(--border)", borderRadius: 6 }}>
            <button type="button"
              style={{ width: "100%", textAlign: "left", padding: "10px 14px", background: "none",
                border: "none", cursor: "pointer", display: "flex", justifyContent: "space-between",
                fontWeight: 600, fontSize: "0.82rem" }}
              onClick={() => setJsOpen(!jsOpen)}>
              Additional JS
              <span style={{ color: "var(--text-muted)", transition: "transform 0.2s",
                transform: jsOpen ? "rotate(180deg)" : "none" }}>▾</span>
            </button>
            {jsOpen && (
              <div style={{ padding: "0 14px 14px" }}>
                <CodeEditor value={js} onChange={setJs} language="js" minHeight={140} hideComponentEmbeds />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Load template modal */}
      {loadModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 500,
          display: "flex", alignItems: "center", justifyContent: "center",
        }} onClick={() => setLoadModal(false)}>
          <div style={{
            background: "white", borderRadius: 12, padding: 28, width: 560, maxHeight: "80vh",
            display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700 }}>Load from Navigation Component</h3>
              <button type="button" style={{ background: "none", border: "none", fontSize: "1.2rem", cursor: "pointer" }}
                onClick={() => setLoadModal(false)}>✕</button>
            </div>
            <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: 16 }}>
              Select a navigation-type component to load its Liquid template as a starting point.
              The variable <code>menu</code> will contain this navigation&apos;s items.
            </p>
            {navComponents.length === 0 ? (
              <div style={{ textAlign: "center", padding: "32px 0", color: "var(--text-muted)" }}>
                <p style={{ fontSize: "1.5rem", marginBottom: 8 }}>🧭</p>
                <p>No navigation components yet.</p>
                <p style={{ fontSize: "0.82rem" }}>Create a component with type "navigation" first.</p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, overflowY: "auto" }}>
                {navComponents.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    style={{
                      textAlign: "left", padding: "14px 16px", border: "1px solid var(--border)",
                      borderRadius: 8, background: "white", cursor: "pointer",
                      transition: "border-color 0.15s, box-shadow 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "var(--primary)";
                      e.currentTarget.style.boxShadow = "0 4px 12px rgba(46,90,151,0.12)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "var(--border)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                    onClick={() => { setTemplate(c.templateLiquid); setLoadModal(false); }}
                  >
                    <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: "0.9rem" }}>🧭 {c.name}</p>
                    <p style={{ margin: 0, fontSize: "0.72rem", color: "var(--text-muted)", fontFamily: "monospace",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {c.templateLiquid.slice(0, 60) || "(empty template)"}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add/edit item modal */}
      {addModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 500,
          display: "flex", alignItems: "center", justifyContent: "center",
        }} onClick={() => { setAddModal(null); setEditItemIdx(null); }}>
          <div style={{
            background: "white", borderRadius: 12, padding: 28, width: 440,
            boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>
                {editItemIdx !== null ? "Edit item" : addModal === "page" ? "Add page link" : "Add custom link"}
              </h3>
              <button type="button" style={{ background: "none", border: "none", fontSize: "1.2rem", cursor: "pointer" }}
                onClick={() => { setAddModal(null); setEditItemIdx(null); }}>✕</button>
            </div>

            {addModal === "page" && editItemIdx === null ? (
              <div className="form-group">
                <label className="form-label">Page</label>
                <select className="form-control" onChange={(e) => {
                  const page = pages.find((p) => p.id === e.target.value);
                  if (page) { setNewLabel(page.title); setNewUrl(`/${page.slug}`); }
                }}>
                  <option value="">— Select page —</option>
                  {pages.map((p) => (
                    <option key={p.id} value={p.id}>{p.title} ({p.slug})</option>
                  ))}
                </select>
              </div>
            ) : null}

            <div className="form-group">
              <label className="form-label">Label</label>
              <input className="form-control" value={newLabel} onChange={(e) => setNewLabel(e.target.value)}
                placeholder="e.g. Home" autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">URL</label>
              <input className="form-control" value={newUrl} onChange={(e) => setNewUrl(e.target.value)}
                placeholder="/path or https://..." />
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
              <button type="button" className="btn btn-secondary btn-sm"
                onClick={() => { setAddModal(null); setEditItemIdx(null); }}>Cancel</button>
              <button type="button" className="btn btn-primary btn-sm"
                onClick={() => addItem(addModal)} disabled={!newLabel.trim() || !newUrl.trim()}>
                {editItemIdx !== null ? "Update" : "Add"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
