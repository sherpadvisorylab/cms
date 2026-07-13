"use client";

import React, { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CodeEditor } from "@/components/admin/CodeEditor";
import { SchemaFieldEditor } from "@/components/admin/SchemaFieldEditor";
import { PatternInput } from "@/components/admin/PatternInput";
import { ComponentPropsSection } from "@/components/admin/ComponentPropsSection";
import { ValidatedFieldInput } from "@/components/admin/SchemaFieldInput";
import { getImageUrl, type ImageValue } from "@/components/admin/ImageUploadField";
import {
  SCHEMA_FIELD_TYPES,
  type CmsCollection,
  type CmsCollectionRecord,
  type CmsCollectionView,
  type ComponentSchemaField,
  type CmsSettings,
  type CmsTranslationEntry,
} from "@sherpacms/domain";
import {
  createCollectionDirect,
  deleteCollection,
  saveCollectionFull,
  createRecord,
  updateRecord,
  deleteRecord,
  importCollectionRecords,
  getCollectionRecordsForRelationPicker,
  updateCollectionRecordTranslation,
  type ImportRecordRow,
  type ImportResult,
} from "./actions";
import { parseCsv, toCsvRow, fieldValueToCsvString, csvStringToFieldValue, isCsvSupportedField, normalizeHeader } from "@/lib/csv";

// ── Types ─────────────────────────────────────────────────────────────────────

type CollectionWithRecords = CmsCollection & { records: CmsCollectionRecord[] };

type ComponentTemplate = { id: string; name: string; html: string; css: string; js: string; schema: ComponentSchemaField[] | null };

interface Props {
  initialCollections: CollectionWithRecords[];
  componentTemplates: ComponentTemplate[];
  settings: CmsSettings | null;
  translationEntries?: CmsTranslationEntry[];
  defaultLocale: string;
  supportedLocales: string[];
}

interface EditState {
  name: string;
  slug: string;
  schema: ComponentSchemaField[];
  detailTemplate: string;
  detailCss: string;
  detailJs: string;
  views: CmsCollectionView[];
  records: CmsCollectionRecord[];
  slugPattern: string;
  permalinkPattern: string;
  detailMetaTitle: string;
  detailMetaDescription: string;
  componentDefaultProps: Record<string, Record<string, unknown>>;
  hasDetailPage: boolean;
}

