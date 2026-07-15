"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SlideDrawer } from "@/components/admin/SlideDrawer";
import { ComponentPickerModal } from "@/components/admin/ComponentPickerModal";
import { clonePage, quickUpdatePage, updateStructure } from "./actions";
import {
  buildPermalinkMap,
  joinParentPermalink,
  normalizePermalink,
} from "@/lib/pagePermalinks";
import type { CmsPage, CmsArea, ComponentInstance } from "@sherpacms/domain";

type PageRow = CmsPage & {
  publishedVersionNumber?: number | null;
  componentCount?: number;
  linkedComponentCount?: number;
  collectionCount?: number;
};

const SYSTEM_PAGE_LABELS: Record<string, { icon: string; label: string }> = {
  home: { icon: "🏠", label: "Home" },
  "404": { icon: "🚫", label: "404" },
};

type Props = {
  pages: PageRow[];
  areas: CmsArea[];
  search: string;
  areaFilter: string;
  systemPageMap?: Record<string, string>;
};

type DrawerComponentMeta = {
  id: string;
  name: string;
  namespace: string | null;
  type: string;
  status: string;
};

type TreeRow = {
  page: PageRow;
  depth: number;
  hasChildren: boolean;
};

function serializeStructure(structure: ComponentInstance[]) {
  return JSON.stringify(structure);
}

