"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminEditorHeader } from "@/components/admin/AdminEditorHeader";
import { CodeEditor, type LocalVar } from "@/components/admin/CodeEditor";
import type {
  CmsPageTemplate,
  CmsRenderTemplate,
  CmsSettings,
  CmsTemplate,
  CmsTranslationEntry,
  RenderTemplateType,
} from "@sherpacms/domain";
import { createTemplate, updateTemplate, deleteTemplate } from "./actions";

type Tab = "layouts" | "navigation" | "email" | "page";
type RenderTemplateWithAssets = CmsRenderTemplate & { css?: string | null; js?: string | null };
type EditingState = RenderTemplateWithAssets | { kind: "new"; type: RenderTemplateType } | null;

function isRenderTemplate(template: CmsTemplate): template is RenderTemplateWithAssets {
  return template.type !== "page";
}

const TAB_LABELS: Record<Tab, string> = {
  layouts: "Layouts",
  navigation: "Navigation",
  email: "Email",
  page: "Page",
};

const NAVIGATION_ITEM_VARS: LocalVar[] = [
  { key: "item.label", label: "Item label", type: "text" },
  { key: "item.url", label: "Item URL", type: "text" },
  { key: "item.description", label: "Item description", type: "text" },
  { key: "item.target", label: "Item target attribute", type: "text" },
];

interface Props {
  initialTab: Tab;
  templates: CmsTemplate[];
  emailTemplates: { id: string; name: string; templateKey: string; subject?: string }[];
  settings: CmsSettings | null;
  translationEntries?: CmsTranslationEntry[];
}

function isNewTemplateDraft(
  editing: EditingState,
): editing is { kind: "new"; type: RenderTemplateType } {
  return editing !== null && "kind" in editing;
}

export function TemplatesClient({
  initialTab,
  templates,
  emailTemplates,
  settings,
  translationEntries = [],
}: Props) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [editing, setEditing] = useState<EditingState>(null);
  const router = useRouter();

  function switchTab(nextTab: Tab) {
    setTab(nextTab);
    router.replace(`/admin/templates?tab=${nextTab}`, { scroll: false });
  }

  if (editing !== null) {
    return (
      <LayoutEditor
        template={isNewTemplateDraft(editing) ? null : editing}
        initialType={isNewTemplateDraft(editing) ? editing.type : editing.type}
        settings={settings}
        translationEntries={translationEntries}
        onClose={() => {
          setEditing(null);
          router.refresh();
        }}
      />
    );
  }

  const renderTemplates = templates.filter(isRenderTemplate);
  const pageTemplates = templates.filter(
    (template): template is CmsPageTemplate => template.type === "page",
  );
  const headAndBodyTemplates = renderTemplates.filter(
    (template) => template.type === "area_head" || template.type === "area_body",
  );
  const navigationTemplates = renderTemplates.filter(
    (template) => template.type === "navigation",
  );

  return (
    <div>
      <AdminPageHeader
        title="Templates"
        subtitle="Reusable templates for area layouts, navigations, pages, and emails."
        tabs={(Object.keys(TAB_LABELS) as Tab[]).map((tabKey) => (
          <button
            key={tabKey}
            className={`tab ${tab === tabKey ? "active" : ""}`}
            onClick={() => switchTab(tabKey)}
          >
            {TAB_LABELS[tabKey]}
          </button>
        ))}
        actions={
          tab === "layouts" ? (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setEditing({ kind: "new", type: "area_head" })}
            >
              + New Layout
            </button>
          ) : tab === "navigation" ? (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setEditing({ kind: "new", type: "navigation" })}
            >
              + New Navigation Template
            </button>
          ) : tab === "email" ? (
            <a href="/admin/emails/new" className="btn btn-primary btn-sm">
              + New Email Template
            </a>
          ) : null
        }
      />

      {tab === "layouts" && (
        <LayoutsTab templates={headAndBodyTemplates} onEdit={(template) => setEditing(template)} />
      )}
      {tab === "navigation" && (
        <NavigationTemplatesTab
          templates={navigationTemplates}
          onEdit={(template) => setEditing(template)}
        />
      )}
      {tab === "email" && <EmailTab templates={emailTemplates} />}
      {tab === "page" && <PageTab templates={pageTemplates} />}
    </div>
  );
}

