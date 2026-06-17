import { unstable_cache } from "next/cache";
import { cms } from "@/lib/cms";
import { initAdmin } from "@/lib/firebase/admin";
import { getStorage } from "firebase-admin/storage";

initAdmin();

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

const getFaviconUrl = unstable_cache(
  async () => {
    const settings = await cms.settings.get();
    return (settings?.branding as Record<string, unknown> | undefined)?.favicon as string | undefined;
  },
  ["favicon-url"],
  { tags: ["favicon"], revalidate: false },
);

async function fetchFromStorage(assetPath: string): Promise<{ data: ArrayBuffer; contentType: string } | null> {
  try {
    const file = getStorage().bucket().file(`cms-assets/${assetPath}`);
    const [exists] = await file.exists();
    if (!exists) return null;
    const [buffer] = await file.download();
    const [metadata] = await file.getMetadata();
    return {
      data: buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer,
      contentType: (metadata.contentType as string | undefined) ?? guessContentType(assetPath),
    };
  } catch {
    return null;
  }
}

async function fetchFromUrl(url: string): Promise<{ data: ArrayBuffer; contentType: string } | null> {
  try {
    const upstream = await fetch(url);
    if (!upstream.ok) return null;
    return {
      data: await upstream.arrayBuffer(),
      contentType: upstream.headers.get("content-type") ?? guessContentType(url),
    };
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const faviconUrl = await getFaviconUrl();
    if (!faviconUrl) return new Response(null, { status: 404 });

    let result: { data: ArrayBuffer; contentType: string } | null = null;

    if (faviconUrl.startsWith("/assets/")) {
      result = await fetchFromStorage(faviconUrl.replace(/^\/assets\//, ""));
    } else if (faviconUrl.startsWith("http://") || faviconUrl.startsWith("https://")) {
      result = await fetchFromUrl(faviconUrl);
    }

    if (!result) return new Response(null, { status: 404 });

    return new Response(result.data, {
      status: 200,
      headers: {
        "Content-Type": result.contentType,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
