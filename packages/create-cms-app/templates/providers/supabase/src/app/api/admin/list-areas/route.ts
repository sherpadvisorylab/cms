import { createClient } from "@/lib/supabase/server";
import { cms } from "@/lib/cms";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const areas = await cms.areas.findAll().catch(() => []);
  return Response.json({
    areas: areas.map((a) => ({ name: a.name, displayName: a.displayName || a.name })),
  });
}
