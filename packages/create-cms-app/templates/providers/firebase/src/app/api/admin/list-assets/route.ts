import { NextResponse } from "next/server";
import { initAdmin } from "@/lib/firebase/admin";
import { getAuth } from "firebase-admin/auth";
import { getStorage } from "firebase-admin/storage";

initAdmin();

export async function GET(req: Request) {
  const session = req.headers.get("cookie")?.match(/__session=([^;]+)/)?.[1];
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { await getAuth().verifySessionCookie(session, true); }
  catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  const bucket = getStorage().bucket();
  const [files] = await bucket.getFiles({ prefix: "cms-assets/" });

  const assets = files
    .filter((f) => f.name !== "cms-assets/")
    .map((f) => ({
      name:        f.name.replace("cms-assets/", ""),
      url:         `https://storage.googleapis.com/${bucket.name}/${f.name}`,
      contentType: f.metadata.contentType ?? "application/octet-stream",
      size:        Number(f.metadata.size ?? 0),
    }));

  return NextResponse.json({ assets });
}
