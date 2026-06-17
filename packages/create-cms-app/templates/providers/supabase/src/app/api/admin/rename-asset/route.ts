import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "cms-assets";

function slugifyFilename(name: string): string {
  const dotIdx = name.lastIndexOf(".");
  const ext = dotIdx >= 0 ? name.slice(dotIdx + 1).toLowerCase() : "";
  const base = dotIdx >= 0 ? name.slice(0, dotIdx) : name;
  const slug =
    base
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "file";
  return ext ? `${slug}.${ext}` : slug;
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { oldName?: string; newName?: string };
  const { oldName } = body;
  const newName = body.newName ? slugifyFilename(body.newName) : "";

  if (!oldName || !newName) return Response.json({ error: "Missing oldName or newName" }, { status: 400 });
  if (oldName === newName) return Response.json({ error: "Names are identical" }, { status: 400 });

  const admin = createAdminClient();

  // Check destination doesn't already exist
  const { data: existing } = await admin.storage.from(BUCKET).list("", { search: newName });
  const exists = (existing ?? []).some((f) => f.name === newName);
  if (exists) return Response.json({ error: "A file with that name already exists" }, { status: 409 });

  // Supabase Storage supports native move (rename)
  const { error } = await admin.storage.from(BUCKET).move(oldName, newName);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ url: `/assets/${newName}`, name: newName });
}
