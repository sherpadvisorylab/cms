import { cms } from "@/lib/cms";
import { initAdmin } from "@/lib/firebase/admin";
import { getAuth } from "firebase-admin/auth";
import { getPrimaryPublicAreaName } from "@/lib/publicPageResolver";

initAdmin();

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
  const html = await cms.renderPage(areaName, slug, { draft: isDraft });

  if (!html) {
    const notFound = await cms.renderPage(areaName, "404", {});
    return new Response(notFound ?? "<h1>404 Not Found</h1>", {
      status: 404,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": isDraft
        ? "no-store"
        : "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
