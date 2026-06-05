import { NextResponse } from "next/server";
import { initAdmin } from "@/lib/firebase/admin";
import { getAuth } from "firebase-admin/auth";
import { getStorage } from "firebase-admin/storage";

initAdmin();

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100 MB
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

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
  const session = req.headers.get("cookie")?.match(/__session=([^;]+)/)?.[1];
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await getAuth().verifySessionCookie(session, true);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let file: File;
  let requestedName: string | null = null;

  try {
    const form = await req.formData();
    const candidate = form.get("file");
    if (!(candidate instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    file = candidate;
    const filename = form.get("filename");
    if (typeof filename === "string" && filename.trim()) {
      requestedName = filename.trim();
    }
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const isImage = file.type.startsWith("image/");
  const isVideo = file.type.startsWith("video/");
  const maxSize = isVideo ? MAX_VIDEO_SIZE : isImage ? MAX_IMAGE_SIZE : MAX_FILE_SIZE;

  if (file.size > maxSize) {
    return NextResponse.json(
      { error: `File too large (max ${isVideo ? "100" : isImage ? "10" : "25"} MB)` },
      { status: 400 },
    );
  }

  const safeName = /^[a-z0-9][a-z0-9-]*(\.[a-z0-9]+)?$/;
  const name = requestedName && safeName.test(requestedName)
    ? requestedName
    : slugifyFilename(file.name);

  const bucket = getStorage().bucket();
  const blob = bucket.file(`cms-assets/${name}`);

  const buffer = Buffer.from(await file.arrayBuffer());
  await blob.save(buffer, {
    metadata: {
      contentType: file.type || "application/octet-stream",
    },
  });
  await blob.makePublic();

  const url = `https://storage.googleapis.com/${bucket.name}/cms-assets/${name}`;
  return NextResponse.json({ url });
}
