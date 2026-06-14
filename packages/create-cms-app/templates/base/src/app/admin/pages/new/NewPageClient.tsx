"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createPage } from "../actions";
import { joinParentPermalink } from "@/lib/pagePermalinks";
import type { CmsArea, CmsPage } from "@sherpacms/domain";
import { ADMIN_LOCALE_COOKIE } from "@/lib/i18n";

type Props = {
  areas: CmsArea[];
  pages: CmsPage[];
  templateId: string | null;
};

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[àáâãäå]/g, "a")
    .replace(/[èéêë]/g, "e")
    .replace(/[ìíîï]/g, "i")
    .replace(/[òóôõö]/g, "o")
    .replace(/[ùúûü]/g, "u")
    .replace(/[ñ]/g, "n")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizeSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
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
      return `/${page.slug}`;
    }

    trail.add(pageId);
    const parentPermalink =
      page.parentId && pageMap.has(page.parentId) ? resolve(page.parentId, trail) : "/";
    trail.delete(pageId);

    const permalink = joinParentPermalink(parentPermalink, page.slug);
    cache.set(pageId, permalink);
    return permalink;
  }

  return Object.fromEntries(pages.map((page) => [page.id, resolve(page.id)]));
}

function buildParentOptions(pages: CmsPage[]) {
  const childrenByParent = new Map<string | null, CmsPage[]>();

  for (const page of pages) {
    const siblings = childrenByParent.get(page.parentId ?? null) ?? [];
    siblings.push(page);
    childrenByParent.set(page.parentId ?? null, siblings);
  }

  for (const siblings of childrenByParent.values()) {
    siblings.sort(comparePages);
  }

  const rows: Array<{ id: string; label: string; permalink: string }> = [];
  const permalinkMap = buildHierarchyPermalinkMap(pages);

  function append(parentId: string | null, depth: number) {
    const siblings = childrenByParent.get(parentId) ?? [];
    for (const page of siblings) {
      rows.push({
        id: page.id,
        label: `${"  ".repeat(depth)}${depth > 0 ? "- " : ""}${page.title}`,
        permalink: permalinkMap[page.id] ?? `/${page.slug}`,
      });
      append(page.id, depth + 1);
    }
  }

  append(null, 0);
  return rows;
}

function readAdminLocaleCookie(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${ADMIN_LOCALE_COOKIE}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : "";
}

