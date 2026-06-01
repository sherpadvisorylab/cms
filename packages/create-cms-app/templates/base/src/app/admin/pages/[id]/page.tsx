import { cms } from "@/lib/cms";
import { notFound } from "next/navigation";
import { DeleteButton } from "@/components/admin/ui";
import { updatePage, deletePage } from "../actions";
import { PublishToggle } from "@/components/admin/PublishToggle";
import { PageSettingsSaveButton } from "./PageSettingsSaveButton";
import { PageSchemaEditor } from "./PageSchemaEditor";
import type { ComponentSchemaEntry, PageSchemaConfig } from "./PageSchemaEditor";
import { PageEditorHeader } from "./PageEditorHeader";

export default async function PageSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [allPages, areas, allComponents] = await Promise.all([
    cms.pages.findAll(),
    cms.areas.findAll(),
    cms.components.findAll(),
  ]);
  const page = allPages.find((p) => p.id === id);
  if (!page) notFound();

  const [latestVersion, publishedVersion] = await Promise.all([
    cms.pageVersions.getLatest(id).catch(() => null),
    cms.pageVersions.getLatestPublished(id).catch(() => null),
  ]);

  // Build component schema entries — fetch all component versions in parallel
  const structure = latestVersion?.structure ?? [];
  const componentEntries: ComponentSchemaEntry[] = (
    await Promise.all(
      structure.map(async (instance, i) => {
        const comp = allComponents.find((c) => c.id === instance.componentId);
        if (!comp) return null;
        const version = await cms.componentVersions.getLatest(instance.componentId).catch(() => null);
        return {
          instanceIndex:     i,
          componentId:       comp.id,
          componentName:     comp.name,
          namespace:         comp.namespace ?? null,
          schemaOrgTemplate: (version as { schemaOrgTemplate?: string })?.schemaOrgTemplate ?? "",
          fields: (version?.schema ?? []).map((f: { key: string; label: string; type: string }) => ({
            key:   f.key,
            label: f.label,
            type:  f.type,
          })),
        } satisfies ComponentSchemaEntry;
      })
    )
  ).filter((e): e is ComponentSchemaEntry => e !== null);

  const savedConfig  = (page.seo as { schemaConfig?: PageSchemaConfig })?.schemaConfig ?? null;
  const isPublished  = page.status === "published" && !!publishedVersion;
  const update       = updatePage.bind(null, id);

  return (
    <div>
      <PageEditorHeader
        id={id}
        title={page.title}
        isPublished={isPublished}
        actions={
          <>
            <PublishToggle pageId={id} initialIsPublished={isPublished} pageSlug={page.slug} />
            <PageSettingsSaveButton />
          </>
        }
      />

      {/* Settings form — id referenced by the submit button in the header */}
      <form id="settings-form" action={update}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start", marginBottom: 20 }}>

          {/* Left: Page settings */}
          <div className="card">
            <p style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase",
              letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: 14 }}>Page Settings</p>

            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label">Title <span style={{ color: "var(--danger)" }}>*</span></label>
              <input name="title" className="form-control" defaultValue={page.title} required />
            </div>
            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label">Slug <span style={{ color: "var(--danger)" }}>*</span></label>
              <input name="slug" className="form-control" defaultValue={page.slug} required style={{ fontFamily: "monospace" }} />
            </div>
            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label">Area</label>
              <select name="area" className="form-control" defaultValue={page.area}>
                {areas.map((a) => <option key={a.name} value={a.name}>{a.displayName || a.name}</option>)}
              </select>
            </div>
            {/* Preserve publish status — changed only via the toggle button */}
            <input type="hidden" name="status" value={page.status} />
            <div className="form-group">
              <label className="form-label">Parent page</label>
              <select name="parentId" className="form-control" defaultValue={page.parentId ?? ""}>
                <option value="">— None (top level) —</option>
                {allPages.filter((p) => p.id !== id).map((p) => (
                  <option key={p.id} value={p.id}>{p.title} (/{p.slug})</option>
                ))}
              </select>
            </div>

            {/* Delete — bottom right, destructive action separate from settings */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20,
              paddingTop: 16, borderTop: "1px solid var(--border)" }}>
              <DeleteButton action={deletePage.bind(null, id)} />
            </div>
          </div>

          {/* Right: SEO */}
          <div className="card">
            <p style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase",
              letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: 14 }}>SEO</p>

            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label">Meta title</label>
              <input name="seoTitle" className="form-control"
                defaultValue={page.seo?.metaTitle ?? page.seoTitle ?? ""} />
            </div>
            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label">Meta description</label>
              <textarea name="seoDescription" className="form-control" rows={3}
                defaultValue={page.seo?.metaDescription ?? page.seoDescription ?? ""} />
            </div>
            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label">Keywords</label>
              <input name="keywords" className="form-control"
                defaultValue={page.seo?.keywords ?? ""} placeholder="keyword1, keyword2" />
              <span className="form-hint">Comma-separated</span>
            </div>
            <div className="form-group">
              <label className="form-label">OG Image URL</label>
              <input name="ogImageUrl" className="form-control"
                defaultValue={page.ogImageUrl ?? ""} placeholder="https://..." />
              <span className="form-hint">Shown when shared on social media</span>
            </div>
          </div>
        </div>
      </form>

      {/* Schema.org / JSON-LD editor */}
      <PageSchemaEditor
        pageId={id}
        components={componentEntries}
        savedConfig={savedConfig}
      />
    </div>
  );
}
