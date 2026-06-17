import { unstable_cache } from "next/cache";
import { cms } from "@/lib/cms";
import { buildPageCanonicalUrl } from "@/lib/canonicalUrl";

function normalizeSiteUrl(url: string | undefined | null): string {
  return (url ?? "").replace(/\/+$/, "");
}

function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "";
  try { return new Date(d).toISOString(); } catch { return ""; }
}

function escapeXml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/'/g, "&apos;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildEmptySitemap(): string {
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`,
  ].join("\n");
}

const buildSitemap = unstable_cache(
  async (): Promise<string> => {
    const [pages, areas, settings] = await Promise.all([
      cms.pages.findAll(),
      cms.areas.findAll(),
      cms.settings.get(),
    ]);

    const seo = settings?.seo as Record<string, unknown> | undefined;
    const branding = settings?.branding as Record<string, unknown> | undefined;
    const baseUrl = normalizeSiteUrl(
      (seo?.canonicalHost as string | undefined) || (branding?.siteUrl as string | undefined)
    );

    if (!baseUrl) return buildEmptySitemap();

    const areaMap = new Map(areas.map((a) => [a.name, a]));
    const published = pages.filter(
      (p) => p.status === "published" && p.permalink && p.permalink !== "404" && p.permalink !== "/404"
    );

    const byKey = new Map<string, typeof published>();
    for (const page of published) {
      const key = (page.translationKey as string | undefined) || page.id;
      if (!byKey.has(key)) byKey.set(key, []);
      byKey.get(key)!.push(page);
    }

    const entries: string[] = [];

    for (const group of byKey.values()) {
      const area = areaMap.get(group[0].area as string);
      const areaRootPath = (area?.rootPath as string | undefined) ?? "/";
      const defaultLocale = (area?.defaultLocale as string | undefined) ?? "";

      const envDefaultLocale = process.env.SHERPA_DEFAULT_LOCALE ?? "";
      const hreflangs = group
        .map((p) => ({
          locale: (p.locale as string | undefined) || defaultLocale || envDefaultLocale,
          loc: buildPageCanonicalUrl({
            siteUrl: baseUrl,
            permalink: p.permalink as string,
            locale: (p.locale as string | undefined) ?? "",
            defaultLocale,
            areaRootPath,
          }),
        }))
        .filter((h) => h.locale !== "");

      for (const page of group) {
        const pageLoc = buildPageCanonicalUrl({
          siteUrl: baseUrl,
          permalink: page.permalink as string,
          locale: (page.locale as string | undefined) ?? "",
          defaultLocale,
          areaRootPath,
        });

        const lastmod = formatDate(page.updatedAt);

        let xml = `  <url>\n    <loc>${escapeXml(pageLoc)}</loc>\n`;
        if (lastmod) xml += `    <lastmod>${lastmod}</lastmod>\n`;

        if (hreflangs.length > 1) {
          for (const { locale, loc } of hreflangs) {
            xml += `    <xhtml:link rel="alternate" hreflang="${escapeXml(locale)}" href="${escapeXml(loc)}"/>\n`;
          }
          const def = hreflangs.find((h) => h.locale === defaultLocale) ?? hreflangs[0];
          xml += `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(def.loc)}"/>\n`;
        }

        xml += `  </url>`;
        entries.push(xml);
      }
    }

    return [
      `<?xml version="1.0" encoding="UTF-8"?>`,
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"`,
      `        xmlns:xhtml="http://www.w3.org/1999/xhtml">`,
      ...entries,
      `</urlset>`,
    ].join("\n");
  },
  ["sitemap-xml"],
  { tags: ["pages", "sitemap"], revalidate: false },
);

export async function GET() {
  try {
    const xml = await buildSitemap();
    return new Response(xml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    });
  } catch {
    return new Response(buildEmptySitemap(), {
      status: 200,
      headers: { "Content-Type": "application/xml; charset=utf-8" },
    });
  }
}
