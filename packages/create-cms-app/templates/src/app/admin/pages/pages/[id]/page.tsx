import { cms } from "@/lib/cms";
import { notFound } from "next/navigation";
import { FormCard, Field, SelectField, TextareaField, DeleteButton } from "@/components/admin/ui";
import { updatePage, deletePage, publishPage } from "../actions";
import { ImageUploadField, getImageUrl, type ImageValue } from "@/components/admin/ImageUploadField";

export default async function PageSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [allPages, areas] = await Promise.all([
    cms.pages.findAll(),
    cms.areas.findAll(),
  ]);
  const page = allPages.find((p) => p.id === id);
  if (!page) notFound();

  const latestVersion = await cms.pageVersions.getLatest(id).catch(() => null);
  const publishedVersion = await cms.pageVersions.getLatestPublished(id).catch(() => null);

  const update = updatePage.bind(null, id);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h1 style={{ fontSize: "1.4rem", fontWeight: 700 }}>{page.title}</h1>
        <DeleteButton action={deletePage.bind(null, id)} />
      </div>

      {/* Publish banner */}
      <div className="card" style={{ marginBottom: 20, display: "flex", alignItems: "center",
        justifyContent: "space-between", gap: 16 }}>
        <div>
          <p style={{ margin: 0, fontSize: "0.85rem", fontWeight: 600 }}>
            {publishedVersion
              ? `Published — v${publishedVersion.version} on ${new Date(publishedVersion.publishedAt!).toLocaleDateString()}`
              : "Not published yet"}
          </p>
          {latestVersion && (
            <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "var(--text-muted)" }}>
              Latest draft: v{latestVersion.version}
            </p>
          )}
        </div>
        <form action={publishPage.bind(null, id)}>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={!latestVersion}
            style={{ whiteSpace: "nowrap" }}
          >
            🚀 Publish Page
          </button>
        </form>
      </div>

      {/* Settings form */}
      <form action={update}>
        <FormCard>
          {/* Basic */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Title <span style={{ color: "red" }}>*</span></label>
              <input name="title" className="form-control" defaultValue={page.title} required />
            </div>
            <div className="form-group">
              <label className="form-label">Slug <span style={{ color: "red" }}>*</span></label>
              <input name="slug" className="form-control" defaultValue={page.slug} required />
            </div>
          </div>

          <div className="form-row">
            <SelectField
              label="Area"
              name="area"
              defaultValue={page.area}
              options={areas.map((a) => ({ value: a.name, label: a.displayName || a.name }))}
            />
            <SelectField
              label="Status"
              name="status"
              defaultValue={page.status}
              options={[
                { value: "draft",     label: "Draft" },
                { value: "published", label: "Published" },
                { value: "archived",  label: "Archived" },
              ]}
            />
          </div>

          {/* Parent page */}
          <div className="form-group">
            <label className="form-label">Parent page</label>
            <select name="parentId" className="form-control" defaultValue={page.parentId ?? ""}>
              <option value="">— None (top level) —</option>
              {allPages.filter((p) => p.id !== id).map((p) => (
                <option key={p.id} value={p.id}>{p.title} (/{p.slug})</option>
              ))}
            </select>
          </div>

          {/* SEO */}
          <p style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase",
            letterSpacing: "0.06em", color: "var(--text-muted)", marginTop: 8 }}>
            SEO
          </p>
          <Field label="Meta title" name="seoTitle"
            defaultValue={page.seo?.metaTitle ?? page.seoTitle ?? ""} />
          <TextareaField label="Meta description" name="seoDescription" rows={2}
            defaultValue={page.seo?.metaDescription ?? page.seoDescription ?? ""} />
          <Field label="Keywords" name="keywords"
            defaultValue={page.seo?.keywords ?? ""} hint="Comma-separated" />

          {/* OG Image */}
          <div className="form-group">
            <label className="form-label">OG Image URL</label>
            <input name="ogImageUrl" className="form-control"
              defaultValue={page.ogImageUrl ?? ""} placeholder="https://…" />
          </div>

          <button type="submit" className="btn btn-primary" style={{ marginTop: 8 }}>
            💾 Save Settings
          </button>
        </FormCard>
      </form>
    </div>
  );
}
