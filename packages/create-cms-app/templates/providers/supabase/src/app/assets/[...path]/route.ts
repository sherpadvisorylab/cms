import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "cms-assets";

/**
 * Public proxy for CMS assets. Redirects /assets/{filename} → Supabase Storage URL.
 * Storing relative /assets/ URLs in content makes them portable across domains
 * and storage providers (swap only this route when migrating backends).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const filePath = path.join("/");
  const admin = createAdminClient();
  const { data } = admin.storage.from(BUCKET).getPublicUrl(filePath);
  return Response.redirect(data.publicUrl, 302);
}
