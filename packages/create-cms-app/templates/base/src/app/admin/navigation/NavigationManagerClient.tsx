"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CodeEditor, type LocalVar } from "@/components/admin/CodeEditor";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import type { CmsNavigation, CmsNavigationItem, CmsSettings, CmsTranslationEntry } from "@sherpacms/domain";
import { createNavigationDirect, deleteNavigation, saveNavigationFull } from "./actions";

type NavigationItemPath = number[];

interface NavigationPageOption {
  id: string;
  title: string;
  slug: string;
  url: string;
  areaName: string;
  locale: string | null;
  translationKey: string | null;
  status: string;
}

interface Props {
  initialNavs: CmsNavigation[];
  settings: CmsSettings | null;
  navTemplates: { id: string; name: string; html: string; css: string; js: string }[];
  pages: NavigationPageOption[];
  /** Default/source locale — labels/descriptions live here as the base (non-localized) fields. */
  defaultLocale: string;
  /** All locales enabled in Settings. Languages are enabled there, not from this screen. */
  supportedLocales: string[];
  translationEntries?: CmsTranslationEntry[];
}

interface NavEditState {
  name: string;
  items: CmsNavigationItem[];
  template: string;
  css: string;
  js: string;
}

export function NavigationManagerClient({
  initialNavs,
  settings,
  navTemplates,
  pages,
  defaultLocale,
  supportedLocales,
  translationEntries = [],
}: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [navs, setNavs] = useState<CmsNavigation[]>(initialNavs);
  const [selectedId, setSelectedId] = useState<string | null>(initialNavs[0]?.id ?? null);
  const [tab, setTab] = useState<"items" | "template" | "settings">("items");

  const otherLocales = supportedLocales.filter((locale) => locale !== defaultLocale);
  const showLocaleTabs = otherLocales.length > 0;
  const [activeLocale, setActiveLocale] = useState(defaultLocale);
  const isTranslating = showLocaleTabs && activeLocale !== defaultLocale;

  const [adding, setAdding] = useState(false);
  const [newNavName, setNewNavName] = useState("");

  const [editState, setEditState] = useState<Record<string, NavEditState>>(() =>
    Object.fromEntries(initialNavs.map((navigation) => [navigation.id, navToState(navigation, pages)])),
  );

  const [loadModal, setLoadModal] = useState(false);
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editItemPath, setEditItemPath] = useState<NavigationItemPath | null>(null);
  const [createParentPath, setCreateParentPath] = useState<NavigationItemPath | null>(null);
  const [newLabel, setNewLabel] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newTarget, setNewTarget] = useState<"_self" | "_blank">("_self");
  const [newDescription, setNewDescription] = useState("");
  const [linkType, setLinkType] = useState<"page" | "custom">("custom");
  const [newPageId, setNewPageId] = useState<string | null>(null);

  // Pages the "Page" picker offers — the default-locale version of each logical page.
  // Its translation for other locales is resolved automatically at render time.
  const pagesForPicker = pages.filter((p) => !p.locale || p.locale === defaultLocale);

  function isPageLinkAvailableForLocale(pageId: string, locale: string): boolean {
    const page = pages.find((p) => p.id === pageId);
    if (!page) return false;
    if (!locale || (page.locale ?? defaultLocale) === locale) return true;
    if (!page.translationKey) return false;
    return pages.some(
      (candidate) =>
        candidate.translationKey === page.translationKey &&
        candidate.status === "published" &&
        (candidate.locale ?? defaultLocale) === locale,
    );
  }

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [delConfirm, setDelConfirm] = useState(false);

  const selected = navs.find((navigation) => navigation.id === selectedId) ?? null;
  const state = selectedId ? editState[selectedId] : null;
  const navigationLocalVars = state ? buildNavigationLocalVars(state.items) : [];

  function patch(id: string, partial: Partial<NavEditState>) {
    setEditState((previous) => ({ ...previous, [id]: { ...previous[id], ...partial } }));
  }

  function handleCreate() {
    if (!newNavName.trim()) return;
    startTransition(async () => {
      const navigation = await createNavigationDirect(newNavName.trim());
      setNavs((previous) => [...previous, navigation]);
      setEditState((previous) => ({ ...previous, [navigation.id]: navToState(navigation, pages) }));
      setSelectedId(navigation.id);
      setAdding(false);
      setNewNavName("");
    });
  }

  function handleSave() {
    if (!selectedId || !state) return;
    setSaving(true);
    startTransition(async () => {
      await saveNavigationFull(selectedId, {
        name: state.name,
        slug: "",
        items: state.items,
        template: state.template,
        additionalCss: state.css,
        additionalJs: state.js,
      });
      setNavs((previous) =>
        previous.map((navigation) =>
          navigation.id === selectedId
            ? { ...navigation, name: state.name, items: state.items }
            : navigation,
        ),
      );
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      router.refresh();
    });
  }

  function handleDelete() {
    if (!selectedId) return;
    startTransition(async () => {
      await deleteNavigation(selectedId);
      const remaining = navs.filter((navigation) => navigation.id !== selectedId);
      setNavs(remaining);
      setSelectedId(remaining[0]?.id ?? null);
      setDelConfirm(false);
      router.refresh();
    });
  }

  function openCreateModal(parentPath: NavigationItemPath | null = null) {
    setItemModalOpen(true);
    setEditItemPath(null);
    setCreateParentPath(parentPath);
    setNewLabel("");
    setNewUrl("");
    setNewTarget("_self");
    setNewDescription("");
    setLinkType("custom");
    setNewPageId(null);
  }

  function openEditItem(path: NavigationItemPath) {
    if (!state) return;
    const item = getItemAtPath(state.items, path);
    if (!item) return;
    setItemModalOpen(true);
    setEditItemPath(path);
    setCreateParentPath(null);
    setNewUrl(item.url);
    setNewTarget(item.target === "_blank" ? "_blank" : "_self");
    setLinkType(item.pageId ? "page" : "custom");
    setNewPageId(item.pageId ?? null);
    if (isTranslating) {
      const translation = item.translations?.[activeLocale];
      setNewLabel(translation?.label ?? "");
      setNewDescription(translation?.description ?? "");
      if (!item.pageId) setNewUrl(translation?.url ?? "");
    } else {
      setNewLabel(item.label);
      setNewDescription(typeof item.description === "string" ? item.description : "");
    }
  }

  function closeItemModal() {
    setItemModalOpen(false);
    setEditItemPath(null);
    setCreateParentPath(null);
    setNewLabel("");
    setNewUrl("");
    setNewTarget("_self");
    setNewDescription("");
    setLinkType("custom");
    setNewPageId(null);
  }

  function addOrUpdateItem() {
    if (!selectedId || !state || !newLabel.trim()) return;

    if (isTranslating) {
      if (!editItemPath) return;
      const existing = getItemAtPath(state.items, editItemPath);
      if (!existing) return;
      const nextItems = replaceItemAtPath(state.items, editItemPath, {
        ...existing,
        translations: {
          ...existing.translations,
          [activeLocale]: {
            label: newLabel.trim(),
            description: newDescription.trim(),
            ...(existing.pageId ? {} : { url: newUrl.trim() }),
          },
        },
      });
      patch(selectedId, { items: nextItems });
      closeItemModal();
      return;
    }

    const linkedPage = linkType === "page" && newPageId ? pages.find((p) => p.id === newPageId) : null;
    const normalizedUrl = linkedPage ? linkedPage.url : newUrl.trim();
    const type: "page" | "custom" = linkedPage ? "page" : inferNavigationItemType(normalizedUrl, pages);
    const normalizedItems = normalizeNavigationItems(state.items);
    const siblingKeys = getSiblingKeySet(
      editItemPath ? normalizedItems : normalizedItems,
      editItemPath ? editItemPath.slice(0, -1) : createParentPath,
      editItemPath ? getItemAtPath(normalizedItems, editItemPath)?.key : null,
    );
    const existing = editItemPath ? getItemAtPath(normalizedItems, editItemPath) : null;
    const resolvedKey = editItemPath
      ? existing?.key ?? ensureUniqueNavigationKey(deriveNavigationKey(newLabel), siblingKeys)
      : ensureUniqueNavigationKey(deriveNavigationKey(newLabel), siblingKeys);
    const item: CmsNavigationItem = {
      key: resolvedKey,
      type,
      label: newLabel.trim(),
      url: normalizedUrl,
      pageId: linkedPage ? linkedPage.id : null,
      target: newTarget,
      description: newDescription.trim(),
      items: [],
    };

    let nextItems = normalizedItems;
    if (editItemPath) {
      nextItems = replaceItemAtPath(state.items, editItemPath, {
        ...item,
        items: existing?.items ?? [],
      });
    } else if (createParentPath) {
      nextItems = appendChildAtPath(normalizedItems, createParentPath, item);
    } else {
      nextItems = [...normalizedItems, item];
    }

    patch(selectedId, { items: nextItems });
    closeItemModal();
  }

  function removeItem(path: NavigationItemPath) {
    if (!selectedId || !state) return;
    patch(selectedId, { items: removeItemAtPath(state.items, path).items });
  }

  function moveItem(path: NavigationItemPath, direction: -1 | 1) {
    if (!selectedId || !state) return;
    patch(selectedId, { items: moveItemWithinParent(state.items, path, direction) });
  }

  function indentItem(path: NavigationItemPath) {
    if (!selectedId || !state) return;
    patch(selectedId, { items: indentItemPath(state.items, path) });
  }

  function outdentItem(path: NavigationItemPath) {
    if (!selectedId || !state) return;
    patch(selectedId, { items: outdentItemPath(state.items, path) });
  }

  const flatItems = state ? flattenNavigationItems(state.items) : [];

  return (
    <div style={{ display: "flex", height: "calc(100vh - var(--header-h) - 3rem)", gap: 0 }}>
      <div
        style={{
          width: 260,
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          background: "white",
          border: "1px solid var(--border)",
          borderRadius: 8,
          overflow: "hidden",
          marginRight: 16,
        }}
      >
        <div
          style={{
            padding: "14px 16px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <p
            style={{
              margin: 0,
              fontWeight: 700,
              fontSize: "0.88rem",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "var(--text-muted)",
            }}
          >
            Navigations
          </p>
          <button
            type="button"
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              border: "none",
              background: "var(--primary)",
              color: "white",
              cursor: "pointer",
              fontSize: "1.1rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onClick={() => setAdding(true)}
            title="New navigation"
          >
            +
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {navs.map((navigation) => (
            <button
              key={navigation.id}
              type="button"
              onClick={() => {
                setSelectedId(navigation.id);
                setDelConfirm(false);
              }}
              style={{
                width: "100%",
                textAlign: "left",
                padding: "12px 16px",
                background: selectedId === navigation.id ? "#eff6ff" : "none",
                border: "none",
                borderBottom: "1px solid var(--border)",
                cursor: "pointer",
                borderLeft:
                  selectedId === navigation.id
                    ? "3px solid var(--primary)"
                    : "3px solid transparent",
                transition: "background 0.12s",
              }}
            >
              <p style={{ margin: 0, fontWeight: 600, fontSize: "0.88rem" }}>{navigation.name}</p>
              <p style={{ margin: 0, fontSize: "0.72rem", color: "var(--text-muted)" }}>
                {countNavigationItems(editState[navigation.id]?.items ?? navigation.items ?? [])} items
              </p>
            </button>
          ))}

          {navs.length === 0 && !adding && (
            <p style={{ padding: 16, fontSize: "0.82rem", color: "var(--text-muted)", margin: 0 }}>
              No navigations yet.
            </p>
          )}
        </div>

        {adding && (
          <div style={{ padding: 12, borderTop: "1px solid var(--border)", background: "#f8fafc" }}>
            <input
              className="form-control"
              autoFocus
              value={newNavName}
              onChange={(event) => setNewNavName(event.target.value)}
              placeholder="Navigation name"
              style={{ marginBottom: 8, fontSize: "0.85rem" }}
              onKeyDown={(event) => {
                if (event.key === "Enter") handleCreate();
                if (event.key === "Escape") {
                  setAdding(false);
                  setNewNavName("");
                }
              }}
            />
            <div style={{ display: "flex", gap: 6 }}>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                style={{ flex: 1 }}
                onClick={handleCreate}
                disabled={!newNavName.trim()}
              >
                Create
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setAdding(false);
                  setNewNavName("");
                }}
              >
                X
              </button>
            </div>
          </div>
        )}
      </div>

      {!selected || !state ? (
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--text-muted)",
            fontSize: "0.9rem",
            border: "1px solid var(--border)",
            borderRadius: 8,
            background: "white",
          }}
        >
          Select a navigation or create a new one.
        </div>
      ) : (
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            background: "white",
            border: "1px solid var(--border)",
            borderRadius: 8,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 20px",
              borderBottom: "1px solid var(--border)",
              background: "#f8fafc",
              flexShrink: 0,
            }}
          >
            <input
              className="form-control"
              value={state.name}
              onChange={(event) => patch(selectedId!, { name: event.target.value })}
              style={{ fontWeight: 700, fontSize: "1rem", maxWidth: 300 }}
            />
            <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
              <button type="button" className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
                {saved ? "Saved" : saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>

          <div style={{ display: "flex", borderBottom: "1px solid var(--border)", padding: "0 20px", flexShrink: 0 }}>
            {([
              ["items", "Items"],
              ["template", "Display Template"],
              ["settings", "Settings"],
            ] as const).map(([nextTab, label]) => (
              <button
                key={nextTab}
                type="button"
                className={`tab ${tab === nextTab ? "active" : ""}`}
                onClick={() => setTab(nextTab)}
                style={{ paddingLeft: 0, paddingRight: 20, fontSize: "0.85rem" }}
              >
                {label}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
            {tab === "items" && (
              <div>
                <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: 12 }}>
                  Add CMS pages or custom links. Use indent and outdent to build nested groups for mega menus, footer columns, or sidebars.
                </p>

                {showLocaleTabs && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 12,
                      padding: "8px 10px",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      background: "#f8fafc",
                    }}
                  >
                    <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginRight: 4 }}>
                      Editing labels for:
                    </span>
                    {[defaultLocale, ...otherLocales].map((locale) => (
                      <button
                        key={locale}
                        type="button"
                        onClick={() => setActiveLocale(locale)}
                        style={{
                          padding: "4px 10px",
                          borderRadius: 6,
                          border: "1px solid var(--border)",
                          background: activeLocale === locale ? "var(--primary)" : "white",
                          color: activeLocale === locale ? "white" : "var(--text)",
                          fontSize: "0.78rem",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        {locale.toUpperCase()}
                        {locale === defaultLocale ? " (default)" : ""}
                      </button>
                    ))}
                    {isTranslating && (
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginLeft: 4 }}>
                        {flatItems.filter((f) => f.item.translations?.[activeLocale]?.label).length}/{flatItems.length} translated
                      </span>
                    )}
                  </div>
                )}

                {isTranslating && (
                  <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: 12 }}>
                    Editing the {activeLocale.toUpperCase()} translation. Structure, URLs, and ordering are shared
                    across languages and can only be changed from the default locale ({defaultLocale.toUpperCase()}).
                  </p>
                )}

                {!isTranslating && (
                  <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => openCreateModal()}>
                      Add
                    </button>
                  </div>
                )}

                {flatItems.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "32px 0", color: "var(--text-muted)" }}>
                    <p style={{ fontSize: "1.5rem", marginBottom: 8 }}>Tree</p>
                    <p style={{ fontSize: "0.85rem" }}>No items yet.</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {flatItems.map(({ item, path, depth, siblingIndex, siblingCount }) => (
                      <div
                        key={path.join("-")}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "10px 14px",
                          paddingLeft: 14 + depth * 24,
                          border: "1px solid var(--border)",
                          borderRadius: 8,
                          background: depth === 0 ? "#fafafa" : "#ffffff",
                        }}
                      >
                        <span style={{ color: "var(--text-muted)", fontSize: "1.1rem", cursor: "grab" }}>::</span>
                        <span
                          style={{
                            fontSize: "0.7rem",
                            padding: "2px 7px",
                            borderRadius: 10,
                            fontWeight: 600,
                            background: item.type === "page" ? "#eff6ff" : "#f0fdf4",
                            color: item.type === "page" ? "var(--primary)" : "#16a34a",
                          }}
                        >
                          {item.type}
                        </span>
                        {(() => {
                          const translation = item.translations?.[activeLocale];
                          const displayLabel = isTranslating ? translation?.label || item.label : item.label;
                          const untranslated = isTranslating && !translation?.label;
                          return (
                            <span
                              style={{
                                fontWeight: 600,
                                fontSize: "0.9rem",
                                flex: 1,
                                fontStyle: untranslated ? "italic" : "normal",
                                color: untranslated ? "var(--text-muted)" : "inherit",
                              }}
                            >
                              {displayLabel}
                              {untranslated && (
                                <span
                                  style={{
                                    marginLeft: 8,
                                    fontSize: "0.68rem",
                                    fontStyle: "normal",
                                    fontWeight: 600,
                                    padding: "1px 6px",
                                    borderRadius: 8,
                                    background: "#fff7ed",
                                    color: "#c2410c",
                                  }}
                                >
                                  not translated
                                </span>
                              )}
                            </span>
                          );
                        })()}
                        {isTranslating && item.pageId && !isPageLinkAvailableForLocale(item.pageId, activeLocale) && (
                          <span
                            style={{
                              fontSize: "0.68rem",
                              fontWeight: 600,
                              padding: "1px 6px",
                              borderRadius: 8,
                              background: "#fef2f2",
                              color: "var(--danger)",
                            }}
                            title="No published translation for this page — the item will be omitted from the menu in this locale."
                          >
                            no page in {activeLocale.toUpperCase()}
                          </span>
                        )}
                        <span
                          style={{
                            fontSize: "0.78rem",
                            color: "var(--text-muted)",
                            fontFamily: "monospace",
                          }}
                        >
                          {item.url}
                        </span>
                        <div style={{ display: "flex", gap: 4, marginLeft: 8 }}>
                          {!isTranslating && (
                            <>
                              <button
                                type="button"
                                style={iconBtn}
                                onClick={() => moveItem(path, -1)}
                                disabled={siblingIndex === 0}
                                title="Move up"
                              >
                                Up
                              </button>
                              <button
                                type="button"
                                style={iconBtn}
                                onClick={() => moveItem(path, 1)}
                                disabled={siblingIndex === siblingCount - 1}
                                title="Move down"
                              >
                                Down
                              </button>
                              <button
                                type="button"
                                style={iconBtn}
                                onClick={() => indentItem(path)}
                                disabled={siblingIndex === 0}
                                title="Indent under previous sibling"
                              >
                                Indent
                              </button>
                              <button
                                type="button"
                                style={iconBtn}
                                onClick={() => outdentItem(path)}
                                disabled={depth === 0}
                                title="Outdent one level"
                              >
                                Outdent
                              </button>
                              <button
                                type="button"
                                style={iconBtn}
                                onClick={() => openCreateModal(path)}
                                title="Add child item"
                              >
                                Child
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            style={iconBtn}
                            onClick={() => openEditItem(path)}
                            title={isTranslating ? "Edit translation" : "Edit item"}
                          >
                            {isTranslating ? "Translate" : "Edit"}
                          </button>
                          {!isTranslating && (
                            <button
                              type="button"
                              style={{ ...iconBtn, color: "var(--danger)" }}
                              onClick={() => removeItem(path)}
                              title="Remove item"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === "template" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-muted)" }}>
                      Liquid template rendered when this nav is embedded via{" "}
                      <code style={inlineCode}>{`{{navigation:${selected.id}}}`}</code>. Use{" "}
                      <code style={inlineCode}>{"{% for item in menu.items %}"}</code> for root items and{" "}
                      <code style={inlineCode}>{"{% for child in item.items %}"}</code> for nested items. Direct keyed
                      access is available via <code style={inlineCode}>{"menu.<key>"}</code>.
                      Type <code style={inlineCode}>{"{{"}</code> for the variable picker.
                    </p>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setLoadModal(true)}
                      style={{ whiteSpace: "nowrap", marginLeft: 12 }}
                    >
                      Load
                    </button>
                  </div>
                  <CodeEditor
                    value={state.template}
                    onChange={(value) => patch(selectedId!, { template: value })}
                    language="html"
                    pickerContext="navigation_template"
                    settings={settings}
                    translationEntries={translationEntries}
                    minHeight={280}
                    localVars={navigationLocalVars}
                    localVarsLabel="Menu Variables"
                  />
                </div>

                <CollapsibleSection title="Additional CSS">
                  <CodeEditor
                    value={state.css}
                    onChange={(value) => patch(selectedId!, { css: value })}
                    language="css"
                    pickerContext="navigation_template"
                    settings={settings}
                    translationEntries={translationEntries}
                    minHeight={140}
                  />
                </CollapsibleSection>

                <CollapsibleSection title="Additional JS">
                  <CodeEditor
                    value={state.js}
                    onChange={(value) => patch(selectedId!, { js: value })}
                    language="js"
                    pickerContext="navigation_template"
                    settings={settings}
                    translationEntries={translationEntries}
                    minHeight={140}
                  />
                </CollapsibleSection>
              </div>
            )}

            {tab === "settings" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div className="card">
                  <p style={sectionHeading}>Embed code</p>
                  <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: 8 }}>
                    Use this placeholder in area Head or Body templates to embed this navigation:
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <code style={embedCodeStyle}>
                      {`{{navigation:${state.name.toLowerCase().replace(/\s+/g, "-")}}}`}
                    </code>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      title="Copy"
                      onClick={() =>
                        navigator.clipboard.writeText(`{{navigation:${state.name.toLowerCase().replace(/\s+/g, "-")}}}`)
                      }
                    >
                      Copy
                    </button>
                  </div>
                  <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 6 }}>
                    Resolved by navigation name; rename the navigation to change the key.
                  </p>
                </div>

                <div className="card" style={{ borderColor: "#fecaca", background: "#fff5f5" }}>
                  <p style={{ ...sectionHeading, color: "var(--danger)" }}>Danger zone</p>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: "0.88rem" }}>Delete navigation</p>
                      <p style={{ margin: "4px 0 0", fontSize: "0.78rem", color: "var(--text-muted)" }}>
                        Permanently removes this navigation and all its items.
                      </p>
                    </div>
                    {!delConfirm ? (
                      <button type="button" className="btn btn-danger btn-sm" onClick={() => setDelConfirm(true)}>
                        Delete
                      </button>
                    ) : (
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span style={{ fontSize: "0.82rem", color: "var(--danger)" }}>Confirm delete?</span>
                        <button type="button" className="btn btn-danger btn-sm" onClick={handleDelete}>
                          Yes, delete
                        </button>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setDelConfirm(false)}>
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {loadModal && (
        <Modal onClose={() => setLoadModal(false)} title="Load from Navigation Template">
          <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: 16 }}>
            Select a navigation template to load its Liquid template, CSS, and JavaScript. Nested items are available via{" "}
            <code style={inlineCode}>{"item.items"}</code> and direct access via{" "}
            <code style={inlineCode}>{"menu.<key>"}</code>.
          </p>
          {navTemplates.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 0", color: "var(--text-muted)" }}>
              <p style={{ fontSize: "1.8rem", marginBottom: 8 }}>Templates</p>
              <p>No navigation templates yet.</p>
              <p style={{ fontSize: "0.82rem" }}>Create one in Templates - Navigation first.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {navTemplates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  style={loadCardStyle}
                  onMouseEnter={(event) => {
                    event.currentTarget.style.borderColor = "var(--primary)";
                    event.currentTarget.style.boxShadow = "0 4px 12px rgba(46,90,151,0.1)";
                  }}
                  onMouseLeave={(event) => {
                    event.currentTarget.style.borderColor = "var(--border)";
                    event.currentTarget.style.boxShadow = "none";
                  }}
                  onClick={() => {
                    if (selectedId) {
                      patch(selectedId, {
                        template: template.html,
                        css: template.css ?? "",
                        js: template.js ?? "",
                      });
                    }
                    setLoadModal(false);
                    setTab("template");
                  }}
                >
                  <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: "0.9rem" }}>{template.name}</p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.72rem",
                      color: "var(--text-muted)",
                      fontFamily: "monospace",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {template.html.slice(0, 60) || "(empty template)"}
                  </p>
                </button>
              ))}
            </div>
          )}
        </Modal>
      )}

      {itemModalOpen && (
        <Modal
          onClose={closeItemModal}
          width={760}
          title={
            isTranslating
              ? `Translate item (${activeLocale.toUpperCase()})`
              : editItemPath
                ? "Edit item"
                : createParentPath
                  ? "Add child item"
                  : "Add item"
          }
        >
          <div className="form-group">
            <label className="form-label">Label</label>
            <input
              className="form-control"
              value={newLabel}
              onChange={(event) => setNewLabel(event.target.value)}
              placeholder={
                isTranslating && editItemPath && state
                  ? getItemAtPath(state.items, editItemPath)?.label
                  : "For example: Home"
              }
              autoFocus
            />
            <span className="form-hint" style={{ fontSize: "0.72rem" }}>
              {isTranslating
                ? `Default (${defaultLocale.toUpperCase()}) label: "${(editItemPath && state && getItemAtPath(state.items, editItemPath)?.label) || ""}"`
                : "The internal key is generated from the label on creation and then stays stable for Liquid access."}
            </span>
          </div>
          {!isTranslating && (
            <div className="form-group">
              <label className="form-label">Link</label>
              <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                <button
                  type="button"
                  className={`btn btn-sm ${linkType === "page" ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => setLinkType("page")}
                >
                  Page
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${linkType === "custom" ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => {
                    setLinkType("custom");
                    setNewPageId(null);
                  }}
                >
                  Custom URL
                </button>
              </div>
              {linkType === "page" ? (
                <>
                  <select
                    className="form-control"
                    value={newPageId ?? ""}
                    onChange={(event) => setNewPageId(event.target.value || null)}
                  >
                    <option value="">Select a page...</option>
                    {pagesForPicker.map((page) => (
                      <option key={page.id} value={page.id}>
                        {page.title} ({page.areaName})
                      </option>
                    ))}
                  </select>
                  <span className="form-hint" style={{ fontSize: "0.72rem" }}>
                    Links to this page. If a locale has no published translation of it, the item is
                    simply omitted from that locale&apos;s menu instead of showing a broken link.
                  </span>
                </>
              ) : (
                <>
                  <input
                    className="form-control"
                    value={newUrl}
                    onChange={(event) => setNewUrl(event.target.value)}
                    placeholder="/path or https://..."
                  />
                  <span className="form-hint" style={{ fontSize: "0.72rem" }}>
                    Optional. Leave empty for parent/group items that only organize child links. A fixed
                    URL is the same for every locale — use &quot;Page&quot; instead if it should adapt per language.
                  </span>
                </>
              )}
            </div>
          )}
          {isTranslating && editItemPath && state && !getItemAtPath(state.items, editItemPath)?.pageId && (
            <div className="form-group">
              <label className="form-label">URL</label>
              <input
                className="form-control"
                value={newUrl}
                onChange={(event) => setNewUrl(event.target.value)}
                placeholder={getItemAtPath(state.items, editItemPath)?.url || "/path or https://..."}
              />
              <span className="form-hint" style={{ fontSize: "0.72rem" }}>
                {`Default (${defaultLocale.toUpperCase()}) URL: "${getItemAtPath(state.items, editItemPath)?.url || ""}". Leave empty to reuse it unchanged for ${activeLocale.toUpperCase()}.`}
              </span>
            </div>
          )}
          {isTranslating && editItemPath && state && getItemAtPath(state.items, editItemPath)?.pageId && (
            <p className="form-hint" style={{ fontSize: "0.72rem", margin: "-4px 0 8px" }}>
              This item links to a page — its URL resolves automatically to that page&apos;s {activeLocale.toUpperCase()} translation.
            </p>
          )}
          <div className="form-group">
            <label className="form-label">Description</label>
            <RichTextEditor
              value={newDescription}
              onChange={setNewDescription}
              placeholder="Optional rich text shown by custom navigation templates."
              minHeight={180}
            />
          </div>
          {!isTranslating && (
            <div className="form-group">
              <label
                className="form-label"
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}
              >
                <span>Open in new tab</span>
              </label>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={newTarget === "_blank"}
                  onChange={(event) => setNewTarget(event.target.checked ? "_blank" : "_self")}
                />
                <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                  {newTarget === "_blank" ? "Enabled: _blank" : "Disabled: _self"}
                </span>
              </label>
            </div>
          )}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={closeItemModal}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={addOrUpdateItem}
              disabled={!newLabel.trim()}
            >
              {editItemPath ? "Update" : "Add"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function navToState(navigation: CmsNavigation, pages: NavigationPageOption[]): NavEditState {
  return {
    name: navigation.name,
    items: backfillPageIds(normalizeNavigationItems(navigation.items ?? []), pages),
    template: navigation.template ?? "",
    css: navigation.additionalCss ?? "",
    js: navigation.additionalJs ?? "",
  };
}

/**
 * Migrates legacy "page" items created before the page picker existed: they only stored a static
 * `url` matching a page's URL at the time, with no stable `pageId`. Matches by URL once so the item
 * gains a real page reference and its link starts resolving per-locale instead of staying fixed.
 */
function backfillPageIds(items: CmsNavigationItem[], pages: NavigationPageOption[]): CmsNavigationItem[] {
  return items.map((item) => {
    const inferredPageId =
      item.pageId ?? (item.type === "page" ? pages.find((p) => p.url === item.url)?.id ?? null : item.pageId ?? null);
    return {
      ...item,
      pageId: inferredPageId,
      items: item.items ? backfillPageIds(item.items, pages) : item.items,
    };
  });
}

function cloneNavigationItems(items: CmsNavigationItem[]): CmsNavigationItem[] {
  return items.map((item) => ({
    ...item,
    items: cloneNavigationItems(item.items ?? []),
  }));
}

function countNavigationItems(items: CmsNavigationItem[]): number {
  return items.reduce((count, item) => count + 1 + countNavigationItems(item.items ?? []), 0);
}

function getItemAtPath(items: CmsNavigationItem[], path: NavigationItemPath): CmsNavigationItem | null {
  let currentItems = items;
  let currentItem: CmsNavigationItem | null = null;

  for (const index of path) {
    currentItem = currentItems[index] ?? null;
    if (!currentItem) return null;
    currentItems = currentItem.items ?? [];
  }

  return currentItem;
}

function updateItemsAtPath(
  items: CmsNavigationItem[],
  parentPath: NavigationItemPath,
  updater: (siblings: CmsNavigationItem[]) => CmsNavigationItem[],
): CmsNavigationItem[] {
  if (parentPath.length === 0) {
    return updater(cloneNavigationItems(items));
  }

  const [index, ...rest] = parentPath;
  return items.map((item, currentIndex) => {
    if (currentIndex !== index) {
      return {
        ...item,
        items: cloneNavigationItems(item.items ?? []),
      };
    }

    return {
      ...item,
      items: updateItemsAtPath(item.items ?? [], rest, updater),
    };
  });
}

function replaceItemAtPath(
  items: CmsNavigationItem[],
  path: NavigationItemPath,
  replacement: CmsNavigationItem,
): CmsNavigationItem[] {
  const parentPath = path.slice(0, -1);
  const index = path[path.length - 1];
  return updateItemsAtPath(items, parentPath, (siblings) =>
    siblings.map((item, siblingIndex) => (siblingIndex === index ? replacement : item)),
  );
}

function appendChildAtPath(
  items: CmsNavigationItem[],
  parentPath: NavigationItemPath,
  child: CmsNavigationItem,
): CmsNavigationItem[] {
  const parentItem = getItemAtPath(items, parentPath);
  if (!parentItem) return items;
  return replaceItemAtPath(items, parentPath, {
    ...parentItem,
    items: [...(parentItem.items ?? []), child],
  });
}

function removeItemAtPath(
  items: CmsNavigationItem[],
  path: NavigationItemPath,
): { items: CmsNavigationItem[]; removed: CmsNavigationItem | null } {
  const removed = getItemAtPath(items, path);
  if (!removed) return { items, removed: null };

  const parentPath = path.slice(0, -1);
  const index = path[path.length - 1];
  return {
    items: updateItemsAtPath(items, parentPath, (siblings) =>
      siblings.filter((_, siblingIndex) => siblingIndex !== index),
    ),
    removed,
  };
}

function insertItemAtPath(
  items: CmsNavigationItem[],
  parentPath: NavigationItemPath,
  index: number,
  item: CmsNavigationItem,
): CmsNavigationItem[] {
  return updateItemsAtPath(items, parentPath, (siblings) => {
    const next = [...siblings];
    next.splice(index, 0, item);
    return next;
  });
}

function moveItemWithinParent(
  items: CmsNavigationItem[],
  path: NavigationItemPath,
  direction: -1 | 1,
): CmsNavigationItem[] {
  const parentPath = path.slice(0, -1);
  const index = path[path.length - 1];
  return updateItemsAtPath(items, parentPath, (siblings) => {
    const swapIndex = index + direction;
    if (swapIndex < 0 || swapIndex >= siblings.length) return siblings;
    const next = [...siblings];
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
    return next;
  });
}

function indentItemPath(items: CmsNavigationItem[], path: NavigationItemPath): CmsNavigationItem[] {
  const parentPath = path.slice(0, -1);
  const index = path[path.length - 1];
  if (index === 0) return items;

  const current = getItemAtPath(items, path);
  if (!current) return items;

  const previousSiblingPath = [...parentPath, index - 1];
  const { items: withoutCurrent } = removeItemAtPath(items, path);
  return appendChildAtPath(withoutCurrent, previousSiblingPath, current);
}

function outdentItemPath(items: CmsNavigationItem[], path: NavigationItemPath): CmsNavigationItem[] {
  if (path.length < 2) return items;

  const current = getItemAtPath(items, path);
  if (!current) return items;

  const parentPath = path.slice(0, -1);
  const grandParentPath = parentPath.slice(0, -1);
  const parentIndex = parentPath[parentPath.length - 1];
  const { items: withoutCurrent } = removeItemAtPath(items, path);
  return insertItemAtPath(withoutCurrent, grandParentPath, parentIndex + 1, current);
}

function flattenNavigationItems(
  items: CmsNavigationItem[],
  depth = 0,
  parentPath: NavigationItemPath = [],
): Array<{
  item: CmsNavigationItem;
  path: NavigationItemPath;
  depth: number;
  siblingIndex: number;
  siblingCount: number;
}> {
  return items.flatMap((item, index, siblings) => {
    const path = [...parentPath, index];
    return [
      { item, path, depth, siblingIndex: index, siblingCount: siblings.length },
      ...flattenNavigationItems(item.items ?? [], depth + 1, path),
    ];
  });
}

function slugifyNavigationKey(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function deriveNavigationKey(label: string) {
  const fromLabel = slugifyNavigationKey(label);
  if (fromLabel) return fromLabel;
  return "item";
}

function ensureUniqueNavigationKey(requestedKey: string, usedKeys: Set<string>, fallback = "item") {
  const baseKey = slugifyNavigationKey(requestedKey) || slugifyNavigationKey(fallback) || "item";
  if (!usedKeys.has(baseKey)) return baseKey;

  let suffix = 2;
  while (usedKeys.has(`${baseKey}-${suffix}`)) {
    suffix += 1;
  }

  return `${baseKey}-${suffix}`;
}

function normalizeNavigationItems(items: CmsNavigationItem[]) {
  const usedKeys = new Set<string>();
  return items.map((item, index) => normalizeNavigationItemNode(item, usedKeys, `item-${index + 1}`));
}

function normalizeNavigationItemNode(item: CmsNavigationItem, usedKeys: Set<string>, fallbackKey: string): CmsNavigationItem {
  const normalizedItems = normalizeChildNavigationItems(item.items ?? []);
  const resolvedKey = ensureUniqueNavigationKey(item.key || deriveNavigationKey(item.label), usedKeys, fallbackKey);
  usedKeys.add(resolvedKey);

  return {
    ...item,
    key: resolvedKey,
    items: normalizedItems,
  };
}

function normalizeChildNavigationItems(items: CmsNavigationItem[]) {
  const usedKeys = new Set<string>();
  return items.map((item, index) => normalizeNavigationItemNode(item, usedKeys, `item-${index + 1}`));
}

function getSiblingKeySet(
  items: CmsNavigationItem[],
  parentPath: NavigationItemPath | null,
  ignoreKey: string | null = null,
) {
  const siblings = parentPath && parentPath.length > 0 ? getItemAtPath(items, parentPath)?.items ?? [] : items;
  return new Set(siblings.map((item) => item.key).filter((key) => key && key !== ignoreKey));
}

function buildNavigationLocalVars(items: CmsNavigationItem[]): LocalVar[] {
  const vars: LocalVar[] = [];
  const seen = new Set<string>();

  const push = (key: string, label: string, type: LocalVar["type"]) => {
    if (seen.has(key)) return;
    seen.add(key);
    vars.push({ key, label, type });
  };

  push("menu", "Navigation root object", "object");
  push("menu.items", "Root navigation items", "list");

  const loopAliases = ["item", "child", "grandchild"] as const;
  for (const alias of loopAliases) {
    push(`${alias}.key`, `${capitalize(alias)} key`, "text");
    push(`${alias}.label`, `${capitalize(alias)} label`, "text");
    push(`${alias}.url`, `${capitalize(alias)} URL`, "text");
    push(`${alias}.description`, `${capitalize(alias)} description`, "text");
    push(`${alias}.target`, `${capitalize(alias)} target attribute`, "text");
    push(`${alias}.items`, `${capitalize(alias)} nested items`, "list");
  }

  const addNodeVars = (node: CmsNavigationItem, path: string) => {
    push(path, `${node.label} item`, "object");
    push(`${path}.key`, `${node.label} key`, "text");
    push(`${path}.label`, `${node.label} label`, "text");
    push(`${path}.url`, `${node.label} URL`, "text");
    push(`${path}.description`, `${node.label} description`, "text");
    push(`${path}.target`, `${node.label} target attribute`, "text");
    push(`${path}.items`, `${node.label} nested items`, "list");

    for (const child of node.items ?? []) {
      addNodeVars(child, `${path}.${child.key}`);
    }
  };

  for (const item of items) {
    addNodeVars(item, `menu.${item.key}`);
  }

  return vars;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function inferNavigationItemType(
  url: string,
  pages: { id: string; title: string; slug: string; url: string; areaName: string }[],
): "page" | "custom" {
  if (!url.trim()) return "custom";
  return url === "/" || pages.some((page) => page.url === url) ? "page" : "custom";
}

const iconBtn: React.CSSProperties = {
  background: "none",
  border: "1px solid var(--border)",
  cursor: "pointer",
  padding: "2px 6px",
  borderRadius: 4,
  fontSize: "0.72rem",
  lineHeight: 1.4,
};

const inlineCode: React.CSSProperties = {
  background: "#f1f5f9",
  padding: "0 3px",
  borderRadius: 3,
  fontSize: "0.75rem",
};

const sectionHeading: React.CSSProperties = {
  fontSize: "0.72rem",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: "var(--text-muted)",
  marginBottom: 16,
};

const embedCodeStyle: React.CSSProperties = {
  flex: 1,
  display: "block",
  background: "#f1f5f9",
  padding: "10px 14px",
  borderRadius: 6,
  fontSize: "0.85rem",
  color: "var(--primary)",
  userSelect: "all",
  cursor: "text",
};

const loadCardStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "14px 16px",
  border: "1px solid var(--border)",
  borderRadius: 8,
  background: "white",
  cursor: "pointer",
};

function Modal({
  title,
  children,
  onClose,
  width = 520,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  width?: number;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        zIndex: 500,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "white",
          borderRadius: 12,
          padding: 28,
          width,
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
          overflowY: "auto",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>{title}</h3>
          <button
            type="button"
            style={{ background: "none", border: "none", fontSize: "1.2rem", cursor: "pointer" }}
            onClick={onClose}
          >
            X
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function CollapsibleSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 6 }}>
      <button
        type="button"
        style={{
          width: "100%",
          textAlign: "left",
          padding: "10px 14px",
          background: "none",
          border: "none",
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          fontWeight: 600,
          fontSize: "0.82rem",
        }}
        onClick={() => setOpen(!open)}
      >
        {title}
        <span
          style={{
            color: "var(--text-muted)",
            transition: "transform 0.2s",
            display: "inline-block",
            transform: open ? "rotate(180deg)" : "none",
          }}
        >
          v
        </span>
      </button>
      {open && <div style={{ padding: "0 14px 14px" }}>{children}</div>}
    </div>
  );
}