function LayoutsTab({
  templates,
  onEdit,
}: {
  templates: RenderTemplateWithAssets[];
  onEdit: (template: RenderTemplateWithAssets) => void;
}) {
  const headTemplates = templates.filter((template) => template.type === "area_head");
  const bodyTemplates = templates.filter((template) => template.type === "area_body");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {templates.length === 0 && (
        <div className="empty-state">
          <p>No layout templates yet.</p>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
            Create reusable <code>&lt;head&gt;</code> and <code>&lt;body&gt;</code> HTML
            structures that can be loaded in any area's Design tab.
          </p>
        </div>
      )}

      {headTemplates.length > 0 && (
        <TemplateGroup title="<head> templates" templates={headTemplates} onEdit={onEdit} />
      )}
      {bodyTemplates.length > 0 && (
        <TemplateGroup title="<body> templates" templates={bodyTemplates} onEdit={onEdit} />
      )}
    </div>
  );
}

function NavigationTemplatesTab({
  templates,
  onEdit,
}: {
  templates: RenderTemplateWithAssets[];
  onEdit: (template: RenderTemplateWithAssets) => void;
}) {
  if (templates.length === 0) {
    return (
      <div className="empty-state">
        <p>No navigation templates yet.</p>
        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
          Create reusable navigation render templates to load inside the Navigation editor.
        </p>
      </div>
    );
  }

  return <TemplateGroup title="Navigation templates" templates={templates} onEdit={onEdit} />;
}

