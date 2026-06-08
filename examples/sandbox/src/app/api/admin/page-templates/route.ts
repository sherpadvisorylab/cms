import { NextResponse } from "next/server";
import { cms } from "@/lib/cms";
import { sanitizePageTemplateStructure, sortByRecentTimestamp } from "@/lib/pageTemplates";
import { isPageTemplate, type CmsPageTemplate } from "@sherpacms/domain";
import { createClient } from "@/lib/supabase/server";

async function requireAuth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return !!user;
}

export async function GET() {
  if (!await requireAuth()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const templates = (sortByRecentTimestamp(
    (await cms.templates.findByType("page").catch(() => []))
      .filter(isPageTemplate),
  ) as CmsPageTemplate[]).map((template) => ({
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
  if (!await requireAuth()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, structure } = await req.json() as { name: string; structure: unknown[] };
  if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const template = await cms.templates.create({
    type: "page",
    name: name.trim(),
    structure: sanitizePageTemplateStructure(structure),
  });

  return NextResponse.json({ id: template.id, name: template.name });
}
