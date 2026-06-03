import { cms } from "@/lib/cms";
import { getPrimaryPublicAreaName } from "@/lib/publicPageResolver";
import { unstable_cache } from "next/cache";

/**
 * Root Route Handler — serves the system "home" page at /.
 * Bypasses Next.js layout to return the full CMS-rendered HTML document
 * (including area body template, navigation embeds, CSS/JS), identical
 * to how [slug]/route.ts renders all other public pages.
 */
function renderHomeCached(areaName: string) {
  return unstable_cache(
    async () => {
      // Prefer system page "home" if assigned
      const systemHtml = await cms.renderSystemPage(areaName, "home").catch(() => null);
      if (systemHtml) return systemHtml;
      // Fallback: find first published page with a home-like slug
      const pages = await cms.pages.findAll(areaName).catch(() => []);
      const published = pages.filter((p) => p.status === "published");
      const candidate = ["", "/", "home", "index"]
        .map((s) => published.find((p) => p.slug === s))
        .find(Boolean);
      return candidate ? cms.renderPage(areaName, candidate.slug, {}) : null;
    },
    [`render:${areaName}:home`],
    { revalidate: false, tags: ["home-page", "pages"] },
  )();
}

export async function GET() {
  const areaName = await getPrimaryPublicAreaName();
  const html = await renderHomeCached(areaName);

  if (!html) {
    return new Response(
      `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:40px">
        <h2>No homepage configured yet</h2>
        <p>Create a page and assign it as the Home system page in the CMS admin.</p>
        <p><a href="/admin">Open Admin</a></p>
      </body></html>`,
      { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }

  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
