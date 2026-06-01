import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "cms-assets";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(BUCKET)
    .list("", { limit: 500, sortBy: { column: "created_at", order: "desc" } });

  if (error) return Response.json({ error: error.message }, { status: 500 });

  const assets = (data ?? [])
    .filter((f) => f.name && !f.name.endsWith(".emptyFolderPlaceholder"))
    .map((f) => ({
      name:        f.name,
      url:         admin.storage.from(BUCKET).getPublicUrl(f.name).data.publicUrl,
      contentType: (f.metadata?.mimetype as string) ?? "application/octet-stream",
      size:        (f.metadata?.size as number) ?? 0,
    }));

  return Response.json({ assets });
}
