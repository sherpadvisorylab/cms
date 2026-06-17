import { cms } from "@/lib/cms";
import { initAdmin } from "@/lib/firebase/admin";
import { getAuth } from "firebase-admin/auth";
import { getPrimaryPublicAreaName } from "@/lib/publicPageResolver";
import { normalizePermalink } from "@/lib/pagePermalinks";
import { unstable_cache } from "next/cache";
import { isDevModeActive } from "@/lib/devMode";

initAdmin();

function renderPageCached(areaName: string, permalink: string) {
  const normalizedPermalink = normalizePermalink(permalink);
  return unstable_cache(
    async () => {
      const html = await cms.renderPage(areaName, normalizedPermalink, {});
      if (!html) throw new Error("Page not found: " + normalizedPermalink);
      return html;
    },
    [`render:${areaName}:${normalizedPermalink}`],
    { revalidate: false, tags: [`page:${normalizedPermalink}`, "pages"] },
  )().catch(() => null);
}

function render404Cached(areaName: string) {
  return unstable_cache(
    () =>
      cms.renderSystemPage(areaName, "404").then(
        (html) => html ?? cms.renderPage(areaName, "/404", {}),
      ),
    [`render:${areaName}:404`],
    { revalidate: false, tags: ["page:/404", "pages"] },
  )();
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ permalink: string[] }> },
) {
  const { permalink } = await params;
  const normalizedPermalink = normalizePermalink(`/${(permalink ?? []).join("/")}`);
  const { searchParams } = new URL(request.url);
  const isDraft = searchParams.get("draft") === "1";

  if (isDraft) {
    const session = request.headers.get("cookie")?.match(/__session=([^;]+)/)?.[1];
    if (!session) return new Response("Unauthorized", { status: 401 });
    try {
      await getAuth().verifySessionCookie(session, true);
    } catch {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  const areaName = await getPrimaryPublicAreaName();
  const devMode = isDevModeActive();
  const bypassCache = isDraft || devMode;

  if (!isDraft) {
    const area = await cms.areas.findByKey(areaName).catch(() => null);
    if (area?.systemPages) {
      const allPages = await cms.pages.findAll(areaName).catch(() => []);
      const isSystemPermalink = Object.values(area.systemPages).some((pageId) => {
        const page = allPages.find((entry) => entry.id === pageId);
        return normalizePermalink(page?.permalink ?? page?.slug) === normalizedPermalink;
      });
      if (isSystemPermalink) {
        const notFound = devMode
          ? await cms.renderSystemPage(areaName, "404").then((h) => h ?? cms.renderPage(areaName, "/404", {}))
          : await render404Cached(areaName);
        return new Response(notFound ?? "<h1>404 Not Found</h1>", {
          status: 404,
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            ...(devMode && { "Cache-Control": "no-store, no-cache" }),
          },
        });
      }
    }
  }

  const html = bypassCache
    ? await cms.renderPage(areaName, normalizedPermalink, { draft: isDraft })
    : await renderPageCached(areaName, normalizedPermalink);

  if (!html) {
    const collectionHtml = await cms.renderCollectionDetailPage(areaName, normalizedPermalink, {
      draft: isDraft,
      searchParams: Object.fromEntries(new URL(request.url).searchParams),
    });
    if (collectionHtml) {
      return new Response(collectionHtml, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          ...(bypassCache && { "Cache-Control": "no-store, no-cache" }),
        },
      });
    }

    const notFound = bypassCache
      ? (await cms.renderSystemPage(areaName, "404") ?? await cms.renderPage(areaName, "/404", {}))
      : await render404Cached(areaName);
    return new Response(notFound ?? "<h1>404 Not Found</h1>", {
      status: 404,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        ...(bypassCache && { "Cache-Control": "no-store, no-cache" }),
      },
    });
  }

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      ...(bypassCache && { "Cache-Control": "no-store, no-cache" }),
    },
  });
}
