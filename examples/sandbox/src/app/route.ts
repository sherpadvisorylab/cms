import { cms } from "@/lib/cms";
import { getPrimaryPublicAreaName } from "@/lib/publicPageResolver";
import { normalizePermalink } from "@/lib/pagePermalinks";
import { unstable_cache } from "next/cache";

type PublishedPage = Awaited<ReturnType<typeof cms.pages.findAll>>[number];

// Multiple published pages can share a permalink as locale variants of the same logical
// page (e.g. Home served at "/" in every language, disambiguated by the locale prefix at
// the URL level, not by permalink) — prefer the exact locale match, then the locale-less
// variant, then just the first, mirroring PageRepository.findByPermalink.
function findLocaleAwarePage(pages: PublishedPage[], permalink: string, locale?: string) {
  const normalized = normalizePermalink(permalink);
  const matches = pages.filter(
    (page) => normalizePermalink(page.permalink ?? page.slug) === normalized,
  );
  if (matches.length <= 1) return matches[0];
  if (locale) {
    const exact = matches.find((page) => page.locale === locale);
    if (exact) return exact;
  }
  return matches.find((page) => !page.locale) ?? matches[0];
}

function renderHomeCached(areaName: string) {
  return unstable_cache(
    async () => {
      const systemHtml = await cms.renderSystemPage(areaName, "home").catch(() => null);
      if (systemHtml) return systemHtml;

      const pages = await cms.pages.findAll(areaName).catch(() => []);
      const published = pages.filter((page) => page.status === "published");
      const candidate = ["/", "/home", "/index", "", "home", "index"]
        .map((permalink) => findLocaleAwarePage(published, permalink))
        .find(Boolean);

      return candidate
        ? cms.renderPage(areaName, normalizePermalink(candidate.permalink ?? candidate.slug), {})
            .catch(() => null)
        : null;
    },
    [`render:${areaName}:home`],
    { revalidate: false, tags: ["home-page", "pages"] },
  )();
}

export async function GET() {
  const areaName = await getPrimaryPublicAreaName();
  const html = await renderHomeCached(areaName);

  if (!html) {
    return Response.redirect("/admin/pages", 302);
  }

  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
