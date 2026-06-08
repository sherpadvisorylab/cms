import { cms } from "@/lib/cms";
import Link from "next/link";
import { PagesTable } from "./PagesTable";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { NewPageButton } from "@/components/admin/NewPageButton";
import { buildAdminMetadata } from "@/lib/adminMetadata";

export const metadata = buildAdminMetadata(
  "Pages",
  "Browse, filter, and manage the pages published through the CMS.",
);

interface SearchParams { area?: string; q?: string; }

export default async function PagesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { area = "", q = "" } = await searchParams;

  const [pages, areas] = await Promise.all([
    cms.pages.findAll(),
    cms.areas.findAll(),
  ]);

  // Build map of pageId → system page type from all areas
  const systemPageMap: Record<string, string> = {};
  for (const area of areas) {
    if (area.systemPages) {
      for (const [type, pageId] of Object.entries(area.systemPages)) {
        systemPageMap[pageId] = type;
      }
    }
  }
  const pageVersionData = await Promise.all(
    pages.map(async (page) => {
      const [latestVersion, publishedVersion] = await Promise.all([
        cms.pageVersions.getLatest(page.id).catch(() => null),
        page.status === "published"
          ? cms.pageVersions.getLatestPublished(page.id).catch(() => null)
          : Promise.resolve(null),
      ]);
      return {
        pageId: page.id,
        publishedVersionNumber: publishedVersion?.version ?? null,
        structure: latestVersion?.structure ?? page.structure ?? [],
      };
    }),
  );
  const pagesWithPublishedVersion = pages.map((page) => {
    const vd = pageVersionData.find((v) => v.pageId === page.id);
    return {
      ...page,
      publishedVersionNumber: vd?.publishedVersionNumber ?? null,
      componentCount: vd?.structure.length ?? 0,
      linkedComponentCount: vd?.structure.filter((s) => !!s.linkedFrom).length ?? 0,
    };
  });

  const total     = pages.length;
  const published = pages.filter((p) => p.status === "published").length;
  const drafts    = pages.filter((p) => p.status === "draft").length;
  const archived  = pages.filter((p) => p.status === "archived").length;

  const areaNames = [...new Set(pages.map((p) => p.area))];

  return (
    <div>
      <AdminPageHeader
        title="Pages"
        actions={<NewPageButton />}
      />

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Total",     value: total,     color: "var(--text)" },
          { label: "Published", value: published, color: "var(--success)" },
          { label: "Drafts",    value: drafts,    color: "var(--warning)" },
          { label: "Archived",  value: archived,  color: "var(--text-muted)" },
        ].map((s) => (
          <div key={s.label} className="card" style={{ textAlign: "center", padding: "14px 8px" }}>
            <div style={{ fontSize: "1.8rem", fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters + Search */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        {/* Area filter badges */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {["", ...areaNames].map((a) => {
            const label    = a === "" ? "All" : (areas.find((x) => x.name === a)?.displayName ?? a);
            const isActive = area === a;
            return (
              <Link
                key={a}
                href={`/admin/pages?area=${encodeURIComponent(a)}&q=${encodeURIComponent(q)}`}
                style={{
                  padding: "5px 14px", borderRadius: 999, fontSize: "0.82rem", fontWeight: 600,
                  textDecoration: "none", transition: "all 0.12s",
                  background: isActive ? "var(--primary)" : "var(--bg-light)",
                  color:      isActive ? "white"          : "var(--text-muted)",
                  border:     `1px solid ${isActive ? "var(--primary)" : "var(--border)"}`,
                }}
              >
                {label}
              </Link>
            );
          })}
        </div>

        {/* Search */}
        <form style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          <input type="hidden" name="area" value={area} />
          <input
            name="q"
            className="form-control"
            placeholder="Search pages…"
            defaultValue={q}
            style={{ width: 200 }}
          />
          <button type="submit" className="btn btn-secondary btn-sm">Search</button>
          {q && (
            <Link href={`/admin/pages?area=${encodeURIComponent(area)}`}
              className="btn btn-secondary btn-sm">✕</Link>
          )}
        </form>
      </div>

      {/* Table */}
      <PagesTable pages={pagesWithPublishedVersion} areas={areas} search={q} areaFilter={area} systemPageMap={systemPageMap} />
    </div>
  );
}
