import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { cmsPageTemplates } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { randomUUID } from "crypto";

async function requireAuth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return !!user;
}

export async function GET() {
  if (!await requireAuth()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db
    .select({ id: cmsPageTemplates.id, name: cmsPageTemplates.name })
    .from(cmsPageTemplates)
    .orderBy(desc(cmsPageTemplates.createdAt));

  return NextResponse.json({ templates: rows });
}

export async function POST(req: Request) {
  if (!await requireAuth()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, structure } = await req.json() as { name: string; structure: unknown[] };
  if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const id = randomUUID();
  await db.insert(cmsPageTemplates).values({
    id,
    name:      name.trim(),
    structure: structure ?? [],
  });

  return NextResponse.json({ id, name: name.trim() });
}
