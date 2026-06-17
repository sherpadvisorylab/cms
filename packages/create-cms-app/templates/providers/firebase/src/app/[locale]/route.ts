import { cms } from "@/lib/cms";
import { initAdmin } from "@/lib/firebase/admin";
import { getPrimaryPublicAreaName } from "@/lib/publicPageResolver";
import { normalizePermalink } from "@/lib/pagePermalinks";
import { unstable_cache } from "next/cache";
import { LOCALE_COOKIE } from "@/lib/i18n";
import { cookies } from "next/headers";

initAdmin();

function getPublicRequestUrl(request: Request): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  if (forwardedHost && forwardedProto) {
    try {
      const url = new URL(request.url);
      return `${forwardedProto}://${forwardedHost}${url.pathname}${url.search}`;
    } catch {}
  }
  return request.url;
}

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

      if (!candidate) return null; // no home page configured
      return cms.renderPage(areaName, normalizePermalink(candidate.permalink ?? candidate.slug), { locale });
      // throws on render errors (not cached); null if no output
    },
    [`render:${areaName}:${locale}:home`],
    { revalidate: false, tags: ["home-page", "pages"] },
  )();
  // resolves to string (ok) | null (not configured) | rejects (render error)
}

function renderPageCached(areaName: string, permalink: string) {
  const normalizedPermalink = normalizePermalink(permalink);
  return unstable_cache(
    () => cms.renderPage(areaName, normalizedPermalink),
    [`render:${areaName}:${normalizedPermalink}`],
    { revalidate: false, tags: [`page:${normalizedPermalink}`, "pages"] },
  )();
  // resolves to string (found) | null (not found) | rejects (render error → not cached)
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ locale: string }> },
) {
  const { locale } = await params;
  const publicUrl = getPublicRequestUrl(request);
  const areaName = await getPrimaryPublicAreaName();

  // Determine if this segment is actually a supported locale code.
  const { codes: supportedLocaleCodes, multiLanguageEnabled } = await getSupportedLocaleCodes();
  const isValidLocale = multiLanguageEnabled && supportedLocaleCodes.includes(locale);

  if (!isValidLocale) {
    // ── Fallback: render as regular permalink ─────────────────────────────────
    const permalink = normalizePermalink(`/${locale}`);

    let html: string | null;
    try {
      html = await renderPageCached(areaName, permalink);
    } catch (e) {
      console.error(`[render] ${areaName}${permalink}`, e);
      return new Response("Internal Server Error", { status: 500, headers: { "Content-Type": "text/html; charset=utf-8" } });
    }

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
  let html: string | null;
  try {
    html = await renderLocaleHomeCached(areaName, locale);
  } catch (e) {
    console.error(`[render] ${areaName} locale-home:${locale}`, e);
    return new Response("Internal Server Error", { status: 500, headers: { "Content-Type": "text/html; charset=utf-8" } });
  }

  if (!html) {
    return Response.redirect(new URL("/admin/pages", publicUrl), 302);
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
