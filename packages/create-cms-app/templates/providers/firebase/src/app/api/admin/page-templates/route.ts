import { NextResponse } from "next/server";
import { cms } from "@/lib/cms";
import { sanitizePageTemplateStructure, sortByRecentTimestamp } from "@/lib/pageTemplates";
import type { CmsPageTemplate } from "@sherpacms/domain";
import { initAdmin } from "@/lib/firebase/admin";
import { getAuth } from "firebase-admin/auth";

initAdmin();

async function requireAuth(req: Request) {
  const session = req.headers.get("cookie")?.match(/__session=([^;]+)/)?.[1];
  if (!session) return false;
  try { await getAuth().verifySessionCookie(session, true); return true; }
  catch { return false; }
}

export async function GET(req: Request) {
  if (!await requireAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const pageTemplates = sortByRecentTimestamp(
    (await cms.templates.findByType("page").catch(() => []))
      .filter((template): template is CmsPageTemplate => template.type === "page"),
  ) as CmsPageTemplate[];

  const templates = pageTemplates.map((template) => ({
      id: template.id,
      name: template.name,
      description: template.description,
      structure: sanitizePageTemplateStructure(template.structure),
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
      type: template.type,
    }));
  return NextResponse.json({ templates });
}

export async function POST(req: Request) {
  if (!await requireAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, structure } = await req.json() as { name: string; structure: unknown[] };
  if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const template = await cms.templates.create({
    type: "page",
    name: name.trim(),
    structure: sanitizePageTemplateStructure(structure),
  });

  return NextResponse.json({ id: template.id, name: template.name });
}
