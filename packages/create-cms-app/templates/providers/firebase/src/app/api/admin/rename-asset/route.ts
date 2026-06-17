import { NextResponse } from "next/server";
import { initAdmin } from "@/lib/firebase/admin";
import { getAuth } from "firebase-admin/auth";
import { getStorage } from "firebase-admin/storage";

initAdmin();

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
  const session = req.headers.get("cookie")?.match(/__session=([^;]+)/)?.[1];
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { await getAuth().verifySessionCookie(session, true); }
  catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  const body = await req.json() as { oldName?: string; newName?: string };
  const { oldName } = body;
  const newName = body.newName ? slugifyFilename(body.newName) : "";

  if (!oldName || !newName) return NextResponse.json({ error: "Missing oldName or newName" }, { status: 400 });
  if (oldName === newName) return NextResponse.json({ error: "Names are identical" }, { status: 400 });

  const bucket = getStorage().bucket();
  const src = bucket.file(`cms-assets/${oldName}`);
  const dst = bucket.file(`cms-assets/${newName}`);

  const [srcExists] = await src.exists();
  if (!srcExists) return NextResponse.json({ error: "Source file not found" }, { status: 404 });

  const [dstExists] = await dst.exists();
  if (dstExists) return NextResponse.json({ error: "A file with that name already exists" }, { status: 409 });

  await src.copy(dst);
  await dst.makePublic();
  await src.delete();

  return NextResponse.json({ url: `/assets/${newName}`, name: newName });
}
