"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminEditorHeader } from "@/components/admin/AdminEditorHeader";
import { CodeEditor } from "@/components/admin/CodeEditor";
import type { CmsLayoutTemplate } from "@sherpacms/domain";
import { createLayoutTemplate, updateLayoutTemplate, deleteLayoutTemplate } from "./actions";

type Tab = "layouts" | "email" | "page";

const TAB_LABELS: Record<Tab, string> = {
  layouts: "Layouts",
  email:   "Email",
  page:    "Page",
};

interface Props {
  initialTab:      Tab;
  layoutTemplates: CmsLayoutTemplate[];
  emailTemplates:  { id: string; name: string; templateKey: string; subject?: string }[];
  pageTemplates:   { id: string; name: string; componentCount: number }[];
}

export function TemplatesClient({ initialTab, layoutTemplates, emailTemplates, pageTemplates }: Props) {
  const [tab,     setTab]     = useState<Tab>(initialTab);
  const [editing, setEditing] = useState<CmsLayoutTemplate | "new" | null>(null);
  const router = useRouter();

  function switchTab(t: Tab) {
    setTab(t);
    router.replace(`/admin/templates?tab=${t}`, { scroll: false });
  }

  // ── Full-page layout editor (replaces entire view) ────────────────────────
  if (editing !== null) {
    return (
      <LayoutEditor
        template={editing === "new" ? null : editing}
        onClose={() => { setEditing(null); router.refresh(); }}
      />
    );
  }

  return (
    <div>
      <AdminPageHeader
        title="Templates"
        subtitle="Reusable templates for pages, area layouts, and emails."
        tabs={(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
          <button key={t} className={`tab ${tab === t ? "active" : ""}`} onClick={() => switchTab(t)}>
            {TAB_LABELS[t]}
          </button>
        ))}
        actions={
          tab === "layouts" ? (
            <button className="btn btn-primary btn-sm" onClick={() => setEditing("new")}>
              + New Layout
            </button>
          ) :
          tab === "email" ? <a href="/admin/emails/new" className="btn btn-primary btn-sm">+ New Email Template</a> :
          null
        }
      />

      {tab === "layouts" && (
        <LayoutsTab templates={layoutTemplates} onEdit={setEditing} />
      )}
      {tab === "email" && (
        <EmailTab templates={emailTemplates} />
      )}
      {tab === "page" && (
        <PageTab templates={pageTemplates} />
      )}
    </div>
  );
}

// ── Layouts Tab ───────────────────────────────────────────────────────────────
function LayoutsTab({ templates, onEdit }: { templates: CmsLayoutTemplate[]; onEdit: (t: CmsLayoutTemplate | "new") => void }) {
  const heads  = templates.filter((t) => t.type === "head");
  const bodies = templates.filter((t) => t.type === "body");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {templates.length === 0 && (
        <div className="empty-state">
          <p>No layout templates yet.</p>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
            Create reusable <code>&lt;head&gt;</code> and <code>&lt;body&gt;</code> HTML structures
            that can be loaded in any area&apos;s Design tab.
          </p>
        </div>
      )}

      {heads.length > 0 && (
        <LayoutGroup title="<head> templates" templates={heads} onEdit={onEdit} />
      )}
      {bodies.length > 0 && (
        <LayoutGroup title="<body> templates" templates={bodies} onEdit={onEdit} />
      )}
    </div>
  );
}

