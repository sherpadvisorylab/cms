import { NextResponse } from "next/server";
import { cms } from "@/lib/cms";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [allPages, version, components, publishedVersion] = await Promise.all([
    cms.pages.findAll(),
    cms.pageVersions.getLatest(id),
    cms.components.findAll(),
    cms.pageVersions.getLatestPublished(id).catch(() => null),
  ]);

  const page = allPages.find((p) => p.id === id);
  if (!page) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    pageTitle:   page.title,
    pageSlug:    page.slug,
    isPublished: page.status === "published" && !!publishedVersion,
    latestVersionId: version?.id ?? null,
    latestVersionNumber: version?.version ?? null,
    publishedVersionId: publishedVersion?.id ?? null,
    publishedVersionNumber: publishedVersion?.version ?? null,
    structure:   version?.structure ?? [],
    components: components.map((c) => ({
      id:        c.id,
      name:      c.name,
      namespace: c.namespace ?? null,
      type:      c.type ?? "page",
      status:    c.status,
    })),
  });
}
