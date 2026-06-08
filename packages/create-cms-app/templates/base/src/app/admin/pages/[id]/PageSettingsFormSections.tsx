"use client";

import { useState } from "react";
import type { CmsArea, CmsPage } from "@sherpacms/domain";
import {
  buildPermalinkMap,
  joinParentPermalink,
  normalizePermalink,
} from "@/lib/pagePermalinks";
import { DeleteButton } from "@/components/admin/ui";
import { SystemPageBadges } from "@/components/admin/SystemPageBadges";

type Props = {
  allPages: CmsPage[];
  areas: CmsArea[];
  currentPageId: string;
  initialPage: CmsPage;
  currentSystemType: string | null;
  isSystemPage: boolean;
  onDelete: () => Promise<void>;
};

function sanitizeSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function getParentPermalink(
  parentId: string,
  permalinkMap: Record<string, string>,
) {
  if (!parentId) return "/";
  return permalinkMap[parentId] ?? "/";
}

export function PageSettingsFormSections({
  allPages,
  areas,
  currentPageId,
  initialPage,
  currentSystemType,
  isSystemPage,
  onDelete,
}: Props) {
  const [title, setTitle] = useState(initialPage.title);
  const [slug, setSlug] = useState(initialPage.slug);
  const [area, setArea] = useState(initialPage.area);
  const [parentId, setParentId] = useState(initialPage.parentId ?? "");
  const [hasCustomPermalink, setHasCustomPermalink] = useState(
    !!initialPage.hasCustomPermalink,
  );
  const [customPermalink, setCustomPermalink] = useState(
    normalizePermalink(initialPage.permalink ?? initialPage.slug),
  );

  const permalinkMap = buildPermalinkMap(allPages);
  const availableParents = allPages.filter((page) => page.id !== currentPageId);
  const parentPermalink = getParentPermalink(parentId, permalinkMap);
  const derivedPermalink = joinParentPermalink(parentPermalink, slug);
  const effectivePermalink = hasCustomPermalink
    ? normalizePermalink(customPermalink || derivedPermalink)
    : derivedPermalink;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 20,
        alignItems: "start",
        marginBottom: 20,
      }}
    >
      <div className="card">
        <p
          style={{
            fontSize: "0.72rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: "var(--text-muted)",
            marginBottom: 14,
          }}
        >
          Page Settings
        </p>

        <div className="form-group" style={{ marginBottom: 12 }}>
          <label className="form-label">
            Title <span style={{ color: "var(--danger)" }}>*</span>
          </label>
          <input
            name="title"
            className="form-control"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
          />
        </div>

        {isSystemPage ? (
          <input type="hidden" name="slug" value={slug} />
        ) : (
          <div className="form-group" style={{ marginBottom: 12 }}>
            <label className="form-label">
              Slug <span style={{ color: "var(--danger)" }}>*</span>
            </label>
            <input
              name="slug"
              className="form-control"
              value={slug}
              onChange={(event) => setSlug(sanitizeSlug(event.target.value))}
              required
              style={{ fontFamily: "monospace" }}
            />
            <span className="form-hint">
              Segmento finale della rotta. Il permalink viene aggiornato in base al parent.
            </span>
          </div>
        )}

        <div className="form-group" style={{ marginBottom: 12 }}>
          <label className="form-label">Area</label>
          <select
            name="area"
            className="form-control"
            value={area}
            onChange={(event) => setArea(event.target.value)}
          >
            {areas.map((entry) => (
              <option key={entry.name} value={entry.name}>
                {entry.displayName || entry.name}
              </option>
            ))}
          </select>
        </div>

        <input type="hidden" name="status" value={initialPage.status} />

        <div className="form-group">
          <label className="form-label">Parent page</label>
          <select
            name="parentId"
            className="form-control"
            value={parentId}
            onChange={(event) => setParentId(event.target.value)}
          >
            <option value="">- None (top level) -</option>
            {availableParents.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.title} ({permalinkMap[entry.id] ?? normalizePermalink(entry.permalink ?? entry.slug)})
              </option>
            ))}
          </select>
          <span className="form-hint">
            La rotta finale segue la catena parent + slug salvo override manuale.
          </span>
        </div>

        <SystemPageBadges
          pageId={currentPageId}
          areaName={area}
          currentType={currentSystemType}
        />

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginTop: 20,
            paddingTop: 16,
            borderTop: "1px solid var(--border)",
          }}
        >
          {isSystemPage ? (
            <span
              style={{
                fontSize: "0.78rem",
                color: "var(--text-muted)",
                fontStyle: "italic",
              }}
            >
              System pages cannot be deleted
            </span>
          ) : (
            <DeleteButton action={onDelete} />
          )}
        </div>
      </div>

      <div className="card">
        <p
          style={{
            fontSize: "0.72rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: "var(--text-muted)",
            marginBottom: 14,
          }}
        >
          SEO
        </p>

        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: 10,
            background: "var(--bg-light)",
            padding: "12px 14px",
            marginBottom: 14,
          }}
        >
          <div style={{ fontSize: "0.76rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: 6 }}>
            Effective permalink
          </div>
          <div style={{ fontFamily: "monospace", fontSize: "0.9rem", color: "var(--text)" }}>
            {effectivePermalink}
          </div>
          <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", marginTop: 6 }}>
            {hasCustomPermalink
              ? "Override manuale attivo."
              : `Derivato da ${parentPermalink} + ${slug || "(slug vuoto)"}.`}
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 12 }}>
          <label className="form-label">Meta title</label>
          <input
            name="seoTitle"
            className="form-control"
            defaultValue={initialPage.seo?.metaTitle ?? initialPage.seoTitle ?? ""}
          />
        </div>

        <div className="form-group" style={{ marginBottom: 12 }}>
          <label className="form-label">Meta description</label>
          <textarea
            name="seoDescription"
            className="form-control"
            rows={3}
            defaultValue={initialPage.seo?.metaDescription ?? initialPage.seoDescription ?? ""}
          />
        </div>

        <div className="form-group" style={{ marginBottom: 12 }}>
          <label className="form-label">Keywords</label>
          <input
            name="keywords"
            className="form-control"
            defaultValue={initialPage.seo?.keywords ?? ""}
            placeholder="keyword1, keyword2"
          />
          <span className="form-hint">Comma-separated</span>
        </div>

        <div className="form-group" style={{ marginBottom: 12 }}>
          <label className="form-label">OG Image URL</label>
          <input
            name="ogImageUrl"
            className="form-control"
            defaultValue={initialPage.ogImageUrl ?? ""}
            placeholder="https://..."
          />
          <span className="form-hint">Shown when shared on social media</span>
        </div>

        <div className="form-group" style={{ marginBottom: 12 }}>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: "0.83rem",
              fontWeight: 600,
              cursor: isSystemPage ? "not-allowed" : "pointer",
              opacity: isSystemPage ? 0.65 : 1,
            }}
          >
            <input
              type="checkbox"
              name="hasCustomPermalink"
              checked={hasCustomPermalink}
              disabled={isSystemPage}
              onChange={(event) => {
                const nextValue = event.target.checked;
                setHasCustomPermalink(nextValue);
                if (!nextValue) {
                  setCustomPermalink(derivedPermalink);
                }
              }}
            />
            Override permalink manually
          </label>
          <span className="form-hint">
            Se disattivo, il permalink resta ancorato a parent + slug.
          </span>
        </div>

        <div className="form-group">
          <label className="form-label">Permalink</label>
          <input
            name="permalink"
            className="form-control"
            value={hasCustomPermalink ? customPermalink : effectivePermalink}
            onChange={(event) => setCustomPermalink(normalizePermalink(event.target.value))}
            disabled={!hasCustomPermalink}
            readOnly={!hasCustomPermalink}
            style={{ fontFamily: "monospace" }}
          />
          <span className="form-hint">
            Campo canonico usato dal motore CMS per risolvere la rotta pubblica.
          </span>
        </div>
      </div>
    </div>
  );
}
