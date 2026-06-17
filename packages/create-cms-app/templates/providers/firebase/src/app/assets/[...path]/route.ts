import { initAdmin } from "@/lib/firebase/admin";
import { getStorage } from "firebase-admin/storage";

initAdmin();

/**
 * Public proxy for CMS assets. Redirects /assets/{filename} → GCS storage URL.
 * Storing relative /assets/ URLs in content makes them portable across domains
 * and storage providers (swap only this route when migrating backends).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const filePath = path.join("/");
  const bucket = getStorage().bucket();
  const gcsUrl = `https://storage.googleapis.com/${bucket.name}/cms-assets/${filePath}`;
  return Response.redirect(gcsUrl, 302);
}
