import { cms } from "@/lib/cms";
import { getPrimaryPublicAreaName } from "@/lib/publicPageResolver";
import { normalizePermalink } from "@/lib/pagePermalinks";
import { unstable_cache } from "next/cache";

/** Return the globally configured supported locale codes (from settings.branding.locales). */
async function getSupportedLocaleCodes(): Promise<{ codes: string[]; multiLanguageEnabled: boolean }> {
  const settings = await cms.settings.get().catch(() => null);
  const branding = settings?.branding as Record<string, unknown> | undefined;
  const multiLanguageEnabled = (branding?.multiLanguageEnabled as boolean | undefined) ?? false;
  const locales = (branding?.locales as Array<{ code: string }> | undefined) ?? [];
  return { codes: locales.map((l) => l.code), multiLanguageEnabled };
}

function renderPageCached(areaName: string, permalink: string, locale?: string) {
  const normalizedPermalink = normalizePermalink(permalink);
  const cacheKey = locale
    ? `render:${areaName}:${locale}:${normalizedPermalink}`
    : `render:${areaName}:${normalizedPermalink}`;
  return unstable_cache(
    async () => {
      const html = await cms.renderPage(areaName, normalizedPermalink, locale ? { locale } : undefined);
      if (!html) throw new Error("Page not found: " + normalizedPermalink);
      return html;
    },
    [cacheKey],
    { revalidate: false, tags: [`page:${normalizedPermalink}`, "pages"] },
  )().catch(() => null);
}

function render404Cached(areaName: string, locale?: string) {
  const cacheKey = locale ? `render:${areaName}:${locale}:404` : `render:${areaName}:404`;
  return unstable_cache(
    () =>
      cms.renderSystemPage(areaName, "404", locale ? { locale } : undefined).then(
        (html) => html ?? cms.renderPage(areaName, "/404", locale ? { locale } : undefined),
      ),
    [cacheKey],
    { revalidate: false, tags: ["page:/404", "pages"] },
  )();
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ locale: string; permalink: string[] }> },
) {
  const { locale, permalink } = await params;
  const areaName = await getPrimaryPublicAreaName();

  // Determine if the first path segment is actually a supported locale code.
  const { codes: supportedLocaleCodes, multiLanguageEnabled } = await getSupportedLocaleCodes();
  const isValidLocale = multiLanguageEnabled && supportedLocaleCodes.includes(locale);

  if (!isValidLocale) {
    // ── Fallback: concatenate segments and render as plain permalink ───────────
    const fullPath = normalizePermalink(`/${locale}/${(permalink ?? []).join("/")}`);

    const html = await renderPageCached(areaName, fullPath).catch(() => null);

    if (!html) {
      const collectionHtml = await cms.renderCollectionDetailPage(areaName, fullPath, {
        searchParams: Object.fromEntries(new URL(request.url).searchParams),
      }).catch(() => null);
      if (collectionHtml) {
        return new Response(collectionHtml, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } });
      }

      const notFound = await render404Cached(areaName).catch(() => null);
      return new Response(notFound ?? "<h1>404 Not Found</h1>", {
        status: 404,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    return new Response(html, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } });
  }

  // ── Valid locale: render locale-aware page ────────────────────────────────
  const normalizedPermalink = normalizePermalink(`/${(permalink ?? []).join("/")}`);

  const html = await renderPageCached(areaName, normalizedPermalink, locale).catch(() => null);

  if (!html) {
    const collectionHtml = await cms.renderCollectionDetailPage(areaName, normalizedPermalink, {
      locale,
      searchParams: Object.fromEntries(new URL(request.url).searchParams),
    }).catch(() => null);
    if (collectionHtml) {
      return new Response(collectionHtml, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } });
    }

    const notFound = await render404Cached(areaName, locale).catch(() => null);
    return new Response(notFound ?? "<h1>404 Not Found</h1>", {
      status: 404,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
