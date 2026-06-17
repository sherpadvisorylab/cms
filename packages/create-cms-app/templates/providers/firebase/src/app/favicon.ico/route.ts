import { cms } from "@/lib/cms";
import { initAdmin } from "@/lib/firebase/admin";
import { getStorage } from "firebase-admin/storage";

initAdmin();

export const dynamic = "force-dynamic";

const CONTENT_TYPE_MAP: Record<string, string> = {
  ico: "image/x-icon",
  png: "image/png",
  svg: "image/svg+xml",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
};

function guessContentType(url: string): string {
  const ext = url.split("?")[0].split(".").pop()?.toLowerCase() ?? "";
  return CONTENT_TYPE_MAP[ext] ?? "image/x-icon";
}

async function fetchFromStorage(assetPath: string): Promise<Response | null> {
  try {
    const file = getStorage().bucket().file(`cms-assets/${assetPath}`);
    const [exists] = await file.exists();
    if (!exists) return null;
    const [buffer] = await file.download();
    const [metadata] = await file.getMetadata();
    const contentType = (metadata.contentType as string | undefined) ?? guessContentType(assetPath);
    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch {
    return null;
  }
}

async function fetchFromUrl(url: string): Promise<Response | null> {
  try {
    const upstream = await fetch(url, { next: { revalidate: 3600 } });
    if (!upstream.ok) return null;
    const body = await upstream.arrayBuffer();
    const contentType = upstream.headers.get("content-type") ?? guessContentType(url);
    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const settings = await cms.settings.get();
    const faviconUrl = (settings?.branding as Record<string, unknown> | undefined)?.favicon as string | undefined;

    if (!faviconUrl) {
      return new Response(null, { status: 404 });
    }

    let response: Response | null = null;

    if (faviconUrl.startsWith("/assets/")) {
      const assetPath = faviconUrl.replace(/^\/assets\//, "");
      response = await fetchFromStorage(assetPath);
    } else if (faviconUrl.startsWith("http://") || faviconUrl.startsWith("https://")) {
      response = await fetchFromUrl(faviconUrl);
    }

    return response ?? new Response(null, { status: 404 });
  } catch {
    return new Response(null, { status: 404 });
  }
}
