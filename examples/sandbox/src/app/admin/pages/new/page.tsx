"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createPage } from "../actions";

function toSlug(text: string): string {
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

export default function NewPagePage() {
  const searchParams = useSearchParams();
  const templateId   = searchParams.get("template");

  const [areas,          setAreas]          = useState<{ name: string; displayName: string }[]>([]);
  const [area,           setArea]           = useState("");
  const [title,          setTitle]          = useState("");
  const [slug,           setSlug]           = useState("");
  const [slugTouched,    setSlugTouched]    = useState(false);
  const [submitting,     setSubmitting]     = useState(false);
  const [templateName,   setTemplateName]   = useState<string | null>(null);
  const [templateStruct, setTemplateStruct] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/list-areas")
      .then((r) => r.json())
      .then((d) => {
        const list = d.areas ?? [];
        setAreas(list);
        if (list.length > 0) setArea(list[0].name);
      });
  }, []);

  useEffect(() => {
    if (!templateId) return;
    fetch(`/api/admin/page-templates/${templateId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.name) setTemplateName(data.name);
        if (data.structure) setTemplateStruct(JSON.stringify(data.structure));
      })
      .catch(() => {});
  }, [templateId]);

  useEffect(() => {
    if (!slugTouched) setSlug(toSlug(title));
  }, [title, slugTouched]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const form = new FormData();
    form.set("area",  area);
    form.set("title", title);
    form.set("slug",  slug);
    if (templateStruct) form.set("structure", templateStruct);
    await createPage(form);
  }

  return (
    <div>
      <Link href="/admin/pages" style={{ fontSize: "0.85rem", color: "var(--text-muted)", textDecoration: "none" }}>
        &#8592; Pages
      </Link>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: "12px 0 20px" }}>New Page</h1>

      {templateName && (
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 6,
          padding: "6px 12px", marginBottom: 20, fontSize: "0.85rem", color: "#1d4ed8",
        }}>
          <span>📄</span>
          <span>From template: <strong>{templateName}</strong></span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="card" style={{ maxWidth: 560 }}>

          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label">Area</label>
            <select className="form-control" value={area} onChange={(e) => setArea(e.target.value)}>
              {areas.map((a) => (
                <option key={a.name} value={a.name}>{a.displayName || a.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label">
              Title <span style={{ color: "var(--danger)" }}>*</span>
            </label>
            <input
              className="form-control"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
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
              <span style={{ color: "var(--text-muted)", fontSize: "0.9rem", flexShrink: 0 }}>/</span>
              <input
                className="form-control"
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-"));
                }}
                required
                placeholder="about-us"
                style={{ fontFamily: "monospace" }}
              />
              {slugTouched && (
                <button type="button" className="btn btn-secondary btn-sm"
                  title="Re-sync from title"
                  onClick={() => { setSlugTouched(false); setSlug(toSlug(title)); }}>
                  &#x21BA;
                </button>
              )}
            </div>
            <p className="form-hint" style={{ marginTop: 4 }}>
              {slugTouched ? "Custom — click rotate to re-sync from title" : "Auto-generated from title"}
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button type="submit" className="btn btn-primary"
              disabled={submitting || !title.trim() || !slug.trim()}>
              {submitting ? "Creating..." : "Create Page"}
            </button>
            <Link href="/admin/pages" style={{ fontSize: "0.88rem", color: "var(--text-muted)" }}>
              Cancel
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}