function toSlug(text: string) {
  return text
    .toLowerCase().trim()
    .replace(/[àáâãäå]/g, "a").replace(/[èéêë]/g, "e")
    .replace(/[ìíîï]/g, "i").replace(/[òóôõö]/g, "o")
    .replace(/[ùúûü]/g, "u").replace(/[ñ]/g, "n")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function comparePages(left: Pick<CmsPage, "title" | "slug">, right: Pick<CmsPage, "title" | "slug">) {
  return (
    left.title.localeCompare(right.title, undefined, { sensitivity: "base", numeric: true }) ||
    left.slug.localeCompare(right.slug, undefined, { sensitivity: "base", numeric: true })
  );
}

function buildHierarchyPermalinkMap(pages: CmsPage[]) {
  const pageMap = new Map(pages.map((page) => [page.id, page]));
  const cache = new Map<string, string>();

  function resolve(pageId: string, trail = new Set<string>()): string {
    const cached = cache.get(pageId);
    if (cached) return cached;

    const page = pageMap.get(pageId);
    if (!page) return "/";

    if (trail.has(pageId)) {
      return normalizePermalink(page.slug);
    }

    trail.add(pageId);
    const parentPermalink =
      page.parentId && pageMap.has(page.parentId)
        ? resolve(page.parentId, trail)
        : "/";
    trail.delete(pageId);

    const permalink = joinParentPermalink(parentPermalink, page.slug);
    cache.set(pageId, permalink);
    return permalink;
  }

  return Object.fromEntries(pages.map((page) => [page.id, resolve(page.id)]));
}

function collectVisiblePageIds(
  pages: PageRow[],
  query: string,
  actualPermalinkMap: Record<string, string>,
  hierarchyPermalinkMap: Record<string, string>,
) {
  if (!query) return new Set(pages.map((page) => page.id));

  const matchedIds = new Set<string>();
  const pageMap = new Map(pages.map((page) => [page.id, page]));

  for (const page of pages) {
    const haystack = [
      page.title,
      actualPermalinkMap[page.id] ?? "",
      hierarchyPermalinkMap[page.id] ?? "",
    ]
      .join(" ")
      .toLowerCase();

    if (haystack.includes(query)) {
      matchedIds.add(page.id);
      let currentParentId = page.parentId ?? null;
      while (currentParentId) {
        matchedIds.add(currentParentId);
        currentParentId = pageMap.get(currentParentId)?.parentId ?? null;
      }
    }
  }

  return matchedIds;
}

function compareRootPages(
  left: PageRow,
  right: PageRow,
  systemPageMap: Record<string, string>,
): number {
  const leftType = systemPageMap[left.id];
  const rightType = systemPageMap[right.id];
  const leftIsHome = leftType === "home";
  const rightIsHome = rightType === "home";
  const leftIsSystem = !!leftType && !leftIsHome;
  const rightIsSystem = !!rightType && !rightIsHome;

  if (leftIsHome && !rightIsHome) return -1;
  if (rightIsHome && !leftIsHome) return 1;
  if (leftIsSystem && !rightIsSystem) return 1;
  if (rightIsSystem && !leftIsSystem) return -1;
  return comparePages(left, right);
}

function buildTreeRows(
  pages: PageRow[],
  expandedMap: Record<string, boolean>,
  forceExpandAll: boolean,
  systemPageMap: Record<string, string> = {},
) {
  const visibleIds = new Set(pages.map((page) => page.id));
  const childrenByParent = new Map<string | null, PageRow[]>();

  for (const page of pages) {
    const parentId = page.parentId && visibleIds.has(page.parentId) ? page.parentId : null;
    const siblings = childrenByParent.get(parentId) ?? [];
    siblings.push(page);
    childrenByParent.set(parentId, siblings);
  }

  // Root level: home first, other system pages last; children: alphabetical
  const rootSiblings = childrenByParent.get(null) ?? [];
  rootSiblings.sort((a, b) => compareRootPages(a, b, systemPageMap));
  childrenByParent.set(null, rootSiblings);

  for (const [parentId, siblings] of childrenByParent.entries()) {
    if (parentId !== null) siblings.sort(comparePages);
  }

  const rows: TreeRow[] = [];
  const expandableIds = new Set<string>();

  function append(parentId: string | null, depth: number) {
    const siblings = childrenByParent.get(parentId) ?? [];
    for (const page of siblings) {
      const children = childrenByParent.get(page.id) ?? [];
      const hasChildren = children.length > 0;
      if (hasChildren) expandableIds.add(page.id);

      rows.push({
        page,
        depth,
        hasChildren,
      });

      const isExpanded = forceExpandAll ? true : (expandedMap[page.id] ?? true);
      if (hasChildren && isExpanded) {
        append(page.id, depth + 1);
      }
    }
  }

  append(null, 0);

  return { rows, expandableIds };
}

function buildPageOptionRows(
  pages: PageRow[],
  hierarchyPermalinkMap: Record<string, string>,
  excludedPageId?: string,
) {
  const filtered = pages.filter((page) => page.id !== excludedPageId);
  const { rows } = buildTreeRows(
    filtered,
    Object.fromEntries(filtered.map((page) => [page.id, true])),
    true,
    {},
  );

  return rows.map(({ page, depth }) => ({
    id: page.id,
    label: `${"— ".repeat(depth)}${page.title}`,
    permalink: hierarchyPermalinkMap[page.id] ?? normalizePermalink(page.slug),
  }));
}

export function PagesTable({ pages, areas, search, areaFilter, systemPageMap = {} }: Props) {
  const router = useRouter();
  const areaMap = Object.fromEntries(areas.map((area) => [area.name, area.displayName || area.name]));
  const actualPermalinkMap = buildPermalinkMap(pages);
  const hierarchyPermalinkMap = buildHierarchyPermalinkMap(pages);

  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [drawerPage, setDrawerPage] = useState<CmsPage | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [editArea, setEditArea] = useState("");
  const [editParentId, setEditParentId] = useState("");
  const [structure, setStructure] = useState<ComponentInstance[]>([]);
  const [savedStructureJson, setSavedStructureJson] = useState("[]");
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cloneSourcePage, setCloneSourcePage] = useState<CmsPage | null>(null);
  const [cloneTitle, setCloneTitle] = useState("");
  const [cloneSlug, setCloneSlug] = useState("");
  const [cloneSlugTouched, setCloneSlugTouched] = useState(false);
  const [cloneArea, setCloneArea] = useState("");
  const [cloneParentId, setCloneParentId] = useState("");
  const [cloning, setCloning] = useState(false);
  const [cloneError, setCloneError] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [insertAfter, setInsertAfter] = useState<number | null>(null);
  const [availableComponents, setAvailableComponents] = useState<DrawerComponentMeta[]>([]);
  const [, startTransition] = useTransition();

  const query = search.trim().toLowerCase();
  const pagesInArea = pages.filter((page) => !areaFilter || page.area === areaFilter);
  const visibleIds = collectVisiblePageIds(
    pagesInArea,
    query,
    actualPermalinkMap,
    hierarchyPermalinkMap,
  );
  const visiblePages = pagesInArea.filter((page) => visibleIds.has(page.id));
  const forceExpandAll = query.length > 0;
  const { rows: treeRows, expandableIds } = buildTreeRows(
    visiblePages,
    expandedRows,
    forceExpandAll,
    systemPageMap,
  );

  useEffect(() => {
    setExpandedRows((current) => {
      const next: Record<string, boolean> = {};
      for (const pageId of expandableIds) {
        next[pageId] = current[pageId] ?? true;
      }
      return next;
    });
  }, [pages.length, areaFilter, query, treeRows.length]);

  function getPagePermalink(page: Pick<CmsPage, "id" | "slug" | "permalink">) {
    return actualPermalinkMap[page.id] ?? normalizePermalink(page.permalink ?? page.slug);
  }

  function getHierarchyPermalink(page: Pick<CmsPage, "id" | "slug">) {
    return hierarchyPermalinkMap[page.id] ?? normalizePermalink(page.slug);
  }

  function getDraftPermalink(parentValue: string, slugValue: string) {
    const parentPermalink = parentValue
      ? (actualPermalinkMap[parentValue] ?? hierarchyPermalinkMap[parentValue] ?? "/")
      : "/";
    return joinParentPermalink(parentPermalink, slugValue);
  }

  function toggleRow(pageId: string) {
    setExpandedRows((current) => ({
      ...current,
      [pageId]: !(current[pageId] ?? true),
    }));
  }

  async function openDrawer(page: CmsPage) {
    setDrawerPage(page);
    setEditTitle(page.title);
    setEditSlug(page.slug);
    setSlugTouched(false);
    setEditArea(page.area);
    setEditParentId(page.parentId ?? "");
    setStructure([]);
    setSavedStructureJson("[]");
    setAvailableComponents([]);
    setDrawerLoading(true);

    try {
      const response = await fetch(`/admin/pages/${page.id}/structure/data`);
      const data = await response.json();
      const nextStructure = data.structure ?? [];
      setStructure(nextStructure);
      setSavedStructureJson(serializeStructure(nextStructure));
      setAvailableComponents(data.components ?? []);
    } finally {
      setDrawerLoading(false);
    }
  }

  function closeDrawer() {
    setDrawerPage(null);
    setShowPicker(false);
    setInsertAfter(null);
    setDrawerLoading(false);
    setSaving(false);
  }

  function openCloneDrawer(page: CmsPage) {
    setCloneSourcePage(page);
    setCloneTitle(`${page.title} Copy`);
    setCloneSlug(toSlug(`${page.title} Copy`));
    setCloneSlugTouched(false);
    setCloneArea(page.area);
    setCloneParentId(page.parentId ?? "");
    setCloneError("");
  }

  function closeCloneDrawer() {
    setCloneSourcePage(null);
    setCloneTitle("");
    setCloneSlug("");
    setCloneSlugTouched(false);
    setCloneArea("");
    setCloneParentId("");
    setCloneError("");
    setCloning(false);
  }

  useEffect(() => {
    if (!slugTouched) {
      setEditSlug(toSlug(editTitle));
    }
  }, [editTitle, slugTouched]);

  useEffect(() => {
    if (!cloneSlugTouched) {
      setCloneSlug(toSlug(cloneTitle));
    }
  }, [cloneTitle, cloneSlugTouched]);

  function getComponent(componentId: string) {
    return availableComponents.find((component) => component.id === componentId);
  }

  function addComponent(componentId: string) {
    const newItem: ComponentInstance = { componentId, props: {} };

    if (insertAfter !== null) {
      setStructure((prev) => {
        const next = [...prev];
        next.splice(insertAfter + 1, 0, newItem);
        return next;
      });
    } else {
      setStructure((prev) => [...prev, newItem]);
    }

    setShowPicker(false);
    setInsertAfter(null);
  }

  function moveUp(index: number) {
    setStructure((prev) => {
      if (index === 0) return prev;
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  }

  function moveDown(index: number) {
    setStructure((prev) => {
      if (index >= prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  }

  function removeComponent(index: number) {
    setStructure((prev) => prev.filter((_, currentIndex) => currentIndex !== index));
  }

  async function handleSave() {
    if (!drawerPage) return;

    setSaving(true);
    startTransition(async () => {
      try {
        await quickUpdatePage(drawerPage.id, {
          title: editTitle,
          slug: editSlug,
          area: editArea,
          parentId: editParentId || null,
          status: drawerPage.status,
        });

        const structureChanged = serializeStructure(structure) !== savedStructureJson;
        if (structureChanged) {
          await updateStructure(drawerPage.id, JSON.stringify(structure));
          setSavedStructureJson(serializeStructure(structure));
        }

        closeDrawer();
      } finally {
        setSaving(false);
      }
    });
  }

  async function handleClone() {
    if (!cloneSourcePage) return;

    setCloning(true);
    setCloneError("");
    startTransition(async () => {
      try {
        const result = await clonePage({
          sourcePageId: cloneSourcePage.id,
          title: cloneTitle.trim(),
          slug: cloneSlug.trim(),
          area: cloneArea,
          parentId: cloneParentId || null,
        });
        closeCloneDrawer();
        router.refresh();
        window.location.href = `/admin/pages/${result.pageId}/content`;
      } catch (error) {
        setCloneError(error instanceof Error ? error.message : "Unable to clone this page");
        setCloning(false);
      }
    });
  }

  const parentOptions = buildPageOptionRows(
    pages.filter((page) => page.area === editArea),
    hierarchyPermalinkMap,
    drawerPage?.id,
  );
  const cloneParentOptions = buildPageOptionRows(
    pages.filter((page) => page.area === cloneArea),
    hierarchyPermalinkMap,
    cloneSourcePage?.id,
  );

  const statusStyle: Record<string, React.CSSProperties> = {
    published: { background: "#dcfce7", color: "#15803d" },
    draft: { background: "#fef9c3", color: "#854d0e" },
    archived: { background: "#f1f5f9", color: "#64748b" },
  };

  const hasMetaChanges = !!drawerPage && (
    editTitle !== drawerPage.title
    || editSlug !== drawerPage.slug
    || editArea !== drawerPage.area
    || editParentId !== (drawerPage.parentId ?? "")
  );
  const hasStructureChanges = serializeStructure(structure) !== savedStructureJson;
  const hasUnsavedChanges = hasMetaChanges || hasStructureChanges;
  const clonePermalink = getDraftPermalink(cloneParentId, cloneSlug.trim());
  const clonePermalinkExists = pages.some(
    (page) =>
      page.area === cloneArea
      && normalizePermalink(getPagePermalink(page)) === normalizePermalink(clonePermalink),
  );
  const canClone = !!cloneSourcePage && !!cloneTitle.trim() && !!cloneSlug.trim() && !clonePermalinkExists;

  return (
    <>
      {treeRows.length === 0 ? (
        <div className="empty-state"><p>No pages found.</p></div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Permalink</th>
                <th>Area</th>
                <th>Status</th>
                <th>Components</th>
                <th>Updated</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {treeRows.map(({ page, depth, hasChildren }) => {
                const hierarchyPermalink = getHierarchyPermalink(page);
                const actualPermalink = getPagePermalink(page);
                const hasCustomDisplay =
                  !systemPageMap[page.id] &&
                  normalizePermalink(actualPermalink) !== normalizePermalink(hierarchyPermalink);
                const isExpanded = forceExpandAll ? true : (expandedRows[page.id] ?? true);

                return (
                  <tr
                    key={page.id}
                    style={{ cursor: "pointer" }}
                    onClick={() => { window.location.href = `/admin/pages/${page.id}/content`; }}
                  >
                    <td>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          paddingLeft: `${depth * 22}px`,
                          minHeight: 28,
                        }}
                      >
                        {hasChildren ? (
                          <button
                            type="button"
                            className="btn-icon"
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleRow(page.id);
                            }}
                            title={isExpanded ? "Collapse children" : "Expand children"}
                            style={{
                              width: 22,
                              height: 22,
                              fontSize: "0.72rem",
                              color: "var(--text-muted)",
                              flexShrink: 0,
                            }}
                          >
                            {isExpanded ? "▾" : "▸"}
                          </button>
                        ) : (
                          <span style={{ width: 22, flexShrink: 0 }} />
                        )}
                        <div style={{ minWidth: 0 }}>
                          <span style={{ color: "var(--primary)", fontWeight: 600, fontSize: "0.875rem" }}>
                            {page.title}
                          </span>
                          {(page.seo?.robotsIndex === false || page.seo?.robotsFollow === false) && (
                            <div style={{ display: "flex", gap: 4, marginTop: 3 }}>
                              {page.seo?.robotsIndex === false && (
                                <span style={{
                                  fontSize: "0.66rem", fontWeight: 700,
                                  background: "#fee2e2", color: "#b91c1c",
                                  border: "1px solid #fecaca",
                                  padding: "1px 7px", borderRadius: 999,
                                }}>
                                  noindex
                                </span>
                              )}
                              {page.seo?.robotsFollow === false && (
                                <span style={{
                                  fontSize: "0.66rem", fontWeight: 700,
                                  background: "#ffedd5", color: "#c2410c",
                                  border: "1px solid #fed7aa",
                                  padding: "1px 7px", borderRadius: 999,
                                }}>
                                  nofollow
                                </span>
                              )}
                            </div>
                          )}
                          {depth > 0 && (
                            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 2 }}>
                              Child page
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      {systemPageMap[page.id] ? (
                        <span style={{
                          display: "inline-flex", alignItems: "center", gap: 5,
                          background: "#dcfce7", color: "#15803d",
                          border: "1px solid #bbf7d0",
                          fontSize: "0.74rem", fontWeight: 700,
                          padding: "2px 9px", borderRadius: 999,
                        }}>
                          {SYSTEM_PAGE_LABELS[systemPageMap[page.id]]?.icon ?? "⚙️"}{" "}
                          {SYSTEM_PAGE_LABELS[systemPageMap[page.id]]?.label ?? systemPageMap[page.id]}
                        </span>
                      ) : (
                        <div>
                          <div style={{ fontFamily: "monospace", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                            {hierarchyPermalink}
                          </div>
                          {hasCustomDisplay && (
                            <div style={{ fontSize: "0.73rem", color: "var(--text-muted)", marginTop: 3 }}>
                              Display in:{" "}
                              <span style={{ fontFamily: "monospace" }}>{actualPermalink}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          padding: "2px 8px",
                          borderRadius: 999,
                          background: "#e0f2fe",
                          color: "#0369a1",
                          fontWeight: 600,
                        }}
                      >
                        {areaMap[page.area] ?? page.area}
                      </span>
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: "0.72rem",
                          padding: "2px 8px",
                          borderRadius: 999,
                          fontWeight: 600,
                          ...(statusStyle[page.status] ?? {}),
                        }}
                      >
                        {page.status === "published" && page.publishedVersionNumber
                          ? `${page.status} v${page.publishedVersionNumber}`
                          : page.status}
                      </span>
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {page.componentCount !== undefined ? (
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                          <span style={{
                            fontSize: "0.78rem", fontWeight: 600,
                            color: page.componentCount === 0 ? "var(--text-muted)" : "var(--text)",
                          }}>
                            {"🧩"} {page.componentCount}
                          </span>
                          {!!page.linkedComponentCount && (
                            <span style={{
                              fontSize: "0.68rem", background: "#ede9fe", color: "#6d28d9",
                              padding: "1px 6px", borderRadius: 999, fontWeight: 600,
                            }}>
                              {"🔗"} {page.linkedComponentCount}
                            </span>
                          )}
                          {!!page.collectionCount && (
                            <span style={{
                              fontSize: "0.68rem", background: "#dcfce7", color: "#16a34a",
                              padding: "1px 6px", borderRadius: 999, fontWeight: 600,
                            }}>
                              {"🗃️"} {page.collectionCount}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>{"—"}</span>
                      )}
                    </td>
                    <td style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>
                      {page.updatedAt ? new Date(page.updatedAt).toLocaleDateString("en-CA") : "—"}
                    </td>
                    <td style={{ whiteSpace: "nowrap" }} onClick={(event) => event.stopPropagation()}>
                      <button
                        className="btn btn-secondary btn-sm"
                        title="Page settings"
                        onClick={(event) => {
                          event.stopPropagation();
                          void openDrawer(page);
                        }}
                        style={{ marginRight: 4 }}
                      >
                        ⚙
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        title="Clone page"
                        onClick={(event) => {
                          event.stopPropagation();
                          openCloneDrawer(page);
                        }}
                      >
                        ⧉
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <SlideDrawer open={!!drawerPage} onClose={closeDrawer} title={`Settings — ${drawerPage?.title ?? ""}`}>
        {drawerPage && (
          drawerLoading ? (
            <div className="empty-state"><p>Loading…</p></div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Title</label>
                  <input className="form-control" value={editTitle} onChange={(event) => setEditTitle(event.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Slug</label>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input
                      className="form-control"
                      value={editSlug}
                      onChange={(event) => {
                        setSlugTouched(true);
                        setEditSlug(
                          event.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9-]/g, "-")
                            .replace(/-+/g, "-"),
                        );
                      }}
                    />
                    {slugTouched && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        title="Re-sync from title"
                        onClick={() => {
                          setSlugTouched(false);
                          setEditSlug(toSlug(editTitle));
                        }}
                      >
                        ↺
                      </button>
                    )}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Area</label>
                  <select className="form-control" value={editArea} onChange={(event) => setEditArea(event.target.value)}>
                    {areas.map((area) => (
                      <option key={area.name} value={area.name}>
                        {area.displayName || area.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Parent page</label>
                  <select className="form-control" value={editParentId} onChange={(event) => setEditParentId(event.target.value)}>
                    <option value="">— None (top level) —</option>
                    {parentOptions.map((page) => (
                      <option key={page.id} value={page.id}>
                        {page.label} ({page.permalink})
                      </option>
                    ))}
                  </select>
                  <p className="form-hint" style={{ marginTop: 4 }}>
                    Effective permalink: {getDraftPermalink(editParentId, editSlug)}
                  </p>
                </div>
              </div>

              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)" }}>
                      Structure
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 4 }}>
                      Manage the page component order directly from this drawer.
                    </div>
                  </div>
                </div>

                {structure.length === 0 ? (
                  <div className="empty-state" style={{ border: "1px dashed var(--border)", borderRadius: 10, padding: 18 }}>
                    <p>No components yet.</p>
                    <button className="btn btn-primary btn-sm" style={{ marginTop: 10 }} onClick={() => { setInsertAfter(null); setShowPicker(true); }}>
                      + Add component
                    </button>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {structure.map((instance, index) => {
                      const component = getComponent(instance.componentId);
                      return (
                        <div
                          key={`${instance.componentId}-${index}`}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            padding: "10px 12px",
                            border: "1px solid var(--border)",
                            borderRadius: 10,
                            background: "var(--bg-light)",
                          }}
                        >
                          <span style={{ minWidth: 24, fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 700 }}>
                            #{index + 1}
                          </span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--text)" }}>
                              {component?.name ?? instance.componentId}
                            </div>
                            {component?.namespace && (
                              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 2 }}>
                                {component.namespace}
                              </div>
                            )}
                          </div>
                          <div style={{ display: "flex", gap: 4 }}>
                            <button className="btn-icon" onClick={() => moveUp(index)} disabled={index === 0} title="Move up">▲</button>
                            <button className="btn-icon" onClick={() => moveDown(index)} disabled={index >= structure.length - 1} title="Move down">▼</button>
                            <button className="btn-icon" onClick={() => { setInsertAfter(index); setShowPicker(true); }} title="Insert below" style={{ color: "var(--primary)" }}>+</button>
                            <button className="btn-icon" onClick={() => removeComponent(index)} title="Remove" style={{ color: "var(--danger)" }}>×</button>
                          </div>
                        </div>
                      );
                    })}
                    <button className="btn btn-secondary btn-sm" style={{ alignSelf: "flex-start", marginTop: 2 }} onClick={() => { setInsertAfter(null); setShowPicker(true); }}>
                      + Add component to end
                    </button>
                  </div>
                )}
              </div>

              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap", paddingTop: 8, borderTop: "1px solid var(--border)" }}>
                <Link href={`/admin/pages/${drawerPage.id}/content`} className="btn btn-secondary" onClick={closeDrawer}>
                  Edit content →
                </Link>
                <button className="btn btn-primary" onClick={handleSave} disabled={saving || !hasUnsavedChanges}>
                  {saving ? "Saving…" : "Save changes"}
                </button>
              </div>
            </div>
          )
        )}
      </SlideDrawer>

      {showPicker && (
        <ComponentPickerModal
          components={availableComponents}
          onSelect={addComponent}
          onClose={() => {
            setShowPicker(false);
            setInsertAfter(null);
          }}
        />
      )}

      <SlideDrawer open={!!cloneSourcePage} onClose={closeCloneDrawer} title={`Clone — ${cloneSourcePage?.title ?? ""}`}>
        {cloneSourcePage && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Title</label>
              <input className="form-control" value={cloneTitle} onChange={(event) => setCloneTitle(event.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label">Slug</label>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input
                  className="form-control"
                  value={cloneSlug}
                  onChange={(event) => {
                    setCloneSlugTouched(true);
                    setCloneSlug(
                      event.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9-]/g, "-")
                        .replace(/-+/g, "-"),
                    );
                  }}
                />
                {cloneSlugTouched && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    title="Re-sync from title"
                    onClick={() => {
                      setCloneSlugTouched(false);
                      setCloneSlug(toSlug(cloneTitle));
                    }}
                  >
                    ↺
                  </button>
                )}
              </div>
              <p className="form-hint" style={{ marginTop: 4 }}>
                {cloneSlugTouched ? "Custom slug" : "Auto-generated from title"}
              </p>
              {clonePermalinkExists && (
                <p style={{ marginTop: 6, fontSize: "0.78rem", color: "var(--danger)" }}>
                  A page with this permalink already exists in the selected area.
                </p>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Area</label>
              <select className="form-control" value={cloneArea} onChange={(event) => setCloneArea(event.target.value)}>
                {areas.map((area) => (
                  <option key={area.name} value={area.name}>
                    {area.displayName || area.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Parent page</label>
              <select className="form-control" value={cloneParentId} onChange={(event) => setCloneParentId(event.target.value)}>
                <option value="">— None (top level) —</option>
                {cloneParentOptions.map((page) => (
                  <option key={page.id} value={page.id}>
                    {page.label} ({page.permalink})
                  </option>
                ))}
              </select>
              <p className="form-hint" style={{ marginTop: 4 }}>
                Effective permalink: {clonePermalink}
              </p>
            </div>

            {cloneError && (
              <div style={{ fontSize: "0.82rem", color: "var(--danger)", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "10px 12px" }}>
                {cloneError}
              </div>
            )}

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", paddingTop: 8 }}>
              <button type="button" className="btn btn-secondary" onClick={closeCloneDrawer} disabled={cloning}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={handleClone} disabled={!canClone || cloning}>
                {cloning ? "Cloning…" : "Clone page"}
              </button>
            </div>
          </div>
        )}
      </SlideDrawer>
    </>
  );
}
