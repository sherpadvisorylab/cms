import { cms } from "@/lib/cms";
import { getPrimaryPublicAreaName } from "@/lib/publicPageResolver";
import { unstable_cache } from "next/cache";

function renderHomeCached(areaName: string) {
  return unstable_cache(
    async () => {
      const systemHtml = await cms.renderSystemPage(areaName, "home").catch(() => null);
      if (systemHtml) return systemHtml;
      // Fallback: first published page with a home-like slug
      const pages = await cms.pages.findAll(areaName).catch(() => []);
      const published = pages.filter((p) => p.status === "published");
      const candidate = ["", "/", "home", "index"]
        .map((s) => published.find((p) => p.slug === s))
        .find(Boolean);
      return candidate ? cms.renderPage(areaName, candidate.slug, {}).catch(() => null) : null;
    },
    [`render:${areaName}:home`],
    { revalidate: false, tags: ["home-page", "pages"] },
  )();
}

export async function GET() {
  const areaName = await getPrimaryPublicAreaName();
  const html     = await renderHomeCached(areaName);

  // Should not happen in a seeded project — home system page is always created by seed-system-pages.ts
  if (!html) {
    return Response.redirect("/admin/pages", 302);
  }

  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
