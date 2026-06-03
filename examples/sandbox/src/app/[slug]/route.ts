import { cms } from "@/lib/cms";
import { createClient } from "@/lib/supabase/server";
import { getPrimaryPublicAreaName } from "@/lib/publicPageResolver";
import { unstable_cache } from "next/cache";

function renderPageCached(areaName: string, slug: string) {
  return unstable_cache(
    () => cms.renderPage(areaName, slug, {}),
    [`render:${areaName}:${slug}`],
    { revalidate: false, tags: [`page:${slug}`, "pages"] },
  )();
}

function render404Cached(areaName: string) {
  return unstable_cache(
    () => cms.renderSystemPage(areaName, "404")
      .then(html => html ?? cms.renderPage(areaName, "404", {})),
    [`render:${areaName}:404`],
    { revalidate: false, tags: ["page:404", "pages"] },
  )();
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const { searchParams } = new URL(request.url);
  const isDraft = searchParams.get("draft") === "1";

  if (isDraft) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response("Unauthorized", { status: 401 });
  }

  const areaName = await getPrimaryPublicAreaName();

  // System page slugs return 404 — slug is no longer a valid public URL
  // (SYSTEM_PAGE_RULES.oldSlugReturns404)
  if (!isDraft) {
    const area = await cms.areas.findByKey(areaName).catch(() => null);
    if (area?.systemPages) {
      const allPages = await cms.pages.findAll(areaName).catch(() => []);
      const isSystemSlug = Object.values(area.systemPages).some((pageId) =>
        allPages.find((p) => p.id === pageId)?.slug === slug,
      );
      if (isSystemSlug) {
        const notFound = await render404Cached(areaName).catch(() => null);
        return new Response(
          notFound ?? `<!DOCTYPE html><html><body><h2>404 — Not found</h2></body></html>`,
          { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } },
        );
      }
    }
  }

  // Draft: always fresh from Firestore, no cache.
  // Published: served from Next.js cache, invalidated on publish via revalidateTag.
  const html = isDraft
    ? await cms.renderPage(areaName, slug, { draft: true })
    : await renderPageCached(areaName, slug);

  if (!html) {
    const notFound = isDraft
      ? (await cms.renderSystemPage(areaName, "404") ?? await cms.renderPage(areaName, "404", {}))
      : await render404Cached(areaName);
    return new Response(notFound ?? "<h1>404 Not Found</h1>", {
      status: 404,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      ...(isDraft && { "Cache-Control": "no-store" }),
    },
  });
}
