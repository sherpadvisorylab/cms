import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "cms-assets";
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_VIDEO_SIZE = 100 * 1024 * 1024;
const MAX_FILE_SIZE = 25 * 1024 * 1024;

function slugifyFilename(name: string): string {
  const dotIdx = name.lastIndexOf(".");
  const ext = dotIdx >= 0 ? name.slice(dotIdx + 1).toLowerCase() : "";
  const base = dotIdx >= 0 ? name.slice(0, dotIdx) : name;
  const slug = base
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "file";
  return ext ? `${slug}.${ext}` : slug;
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let file: File;
  let requestedName: string | null = null;

  try {
    const form = await req.formData();
    const candidate = form.get("file");
    if (!(candidate instanceof File)) {
      return Response.json({ error: "No file provided" }, { status: 400 });
    }

    file = candidate;
    const filename = form.get("filename");
    if (typeof filename === "string" && filename.trim()) {
      requestedName = filename.trim();
    }
  } catch {
    return Response.json({ error: "Invalid form data" }, { status: 400 });
  }

  const isImage = file.type.startsWith("image/");
  const isVideo = file.type.startsWith("video/");
  const maxSize = isVideo ? MAX_VIDEO_SIZE : isImage ? MAX_IMAGE_SIZE : MAX_FILE_SIZE;

  if (file.size > maxSize) {
    return Response.json(
      { error: `File too large (max ${isVideo ? "100" : isImage ? "10" : "25"} MB)` },
      { status: 400 },
    );
  }

  const safeName = /^[a-z0-9][a-z0-9-]*(\.[a-z0-9]+)?$/;
  const path = requestedName && safeName.test(requestedName)
    ? requestedName
    : slugifyFilename(file.name);

  const admin = createAdminClient();
  const { error } = await admin.storage
    .from(BUCKET)
    .upload(path, await file.arrayBuffer(), {
      contentType: file.type || "application/octet-stream",
      upsert: true,
    });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ url: `/assets/${path}` });
}
