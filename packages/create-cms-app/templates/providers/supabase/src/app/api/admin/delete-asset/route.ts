import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "cms-assets";

export async function DELETE(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let name: string;
  try {
    const body = await req.json() as { name?: string };
    if (!body.name) throw new Error("missing");
    name = body.name;
  } catch {
    return Response.json({ error: "Missing asset name" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.storage.from(BUCKET).remove([name]);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true });
}
