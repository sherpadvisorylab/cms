"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { SlideDrawer } from "@/components/admin/SlideDrawer";
import { quickUpdatePage } from "./actions";
import type { CmsPage, CmsArea } from "@cms/domain";

type Props = {
  pages: CmsPage[];
  areas: CmsArea[];
  search: string;
  areaFilter: string;
};

export function PagesTable({ pages, areas, search, areaFilter }: Props) {
  const areaMap = Object.fromEntries(areas.map((a) => [a.name, a.displayName || a.name]));

  const [drawerPage, setDrawerPage]   = useState<CmsPage | null>(null);
  const [editTitle,  setEditTitle]    = useState("");
  const [editSlug,   setEditSlug]     = useState("");
  const [editArea,   setEditArea]     = useState("");
  const [editStatus, setEditStatus]   = useState("");
  const [saving,     setSaving]       = useState(false);
  const [, startTransition]           = useTransition();

  // Client-side filter (server may also filter but this gives instant feedback)
  const filtered = pages.filter((p) => {
    if (areaFilter && p.area !== areaFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return p.title.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q);
    }
    return true;
  });

  function openDrawer(page: CmsPage) {
    setDrawerPage(page);
    setEditTitle(page.title);
    setEditSlug(page.slug);
    setEditArea(page.area);
    setEditStatus(page.status);
  }

  async function handleSave() {
    if (!drawerPage) return;
    setSaving(true);
    startTransition(async () => {
      await quickUpdatePage(drawerPage.id, {
        title: editTitle, slug: editSlug, area: editArea, status: editStatus,
      });
      setSaving(false);
      setDrawerPage(null);
    });
  }

  const STATUS_STYLE: Record<string, string> = {
    published: "background:#dcfce7;color:#15803d",
    draft:     "background:#fef9c3;color:#854d0e",
    archived:  "background:#f1f5f9;color:#64748b",
  };

  return (
    <>
      {filtered.length === 0 ? (
        <div className="empty-state"><p>No pages found.</p></div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Slug</th>
                <th>Area</th>
                <th>Status</th>
                <th>Updated</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((page) => (
                <tr key={page.id} style={{ cursor: "pointer" }}
                  onClick={() => window.location.href = `/admin/pages/${page.id}/content`}>
                  <td>
                    <span style={{ color: "var(--primary)", fontWeight: 600, fontSize: "0.875rem" }}>
                      {page.title}
                    </span>
                  </td>
                  <td style={{ fontFamily: "monospace", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    /{page.slug}
                  </td>
                  <td>
                    <span style={{ fontSize: "0.75rem", padding: "2px 8px", borderRadius: 999,
                                   background: "#e0f2fe", color: "#0369a1", fontWeight: 600 }}>
                      {areaMap[page.area] ?? page.area}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: "0.72rem", padding: "2px 8px", borderRadius: 999,
                                   fontWeight: 600, ...(STATUS_STYLE[page.status]
                                     ? Object.fromEntries(STATUS_STYLE[page.status].split(";").map(s => s.split(":")))
                                     : {}) }}>
                      {page.status}
                    </span>
                  </td>
                  <td style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>
                    {page.updatedAt ? new Date(page.updatedAt).toLocaleDateString() : "—"}
                  </td>
                  <td style={{ whiteSpace: "nowrap" }} onClick={(e) => e.stopPropagation()}>
                    <button
                      className="btn btn-secondary btn-sm"
                      title="Page settings"
                      onClick={(e) => { e.stopPropagation(); openDrawer(page); }}
                      style={{ marginRight: 4 }}
                    >
                      ⚙
                    </button>
                    <Link href={`/admin/pages/${page.id}/structure`} prefetch={false}
                      className="btn btn-secondary btn-sm"
                      onClick={(e) => e.stopPropagation()} title="Structure">⊞</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <SlideDrawer open={!!drawerPage} onClose={() => setDrawerPage(null)}
        title={`Settings — ${drawerPage?.title ?? ""}`}>
        {drawerPage && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Title</label>
              <input className="form-control" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Slug</label>
              <input className="form-control" value={editSlug} onChange={(e) => setEditSlug(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Area</label>
              <select className="form-control" value={editArea} onChange={(e) => setEditArea(e.target.value)}>
                {areas.map((a) => <option key={a.name} value={a.name}>{a.displayName || a.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-control" value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div style={{ display: "flex", gap: 8, paddingTop: 8 }}>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </button>
              <Link href={`/admin/pages/${drawerPage.id}/content`} className="btn btn-secondary"
                onClick={() => setDrawerPage(null)}>
                Edit content →
              </Link>
            </div>
          </div>
        )}
      </SlideDrawer>
    </>
  );
}
