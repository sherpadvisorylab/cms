"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CodeEditor } from "@/components/admin/CodeEditor";
import type { CmsNavigation, CmsNavigationItem } from "@cms/domain";
import type { AutocompleteVar } from "@/components/admin/CodeEditor";
import { saveNavigationFull, createNavigationDirect, deleteNavigation } from "./actions";

// Fixed item properties available as Liquid variables inside {% for item in menu %}
const ITEM_VARS = [
  { key: "item.label",       label: "Item label",       type: "text" },
  { key: "item.url",         label: "Item URL",          type: "text" },
  { key: "item.type",        label: "Item type (page/custom)", type: "text" },
  { key: "item.image",       label: "Item image URL",    type: "text" },
  { key: "item.description", label: "Item description",  type: "text" },
];

interface Props {
  initialNavs:   CmsNavigation[];
  navComponents: { id: string; name: string; templateLiquid: string }[];
  pages:         { id: string; title: string; slug: string; url: string; areaName: string }[];
  styleVars:     AutocompleteVar[];
}

export function NavigationManagerClient({ initialNavs, navComponents, pages, styleVars }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [navs,       setNavs]      = useState<CmsNavigation[]>(initialNavs);
  const [selectedId, setSelectedId] = useState<string | null>(initialNavs[0]?.id ?? null);
  const [tab,        setTab]        = useState<"items" | "template" | "settings">("items");

  // New nav inline form
  const [adding,      setAdding]      = useState(false);
  const [newNavName,  setNewNavName]  = useState("");

  // Per-nav edit state (keyed by id)
  const [editState, setEditState]   = useState<Record<string, NavEditState>>(() =>
    Object.fromEntries(initialNavs.map((n) => [n.id, navToState(n)]))
  );

  // Modals
  const [loadModal,   setLoadModal]  = useState(false);
  const [itemModal,   setItemModal]  = useState<"page" | "custom" | null>(null);
  const [editItemIdx, setEditItemIdx]= useState<number | null>(null);
  const [newLabel,    setNewLabel]   = useState("");
  const [newUrl,      setNewUrl]     = useState("");

  const [saving,     setSaving]    = useState(false);
  const [saved,      setSaved]     = useState(false);
  const [delConfirm, setDelConfirm]= useState(false);

  const selected = navs.find((n) => n.id === selectedId) ?? null;
  const state    = selectedId ? editState[selectedId] : null;

  function patch(id: string, partial: Partial<NavEditState>) {
    setEditState((prev) => ({ ...prev, [id]: { ...prev[id], ...partial } }));
  }

  // ── Create new nav ─────────────────────────────────────────────────────────
  function handleCreate() {
    if (!newNavName.trim()) return;
    startTransition(async () => {
      const nav = await createNavigationDirect(newNavName.trim());
      setNavs((prev) => [...prev, nav]);
      setEditState((prev) => ({ ...prev, [nav.id]: navToState(nav) }));
      setSelectedId(nav.id);
      setAdding(false);
      setNewNavName("");
    });
  }

  // ── Save ────────────────────────────────────────────────────────────────────
  function handleSave() {
    if (!selectedId || !state) return;
    setSaving(true);
    startTransition(async () => {
      await saveNavigationFull(selectedId, {
        name:          state.name,
        slug:          "",
        items:         state.items,
        template:      state.template,
        additionalCss: state.css,
        additionalJs:  state.js,
      });
      setNavs((prev) => prev.map((n) => n.id === selectedId
        ? { ...n, name: state.name, items: state.items }
        : n));
      setSaving(false); setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      router.refresh();
    });
  }

  // ── Delete ──────────────────────────────────────────────────────────────────
  function handleDelete() {
    if (!selectedId) return;
    startTransition(async () => {
      await deleteNavigation(selectedId);
      const remaining = navs.filter((n) => n.id !== selectedId);
      setNavs(remaining);
      setSelectedId(remaining[0]?.id ?? null);
      setDelConfirm(false);
      router.refresh();
    });
  }

  // ── Items ───────────────────────────────────────────────────────────────────
  function addItem(type: "page" | "custom") {
    if (!selectedId || !state || !newLabel.trim() || !newUrl.trim()) return;
    const item: CmsNavigationItem = { type, label: newLabel, url: newUrl };
    if (editItemIdx !== null) {
      patch(selectedId!, { items: state.items.map((it, i) => i === editItemIdx ? item : it) });
      setEditItemIdx(null);
    } else {
      patch(selectedId!, { items: [...state.items, item] });
    }
    setNewLabel(""); setNewUrl(""); setItemModal(null);
  }

  function removeItem(idx: number) {
    if (!selectedId || !state) return;
    patch(selectedId!, { items: state.items.filter((_, i) => i !== idx) });
  }

  function moveItem(idx: number, dir: -1 | 1) {
    if (!selectedId || !state) return;
    const next = [...state.items];
    const swap = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    patch(selectedId!, { items: next });
  }

  function openEditItem(idx: number) {
    if (!state) return;
    const item = state.items[idx];
    setNewLabel(item.label); setNewUrl(item.url);
    setEditItemIdx(idx);
    setItemModal(item.type as "page" | "custom");
  }

  return (
    <div style={{ display: "flex", height: "calc(100vh - var(--header-h) - 3rem)", gap: 0 }}>

      {/* ── LEFT: Navigation list ─────────────────────────────────────────── */}
      <div style={{
        width: 260, flexShrink: 0,
        display: "flex", flexDirection: "column",
        background: "white", border: "1px solid var(--border)", borderRadius: 8,
        overflow: "hidden", marginRight: 16,
      }}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)",
          display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: "0.88rem", textTransform: "uppercase",
            letterSpacing: "0.06em", color: "var(--text-muted)" }}>Navigations</p>
          <button type="button"
            style={{ width: 28, height: 28, borderRadius: 6, border: "none",
              background: "var(--primary)", color: "white", cursor: "pointer",
              fontSize: "1.1rem", display: "flex", alignItems: "center", justifyContent: "center" }}
            onClick={() => setAdding(true)} title="New navigation">+</button>
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {navs.map((n) => (
            <button key={n.id} type="button"
              onClick={() => { setSelectedId(n.id); setDelConfirm(false); }}
              style={{
                width: "100%", textAlign: "left", padding: "12px 16px",
                background: selectedId === n.id ? "#eff6ff" : "none",
                border: "none", borderBottom: "1px solid var(--border)", cursor: "pointer",
                borderLeft: selectedId === n.id ? "3px solid var(--primary)" : "3px solid transparent",
                transition: "background 0.12s",
              }}>
              <p style={{ margin: 0, fontWeight: 600, fontSize: "0.88rem" }}>{n.name}</p>
              <p style={{ margin: 0, fontSize: "0.72rem", color: "var(--text-muted)" }}>
                {(editState[n.id]?.items.length ?? n.items?.length ?? 0)} items
              </p>
            </button>
          ))}

          {navs.length === 0 && !adding && (
            <p style={{ padding: 16, fontSize: "0.82rem", color: "var(--text-muted)", margin: 0 }}>
              No navigations yet.
            </p>
          )}
        </div>

        {/* Add new inline */}
        {adding && (
          <div style={{ padding: 12, borderTop: "1px solid var(--border)", background: "#f8fafc" }}>
            <input className="form-control" autoFocus
              value={newNavName} onChange={(e) => setNewNavName(e.target.value)}
              placeholder="Navigation name"
              style={{ marginBottom: 8, fontSize: "0.85rem" }}
              onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") { setAdding(false); setNewNavName(""); } }}
            />
            <div style={{ display: "flex", gap: 6 }}>
              <button type="button" className="btn btn-primary btn-sm" style={{ flex: 1 }}
                onClick={handleCreate} disabled={!newNavName.trim()}>Create</button>
              <button type="button" className="btn btn-secondary btn-sm"
                onClick={() => { setAdding(false); setNewNavName(""); }}>✕</button>
            </div>
          </div>
        )}
      </div>

      {/* ── RIGHT: Editor panel ───────────────────────────────────────────── */}
      {!selected || !state ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
          color: "var(--text-muted)", fontSize: "0.9rem", border: "1px solid var(--border)",
          borderRadius: 8, background: "white" }}>
          Select a navigation or create a new one.
        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", flexDirection: "column",
          background: "white", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px",
            borderBottom: "1px solid var(--border)", background: "#f8fafc", flexShrink: 0 }}>
            <input className="form-control"
              value={state.name}
              onChange={(e) => patch(selectedId!, { name: e.target.value })}
              style={{ fontWeight: 700, fontSize: "1rem", maxWidth: 300 }}
            />
            <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
              <button type="button" className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
                {saved ? "✓ Saved" : saving ? "Saving…" : "💾 Save"}
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", borderBottom: "1px solid var(--border)", padding: "0 20px", flexShrink: 0 }}>
            {([
              ["items",    "☰ Items"],
              ["template", "</> Display Template"],
              ["settings", "⚙ Settings"],
            ] as const).map(([t, label]) => (
              <button key={t} type="button"
                className={`tab ${tab === t ? "active" : ""}`}
                onClick={() => setTab(t)}
                style={{ paddingLeft: 0, paddingRight: 20, fontSize: "0.85rem" }}>
                {label}
              </button>
            ))}
          </div>

          {/* Tab body */}
          <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>

            {/* ── ITEMS TAB ─────────────────────────────────────────────── */}
            {tab === "items" && (
              <div>
                <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: 12 }}>
                  Add CMS pages or custom links. Order defines display order.
                </p>
                <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                  <button type="button" className="btn btn-secondary btn-sm"
                    onClick={() => { setEditItemIdx(null); setNewLabel(""); setNewUrl(""); setItemModal("page"); }}>
                    📄 Add page link
                  </button>
                  <button type="button" className="btn btn-secondary btn-sm"
                    onClick={() => { setEditItemIdx(null); setNewLabel(""); setNewUrl(""); setItemModal("custom"); }}>
                    🔗 Add custom link
                  </button>
                </div>

                {state.items.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "32px 0", color: "var(--text-muted)" }}>
                    <p style={{ fontSize: "1.5rem", marginBottom: 8 }}>☰</p>
                    <p style={{ fontSize: "0.85rem" }}>No items yet.</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {state.items.map((item, idx) => (
                      <div key={idx} style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "10px 14px", border: "1px solid var(--border)", borderRadius: 8,
                        background: "#fafafa",
                      }}>
                        <span style={{ color: "var(--text-muted)", fontSize: "1.1rem", cursor: "grab" }}>⣿</span>
                        <span style={{
                          fontSize: "0.7rem", padding: "2px 7px", borderRadius: 10, fontWeight: 600,
                          background: item.type === "page" ? "#eff6ff" : "#f0fdf4",
                          color: item.type === "page" ? "var(--primary)" : "#16a34a",
                        }}>
                          {item.type}
                        </span>
                        <span style={{ fontWeight: 600, fontSize: "0.9rem", flex: 1 }}>{item.label}</span>
                        <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontFamily: "monospace" }}>
                          {item.url}
                        </span>
                        <div style={{ display: "flex", gap: 4, marginLeft: 8 }}>
                          <button type="button" style={iconBtn} onClick={() => moveItem(idx, -1)} disabled={idx === 0} title="Up">↑</button>
                          <button type="button" style={iconBtn} onClick={() => moveItem(idx, 1)} disabled={idx === state.items.length - 1} title="Down">↓</button>
                          <button type="button" style={iconBtn} onClick={() => openEditItem(idx)} title="Edit">✏️</button>
                          <button type="button" style={{ ...iconBtn, color: "var(--danger)" }} onClick={() => removeItem(idx)} title="Remove">✕</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── TEMPLATE TAB ──────────────────────────────────────────── */}
            {tab === "template" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {/* Template editor */}
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-muted)" }}>
                      Liquid template rendered when this nav is embedded via{" "}
                      <code style={{ background: "#f1f5f9", padding: "0 3px", borderRadius: 3, fontSize: "0.75rem" }}>
                        {`{{navigation:${selected.id}}}`}
                      </code>.
                      Use <code style={{ background: "#f1f5f9", padding: "0 3px", borderRadius: 3, fontSize: "0.75rem" }}>
                        {"{% for item in menu %}"}
                      </code> to iterate.
                      Type <code style={{ background: "#f1f5f9", padding: "0 3px", borderRadius: 3, fontSize: "0.75rem" }}>{"{{"}</code> for variable picker.
                    </p>
                    <button type="button" className="btn btn-secondary btn-sm"
                      onClick={() => setLoadModal(true)} style={{ whiteSpace: "nowrap", marginLeft: 12 }}>
                      Load ▾
                    </button>
                  </div>
                  <CodeEditor
                    value={state.template}
                    onChange={(v) => patch(selectedId!, { template: v })}
                    language="html"
                    minHeight={280}
                    localVars={ITEM_VARS}
                    localVarsLabel="Menu Item"
                    styleVars={styleVars}
                    hideComponentEmbeds
                    hideFormEmbeds
                  />
                </div>

                {/* Additional CSS */}
                <CollapsibleSection title="Additional CSS">
                  <CodeEditor
                    value={state.css}
                    onChange={(v) => patch(selectedId!, { css: v })}
                    language="css"
                    minHeight={140}
                    hideComponentEmbeds
                  />
                </CollapsibleSection>

                {/* Additional JS */}
                <CollapsibleSection title="Additional JS">
                  <CodeEditor
                    value={state.js}
                    onChange={(v) => patch(selectedId!, { js: v })}
                    language="js"
                    minHeight={140}
                    hideComponentEmbeds
                  />
                </CollapsibleSection>
              </div>
            )}

            {/* ── SETTINGS TAB ──────────────────────────────────────────── */}
            {tab === "settings" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div className="card">
                  <p style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase",
                    letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: 16 }}>
                    Embed code
                  </p>
                  <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: 8 }}>
                    Use this placeholder in area <strong>Head</strong> or <strong>Body</strong> templates to embed this navigation:
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <code style={{
                      flex: 1, display: "block", background: "#f1f5f9", padding: "10px 14px",
                      borderRadius: 6, fontSize: "0.85rem", color: "var(--primary)",
                      userSelect: "all", cursor: "text",
                    }}>
                      {`{{navigation:${state.name.toLowerCase().replace(/\s+/g, "-")}}}`}
                    </code>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      title="Copy"
                      onClick={() => navigator.clipboard.writeText(`{{navigation:${state.name.toLowerCase().replace(/\s+/g, "-")}}}`)}
                    >
                      📋
                    </button>
                  </div>
                  <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 6 }}>
                    Resolved by navigation name — rename the navigation to change the key.
                  </p>
                </div>

                {/* Delete zone */}
                <div className="card" style={{ borderColor: "#fecaca", background: "#fff5f5" }}>
                  <p style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase",
                    letterSpacing: "0.06em", color: "var(--danger)", marginBottom: 12 }}>
                    Danger zone
                  </p>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: "0.88rem" }}>Delete navigation</p>
                      <p style={{ margin: "4px 0 0", fontSize: "0.78rem", color: "var(--text-muted)" }}>
                        Permanently removes this navigation and all its items.
                      </p>
                    </div>
                    {!delConfirm ? (
                      <button type="button" className="btn btn-danger btn-sm"
                        onClick={() => setDelConfirm(true)}>
                        Delete
                      </button>
                    ) : (
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span style={{ fontSize: "0.82rem", color: "var(--danger)" }}>Confirm delete?</span>
                        <button type="button" className="btn btn-danger btn-sm" onClick={handleDelete}>Yes, delete</button>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setDelConfirm(false)}>Cancel</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Load template modal ────────────────────────────────────────────── */}
      {loadModal && (
        <Modal onClose={() => setLoadModal(false)} title="Load from Navigation Component">
          <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: 16 }}>
            Select a navigation component to load its Liquid template. Use{" "}
            <code style={{ background: "#f1f5f9", padding: "0 2px", borderRadius: 3 }}>{"{% for item in menu %}"}</code> to iterate items.
          </p>
          {navComponents.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 0", color: "var(--text-muted)" }}>
              <p style={{ fontSize: "1.8rem", marginBottom: 8 }}>🧭</p>
              <p>No navigation components yet.</p>
              <p style={{ fontSize: "0.82rem" }}>Create a component with type "navigation" first.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {navComponents.map((c) => (
                <button key={c.id} type="button"
                  style={{
                    textAlign: "left", padding: "14px 16px",
                    border: "1px solid var(--border)", borderRadius: 8,
                    background: "white", cursor: "pointer",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(46,90,151,0.1)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "none"; }}
                  onClick={() => {
                    if (selectedId) patch(selectedId!, { template: c.templateLiquid });
                    setLoadModal(false);
                    setTab("template");
                  }}>
                  <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: "0.9rem" }}>🧭 {c.name}</p>
                  <p style={{ margin: 0, fontSize: "0.72rem", color: "var(--text-muted)", fontFamily: "monospace",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {c.templateLiquid.slice(0, 60) || "(empty template)"}
                  </p>
                </button>
              ))}
            </div>
          )}
        </Modal>
      )}

      {/* ── Add/edit item modal ─────────────────────────────────────────────── */}
      {itemModal && (
        <Modal onClose={() => { setItemModal(null); setEditItemIdx(null); }}
          title={editItemIdx !== null ? "Edit item" : itemModal === "page" ? "Add page link" : "Add custom link"}>
          {itemModal === "page" && editItemIdx === null && (
            <div className="form-group">
              <label className="form-label">Page</label>
              <select className="form-control" onChange={(e) => {
                const val = e.target.value;
                if (val === "__home__") {
                  setNewLabel("Home"); setNewUrl("/");
                } else {
                  const page = pages.find((p) => p.id === val);
                  if (page) { setNewLabel(page.title); setNewUrl(page.url); }
                }
              }}>
                <option value="">— Select page —</option>
                <option value="__home__">Home — /</option>
                {pages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} ({p.url}){p.areaName ? ` · ${p.areaName}` : ""}
                  </option>
                ))}
              </select>
              <span className="form-hint" style={{ fontSize: "0.72rem" }}>
                Selecting a page pre-fills label and URL — you can edit them below.
              </span>
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Label</label>
            <input className="form-control" value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)} placeholder="e.g. Home" autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">URL</label>
            <input className="form-control" value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)} placeholder="/path or https://..." />
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
            <button type="button" className="btn btn-secondary btn-sm"
              onClick={() => { setItemModal(null); setEditItemIdx(null); }}>Cancel</button>
            <button type="button" className="btn btn-primary btn-sm"
              onClick={() => addItem(itemModal)} disabled={!newLabel.trim() || !newUrl.trim()}>
              {editItemIdx !== null ? "Update" : "Add"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────

interface NavEditState {
  name: string;
  items: CmsNavigationItem[];
  template: string; css: string; js: string;
}

function navToState(n: CmsNavigation): NavEditState {
  return {
    name:     n.name,
    items:    n.items ?? [],
    template: n.template ?? "",
    css:      n.additionalCss ?? "",
    js:       n.additionalJs ?? "",
  };
}

const iconBtn: React.CSSProperties = {
  background: "none", border: "none", cursor: "pointer",
  padding: "2px 4px", borderRadius: 4, fontSize: "0.9rem", lineHeight: 1,
};

// ── Modal wrapper ─────────────────────────────────────────────────────────────
function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 500,
      display: "flex", alignItems: "center", justifyContent: "center",
    }} onClick={onClose}>
      <div style={{
        background: "white", borderRadius: 12, padding: 28, width: 520, maxHeight: "80vh",
        display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
        overflowY: "auto",
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>{title}</h3>
          <button type="button" style={{ background: "none", border: "none", fontSize: "1.2rem", cursor: "pointer" }}
            onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Collapsible section ───────────────────────────────────────────────────────
function CollapsibleSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 6 }}>
      <button type="button"
        style={{ width: "100%", textAlign: "left", padding: "10px 14px", background: "none",
          border: "none", cursor: "pointer", display: "flex", justifyContent: "space-between",
          fontWeight: 600, fontSize: "0.82rem" }}
        onClick={() => setOpen(!open)}>
        {title}
        <span style={{ color: "var(--text-muted)", transition: "transform 0.2s",
          display: "inline-block", transform: open ? "rotate(180deg)" : "none" }}>▾</span>
      </button>
      {open && <div style={{ padding: "0 14px 14px" }}>{children}</div>}
    </div>
  );
}
