import { NextResponse } from "next/server";
import { cms } from "@/lib/cms";
import { normalizePermalink, resolvePagePermalink } from "@/lib/pagePermalinks";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [allPages, version, components, publishedVersion, areas] = await Promise.all([
    cms.pages.findAll(),
    cms.pageVersions.getLatest(id),
    cms.components.findAll(),
    cms.pageVersions.getLatestPublished(id).catch(() => null),
    cms.areas.findAll().catch(() => []),
  ]);

  const page = allPages.find((p) => p.id === id);
  if (!page) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Determine if this page is a system page and what type
  const pageArea = areas.find((a) => a.name === page.area);
  const systemPageType = pageArea?.systemPages
    ? (Object.entries(pageArea.systemPages).find(([, pid]) => pid === id)?.[0] ?? null)
    : null;

  const structure = version?.structure ?? [];

  // Fetch schemas for all component versions in the structure
  const componentIds = [...new Set(structure.map((s) => s.componentId))];
  const schemaMap: Record<string, unknown[]> = {};
  await Promise.all(
    componentIds.map(async (cid) => {
      const v = await cms.componentVersions.getLatest(cid).catch(() => null);
      schemaMap[cid] = v?.schema ?? [];
    })
  );

  return NextResponse.json({
    title:          page.title,
    pagePermalink:  normalizePermalink(resolvePagePermalink(page, allPages)),
    pageArea:       page.area,
    systemPageType:  systemPageType,
    isSystemPage:    !!systemPageType,
    isPublished:    page.status === "published" && !!publishedVersion,
    latestVersionId: version?.id ?? null,
    latestVersionNumber: version?.version ?? null,
    publishedVersionId: publishedVersion?.id ?? null,
    publishedVersionNumber: publishedVersion?.version ?? null,
    structure,
    componentSchemas: schemaMap,
    components: components.map((c) => ({
      id:        c.id,
      name:      c.name,
      namespace: c.namespace ?? null,
      type:      c.type ?? "page",
      status:    c.status,
    })),
  });
}