function LayoutGroup({
  title, templates, onEdit,
}: {
  title: string;
  templates: CmsLayoutTemplate[];
  onEdit: (t: CmsLayoutTemplate | "new") => void;
}) {
  return (
    <div>
      <p style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase",
        letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: 8 }}>
        {title}
      </p>
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {templates.map((t) => {
              const href = () => onEdit(t);
              return (
                <tr key={t.id} style={{ cursor: "pointer" }} onClick={href}>
                  <td style={{ fontWeight: 600 }}>{t.name}</td>
                  <td style={{ color: "var(--text-muted)" }}>{t.description || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Layout Editor ─────────────────────────────────────────────────────────────
function LayoutEditor({
  template,
  onClose,
}: {
  template: CmsLayoutTemplate | null;
  onClose: () => void;
}) {
  const [name,        setName]        = useState(template?.name        ?? "");
  const [description, setDescription] = useState(template?.description ?? "");
  const [type,        setType]        = useState<"head" | "body">(template?.type ?? "head");
  const [html,        setHtml]        = useState(template?.html        ?? "");
  const [, startTransition] = useTransition();
  const [saving, setSaving] = useState(false);
  const [delConfirm, setDelConfirm] = useState(false);
  const router = useRouter();

  function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    startTransition(async () => {
      if (template) {
        await updateLayoutTemplate(template.id, { name, description, html });
      } else {
        await createLayoutTemplate({ name, description, type, html });
      }
      setSaving(false);
      router.refresh();
      onClose();
    });
  }

  function handleDelete() {
    if (!template) return;
    startTransition(async () => {
      await deleteLayoutTemplate(template.id);
      router.refresh();
      onClose();
    });
  }

  return (
    <div>
      <AdminEditorHeader
        backHref="#"
        backLabel="Templates"
        title={template ? name || "Layout Template" : "New Layout Template"}
        onBack={onClose}
        actions={
          <div style={{ display: "flex", gap: 8 }}>
            {template && !delConfirm && (
              <button type="button" className="btn btn-danger btn-sm" onClick={() => setDelConfirm(true)}>Delete</button>
            )}
            {delConfirm && (
              <>
                <span style={{ fontSize: "0.82rem", color: "var(--danger)", alignSelf: "center" }}>Delete?</span>
                <button type="button" className="btn btn-danger btn-sm" onClick={handleDelete}>Confirm</button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setDelConfirm(false)}>Cancel</button>
              </>
            )}
            <button type="button" className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "💾 Save"}
            </button>
          </div>
        }
      />

      {/* Form */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="card">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 16, alignItems: "start" }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Name</label>
              <input className="form-control" value={name} onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Standard head" />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Description</label>
              <input className="form-control" value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description" />
            </div>
            {!template && (
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Type</label>
                <select className="form-control" value={type}
                  onChange={(e) => setType(e.target.value as "head" | "body")}>
                  <option value="head">&lt;head&gt;</option>
                  <option value="body">&lt;body&gt;</option>
                </select>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <label className="form-label" style={{ marginBottom: 8 }}>
            HTML — <code style={{ background: "#eff6ff", padding: "0 4px", borderRadius: 3,
              color: "var(--primary)", fontSize: "0.85rem" }}>
              {template?.type === "body" || type === "body" ? "<body>" : "<head>"}
            </code> template
          </label>
          <CodeEditor
            value={html}
            onChange={setHtml}
            language="html"
            minHeight={320}
            hideComponentEmbeds
          />
        </div>
      </div>
    </div>
  );
}

// ── Email Tab ─────────────────────────────────────────────────────────────────
function EmailTab({ templates }: { templates: Props["emailTemplates"] }) {
  if (templates.length === 0) {
    return (
      <div className="empty-state">
        <p>No email templates yet.</p>
        <a href="/admin/emails/new" className="btn btn-primary btn-sm" style={{ marginTop: 8 }}>
          + New Email Template
        </a>
      </div>
    );
  }
  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <table className="data-table">
        <thead>
          <tr><th>Name</th><th>Key</th><th>Subject</th></tr>
        </thead>
        <tbody>
          {templates.map((t) => (
            <tr key={t.id} style={{ cursor: "pointer" }}
              onClick={() => window.location.href = `/admin/emails/${t.id}`}>
              <td style={{ fontWeight: 600 }}>{t.name}</td>
              <td>
                <code style={{ fontSize: "0.78rem", background: "#f1f5f9",
                  padding: "2px 6px", borderRadius: 4, color: "var(--text-muted)" }}>
                  {t.templateKey}
                </code>
              </td>
              <td style={{ color: "var(--text-muted)" }}>{t.subject || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Page Tab ─────────────────────────────────────────────────────────────────
function PageTab({ templates }: { templates: Props["pageTemplates"] }) {
  const [list,    setList]    = useState(templates);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleDelete(id: string) {
    setDeleting(id);
    await fetch(`/api/admin/page-templates/${id}`, { method: "DELETE" });
    setList((prev) => prev.filter((t) => t.id !== id));
    setDeleting(null);
  }

  if (list.length === 0) {
    return (
      <div className="empty-state">
        <p>No page templates yet.</p>
        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
          Open any page in the content editor and click <strong>💾 Save as Template</strong> to create one.
        </p>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th style={{ textAlign: "center" }}>Components</th>
            <th style={{ width: 160 }}></th>
          </tr>
        </thead>
        <tbody>
          {list.map((t) => (
            <tr key={t.id}>
              <td style={{ fontWeight: 600 }}>📄 {t.name}</td>
              <td style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                {t.componentCount}
              </td>
              <td>
                <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                  <a
                    href={`/admin/pages/new?template=${t.id}`}
                    className="btn btn-secondary btn-sm"
                  >
                    Use
                  </a>
                  <button
                    className="btn btn-danger btn-sm"
                    disabled={deleting === t.id}
                    onClick={() => handleDelete(t.id)}
                  >
                    {deleting === t.id ? "…" : "Delete"}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
