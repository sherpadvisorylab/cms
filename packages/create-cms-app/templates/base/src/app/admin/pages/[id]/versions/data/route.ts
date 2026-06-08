import { NextResponse } from "next/server";
import { cms } from "@/lib/cms";
import { normalizePermalink, resolvePagePermalink } from "@/lib/pagePermalinks";

type PageVersionRecord = {
  id: string;
  pageId: string;
  version: number;
  structure: unknown[];
  publishedAt: string | Date | null;
  createdAt: string | Date;
};

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [allPages, latestPublished] = await Promise.all([
    cms.pages.findAll(),
    cms.pageVersions.getLatestPublished(id).catch(() => null),
  ]);

  const page = allPages.find((p) => p.id === id);
  if (!page) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const adapter = (cms.pageVersions as unknown as {
    adapter?: {
      getAll<T>(collection: string, filter?: Partial<Record<string, unknown>>): Promise<T[]>;
    };
  }).adapter;

  if (!adapter) {
    return NextResponse.json({ error: "Version storage unavailable" }, { status: 500 });
  }

  const allVersions = await adapter.getAll<PageVersionRecord>("pageVersions", { pageId: id });
  const versions = [...allVersions]
    .sort((a, b) => b.version - a.version)
    .map((version, index) => ({
      id: version.id,
      version: version.version,
      createdAt: version.createdAt,
      publishedAt: version.publishedAt ?? null,
      componentCount: Array.isArray(version.structure) ? version.structure.length : 0,
      isCurrent: index === 0,
      isPublished: latestPublished?.id === version.id,
    }));

  return NextResponse.json({
    versions,
    pagePermalink: normalizePermalink(resolvePagePermalink(page, allPages)),
    pageArea: page.area,
  });
}
