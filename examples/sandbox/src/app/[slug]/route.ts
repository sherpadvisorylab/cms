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

/**
 * Public CMS page renderer — returns full HTML from the area's head/body templates.
 * Published pages are served from Next.js cache (ISR); invalidated on publish via revalidateTag.
 * Draft preview bypasses cache and requires an authenticated admin session.
 *
 * GET /[slug]          → published page (cached)
 * GET /[slug]?draft=1  → draft preview — requires admin session
 */
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

  // Draft: always fresh from DB, no cache.
  // Published: served from Next.js cache, invalidated on publish via revalidateTag.
  const html = isDraft
    ? await cms.renderPage(areaName, slug, { draft: true }).catch(() => null)
    : await renderPageCached(areaName, slug).catch(() => null);

  if (!html) {
    const notFound = isDraft
      ? (await cms.renderSystemPage(areaName, "404").catch(() => null) ?? await cms.renderPage(areaName, "404", {}).catch(() => null))
      : await render404Cached(areaName).catch(() => null);
    return new Response(
      notFound ?? `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:40px"><h2>404 — Page not found</h2><p>/${slug}</p></body></html>`,
      { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }

  const draftBanner = isDraft
    ? `<script>
        var b=document.createElement('div');
        b.style.cssText='position:fixed;top:0;left:0;right:0;z-index:9999;background:#fef3c7;color:#92400e;padding:6px 16px;font-size:13px;font-weight:600;text-align:center;border-bottom:1px solid #fcd34d;font-family:sans-serif';
        b.textContent='DRAFT PREVIEW — not published';
        document.body.prepend(b);
        document.body.style.marginTop='33px';
      </script>`
    : "";

  const finalHtml = html.replace("</body>", `${draftBanner}</body>`);

  return new Response(finalHtml, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      ...(isDraft && { "Cache-Control": "no-store" }),
    },
  });
}
