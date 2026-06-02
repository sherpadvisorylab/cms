import { cms } from "@/lib/cms";
import { createClient } from "@/lib/supabase/server";
import { getPrimaryPublicAreaName } from "@/lib/publicPageResolver";

/**
 * Public CMS page renderer — returns full HTML from the area's head/body templates.
 * This Route Handler bypasses Next.js layout so the CMS controls the entire HTML document.
 *
 * GET /[slug]          → published page (renderPage)
 * GET /[slug]?draft=1  → draft preview — requires admin session
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const { searchParams } = new URL(request.url);
  const isDraft = searchParams.get("draft") === "1";

  // Draft preview requires an authenticated admin session
  if (isDraft) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  const areaName = await getPrimaryPublicAreaName();
  const html = await cms.renderPage(areaName, slug, { draft: isDraft }).catch(() => null);

  if (!html) {
    return new Response(
      `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:40px">
        <h2>404 — Page not found</h2><p>/${slug}</p>
      </body></html>`,
      { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }

  // Draft: add a visible banner at the top via JS injection
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
      // Cache published pages for 1 hour; revalidate in background
      ...(isDraft
        ? { "Cache-Control": "no-store" }
        : { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" }),
    },
  });
}