type FixedTab = "records" | "schema" | "detail" | "settings";
type TabId = FixedTab | string; // string = view id

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CollectionManagerClient({ initialCollections, componentTemplates, settings, translationEntries = [], defaultLocale, supportedLocales }: Props) {
  const otherLocales = supportedLocales.filter((l) => l !== defaultLocale);
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [collections, setCollections] = useState<CollectionWithRecords[]>(initialCollections);
  const [selectedId, setSelectedId] = useState<string | null>(initialCollections[0]?.id ?? null);
  const [tab, setTab] = useState<TabId>("records");

  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");

  const [editState, setEditState] = useState<Record<string, EditState>>(() =>
    Object.fromEntries(initialCollections.map((c) => [c.id, colToState(c)])),
  );
  const [savedStateMap, setSavedStateMap] = useState<Record<string, EditState>>(() =>
    Object.fromEntries(initialCollections.map((c) => [c.id, colToState(c)])),
  );

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [delConfirm, setDelConfirm] = useState(false);
  const [loadModal, setLoadModal] = useState<"detail" | string | null>(null); // string = view id
  const [importModalOpen, setImportModalOpen] = useState(false);

  // Record modal
  const [recordModal, setRecordModal] = useState<{ mode: "create" | "edit"; record?: CmsCollectionRecord } | null>(null);
  const [recordFields, setRecordFields] = useState<Record<string, unknown>>({});
  const [recordComponentProps, setRecordComponentProps] = useState<Record<string, Record<string, unknown>>>({});
  const [recordDelConfirm, setRecordDelConfirm] = useState<string | null>(null);
  const [recordActiveLocale, setRecordActiveLocale] = useState(defaultLocale);
  const [recordTranslations, setRecordTranslations] = useState<Record<string, Record<string, unknown>>>({});
  const [recordsViewLocale, setRecordsViewLocale] = useState<string>(defaultLocale);

  const selected = collections.find((c) => c.id === selectedId) ?? null;
  const state = selectedId ? editState[selectedId] : null;

  function saveableKey(s: EditState) {
    const { records: _r, ...rest } = s;
    return JSON.stringify(rest);
  }
  const isDirty = !!(state && selectedId && saveableKey(state) !== saveableKey(savedStateMap[selectedId] ?? state));

  function patch(id: string, partial: Partial<EditState>) {
    setEditState((prev) => ({ ...prev, [id]: { ...prev[id], ...partial } }));
  }

  // ── Collection CRUD ───────────────────────────────────────────────────────

  function handleCreate() {
    if (!newName.trim()) return;
    startTransition(async () => {
      const col = await createCollectionDirect(newName.trim(), slugify(newName.trim()));
      const full: CollectionWithRecords = { ...col, records: [] };
      setCollections((prev) => [...prev, full]);
      setEditState((prev) => ({ ...prev, [col.id]: colToState(full) }));
      setSavedStateMap((prev) => ({ ...prev, [col.id]: colToState(full) }));
      setSelectedId(col.id);
      setTab("records");
      setAdding(false);
      setNewName("");
    });
  }

  function handleSave() {
    if (!selectedId || !state) return;
    setSaving(true);
    startTransition(async () => {
      await saveCollectionFull(selectedId, {
        name: state.name,
        slug: state.slug,
        schema: state.schema,
        detailTemplate: state.detailTemplate,
        detailCss: state.detailCss,
        detailJs: state.detailJs,
        views: state.views,
        slugPattern: state.slugPattern || undefined,
        permalinkPattern: state.permalinkPattern || undefined,
        detailMetaTitle: state.detailMetaTitle || undefined,
        detailMetaDescription: state.detailMetaDescription || undefined,
        componentDefaultProps: Object.keys(state.componentDefaultProps).length > 0 ? state.componentDefaultProps : undefined,
        hasDetailPage: state.hasDetailPage,
      });
      setCollections((prev) =>
        prev.map((c) =>
          c.id === selectedId ? { ...c, ...state } : c,
        ),
      );
      setSavedStateMap((prev) => ({ ...prev, [selectedId]: { ...state } }));
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      router.refresh();
    });
  }

  function handleDelete() {
    if (!selectedId) return;
    startTransition(async () => {
      await deleteCollection(selectedId);
      const remaining = collections.filter((c) => c.id !== selectedId);
      setCollections(remaining);
      setSelectedId(remaining[0]?.id ?? null);
      setDelConfirm(false);
      setTab("records");
      router.refresh();
    });
  }

  // ── View management ───────────────────────────────────────────────────────

  function addView() {
    if (!selectedId || !state) return;
    const newView: CmsCollectionView = {
      id: generateId(),
      name: `View ${state.views.length + 1}`,
      slug: `view-${state.views.length + 1}`,
      template: "",
      order: state.views.length,
    };
    const views = [...state.views, newView];
    patch(selectedId, { views });
    setTab(newView.id);
  }

  function patchView(viewId: string, partial: Partial<CmsCollectionView>) {
    if (!selectedId || !state) return;
    patch(selectedId, {
      views: state.views.map((v) => (v.id === viewId ? { ...v, ...partial } : v)),
    });
  }

  function removeView(viewId: string) {
    if (!selectedId || !state) return;
    const views = state.views.filter((v) => v.id !== viewId);
    patch(selectedId, { views });
    if (tab === viewId) setTab("records");
  }

  // ── Record CRUD ───────────────────────────────────────────────────────────

  function openCreateRecord() {
    const defaults: Record<string, unknown> = {};
    state?.schema.forEach((f) => { defaults[f.key] = f.defaultValue ?? ""; });
    setRecordFields(defaults);
    setRecordComponentProps({});
    setRecordTranslations({});
    setRecordActiveLocale(recordsViewLocale);
    setRecordModal({ mode: "create" });
  }

  function openEditRecord(record: CmsCollectionRecord) {
    const { __componentProps__, ...schemaData } = record.data;
    setRecordFields(schemaData);
    setRecordComponentProps((__componentProps__ as Record<string, Record<string, unknown>>) ?? {});
    setRecordTranslations(record.translations ?? {});
    setRecordActiveLocale(recordsViewLocale);
    setRecordModal({ mode: "edit", record });
  }

  function handleSaveRecord() {
    if (!selectedId || !state || !recordModal) return;
    startTransition(async () => {
      // Build data: schema fields + component props stored under reserved key
      const dataToSave: Record<string, unknown> = { ...recordFields };
      const nonEmptyComponentProps: Record<string, Record<string, unknown>> = {};
      for (const [slug, props] of Object.entries(recordComponentProps)) {
        const nonEmpty = Object.fromEntries(Object.entries(props).filter(([, v]) => v !== "" && v !== null && v !== undefined));
        if (Object.keys(nonEmpty).length > 0) nonEmptyComponentProps[slug] = nonEmpty;
      }
      if (Object.keys(nonEmptyComponentProps).length > 0) dataToSave.__componentProps__ = nonEmptyComponentProps;

      let rec: CmsCollectionRecord;
      if (recordModal.mode === "create") {
        rec = await createRecord(selectedId, dataToSave);
      } else if (recordModal.record) {
        rec = await updateRecord(selectedId, recordModal.record.id, dataToSave);
      } else {
        return;
      }

      // Persist any manually-entered locale overrides typed in the modal's non-default tabs.
      for (const [locale, values] of Object.entries(recordTranslations)) {
        if (locale === defaultLocale || !values || !Object.keys(values).length) continue;
        rec = await updateCollectionRecordTranslation(selectedId, rec.id, locale, values);
      }

      patch(selectedId, {
        records: recordModal.mode === "create"
          ? [...state.records, rec]
          : state.records.map((r) => (r.id === rec.id ? rec : r)),
      });
      setRecordModal(null);
    });
  }

  function handleDeleteRecord(recordId: string) {
    if (!selectedId || !state) return;
    startTransition(async () => {
      await deleteRecord(selectedId, recordId);
      patch(selectedId, { records: state.records.filter((r) => r.id !== recordId) });
      setRecordDelConfirm(null);
    });
  }

  function handleImported(result: ImportResult) {
    if (!selectedId) return;
    patch(selectedId, { records: result.records });
    setCollections((prev) => prev.map((c) => (c.id === selectedId ? { ...c, records: result.records } : c)));
  }

  // ── Embed helpers ─────────────────────────────────────────────────────────

  function embedCode(viewSlug?: string) {
    if (!state) return "";
    return viewSlug
      ? `{{collection:${state.slug}:${viewSlug}}}`
      : `{{collection:${state.slug}}}`;
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const currentView = state?.views.find((v) => v.id === tab) ?? null;

  return (
    <div style={{ display: "flex", height: "calc(100vh - 1.5rem)", gap: 0 }}>
      {/* Sidebar */}
      <div style={sidebarStyle}>
        <div style={sidebarHeaderStyle}>
          <p style={sidebarTitleStyle}>Collections</p>
          <button type="button" style={addBtnStyle} onClick={() => setAdding(true)} title="New collection">+</button>
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {collections.map((col) => (
            <button
              key={col.id}
              type="button"
              onClick={() => { setSelectedId(col.id); setTab("records"); setDelConfirm(false); }}
              style={sidebarItemStyle(selectedId === col.id)}
            >
              <p style={{ margin: 0, fontWeight: 600, fontSize: "0.88rem" }}>{col.name}</p>
              <p style={{ margin: 0, fontSize: "0.72rem", color: "var(--text-muted)" }}>
                {(editState[col.id]?.records.length ?? col.records.length)} records
                {" · "}
                {(editState[col.id]?.schema.length ?? 0)} fields
              </p>
            </button>
          ))}
          {collections.length === 0 && !adding && (
            <p style={{ padding: 16, fontSize: "0.82rem", color: "var(--text-muted)", margin: 0 }}>No collections yet.</p>
          )}
        </div>

        {adding && (
          <div style={{ padding: 12, borderTop: "1px solid var(--border)", background: "#f8fafc" }}>
            <input
              className="form-control"
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Collection name"
              style={{ marginBottom: 8, fontSize: "0.85rem" }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
                if (e.key === "Escape") { setAdding(false); setNewName(""); }
              }}
            />
            <div style={{ display: "flex", gap: 6 }}>
              <button type="button" className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={handleCreate} disabled={!newName.trim()}>Create</button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setAdding(false); setNewName(""); }}>X</button>
            </div>
          </div>
        )}
      </div>

      {/* Main panel */}
      {!selected || !state ? (
        <div style={emptyPanelStyle}>Select a collection or create a new one.</div>
      ) : (
        <div style={mainPanelStyle}>
          {/* Header */}
          <div style={panelHeaderStyle}>
            <input
              className="form-control"
              value={state.name}
              onChange={(e) => patch(selectedId!, { name: e.target.value, slug: slugify(e.target.value) })}
              style={{ fontWeight: 700, fontSize: "1rem", maxWidth: 280 }}
            />
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "monospace" }}>{state.slug}</span>
            <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
              <button type="button" className={`btn btn-sm ${isDirty ? "btn-primary" : "btn-secondary"}`} onClick={handleSave} disabled={saving || !isDirty}>
                {saved ? "Saved ✓" : saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="collection-tabs" style={{ display: "flex", borderBottom: "1px solid var(--border)", padding: "0 20px", flexShrink: 0, overflowX: "auto" }}>
            {(["records", "schema"] as FixedTab[]).map((t) => (
              <button key={t} type="button" className={`tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}
                style={{ paddingLeft: 0, paddingRight: 20, fontSize: "0.85rem", textTransform: "capitalize" }}>
                {t === "records" ? `Records (${state.records.length})` : `Schema (${state.schema.length})`}
              </button>
            ))}
            {state.hasDetailPage && (
              <button type="button" className={`tab ${tab === "detail" ? "active" : ""}`} onClick={() => setTab("detail")}
                style={{ paddingLeft: 0, paddingRight: 20, fontSize: "0.85rem" }}>
                Detail
              </button>
            )}
            {/* Separator + Views label */}
            <span style={{ alignSelf: "center", width: 1, background: "var(--border)", height: 18, margin: "0 8px", flexShrink: 0 }} />
            <span style={{ alignSelf: "center", fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-muted)", marginRight: 4, flexShrink: 0 }}>Views</span>
            {state.views.map((v) => (
              <button key={v.id} type="button" className={`tab ${tab === v.id ? "active" : ""}`} onClick={() => setTab(v.id)}
                style={{ paddingLeft: 0, paddingRight: 12, fontSize: "0.85rem" }}>
                {v.name}
              </button>
            ))}
            <button type="button" className="tab" onClick={addView}
              style={{ paddingLeft: 0, paddingRight: 20, fontSize: "0.85rem", color: "var(--primary)", fontWeight: 700 }}>
              +
            </button>
            <button type="button" className={`tab ${tab === "settings" ? "active" : ""}`} onClick={() => setTab("settings")}
              style={{ paddingLeft: 0, paddingRight: 20, fontSize: "0.85rem", marginLeft: "auto" }}>
              Settings
            </button>
          </div>

          {/* Tab content */}
          <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>

            {/* RECORDS TAB */}
            {tab === "records" && (
              <div>
                {state.schema.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "32px 0", color: "var(--text-muted)" }}>
                    <p style={{ fontSize: "1.5rem", marginBottom: 8 }}>📋</p>
                    <p style={{ fontSize: "0.85rem" }}>Define fields in the Schema tab first.</p>
                  </div>
                ) : (
                  <>
                    <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      {otherLocales.length > 0 && (
                        <>
                          <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginRight: 4 }}>Viewing:</span>
                          {[defaultLocale, ...otherLocales].map((locale) => (
                            <button
                              key={locale}
                              type="button"
                              onClick={() => setRecordsViewLocale(locale)}
                              style={{
                                padding: "4px 10px",
                                borderRadius: 6,
                                border: "1px solid var(--border)",
                                background: recordsViewLocale === locale ? "var(--primary)" : "white",
                                color: recordsViewLocale === locale ? "white" : "var(--text)",
                                fontSize: "0.78rem",
                                fontWeight: 600,
                                cursor: "pointer",
                              }}
                            >
                              {locale.toUpperCase()}{locale === defaultLocale ? " (default)" : ""}
                            </button>
                          ))}
                        </>
                      )}
                      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={openCreateRecord}>Add record</button>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setImportModalOpen(true)}>Import</button>
                      </div>
                    </div>
                    {(() => {
                      const isDefaultLocaleList = recordsViewLocale === defaultLocale;
                      const listFields = (isDefaultLocaleList ? state.schema : state.schema.filter((f) => f.translatable)).slice(0, 3);
                      if (!isDefaultLocaleList && listFields.length === 0) {
                        return (
                          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                            No fields are marked &quot;Translatable&quot; for this collection. Mark at least one in the Schema tab.
                          </p>
                        );
                      }
                      if (state.records.length === 0) {
                        return <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>No records yet.</p>;
                      }
                      return (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {state.records.map((rec) => {
                          const { __componentProps__, ...displayData } = rec.data;
                          const hasComponentOverrides = !!__componentProps__ && Object.keys(__componentProps__).length > 0;
                          const isDefaultLocale = isDefaultLocaleList;
                          return (
                          <div key={rec.id} style={recordRowStyle}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              {listFields.map((f) => {
                                const translatedValue = !isDefaultLocale && f.translatable
                                  ? rec.translations?.[recordsViewLocale]?.[f.key]
                                  : undefined;
                                const hasSource = displayData[f.key] !== undefined && displayData[f.key] !== null && displayData[f.key] !== "";
                                const notTranslated = !isDefaultLocale && f.translatable && hasSource && (translatedValue === undefined || translatedValue === "");
                                const raw = f.type === "image_url" || f.type === "video_url"
                                  ? getImageUrl(displayData[f.key] as ImageValue)
                                  : f.type === "list" || f.type === "relation"
                                    ? `${Array.isArray(displayData[f.key]) ? (displayData[f.key] as unknown[]).length : 0} item(s)`
                                    : String((translatedValue ?? displayData[f.key]) ?? "");
                                return (
                                  <span key={f.key} style={{ marginRight: 16, fontSize: "0.82rem" }}>
                                    <span style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>{f.label}: </span>
                                    <span style={{ fontWeight: 500, fontStyle: notTranslated ? "italic" : "normal", color: notTranslated ? "var(--text-muted)" : "inherit" }}>
                                      {truncate(raw, 40)}
                                    </span>
                                    {notTranslated && (
                                      <span style={{ marginLeft: 6, fontSize: "0.68rem", fontWeight: 600, padding: "1px 6px", borderRadius: 8, background: "#fff7ed", color: "#c2410c" }}>
                                        not translated
                                      </span>
                                    )}
                                  </span>
                                );
                              })}
                              {hasComponentOverrides && <span style={{ fontSize: "0.68rem", color: "var(--primary)", marginLeft: 8, background: "#eff6ff", padding: "1px 5px", borderRadius: 4 }}>custom props</span>}
                            </div>
                            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                              <button type="button" style={iconBtn} onClick={() => openEditRecord(rec)}>Edit</button>
                              {recordDelConfirm === rec.id ? (
                                <>
                                  <button type="button" className="btn btn-danger btn-sm" style={{ fontSize: "0.72rem", padding: "2px 8px" }} onClick={() => handleDeleteRecord(rec.id)}>Confirm</button>
                                  <button type="button" style={iconBtn} onClick={() => setRecordDelConfirm(null)}>Cancel</button>
                                </>
                              ) : (
                                <button type="button" style={{ ...iconBtn, color: "var(--danger)" }} onClick={() => setRecordDelConfirm(rec.id)}>Delete</button>
                              )}
                            </div>
                          </div>
                          );
                        })}
                      </div>
                      );
                    })()}
                  </>
                )}
              </div>
            )}

            {/* SCHEMA TAB */}
            {tab === "schema" && (
              <SchemaEditor
                fields={state.schema}
                onChange={(schema) => patch(selectedId!, { schema })}
                collections={collections}
              />
            )}

            {/* DETAIL TAB */}
            {tab === "detail" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", margin: 0 }}>
                  Liquid template for a single record. Available variable: <code style={inlineCode}>record</code> with all schema fields.
                  Embed via <code style={inlineCode}>{`{{collection:${state.slug}:record-id}}`}</code>.
                </p>
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontSize: "0.82rem", fontWeight: 600 }}>Template</span>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setLoadModal("detail")}>Load</button>
                  </div>
                  <CodeEditor
                    value={state.detailTemplate}
                    onChange={(v) => patch(selectedId!, { detailTemplate: v })}
                    language="html"
                    pickerContext="collection_template"
                    settings={settings}
                    componentEmbeds={componentTemplates.map((t) => ({ id: t.id, name: t.name, namespace: null, type: "component" }))}
                    minHeight={240}
                    localVars={state.schema.map((f) => ({ key: `record.${f.key}`, label: f.label, type: "text" as const }))}
                    localVarsLabel="Record fields"
                    translationEntries={translationEntries}
                  />
                </div>

                {/* Component default props — one collapsible section per embedded component */}
                {extractComponentSlugs(state.detailTemplate).map((slug) => {
                  const tpl = findComponentTemplate(slug, componentTemplates);
                  if (!tpl?.schema?.length) return null;
                  return (
                    <ComponentPropsSection
                      key={slug}
                      title={`${tpl.name} — default props`}
                      schema={tpl.schema}
                      values={state.componentDefaultProps[slug] ?? {}}
                      onChange={(vals) => patch(selectedId!, {
                        componentDefaultProps: { ...state.componentDefaultProps, [slug]: vals },
                      })}
                      defaultCollapsed
                    />
                  );
                })}

                <CollapsibleSection title="CSS">
                  <CodeEditor value={state.detailCss} onChange={(v) => patch(selectedId!, { detailCss: v })} language="css" pickerContext="collection_template" settings={settings} translationEntries={translationEntries} minHeight={120} />
                </CollapsibleSection>
                <CollapsibleSection title="JavaScript">
                  <CodeEditor value={state.detailJs} onChange={(v) => patch(selectedId!, { detailJs: v })} language="js" pickerContext="collection_template" settings={settings} translationEntries={translationEntries} minHeight={120} />
                </CollapsibleSection>
              </div>
            )}

            {/* VIEW TAB */}
            {currentView && (
              <ViewTabContent
                view={currentView}
                schema={state.schema}
                settings={settings}
                embedCode={embedCode(currentView.slug)}
                componentEmbeds={componentTemplates.map((t) => ({ id: t.id, name: t.name, namespace: null, type: "component" }))}
                onPatch={(partial) => patchView(currentView.id, partial)}
                onLoadTemplate={() => setLoadModal(currentView.id)}
                onRemove={() => removeView(currentView.id)}
                translationEntries={translationEntries}
              />
            )}

            {/* SETTINGS TAB */}
            {tab === "settings" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

                {/* Detail page toggle + permalink */}
                {(() => {
                  const fieldVars = state.schema.map((f) => ({ key: f.key, label: f.label, example: f.key }));
                  const slugVars = [{ key: "id", label: "Record ID", example: "abc123" }, ...fieldVars];
                  const permalinkVars = [
                    { key: "record.slug", label: "Record slug (computed)", example: "my-record" },
                    { key: "collection.slug", label: "Collection slug", example: state.slug },
                    { key: "collection.name", label: "Collection name", example: state.name },
                    ...fieldVars,
                  ];
                  const metaVars = [
                    { key: "record.slug", label: "Record slug", example: "my-record" },
                    { key: "site.name", label: "Site name", example: "My Site" },
                    ...fieldVars,
                  ];
                  return (
                    <>
                      {/* Detail page card */}
                      <div className="card">
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: state.hasDetailPage ? 20 : 0 }}>
                          <div>
                            <p style={{ margin: 0, fontWeight: 600, fontSize: "0.88rem" }}>Detail page</p>
                            <p style={{ margin: "3px 0 0", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                              Each record gets its own URL with a Liquid template and SEO metadata.
                            </p>
                          </div>
                          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", flexShrink: 0, marginLeft: 16 }}>
                            <input
                              type="checkbox"
                              checked={state.hasDetailPage}
                              onChange={(e) => {
                                patch(selectedId!, { hasDetailPage: e.target.checked });
                                if (!e.target.checked && (tab as string) === "detail") setTab("records");
                              }}
                            />
                            <span style={{ fontSize: "0.82rem" }}>{state.hasDetailPage ? "Enabled" : "Disabled"}</span>
                          </label>
                        </div>

                        {state.hasDetailPage && (
                          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 20 }}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                              <PatternInput
                                label="Slug pattern"
                                value={state.slugPattern}
                                onChange={(v) => patch(selectedId!, { slugPattern: v })}
                                vars={slugVars}
                                placeholder="{name}"
                                hint={`Default: {id}. Result: "pannello-solare-400w"`}
                              />
                              <PatternInput
                                label="Permalink pattern"
                                value={state.permalinkPattern}
                                onChange={(v) => patch(selectedId!, { permalinkPattern: v })}
                                vars={permalinkVars}
                                placeholder={`/${state.slug}/{record.slug}`}
                                hint={`Default: /{collection.slug}/{record.slug}`}
                              />
                            </div>
                            <PatternInput
                              label="Meta title pattern"
                              value={state.detailMetaTitle}
                              onChange={(v) => patch(selectedId!, { detailMetaTitle: v })}
                              vars={metaVars}
                              placeholder="{name} | {site.name}"
                              hint="Used as <title> and og:title on detail pages"
                            />
                            <PatternInput
                              label="Meta description pattern"
                              value={state.detailMetaDescription}
                              onChange={(v) => patch(selectedId!, { detailMetaDescription: v })}
                              vars={metaVars}
                              placeholder="{description}"
                              hint="Used as <meta name=description> and og:description"
                            />
                            <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 6, padding: "10px 14px", fontSize: "0.78rem", color: "#166534" }}>
                              In your Liquid templates use{" "}
                              {["record.slug", "record.permalink", "record.metaTitle", "record.metaDescription"].map((v) => (
                                <code key={v} style={{ background: "#dcfce7", padding: "0 3px", borderRadius: 2, marginRight: 4 }}>{v}</code>
                              ))}.
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  );
                })()}

                <div className="card">
                  <p style={sectionHeading}>Embed codes</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <EmbedRow label="Default view" code={embedCode()} />
                    {state.views.map((v) => (
                      <EmbedRow key={v.id} label={v.name} code={embedCode(v.slug)} />
                    ))}
                  </div>
                </div>
                <div className="card" style={{ borderColor: "#fecaca", background: "#fff5f5" }}>
                  <p style={{ ...sectionHeading, color: "var(--danger)" }}>Danger zone</p>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: "0.88rem" }}>Delete collection</p>
                      <p style={{ margin: "4px 0 0", fontSize: "0.78rem", color: "var(--text-muted)" }}>Permanently removes this collection and all its records.</p>
                    </div>
                    {!delConfirm ? (
                      <button type="button" className="btn btn-danger btn-sm" onClick={() => setDelConfirm(true)}>Delete</button>
                    ) : (
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span style={{ fontSize: "0.82rem", color: "var(--danger)" }}>Confirm?</span>
                        <button type="button" className="btn btn-danger btn-sm" onClick={handleDelete}>Yes</button>
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

      {/* Load template modal */}
      {loadModal !== null && (
        <Modal title="Load from Component" onClose={() => setLoadModal(null)}>
          {componentTemplates.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>No components found.</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {componentTemplates.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  style={loadCardStyle}
                  onClick={() => {
                    if (!selectedId || !state) return;
                    if (loadModal === "detail") {
                      patch(selectedId, { detailTemplate: tpl.html, detailCss: tpl.css ?? "", detailJs: tpl.js ?? "" });
                      setTab("detail");
                    } else {
                      patchView(loadModal, { template: tpl.html, css: tpl.css ?? "", js: tpl.js ?? "" });
                      setTab(loadModal);
                    }
                    setLoadModal(null);
                  }}
                >
                  <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: "0.9rem" }}>{tpl.name}</p>
                  <p style={{ margin: 0, fontSize: "0.72rem", color: "var(--text-muted)", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {tpl.html.slice(0, 60) || "(empty)"}
                  </p>
                </button>
              ))}
            </div>
          )}
        </Modal>
      )}

      {/* Import records modal */}
      {importModalOpen && selected && state && (
        <ImportRecordsModal
          collection={selected}
          schema={state.schema}
          records={state.records}
          onClose={() => setImportModalOpen(false)}
          onImported={handleImported}
        />
      )}

      {/* Record create/edit modal */}
      {recordModal && state && (
        <Modal title={recordModal.mode === "create" ? "Add record" : "Edit record"} onClose={() => setRecordModal(null)} width={580}>
          {otherLocales.length > 0 && (
            <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
              {[defaultLocale, ...otherLocales].map((locale) => (
                <button
                  key={locale}
                  type="button"
                  className={`btn btn-sm ${recordActiveLocale === locale ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => setRecordActiveLocale(locale)}
                >
                  {locale.toUpperCase()}{locale === defaultLocale ? " (default)" : ""}
                </button>
              ))}
            </div>
          )}
          {(() => {
            const isDefaultLocale = recordActiveLocale === defaultLocale;
            const modalFields = isDefaultLocale ? state.schema : state.schema.filter((f) => f.translatable);
            if (!isDefaultLocale && modalFields.length === 0) {
              return (
                <p style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                  No fields are marked &quot;Translatable&quot; for this collection. Mark at least one in the Schema tab.
                </p>
              );
            }
            return (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "0 12px" }}>
                {modalFields.map((field) => {
                  const value = isDefaultLocale
                    ? recordFields[field.key]
                    : recordTranslations[recordActiveLocale]?.[field.key];
                  const hasSource = recordFields[field.key] !== undefined && recordFields[field.key] !== null && recordFields[field.key] !== "";
                  const notTranslated = !isDefaultLocale && hasSource && (value === undefined || value === "");
                  return (
                    <div key={field.key} className="form-group" style={{ gridColumn: colWidthSpan(field.colWidth) }}>
                      <label className="form-label">
                        {field.label}
                        {field.required && isDefaultLocale && <span style={{ color: "var(--danger)", marginLeft: 2 }}>*</span>}
                        {notTranslated && (
                          <span style={{ marginLeft: 6, fontSize: "0.68rem", fontWeight: 600, color: "var(--danger)" }}>not translated</span>
                        )}
                      </label>
                      <ValidatedFieldInput
                        field={field}
                        value={value}
                        onChange={(val) =>
                          isDefaultLocale
                            ? setRecordFields((prev) => ({ ...prev, [field.key]: val }))
                            : setRecordTranslations((prev) => ({
                                ...prev,
                                [recordActiveLocale]: { ...prev[recordActiveLocale], [field.key]: val },
                              }))
                        }
                      />
                    </div>
                  );
                })}
              </div>
            );
          })()}
          {/* Component prop overrides — one collapsible section per embedded component */}
          {extractComponentSlugs(state.detailTemplate).map((slug) => {
            const tpl = findComponentTemplate(slug, componentTemplates);
            if (!tpl?.schema?.length) return null;
            const defaults = state.componentDefaultProps[slug] ?? {};
            // Build placeholders: show collection default as placeholder text
            const placeholders: Record<string, string> = {};
            for (const [k, v] of Object.entries(defaults)) {
              if (v !== undefined && v !== "") placeholders[k] = `default: ${truncate(String(v), 30)}`;
            }
            return (
              <div key={slug} style={{ marginTop: 16 }}>
                <ComponentPropsSection
                  title={`${tpl.name} — override`}
                  schema={tpl.schema}
                  values={recordComponentProps[slug] ?? {}}
                  onChange={(vals) => setRecordComponentProps((prev) => ({ ...prev, [slug]: vals }))}
                  placeholders={placeholders}
                  defaultCollapsed={true}
                />
              </div>
            );
          })}

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setRecordModal(null)}>Cancel</button>
            <button type="button" className="btn btn-primary btn-sm" onClick={handleSaveRecord}>
              {recordModal.mode === "create" ? "Add" : "Update"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Schema Editor ─────────────────────────────────────────────────────────────

function SchemaEditor({ fields, onChange, collections }: { fields: ComponentSchemaField[]; onChange: (fields: ComponentSchemaField[]) => void; collections: CollectionWithRecords[] }) {
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [draft, setDraft] = useState<Partial<ComponentSchemaField>>({});
  // Mirrors the "Options" textarea verbatim (including blank lines being typed) — kept
  // separate from draft.options so an in-progress newline/blank line isn't swallowed by
  // re-deriving the textarea's value from the parsed (and filtered) options array.
  const [optionsText, setOptionsText] = useState("");
  const relationTargetCollection = collections.find((c) => c.slug === draft.relationTarget) ?? null;

  function optionsToText(options: ComponentSchemaField["options"]) {
    return (options ?? []).map((o) => `${o.value}|${o.label}`).join("\n");
  }

  function openAdd() {
    setDraft({ key: "", label: "", type: "text" });
    setOptionsText("");
    setEditingIdx(-1);
  }

  function openEdit(idx: number) {
    setDraft({ ...fields[idx] });
    setOptionsText(optionsToText(fields[idx].options));
    setEditingIdx(idx);
  }

  function deriveKey(label: string, existingKeys: string[]): string {
    const base = label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "field";
    if (!existingKeys.includes(base)) return base;
    let i = 2;
    while (existingKeys.includes(`${base}_${i}`)) i++;
    return `${base}_${i}`;
  }

  function save() {
    if (!draft.label || !draft.type) return;
    // Key: use existing (edit mode) or derive from label (create mode)
    const existingKeys = fields.map((f) => f.key);
    const key = editingIdx === -1
      ? deriveKey(draft.label, existingKeys)
      : (draft.key ?? deriveKey(draft.label, existingKeys));
    const field: ComponentSchemaField = {
      key,
      label: draft.label,
      type: draft.type as ComponentSchemaField["type"],
      defaultValue: draft.defaultValue,
      options: draft.options,
      placeholder: draft.placeholder,
      required: draft.required,
      colWidth: draft.colWidth,
      validator: draft.validator,
      relationTarget: draft.relationTarget,
      relationMode: draft.relationMode,
      relationFields: draft.relationFields,
      relationViewSlug: draft.relationViewSlug,
      translatable: draft.translatable,
    };
    if (editingIdx === -1) {
      onChange([...fields, field]);
    } else if (editingIdx !== null) {
      onChange(fields.map((f, i) => (i === editingIdx ? field : f)));
    }
    setEditingIdx(null);
  }

  function remove(idx: number) {
    onChange(fields.filter((_, i) => i !== idx));
  }

  function move(idx: number, dir: -1 | 1) {
    const next = [...fields];
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= next.length) return;
    [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
    onChange(next);
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <button type="button" className="btn btn-secondary btn-sm" onClick={openAdd}>Add field</button>
      </div>
      {fields.length === 0 && editingIdx === null && (
        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>No fields defined. Add at least one field to start entering records.</p>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
        {fields.map((f, idx) => (
          <div key={f.key} style={recordRowStyle}>
            <span style={{ fontFamily: "monospace", fontSize: "0.82rem", color: "var(--primary)", minWidth: 120 }}>{f.key}</span>
            <span style={{ fontSize: "0.82rem", flex: 1 }}>{f.label}</span>
            <span style={{ ...typeBadge(f.type) }}>{f.type}</span>
            <div style={{ display: "flex", gap: 4 }}>
              <button type="button" style={iconBtn} onClick={() => move(idx, -1)} disabled={idx === 0}>↑</button>
              <button type="button" style={iconBtn} onClick={() => move(idx, 1)} disabled={idx === fields.length - 1}>↓</button>
              <button type="button" style={iconBtn} onClick={() => openEdit(idx)}>Edit</button>
              <button type="button" style={{ ...iconBtn, color: "var(--danger)" }} onClick={() => remove(idx)}>Remove</button>
            </div>
          </div>
        ))}
      </div>

      {editingIdx !== null && (
        <div style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 16, background: "#f8fafc" }}>
          <p style={{ ...sectionHeading, marginBottom: 12 }}>{editingIdx === -1 ? "New field" : "Edit field"}</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Label</label>
              <input
                className="form-control"
                autoFocus
                value={draft.label ?? ""}
                onChange={(e) => setDraft((p) => ({ ...p, label: e.target.value }))}
                placeholder="e.g. Question"
              />
              {editingIdx !== -1 && draft.key && (
                <span className="form-hint" style={{ fontSize: "0.72rem", fontFamily: "monospace" }}>key: {draft.key}</span>
              )}
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Type</label>
              <select className="form-control" value={draft.type ?? "text"} onChange={(e) => setDraft((p) => ({ ...p, type: e.target.value as ComponentSchemaField["type"] }))}>
                {SCHEMA_FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          {draft.type === "select" && (
            <div className="form-group">
              <label className="form-label">Options (one per line: value|Label)</label>
              <textarea
                className="form-control"
                rows={3}
                value={optionsText}
                onChange={(e) => {
                  setOptionsText(e.target.value);
                  const options = e.target.value.split("\n").filter((line) => line.trim()).map((line) => {
                    const [value, ...rest] = line.split("|");
                    return { value: value.trim(), label: rest.join("|").trim() || value.trim() };
                  });
                  setDraft((p) => ({ ...p, options }));
                }}
              />
            </div>
          )}
          {draft.type === "relation" && (
            <div className="form-group">
              <label className="form-label">Related collection</label>
              <select
                className="form-control"
                value={draft.relationTarget ?? ""}
                onChange={(e) => setDraft((p) => ({
                  ...p,
                  relationTarget: e.target.value || undefined,
                  relationFields: undefined,
                  relationViewSlug: undefined,
                }))}
              >
                <option value="">— Select a collection —</option>
                {collections.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
              </select>
            </div>
          )}
          {draft.type === "relation" && draft.relationTarget && (
            <div className="form-group">
              <label className="form-label">Display mode</label>
              <div style={{ display: "flex", gap: 16, marginTop: 4 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: "0.85rem" }}>
                  <input
                    type="radio"
                    name="relationMode"
                    checked={(draft.relationMode ?? "fields") === "fields"}
                    onChange={() => setDraft((p) => ({ ...p, relationMode: "fields" }))}
                  />
                  Expose fields (loop with <code>{"{% for %}"}</code> in the template)
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: "0.85rem" }}>
                  <input
                    type="radio"
                    name="relationMode"
                    checked={draft.relationMode === "view"}
                    onChange={() => setDraft((p) => ({ ...p, relationMode: "view" }))}
                  />
                  Render a view of the related collection
                </label>
              </div>
            </div>
          )}
          {draft.type === "relation" && draft.relationTarget && (draft.relationMode ?? "fields") === "fields" && (
            <div className="form-group">
              <label className="form-label">Exposed fields (default: all)</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {(relationTargetCollection?.schema ?? []).length === 0 ? (
                  <span className="form-hint">The related collection has no fields defined.</span>
                ) : (
                  relationTargetCollection!.schema.map((f) => {
                    const checked = draft.relationFields ? draft.relationFields.includes(f.key) : true;
                    return (
                      <label key={f.key} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.8rem", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const allKeys = relationTargetCollection!.schema.map((sf) => sf.key);
                            const current = draft.relationFields ?? allKeys;
                            const next = e.target.checked
                              ? allKeys.filter((k) => k === f.key || current.includes(k))
                              : current.filter((k) => k !== f.key);
                            setDraft((p) => ({ ...p, relationFields: next }));
                          }}
                        />
                        {f.label}
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          )}
          {draft.type === "relation" && draft.relationTarget && draft.relationMode === "view" && (
            <div className="form-group">
              <label className="form-label">View to render</label>
              <select
                className="form-control"
                value={draft.relationViewSlug ?? ""}
                onChange={(e) => setDraft((p) => ({ ...p, relationViewSlug: e.target.value || undefined }))}
              >
                <option value="">— Default (first view) —</option>
                {(relationTargetCollection?.views ?? []).slice().sort((a, b) => a.order - b.order).map((v) => (
                  <option key={v.id} value={v.slug}>{v.name}</option>
                ))}
              </select>
              {(relationTargetCollection?.views ?? []).length === 0 && (
                <span className="form-hint">The related collection has no views defined.</span>
              )}
            </div>
          )}
          <div style={{ marginBottom: 14 }}>
            <SchemaFieldEditor
              field={draft as ComponentSchemaField}
              onChange={(patch) => setDraft((p) => ({ ...p, ...patch }))}
            />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="btn btn-primary btn-sm" onClick={save} disabled={!draft.label}>
              {editingIdx === -1 ? "Add" : "Update"}
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditingIdx(null)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── View Tab Content ──────────────────────────────────────────────────────────

function ViewTabContent({
  view,
  schema,
  settings,
  embedCode,
  componentEmbeds,
  onPatch,
  onLoadTemplate,
  onRemove,
  translationEntries = [],
}: {
  view: CmsCollectionView;
  schema: ComponentSchemaField[];
  settings: CmsSettings | null;
  embedCode: string;
  componentEmbeds: { id: string; name: string; namespace: string | null; type: string }[];
  onPatch: (partial: Partial<CmsCollectionView>) => void;
  onLoadTemplate: () => void;
  onRemove: () => void;
  translationEntries?: CmsTranslationEntry[];
}) {
  const [delConfirm, setDelConfirm] = useState(false);

  // "collection.records" as list → triggers {% for record in collection.records %} snippet
  // "record.*" keys → dot-completion after "record." and picker display
  const localVars = [
    { key: "collection.records", label: "Records", type: "list" as const },
    ...schema.map((f) => ({ key: `record.${f.key}`, label: f.label, type: "text" as const })),
  ];
  const paginationVars = [
    { key: "collection.pagination.page", label: "Current page", type: "text" as const },
    { key: "collection.pagination.total_pages", label: "Total pages", type: "text" as const },
    { key: "collection.pagination.has_prev", label: "Has previous page", type: "text" as const },
    { key: "collection.pagination.has_next", label: "Has next page", type: "text" as const },
    { key: "collection.pagination.prev_page", label: "Previous page number", type: "text" as const },
    { key: "collection.pagination.next_page", label: "Next page number", type: "text" as const },
    { key: "collection.pagination.total_count", label: "Total records", type: "text" as const },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* View name + slug */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">View name</label>
          <input className="form-control" value={view.name} onChange={(e) => onPatch({ name: e.target.value, slug: slugify(e.target.value) })} />
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Slug</label>
          <input className="form-control" value={view.slug} onChange={(e) => onPatch({ slug: slugify(e.target.value) })} style={{ fontFamily: "monospace", fontSize: "0.85rem" }} />
        </div>
      </div>

      {/* Filter */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Filter field</label>
          <select className="form-control" value={view.filterField ?? ""} onChange={(e) => onPatch({ filterField: e.target.value || undefined })}>
            <option value="">— No filter —</option>
            {schema.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Filter value (equals)</label>
          <input className="form-control" value={String(view.filterValue ?? "")} onChange={(e) => onPatch({ filterValue: e.target.value || undefined })} disabled={!view.filterField} placeholder="Value to match" />
        </div>
      </div>

      {/* Sort */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Sort by field</label>
          <select className="form-control" value={view.sortField ?? ""} onChange={(e) => onPatch({ sortField: e.target.value || undefined })}>
            <option value="">— No sort —</option>
            {schema.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Direction</label>
          <select className="form-control" value={view.sortDirection ?? "asc"} onChange={(e) => onPatch({ sortDirection: e.target.value as "asc" | "desc" })} disabled={!view.sortField}>
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </select>
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Page size</label>
          <input type="number" className="form-control" min={0} value={view.pageSize ?? 0} onChange={(e) => onPatch({ pageSize: Number(e.target.value) || 0 })} placeholder="0 = no pagination" />
          <span className="form-hint" style={{ fontSize: "0.72rem" }}>0 = show all records</span>
        </div>
      </div>

      {/* Template */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: "0.82rem", fontWeight: 600 }}>Template</span>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onLoadTemplate}>Load</button>
        </div>
        <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: 8 }}>
          Use <code style={inlineCode}>{`{% for record in collection.records %}`}</code> to loop records.
          Embed via <code style={inlineCode}>{embedCode}</code>.
        </p>
        <CodeEditor
          value={view.template}
          onChange={(v) => onPatch({ template: v })}
          language="html"
          pickerContext="collection_template"
          settings={settings}
          componentEmbeds={componentEmbeds}
          minHeight={240}
          localVars={[...localVars, ...paginationVars]}
          localVarsLabel="Collection variables"
          translationEntries={translationEntries}
        />
      </div>

      <CollapsibleSection title="CSS">
        <CodeEditor value={view.css ?? ""} onChange={(v) => onPatch({ css: v })} language="css" pickerContext="collection_template" settings={settings} translationEntries={translationEntries} minHeight={120} />
      </CollapsibleSection>
      <CollapsibleSection title="JavaScript">
        <CodeEditor value={view.js ?? ""} onChange={(v) => onPatch({ js: v })} language="js" pickerContext="collection_template" settings={settings} translationEntries={translationEntries} minHeight={120} />
      </CollapsibleSection>

      {/* Embed + delete */}
      <div className="card">
        <p style={sectionHeading}>Embed code</p>
        <EmbedRow label={view.name} code={embedCode} />
      </div>

      <div className="card" style={{ borderColor: "#fecaca", background: "#fff5f5" }}>
        <p style={{ ...sectionHeading, color: "var(--danger)" }}>Remove view</p>
        {!delConfirm ? (
          <button type="button" className="btn btn-danger btn-sm" onClick={() => setDelConfirm(true)}>Remove view</button>
        ) : (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: "0.82rem", color: "var(--danger)" }}>Confirm?</span>
            <button type="button" className="btn btn-danger btn-sm" onClick={onRemove}>Yes</button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setDelConfirm(false)}>Cancel</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Helpers & sub-components ──────────────────────────────────────────────────

function EmbedRow({ label, code }: { label: string; code: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
      <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", minWidth: 100 }}>{label}</span>
      <code style={{ ...embedCodeStyle, flex: 1 }}>{code}</code>
      <button type="button" className="btn btn-secondary btn-sm" onClick={() => navigator.clipboard.writeText(code)} title="Copy">Copy</button>
    </div>
  );
}

function CollapsibleSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 6 }}>
      <button type="button" style={{ width: "100%", textAlign: "left", padding: "10px 14px", background: "none", border: "none", cursor: "pointer", display: "flex", justifyContent: "space-between", fontWeight: 600, fontSize: "0.82rem" }} onClick={() => setOpen(!open)}>
        {title}
        <span style={{ color: "var(--text-muted)", display: "inline-block", transform: open ? "rotate(180deg)" : "none" }}>v</span>
      </button>
      {open && <div style={{ padding: "0 14px 14px" }}>{children}</div>}
    </div>
  );
}

function Modal({ title, children, onClose, width = 520 }: { title: string; children: React.ReactNode; onClose: () => void; width?: number }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div style={{ background: "white", borderRadius: 12, padding: 28, width, maxHeight: "80vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.2)", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>{title}</h3>
          <button type="button" style={{ background: "none", border: "none", fontSize: "1.2rem", cursor: "pointer" }} onClick={onClose}>X</button>
        </div>
        {children}
      </div>
    </div>
  );
}

type RowIssue = { row: number; message: string };

function ImportRecordsModal({
  collection,
  schema,
  records,
  onClose,
  onImported,
}: {
  collection: CollectionWithRecords;
  schema: ComponentSchemaField[];
  records: CmsCollectionRecord[];
  onClose: () => void;
  onImported: (result: ImportResult) => void;
}) {
  const importableFields = schema.filter(isCsvSupportedField);
  const skippedFields = schema.filter((f) => !isCsvSupportedField(f));
  const relationFields = importableFields.filter((f) => f.type === "relation" && f.relationTarget);

  const [fileName, setFileName] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [csvHeader, setCsvHeader] = useState<string[]>([]);
  const [csvDataRows, setCsvDataRows] = useState<string[][]>([]);
  const [idColumn, setIdColumn] = useState("");
  const [columnMap, setColumnMap] = useState<Record<string, string>>({});
  const [relationIdSets, setRelationIdSets] = useState<Record<string, Set<string>>>({});
  const [mode, setMode] = useState<"merge" | "override">("merge");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Preload the valid record ids of every relation field's target collection, once, so the
  // preview can flag CSV values that don't point at a real record (schema is static for the
  // lifetime of this modal, so a mount-only fetch is intentional here).
  useEffect(() => {
    let cancelled = false;
    Promise.all(relationFields.map(async (f) => {
      const data = await getCollectionRecordsForRelationPicker(f.relationTarget!);
      return [f.key, new Set(data.records.map((r) => r.id))] as const;
    })).then((entries) => {
      if (!cancelled) setRelationIdSets(Object.fromEntries(entries));
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function downloadCsv(withData: boolean) {
    const headers = ["id", ...importableFields.map((f) => f.key)];
    const lines = [toCsvRow(headers)];
    if (withData) {
      for (const r of records) {
        lines.push(toCsvRow([r.id, ...importableFields.map((f) => fieldValueToCsvString(r.data[f.key], f))]));
      }
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${collection.slug}${withData ? "" : "-struttura"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleFile(file: File) {
    setFileName(file.name);
    setResult(null);
    const text = await file.text();
    const rows = parseCsv(text);
    if (rows.length === 0) {
      setCsvHeader([]);
      setCsvDataRows([]);
      return;
    }

    const [header, ...dataRows] = rows;
    setCsvHeader(header);
    setCsvDataRows(dataRows);

    // Default mapping: normalized exact match against the field's key or label.
    const normalizedHeader = header.map((h) => ({ raw: h, norm: normalizeHeader(h) }));
    const nextMap: Record<string, string> = {};
    for (const field of importableFields) {
      const match = normalizedHeader.find((h) => h.norm === normalizeHeader(field.key) || h.norm === normalizeHeader(field.label));
      nextMap[field.key] = match?.raw ?? "";
    }
    setColumnMap(nextMap);
    setIdColumn(normalizedHeader.find((h) => h.norm === "id")?.raw ?? "");
  }

  function resetFile() {
    setFileName(null);
    setCsvHeader([]);
    setCsvDataRows([]);
    setColumnMap({});
    setIdColumn("");
  }

  /** Recomputed from the raw CSV + the current column mapping on every render — cheap for typical CSV sizes. */
  function buildPreview(): { rows: ImportRecordRow[]; errors: RowIssue[]; warnings: RowIssue[] } {
    if (csvHeader.length === 0) return { rows: [], errors: [], warnings: [] };

    const idIdx = idColumn ? csvHeader.indexOf(idColumn) : -1;
    const fieldIdxByKey = new Map(importableFields.map((f) => [f.key, columnMap[f.key] ? csvHeader.indexOf(columnMap[f.key]) : -1]));

    const errors: RowIssue[] = [];
    const warnings: RowIssue[] = [];
    for (const field of importableFields) {
      if (field.required && (fieldIdxByKey.get(field.key) ?? -1) < 0) {
        errors.push({ row: 0, message: `Il campo obbligatorio "${field.label}" non è abbinato a nessuna colonna` });
      }
    }

    const rows: ImportRecordRow[] = [];
    csvDataRows.forEach((cells, i) => {
      if (cells.every((c) => c.trim() === "")) return;
      const rowNum = i + 2; // 1-based, +1 for the header row
      const data: Record<string, unknown> = {};
      for (const field of importableFields) {
        const idx = fieldIdxByKey.get(field.key) ?? -1;
        if (idx < 0) continue;
        const raw = cells[idx] ?? "";
        const value = csvStringToFieldValue(raw, field);
        const isEmpty = value === undefined || (Array.isArray(value) ? value.length === 0 : String(value).trim() === "");
        if (field.required && isEmpty) {
          errors.push({ row: rowNum, message: `Riga ${rowNum}: campo obbligatorio "${field.label}" mancante` });
        }
        if (field.type === "number" && raw.trim() !== "" && Number.isNaN(value as number)) {
          errors.push({ row: rowNum, message: `Riga ${rowNum}: "${field.label}" non è un numero valido ("${raw}")` });
        }
        if (field.type === "select" && raw.trim() && !(field.options ?? []).some((o) => o.value === raw.trim())) {
          warnings.push({ row: rowNum, message: `Riga ${rowNum}: valore "${raw}" non tra le opzioni di "${field.label}"` });
        }
        if (field.type === "toggle" && raw.trim() && !["true", "false"].includes(raw.trim().toLowerCase())) {
          warnings.push({ row: rowNum, message: `Riga ${rowNum}: valore "${raw}" per "${field.label}" non è true/false, verrà trattato come false` });
        }
        if (field.type === "relation" && Array.isArray(value)) {
          const validIds = relationIdSets[field.key];
          const unknownIds = validIds ? (value as string[]).filter((id) => !validIds.has(id)) : [];
          if (unknownIds.length > 0) {
            warnings.push({ row: rowNum, message: `Riga ${rowNum}: id non trovati in "${field.label}": ${unknownIds.join(", ")}` });
          }
        }
        data[field.key] = value;
      }
      const id = idIdx >= 0 ? (cells[idIdx]?.trim() || undefined) : undefined;
      rows.push({ id, data });
    });

    return { rows, errors, warnings };
  }

  const preview = buildPreview();

  async function handleConfirm() {
    setImporting(true);
    try {
      const res = await importCollectionRecords(collection.id, preview.rows, mode);
      setResult(res);
      onImported(res);
    } finally {
      setImporting(false);
    }
  }

  return (
    <Modal title={`Import records — ${collection.name}`} onClose={onClose} width={640}>
      {result ? (
        <div>
          <p style={{ fontSize: "0.88rem" }}>
            Import completato: <strong>{result.created}</strong> creati, <strong>{result.updated}</strong> aggiornati
            {mode === "override" ? <>, <strong>{result.deleted}</strong> eliminati</> : null}.
          </p>
          <button type="button" className="btn btn-primary btn-sm" onClick={onClose}>Chiudi</button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", margin: "0 0 8px" }}>
              Esporta struttura per un CSV vuoto con solo le intestazioni attese, o esporta dati per un CSV precompilato con i record esistenti. Modificalo e ricaricalo qui sotto.
              {skippedFields.length > 0 && (
                <> I campi {skippedFields.map((f) => `"${f.label}"`).join(", ")} non sono supportati via CSV e restano sempre invariati.</>
              )}
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => downloadCsv(false)}>⬇ Esporta struttura</button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => downloadCsv(true)}>⬇ Esporta dati</button>
            </div>
          </div>

          <div>
            <label className="form-label">Carica CSV</label>
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const file = e.dataTransfer.files?.[0];
                if (file) handleFile(file);
              }}
              style={{
                border: `2px dashed ${dragOver ? "var(--primary)" : "var(--border)"}`,
                borderRadius: 10,
                padding: "28px 20px",
                textAlign: "center",
                cursor: "pointer",
                background: dragOver ? "rgba(46,90,151,0.06)" : "var(--bg-light, #f8fafc)",
                transition: "background 0.12s, border-color 0.12s",
              }}
            >
              <div style={{ fontSize: "1.8rem", marginBottom: 6, opacity: 0.7 }}>📄</div>
              <p style={{ margin: 0, fontSize: "0.85rem", fontWeight: 600 }}>
                {fileName ?? "Trascina qui il file CSV"}
              </p>
              <p style={{ margin: "4px 0 0", fontSize: "0.76rem", color: "var(--text-muted)" }}>
                {fileName ? `${csvDataRows.length} righe trovate — clicca per cambiare file` : "oppure clicca per selezionarlo"}
              </p>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                style={{ display: "none" }}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
            </div>
          </div>

          {csvHeader.length > 0 && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <label className="form-label" style={{ margin: 0 }}>Abbina le colonne del CSV ai campi</label>
                <button type="button" className="btn-icon" onClick={resetFile} style={{ fontSize: "0.72rem" }}>Cambia file</button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 260, overflowY: "auto", border: "1px solid var(--border)", borderRadius: 8, padding: 10 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, alignItems: "center" }}>
                  <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)" }}>ID (per abbinare i record esistenti)</span>
                  <select className="form-control" value={idColumn} onChange={(e) => setIdColumn(e.target.value)}>
                    <option value="">— Nessuna: crea sempre nuovo —</option>
                    {csvHeader.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                {importableFields.map((field) => (
                  <div key={field.key} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, alignItems: "center" }}>
                    <span style={{ fontSize: "0.82rem" }}>
                      {field.label}{field.required && <span style={{ color: "var(--danger)", marginLeft: 2 }}>*</span>}
                    </span>
                    <select
                      className="form-control"
                      value={columnMap[field.key] ?? ""}
                      onChange={(e) => setColumnMap((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    >
                      <option value="">— Non importare —</option>
                      {csvHeader.map((h) => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {preview.errors.length > 0 && (
            <div style={{ background: "#fff5f5", border: "1px solid #fecaca", borderRadius: 6, padding: 10 }}>
              <p style={{ margin: "0 0 4px", fontWeight: 600, fontSize: "0.8rem", color: "var(--danger)" }}>
                {preview.errors.length} errori — correggi il file o l'abbinamento colonne:
              </p>
              {preview.errors.slice(0, 10).map((e, i) => (
                <p key={i} style={{ margin: 0, fontSize: "0.76rem", color: "var(--danger)" }}>{e.message}</p>
              ))}
            </div>
          )}

          {preview.warnings.length > 0 && (
            <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 6, padding: 10 }}>
              {preview.warnings.slice(0, 10).map((w, i) => (
                <p key={i} style={{ margin: 0, fontSize: "0.76rem", color: "#92400e" }}>{w.message}</p>
              ))}
            </div>
          )}

          {preview.rows.length > 0 && preview.errors.length === 0 && (
            <div>
              <label className="form-label">Modalità</label>
              <div style={{ display: "flex", gap: 16, marginTop: 4 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: "0.85rem" }}>
                  <input type="radio" name="importMode" checked={mode === "merge"} onChange={() => setMode("merge")} />
                  Merge — aggiorna/crea, non cancella nulla
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: "0.85rem" }}>
                  <input type="radio" name="importMode" checked={mode === "override"} onChange={() => setMode("override")} />
                  Override — il CSV sostituisce tutta la collection
                </label>
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>Annulla</button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={preview.rows.length === 0 || preview.errors.length > 0 || importing}
              onClick={handleConfirm}
            >
              {importing ? "Importazione…" : `Importa ${preview.rows.length} record`}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function colToState(col: CollectionWithRecords): EditState {
  return {
    name: col.name,
    slug: col.slug,
    schema: col.schema ?? [],
    detailTemplate: col.detailTemplate ?? "",
    detailCss: col.detailCss ?? "",
    detailJs: col.detailJs ?? "",
    views: col.views ?? [],
    records: col.records ?? [],
    slugPattern: col.slugPattern ?? "",
    permalinkPattern: col.permalinkPattern ?? "",
    detailMetaTitle: col.detailMetaTitle ?? "",
    detailMetaDescription: col.detailMetaDescription ?? "",
    componentDefaultProps: col.componentDefaultProps ?? {},
    hasDetailPage: col.hasDetailPage ?? true,
  };
}

function extractComponentSlugs(template: string): string[] {
  const slugs: string[] = [];
  const seen = new Set<string>();
  for (const m of template.matchAll(/\{\{component:([^}]+)\}\}/g)) {
    const slug = m[1].trim();
    if (!seen.has(slug)) { seen.add(slug); slugs.push(slug); }
  }
  return slugs;
}

function normalizeSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function findComponentTemplate(slug: string, templates: ComponentTemplate[]): ComponentTemplate | undefined {
  return templates.find((t) => t.id === slug || normalizeSlug(t.name) === slug.toLowerCase());
}

function colWidthSpan(colWidth?: "full" | "half" | "third"): string {
  if (colWidth === "half") return "span 3";
  if (colWidth === "third") return "span 2";
  return "span 6"; // full (default)
}

function truncate(value: string, max: number) {
  if (!value) return "—";
  return value.length > max ? value.slice(0, max) + "…" : value;
}

// ── Styles ────────────────────────────────────────────────────────────────────

const sidebarStyle: React.CSSProperties = {
  width: 260, flexShrink: 0, display: "flex", flexDirection: "column",
  background: "white", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", marginRight: 16,
};
const sidebarHeaderStyle: React.CSSProperties = {
  padding: "14px 16px", borderBottom: "1px solid var(--border)",
  display: "flex", alignItems: "center", justifyContent: "space-between",
};
const sidebarTitleStyle: React.CSSProperties = {
  margin: 0, fontWeight: 700, fontSize: "0.88rem",
  textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)",
};
const addBtnStyle: React.CSSProperties = {
  width: 28, height: 28, borderRadius: 6, border: "none",
  background: "var(--primary)", color: "white", cursor: "pointer", fontSize: "1.1rem",
  display: "flex", alignItems: "center", justifyContent: "center",
};
function sidebarItemStyle(active: boolean): React.CSSProperties {
  return {
    width: "100%", textAlign: "left", padding: "12px 16px",
    background: active ? "#eff6ff" : "none", border: "none",
    borderBottom: "1px solid var(--border)", cursor: "pointer",
    borderLeft: active ? "3px solid var(--primary)" : "3px solid transparent",
    transition: "background 0.12s",
  };
}
const emptyPanelStyle: React.CSSProperties = {
  flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
  color: "var(--text-muted)", fontSize: "0.9rem",
  border: "1px solid var(--border)", borderRadius: 8, background: "white",
};
const mainPanelStyle: React.CSSProperties = {
  flex: 1, display: "flex", flexDirection: "column",
  background: "white", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden",
};
const panelHeaderStyle: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 12,
  padding: "12px 20px", borderBottom: "1px solid var(--border)", background: "#f8fafc", flexShrink: 0,
};
const recordRowStyle: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 10,
  padding: "10px 14px", border: "1px solid var(--border)", borderRadius: 8, background: "#fafafa",
};
const iconBtn: React.CSSProperties = {
  background: "none", border: "1px solid var(--border)", cursor: "pointer",
  padding: "2px 6px", borderRadius: 4, fontSize: "0.72rem", lineHeight: 1.4,
};
const inlineCode: React.CSSProperties = {
  background: "#f1f5f9", padding: "0 3px", borderRadius: 3, fontSize: "0.75rem",
};
const sectionHeading: React.CSSProperties = {
  fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase",
  letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: 16,
};
const embedCodeStyle: React.CSSProperties = {
  display: "block", background: "#f1f5f9", padding: "8px 12px",
  borderRadius: 6, fontSize: "0.82rem", color: "var(--primary)", userSelect: "all", cursor: "text",
};
const loadCardStyle: React.CSSProperties = {
  textAlign: "left", padding: "14px 16px",
  border: "1px solid var(--border)", borderRadius: 8, background: "white", cursor: "pointer",
};

function typeBadge(type: string): React.CSSProperties {
  return {
    fontSize: "0.68rem", padding: "2px 7px", borderRadius: 10, fontWeight: 600,
    background: "#eff6ff", color: "var(--primary)",
  };
}
