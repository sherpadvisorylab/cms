import { NextResponse } from "next/server";
import { initAdmin } from "@/lib/firebase/admin";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

initAdmin();

async function requireAuth(req: Request) {
  const session = req.headers.get("cookie")?.match(/__session=([^;]+)/)?.[1];
  if (!session) return false;
  try { await getAuth().verifySessionCookie(session, true); return true; }
  catch { return false; }
}

export async function GET(req: Request) {
  if (!await requireAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getFirestore();
  const snap = await db.collection("pageTemplates").orderBy("createdAt", "desc").get();
  const templates = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  return NextResponse.json({ templates });
}

export async function POST(req: Request) {
  if (!await requireAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, structure } = await req.json() as { name: string; structure: unknown[] };
  if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const db = getFirestore();
  const ref = await db.collection("pageTemplates").add({
    name: name.trim(),
    structure: structure ?? [],
    createdAt: new Date().toISOString(),
  });

  return NextResponse.json({ id: ref.id, name: name.trim() });
}
