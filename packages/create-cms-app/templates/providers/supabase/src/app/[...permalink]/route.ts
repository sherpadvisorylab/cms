import { cms } from "@/lib/cms";
import { createClient } from "@/lib/supabase/server";
import { getPrimaryPublicAreaName } from "@/lib/publicPageResolver";
import { normalizePermalink } from "@/lib/pagePermalinks";
import { unstable_cache } from "next/cache";

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

function renderPageCached(areaName: string, permalink: string) {
  const normalizedPermalink = normalizePermalink(permalink);
  return unstable_cache(
    () => cms.renderPage(areaName, normalizedPermalink, {}),
    [`render:${areaName}:${normalizedPermalink}`],
    { revalidate: false, tags: [`page:${normalizedPermalink}`, "pages"] },
  )();
  // resolves to string (found) | null (not found) | rejects (render error → not cached)
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
  const publicUrl = getPublicRequestUrl(request);
  const isDraft = searchParams.get("draft") === "1";

  if (isDraft) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  const areaName = await getPrimaryPublicAreaName();

  if (!isDraft) {
    const area = await cms.areas.findByKey(areaName).catch(() => null);
    if (area?.systemPages) {
      const allPages = await cms.pages.findAll(areaName).catch(() => []);
      const isSystemPermalink = Object.values(area.systemPages).some((pageId) => {
        const page = allPages.find((entry) => entry.id === pageId);
        return normalizePermalink(page?.permalink ?? page?.slug) === normalizedPermalink;
      });
      if (isSystemPermalink) {
        const notFound = await render404Cached(areaName).catch(() => null);
        return new Response(
          notFound ?? `<!DOCTYPE html><html><body><h2>404 - Not found</h2></body></html>`,
          { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } },
        );
      }
    }
  }

  let html: string | null;
  try {
    html = isDraft
      ? await cms.renderPage(areaName, normalizedPermalink, { draft: true })
      : await renderPageCached(areaName, normalizedPermalink);
  } catch (e) {
    console.error(`[render] ${areaName}${normalizedPermalink}`, e);
    return new Response("Internal Server Error", { status: 500, headers: { "Content-Type": "text/html; charset=utf-8" } });
  }

  if (!html) {
    const notFound = isDraft
      ? (await cms.renderSystemPage(areaName, "404") ?? await cms.renderPage(areaName, "/404", {}))
      : await render404Cached(areaName);
    return new Response(notFound ?? "<h1>404 Not Found</h1>", {
      status: 404,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      ...(isDraft && { "Cache-Control": "no-store" }),
    },
  });
}
