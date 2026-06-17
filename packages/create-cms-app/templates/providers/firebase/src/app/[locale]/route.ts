import { cms } from "@/lib/cms";
import { initAdmin } from "@/lib/firebase/admin";
import { getPrimaryPublicAreaName } from "@/lib/publicPageResolver";
import { normalizePermalink } from "@/lib/pagePermalinks";
import { unstable_cache } from "next/cache";
import { LOCALE_COOKIE } from "@/lib/i18n";
import { cookies } from "next/headers";

initAdmin();

/** Return the globally configured supported locale codes (from settings.branding.locales). */
async function getSupportedLocaleCodes(): Promise<{ codes: string[]; multiLanguageEnabled: boolean }> {
  const settings = await cms.settings.get().catch(() => null);
  const branding = settings?.branding as Record<string, unknown> | undefined;
  const multiLanguageEnabled = (branding?.multiLanguageEnabled as boolean | undefined) ?? false;
  const locales = (branding?.locales as Array<{ code: string }> | undefined) ?? [];
  return { codes: locales.map((l) => l.code), multiLanguageEnabled };
}

function renderLocaleHomeCached(areaName: string, locale: string) {
  return unstable_cache(
    async () => {
      const systemHtml = await cms.renderSystemPage(areaName, "home", { locale }).catch(() => null);
      if (systemHtml) return systemHtml;

      const pages = await cms.pages.findAll(areaName).catch(() => []);
      const published = pages.filter((p) => p.status === "published");
      const candidate = ["/", "/home", "/index", "", "home", "index"]
        .map((permalink) =>
          published.find(
            (page) => normalizePermalink(page.permalink ?? page.slug) === normalizePermalink(permalink),
          ),
        )
        .find(Boolean);

      if (!candidate) throw new Error("Home page not found");
      const html = await cms.renderPage(areaName, normalizePermalink(candidate.permalink ?? candidate.slug), { locale });
      if (!html) throw new Error("Home page not found");
      return html;
    },
    [`render:${areaName}:${locale}:home`],
    { revalidate: false, tags: ["home-page", "pages"] },
  )().catch(() => null);
}

function renderPageCached(areaName: string, permalink: string) {
  const normalizedPermalink = normalizePermalink(permalink);
  return unstable_cache(
    async () => {
      const html = await cms.renderPage(areaName, normalizedPermalink);
      if (!html) throw new Error("Page not found: " + normalizedPermalink);
      return html;
    },
    [`render:${areaName}:${normalizedPermalink}`],
    { revalidate: false, tags: [`page:${normalizedPermalink}`, "pages"] },
  )().catch(() => null);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ locale: string }> },
) {
  const { locale } = await params;
  const areaName = await getPrimaryPublicAreaName();

  // Determine if this segment is actually a supported locale code.
  const { codes: supportedLocaleCodes, multiLanguageEnabled } = await getSupportedLocaleCodes();
  const isValidLocale = multiLanguageEnabled && supportedLocaleCodes.includes(locale);

  if (!isValidLocale) {
    // ── Fallback: render as regular permalink ─────────────────────────────────
    const permalink = normalizePermalink(`/${locale}`);
    const html = await renderPageCached(areaName, permalink).catch(() => null);

    if (!html) {
      const collectionHtml = await cms.renderCollectionDetailPage(areaName, permalink, {
        searchParams: Object.fromEntries(new URL(request.url).searchParams),
      }).catch(() => null);
      if (collectionHtml) {
        return new Response(collectionHtml, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } });
      }

      const notFound = await cms.renderSystemPage(areaName, "404")
        .then((h) => h ?? cms.renderPage(areaName, "/404"))
        .catch(() => null);
      return new Response(notFound ?? "<h1>404 Not Found</h1>", {
        status: 404,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    return new Response(html, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } });
  }

  // ── Valid locale: render locale home ──────────────────────────────────────
  const html = await renderLocaleHomeCached(areaName, locale);

  if (!html) {
    return Response.redirect(new URL("/admin/pages", request.url), 302);
  }

  const cookieStore = await cookies();
  const existingLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  const response = new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });

  if (existingLocale !== locale) {
    response.headers.set(
      "Set-Cookie",
      `${LOCALE_COOKIE}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax`,
    );
  }

  return response;
}
