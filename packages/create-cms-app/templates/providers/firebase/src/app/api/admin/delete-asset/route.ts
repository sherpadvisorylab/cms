import { NextResponse } from "next/server";
import { initAdmin } from "@/lib/firebase/admin";
import { getAuth } from "firebase-admin/auth";
import { getStorage } from "firebase-admin/storage";

initAdmin();

export async function DELETE(req: Request) {
  const session = req.headers.get("cookie")?.match(/__session=([^;]+)/)?.[1];
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { await getAuth().verifySessionCookie(session, true); }
  catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  const { name } = await req.json() as { name: string };
  if (!name) return NextResponse.json({ error: "Missing name" }, { status: 400 });

  await getStorage().bucket().file(`cms-assets/${name}`).delete({ ignoreNotFound: true });
  return NextResponse.json({ ok: true });
}
