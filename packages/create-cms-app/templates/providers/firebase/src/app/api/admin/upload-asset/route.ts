import { NextResponse } from "next/server";
import { initAdmin } from "@/lib/firebase/admin";
import { getAuth } from "firebase-admin/auth";
import { getStorage } from "firebase-admin/storage";
import { randomBytes } from "crypto";

initAdmin();

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100 MB
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

export async function POST(req: Request) {
  // Auth check
  const session = req.headers.get("cookie")?.match(/__session=([^;]+)/)?.[1];
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { await getAuth().verifySessionCookie(session, true); }
  catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  let file: File;
  try {
    const form = await req.formData();
    const f = form.get("file");
    if (!f || !(f instanceof File)) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    file = f;
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const isImage = file.type.startsWith("image/");
  const isVideo = file.type.startsWith("video/");
  const maxSize = isVideo ? MAX_VIDEO_SIZE : isImage ? MAX_IMAGE_SIZE : MAX_FILE_SIZE;
  if (file.size > maxSize) {
    return NextResponse.json({ error: `File too large (max ${isVideo ? "100" : isImage ? "10" : "25"} MB)` }, { status: 400 });
  }

  const ext  = file.name.split(".").pop() ?? "bin";
  const name = `${Date.now()}-${randomBytes(6).toString("hex")}.${ext}`;

  const bucket = getStorage().bucket();
  const blob   = bucket.file(`cms-assets/${name}`);

  const buffer = Buffer.from(await file.arrayBuffer());
  await blob.save(buffer, { metadata: { contentType: file.type || "application/octet-stream" } });
  await blob.makePublic();

  const url = `https://storage.googleapis.com/${bucket.name}/cms-assets/${name}`;
  return NextResponse.json({ url });
}
