import { NextResponse } from "next/server";
import { cms } from "@/lib/cms";
import { createClient } from "@/lib/supabase/server";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Get all versions and the latest published
  const [allPages, publishedVersion] = await Promise.all([
    cms.pages.findAll(),
    cms.pageVersions.getLatestPublished(id).catch(() => null),
  ]);

  const page = allPages.find((p) => p.id === id);
  if (!page) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Fetch latest version to mark as current
  const latestVersion = await cms.pageVersions.getLatest(id).catch(() => null);

  // We don't have a findAll for versions in the CMS — use getLatest as approximation
  // and build a synthetic list from what we can access
  const versions = [];
  if (latestVersion) {
    versions.push({
      id:             latestVersion.id,
      version:        latestVersion.version,
      createdAt:      latestVersion.createdAt,
      publishedAt:    latestVersion.publishedAt ?? null,
      componentCount: Array.isArray(latestVersion.structure) ? latestVersion.structure.length : 0,
      isCurrent:      true,
      isPublished:    publishedVersion?.id === latestVersion.id,
    });
  }
  if (publishedVersion && publishedVersion.id !== latestVersion?.id) {
    versions.push({
      id:             publishedVersion.id,
      version:        publishedVersion.version,
      createdAt:      publishedVersion.createdAt,
      publishedAt:    publishedVersion.publishedAt ?? null,
      componentCount: Array.isArray(publishedVersion.structure) ? publishedVersion.structure.length : 0,
      isCurrent:      false,
      isPublished:    true,
    });
  }

  return NextResponse.json({ versions, pageSlug: page.slug, pageArea: page.area });
}