export default function NewPageClient({ areas, pages, templateId }: Props) {
  const [area, setArea] = useState(areas[0]?.name ?? "");
  const [parentId, setParentId] = useState("");
  const [locale, setLocale] = useState("");
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [templateName, setTemplateName] = useState<string | null>(null);
  const [templateStruct, setTemplateStruct] = useState<string | null>(null);
  const [templateLoading, setTemplateLoading] = useState(Boolean(templateId));
  const [templateError, setTemplateError] = useState("");

  const pagesInArea = useMemo(
    () => pages.filter((page) => page.area === area),
    [area, pages],
  );
  const parentOptions = useMemo(() => buildParentOptions(pagesInArea), [pagesInArea]);

  const selectedAreaConfig = useMemo(
    () => areas.find((a) => a.name === area),
    [area, areas],
  );
  const areaLocales = selectedAreaConfig?.supportedLocales ?? [];

  // Sync locale when area changes
  useEffect(() => {
    const adminLocale = readAdminLocaleCookie();
    if (areaLocales.length > 1) {
      const candidate = areaLocales.includes(adminLocale) ? adminLocale : (selectedAreaConfig?.defaultLocale ?? areaLocales[0] ?? "");
      setLocale(candidate);
    } else {
      setLocale(selectedAreaConfig?.defaultLocale ?? "");
    }
  }, [area, areaLocales, selectedAreaConfig]);

  useEffect(() => {
    if (!slugTouched) {
      setSlug(toSlug(title));
    }
  }, [title, slugTouched]);

  useEffect(() => {
    if (!parentId) return;
    const parentStillAvailable = pagesInArea.some((page) => page.id === parentId);
    if (!parentStillAvailable) {
      setParentId("");
    }
  }, [area, parentId, pagesInArea]);

  useEffect(() => {
    if (!templateId) {
      setTemplateLoading(false);
      setTemplateError("");
      setTemplateName(null);
      setTemplateStruct(null);
      return;
    }

    let active = true;
    setTemplateLoading(true);
    setTemplateError("");

    fetch(`/api/admin/page-templates/${templateId}`, { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Unable to load page template");
        }
        if (!active) return;
        setTemplateName(data.name ?? null);
        setTemplateStruct(data.structure ? JSON.stringify(data.structure) : "[]");
      })
      .catch((error) => {
        if (!active) return;
        setTemplateName(null);
        setTemplateStruct(null);
        setTemplateError(error instanceof Error ? error.message : "Unable to load page template");
      })
      .finally(() => {
        if (active) setTemplateLoading(false);
      });

    return () => {
      active = false;
    };
  }, [templateId]);

  const selectedParentPermalink = parentId
    ? parentOptions.find((option) => option.id === parentId)?.permalink ?? "/"
    : "/";
  const effectivePermalink = slug.trim()
    ? joinParentPermalink(selectedParentPermalink, slug.trim())
    : selectedParentPermalink === "/" ? "/" : `${selectedParentPermalink}/`;

  const templateReady = !templateId || (!templateLoading && !!templateStruct && !templateError);
  const canSubmit =
    !submitting &&
    !!area.trim() &&
    !!title.trim() &&
    !!slug.trim() &&
    templateReady;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setSubmitError("");
    const form = new FormData();
    form.set("area", area);
    form.set("parentId", parentId);
    form.set("title", title.trim());
    form.set("slug", slug.trim());
    form.set("seoTitle", title.trim());
    if (locale) form.set("locale", locale);
    if (templateStruct) form.set("structure", templateStruct);
    try {
      await createPage(form);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to create the page");
      setSubmitting(false);
    }
  }

  return (
    <div>
      <Link
        href="/admin/pages"
        style={{ fontSize: "0.85rem", color: "var(--text-muted)", textDecoration: "none" }}
      >
        &#8592; Pages
      </Link>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: "12px 0 20px" }}>New Page</h1>

      {templateId && (
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: templateError ? "#fef2f2" : "#eff6ff",
            border: templateError ? "1px solid #fecaca" : "1px solid #bfdbfe",
            borderRadius: 6,
            padding: "6px 12px",
            marginBottom: 20,
            fontSize: "0.85rem",
            color: templateError ? "#b91c1c" : "#1d4ed8",
          }}
        >
          <span>{templateError ? "!" : "*"}</span>
          <span>
            {templateLoading && "Loading template..."}
            {!templateLoading && templateError && templateError}
            {!templateLoading && !templateError && templateName && (
              <>
                From template: <strong>{templateName}</strong>
              </>
            )}
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="card" style={{ maxWidth: 720 }}>
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label">
              Area <span style={{ color: "var(--danger)" }}>*</span>
            </label>
            <select
              className="form-control"
              value={area}
              onChange={(event) => setArea(event.target.value)}
              required
            >
              {areas.map((entry) => (
                <option key={entry.name} value={entry.name}>
                  {entry.displayName || entry.name}
                </option>
              ))}
            </select>
          </div>

          {areaLocales.length > 1 && (
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">Locale</label>
              <select
                className="form-control"
                value={locale}
                onChange={(e) => setLocale(e.target.value)}
                style={{ maxWidth: 200, fontFamily: "monospace" }}
              >
                {areaLocales.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc.toUpperCase()}{loc === selectedAreaConfig?.defaultLocale ? " (default)" : ""}
                  </option>
                ))}
              </select>
              <p className="form-hint" style={{ marginTop: 4 }}>
                Language version for this page.
              </p>
            </div>
          )}

          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label">
              Parent page <span style={{ color: "var(--danger)" }}>*</span>
            </label>
            <select
              className="form-control"
              value={parentId}
              onChange={(event) => setParentId(event.target.value)}
            >
              <option value="">/ (Site root)</option>
              {parentOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label} ({option.permalink})
                </option>
              ))}
            </select>
            <p className="form-hint" style={{ marginTop: 4 }}>
              The permalink follows the selected parent chain.
            </p>
          </div>

          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label">
              Title <span style={{ color: "var(--danger)" }}>*</span>
            </label>
            <input
              className="form-control"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              autoFocus
              placeholder="e.g. About Us"
            />
          </div>

          <div className="form-group" style={{ marginBottom: 20 }}>
            <label className="form-label">
              Slug <span style={{ color: "var(--danger)" }}>*</span>
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  color: "var(--text-muted)",
                  fontSize: "0.9rem",
                  flexShrink: 0,
                  fontFamily: "monospace",
                }}
              >
                {selectedParentPermalink === "/" ? "/" : `${selectedParentPermalink}/`}
              </span>
              <input
                className="form-control"
                value={slug}
                onChange={(event) => {
                  setSlugTouched(true);
                  setSlug(normalizeSlug(event.target.value));
                }}
                required
                placeholder="about-us"
                style={{ fontFamily: "monospace" }}
              />
              {slugTouched && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  title="Re-sync from title"
                  onClick={() => {
                    setSlugTouched(false);
                    setSlug(toSlug(title));
                  }}
                >
                  &#x21BA;
                </button>
              )}
            </div>
            <p className="form-hint" style={{ marginTop: 4 }}>
              {slugTouched ? "Custom slug." : "Auto-generated from title."}
            </p>
            <p className="form-hint" style={{ marginTop: 4 }}>
              Effective permalink: <span style={{ fontFamily: "monospace" }}>{effectivePermalink}</span>
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button type="submit" className="btn btn-primary" disabled={!canSubmit}>
              {submitting ? "Creating..." : "Create Page"}
            </button>
            <Link href="/admin/pages" style={{ fontSize: "0.88rem", color: "var(--text-muted)" }}>
              Cancel
            </Link>
          </div>
          {submitError && (
            <div
              style={{
                marginTop: 14,
                fontSize: "0.82rem",
                color: "var(--danger)",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: 10,
                padding: "10px 12px",
              }}
            >
              {submitError}
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
