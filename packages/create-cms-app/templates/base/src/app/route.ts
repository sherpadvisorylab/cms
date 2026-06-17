import { cms } from "@/lib/cms";
import { getPrimaryPublicAreaName } from "@/lib/publicPageResolver";
import { normalizePermalink } from "@/lib/pagePermalinks";
import { unstable_cache } from "next/cache";

function renderHomeCached(areaName: string) {
  return unstable_cache(
    async () => {
      const systemHtml = await cms.renderSystemPage(areaName, "home").catch(() => null);
      if (systemHtml) return systemHtml;

      const pages = await cms.pages.findAll(areaName).catch(() => []);
      const published = pages.filter((page) => page.status === "published");
      const candidate = ["/", "/home", "/index", "", "home", "index"]
        .map((permalink) =>
          published.find(
            (page) =>
              normalizePermalink(page.permalink ?? page.slug) === normalizePermalink(permalink),
          ),
        )
        .find(Boolean);

      if (!candidate) throw new Error("Home page not found");
      const html = await cms.renderPage(areaName, normalizePermalink(candidate.permalink ?? candidate.slug), {});
      if (!html) throw new Error("Home page not found");
      return html;
    },
    [`render:${areaName}:home`],
    { revalidate: false, tags: ["home-page", "pages"] },
  )().catch(() => null);
}

export async function GET(request: Request) {
  const areaName = await getPrimaryPublicAreaName();
  const html = await renderHomeCached(areaName);

  if (!html) {
    return Response.redirect(new URL("/admin/pages", request.url), 302);
  }

  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
