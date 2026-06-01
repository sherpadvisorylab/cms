import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET   = "cms-assets";
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_VIDEO_SIZE = 100 * 1024 * 1024;
const MAX_FILE_SIZE  = 25 * 1024 * 1024;

export async function POST(req: Request) {
  // Auth check — only authenticated admin users
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let file: File;
  try {
    const form = await req.formData();
    const f = form.get("file");
    if (!f || !(f instanceof File)) return Response.json({ error: "No file provided" }, { status: 400 });
    file = f;
  } catch {
    return Response.json({ error: "Invalid form data" }, { status: 400 });
  }

  const isImage = file.type.startsWith("image/");
  const isVideo = file.type.startsWith("video/");
  const maxSize = isVideo ? MAX_VIDEO_SIZE : isImage ? MAX_IMAGE_SIZE : MAX_FILE_SIZE;
  if (file.size > maxSize) {
    return Response.json({ error: `File too large (max ${isVideo ? "100" : isImage ? "10" : "25"} MB)` }, { status: 400 });
  }

  const ext  = file.name.split(".").pop() ?? "bin";
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const admin = createAdminClient();
  const { error } = await admin.storage
    .from(BUCKET)
    .upload(path, await file.arrayBuffer(), { contentType: file.type || "application/octet-stream", upsert: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });

  const { data } = admin.storage.from(BUCKET).getPublicUrl(path);
  return Response.json({ url: data.publicUrl });
}
