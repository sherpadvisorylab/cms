import { cms } from "@/lib/cms";
import { initAdmin } from "@/lib/firebase/admin";
import { getAuth } from "firebase-admin/auth";
import { getPrimaryPublicAreaName } from "@/lib/publicPageResolver";
import { unstable_cache } from "next/cache";

initAdmin();

function renderPageCached(areaName: string, slug: string) {
  return unstable_cache(
    () => cms.renderPage(areaName, slug, {}),
    [`render:${areaName}:${slug}`],
    { revalidate: false, tags: [`page:${slug}`, "pages"] },
  )();
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const { searchParams } = new URL(request.url);
  const isDraft = searchParams.get("draft") === "1";

  if (isDraft) {
    const session = request.headers.get("cookie")?.match(/__session=([^;]+)/)?.[1];
    if (!session) return new Response("Unauthorized", { status: 401 });
    try { await getAuth().verifySessionCookie(session, true); }
    catch { return new Response("Unauthorized", { status: 401 }); }
  }

  const areaName = await getPrimaryPublicAreaName();

  // Draft: always fresh from Firestore, no cache.
  // Published: served from Next.js cache, invalidated on publish via revalidateTag.
  const html = isDraft
    ? await cms.renderPage(areaName, slug, { draft: true })
    : await renderPageCached(areaName, slug);

  if (!html) {
    const notFound = isDraft
      ? await cms.renderPage(areaName, "404", {})
      : await renderPageCached(areaName, "404");
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
