import { cms } from "@/lib/cms";

export const dynamic = "force-dynamic";

const DEFAULT_ROBOTS = "User-agent: *\nAllow: /\n";

export async function GET() {
  try {
    const settings = await cms.settings.get();
    const content = settings?.seo?.robotsTxt?.trim() || DEFAULT_ROBOTS;
    return new Response(content, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    });
  } catch {
    return new Response(DEFAULT_ROBOTS, {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}
