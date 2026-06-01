import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "cms-assets";

export async function DELETE(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let url: string;
  try {
    const body = await req.json() as { url?: string };
    if (!body.url) throw new Error("missing");
    url = body.url;
  } catch {
    return Response.json({ error: "Missing asset URL" }, { status: 400 });
  }

  // Extract file path from public URL:
  // https://<ref>.supabase.co/storage/v1/object/public/cms-assets/<path>
  const match = url.match(/\/storage\/v1\/object\/public\/cms-assets\/(.+)$/);
  if (!match) return Response.json({ error: "Invalid asset URL" }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin.storage.from(BUCKET).remove([match[1]]);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true });
}
