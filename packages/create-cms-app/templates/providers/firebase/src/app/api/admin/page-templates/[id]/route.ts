import { NextResponse } from "next/server";
import { cms } from "@/lib/cms";
import { isPageTemplate } from "@sherpacms/domain";
import { initAdmin } from "@/lib/firebase/admin";
import { getAuth } from "firebase-admin/auth";

initAdmin();

async function requireAuth(req: Request) {
  const session = req.headers.get("cookie")?.match(/__session=([^;]+)/)?.[1];
  if (!session) return false;
  try { await getAuth().verifySessionCookie(session, true); return true; }
  catch { return false; }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!await requireAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const template = await cms.templates.findById(id);
  if (!template || !isPageTemplate(template)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: template.id,
    name: template.name,
    description: template.description,
    structure: template.structure,
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
    type: template.type,
  });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!await requireAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await cms.templates.delete(id);
  return NextResponse.json({ ok: true });
}