function TemplateGroup({
  title,
  templates,
  onEdit,
}: {
  title: string;
  templates: RenderTemplateWithAssets[];
  onEdit: (template: RenderTemplateWithAssets) => void;
}) {
  return (
    <div>
      <p
        style={{
          fontSize: "0.72rem",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: "var(--text-muted)",
          marginBottom: 8,
        }}
      >
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
            {templates.map((template) => (
              <tr
                key={template.id}
                style={{ cursor: "pointer" }}
                onClick={() => onEdit(template)}
              >
                <td style={{ fontWeight: 600 }}>{template.name}</td>
                <td style={{ color: "var(--text-muted)" }}>{template.description || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LayoutEditor({
  template,
  initialType,
  settings,
  onClose,
  translationEntries = [],
}: {
  template: RenderTemplateWithAssets | null;
  initialType: RenderTemplateType;
  settings: CmsSettings | null;
  onClose: () => void;
  translationEntries?: CmsTranslationEntry[];
}) {
  const [name, setName] = useState(template?.name ?? "");
  const [description, setDescription] = useState(template?.description ?? "");
  const [type, setType] = useState<RenderTemplateType>(template?.type ?? initialType);
  const [html, setHtml] = useState(template?.html ?? "");
  const [css, setCss] = useState(template?.css ?? "");
  const [js, setJs] = useState(template?.js ?? "");
  const [, startTransition] = useTransition();
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const router = useRouter();

  const resolvedType = template?.type ?? type;
  const isNavigationTemplate = resolvedType === "navigation";
  const supportsCssAndJs = resolvedType === "area_body" || resolvedType === "navigation";
  const pickerContext = isNavigationTemplate ? "navigation_template" : "layout_template";

  function handleSave() {
    if (!name.trim()) return;

    setSaving(true);
    startTransition(async () => {
      if (template) {
        await updateTemplate(template.id, {
          name,
          description,
          html,
          css: supportsCssAndJs ? css : null,
          js: supportsCssAndJs ? js : null,
        });
      } else {
        await createTemplate({
          name,
          description,
          type: resolvedType,
          html,
          css: supportsCssAndJs ? css : null,
          js: supportsCssAndJs ? js : null,
        });
      }
      setSaving(false);
      router.refresh();
      onClose();
    });
  }

  function handleDelete() {
    if (!template) return;

    startTransition(async () => {
      await deleteTemplate(template.id);
      router.refresh();
      onClose();
    });
  }

  const typeLabel =
    resolvedType === "area_head" ? "<head>" : resolvedType === "area_body" ? "<body>" : "navigation";
  const title =
    template?.name ||
    (resolvedType === "navigation" ? "Navigation Template" : "Layout Template");

  return (
    <div>
      <AdminEditorHeader
        backHref="#"
        backLabel="Templates"
        title={template ? title : resolvedType === "navigation" ? "New Navigation Template" : "New Layout Template"}
        onBack={onClose}
        actions={
          <div style={{ display: "flex", gap: 8 }}>
            {template && !deleteConfirm && (
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={() => setDeleteConfirm(true)}
              >
                Delete
              </button>
            )}
            {deleteConfirm && (
              <>
                <span
                  style={{
                    fontSize: "0.82rem",
                    color: "var(--danger)",
                    alignSelf: "center",
                  }}
                >
                  Delete?
                </span>
                <button type="button" className="btn btn-danger btn-sm" onClick={handleDelete}>
                  Confirm
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setDeleteConfirm(false)}
                >
                  Cancel
                </button>
              </>
            )}
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        }
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="card">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isNavigationTemplate ? "1fr 1fr" : "1fr 1fr auto",
              gap: 16,
              alignItems: "start",
            }}
          >
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Name</label>
              <input
                className="form-control"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={
                  isNavigationTemplate ? "e.g. Footer columns" : "e.g. Standard head"
                }
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Description</label>
              <input
                className="form-control"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Optional description"
              />
            </div>
            {!template && !isNavigationTemplate && (
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Type</label>
                <select
                  className="form-control"
                  value={type}
                  onChange={(event) => setType(event.target.value as RenderTemplateType)}
                >
                  <option value="area_head">&lt;head&gt;</option>
                  <option value="area_body">&lt;body&gt;</option>
                </select>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <label className="form-label" style={{ marginBottom: 8 }}>
            {isNavigationTemplate ? "Liquid Template" : "HTML"} -{" "}
            <code
              style={{
                background: "#eff6ff",
                padding: "0 4px",
                borderRadius: 3,
                color: "var(--primary)",
                fontSize: "0.85rem",
              }}
            >
              {typeLabel}
            </code>{" "}
            template
          </label>
          <CodeEditor
            value={html}
            onChange={setHtml}
            language="html"
            pickerContext={pickerContext}
            settings={settings}
            localVars={isNavigationTemplate ? NAVIGATION_ITEM_VARS : undefined}
            localVarsLabel={isNavigationTemplate ? "Menu Item" : undefined}
            translationEntries={translationEntries}
            minHeight={320}
          />
        </div>

        {supportsCssAndJs && (
          <div className="card">
            <label className="form-label" style={{ marginBottom: 8 }}>
              Additional CSS
            </label>
            <CodeEditor
              value={css}
              onChange={setCss}
              language="css"
              pickerContext={pickerContext}
              settings={settings}
              translationEntries={translationEntries}
              minHeight={180}
            />
          </div>
        )}

        {supportsCssAndJs && (
          <div className="card">
            <label className="form-label" style={{ marginBottom: 8 }}>
              Additional JavaScript
            </label>
            <CodeEditor
              value={js}
              onChange={setJs}
              language="js"
              pickerContext={pickerContext}
              settings={settings}
              translationEntries={translationEntries}
              minHeight={180}
            />
          </div>
        )}
      </div>
    </div>
  );
}

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
          <tr>
            <th>Name</th>
            <th>Key</th>
            <th>Subject</th>
          </tr>
        </thead>
        <tbody>
          {templates.map((template) => (
            <tr
              key={template.id}
              style={{ cursor: "pointer" }}
              onClick={() => {
                window.location.href = `/admin/emails/${template.id}`;
              }}
            >
              <td style={{ fontWeight: 600 }}>{template.name}</td>
              <td>
                <code
                  style={{
                    fontSize: "0.78rem",
                    background: "#f1f5f9",
                    padding: "2px 6px",
                    borderRadius: 4,
                    color: "var(--text-muted)",
                  }}
                >
                  {template.templateKey}
                </code>
              </td>
              <td style={{ color: "var(--text-muted)" }}>{template.subject || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PageTab({ templates }: { templates: CmsPageTemplate[] }) {
  const [list, setList] = useState(
    templates.map((template) => ({
      id: template.id,
      name: template.name,
      componentCount: Array.isArray(template.structure) ? template.structure.length : 0,
    })),
  );
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleDelete(id: string) {
    setDeleting(id);
    await fetch(`/api/admin/page-templates/${id}`, { method: "DELETE" });
    setList((prev) => prev.filter((template) => template.id !== id));
    setDeleting(null);
  }

  if (list.length === 0) {
    return (
      <div className="empty-state">
        <p>No page templates yet.</p>
        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
          Open any page in the content editor and click <strong>Save as Template</strong> to
          create one.
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
            <th style={{ width: 160 }} />
          </tr>
        </thead>
        <tbody>
          {list.map((template) => (
            <tr key={template.id}>
              <td style={{ fontWeight: 600 }}>{template.name}</td>
              <td
                style={{
                  textAlign: "center",
                  color: "var(--text-muted)",
                  fontSize: "0.85rem",
                }}
              >
                {template.componentCount}
              </td>
              <td>
                <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                  <a
                    href={`/admin/pages/new?template=${template.id}`}
                    className="btn btn-secondary btn-sm"
                  >
                    Use
                  </a>
                  <button
                    className="btn btn-danger btn-sm"
                    disabled={deleting === template.id}
                    onClick={() => handleDelete(template.id)}
                  >
                    {deleting === template.id ? "..." : "Delete"}
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
