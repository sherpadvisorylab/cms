import { cms } from "@/lib/cms";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await cms.settings.get();
    const content = settings?.seo?.llmsTxt?.trim();
    if (!content) return new Response(null, { status: 404 });
    return new Response(content, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
