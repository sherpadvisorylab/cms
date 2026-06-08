import { NextResponse } from "next/server";
import { cms } from "@/lib/cms";
import { sanitizePageTemplateStructure } from "@/lib/pageTemplates";
import { isPageTemplate } from "@sherpacms/domain";
import { createClient } from "@/lib/supabase/server";

async function requireAuth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return !!user;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!await requireAuth()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const template = await cms.templates.findById(id);
  if (!template || !isPageTemplate(template)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: template.id,
    name: template.name,
    description: template.description,
    structure: sanitizePageTemplateStructure(template.structure),
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
    type: template.type,
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!await requireAuth()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await cms.templates.delete(id);
  return NextResponse.json({ ok: true });
}
