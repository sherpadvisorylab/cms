import { cms } from "@/lib/cms";
import { TemplatesClient } from "./TemplatesClient";
import { db } from "@/lib/db";
import { cmsPageTemplates } from "@/lib/db/schema";
import { desc } from "drizzle-orm";

async function fetchPageTemplates() {
  try {
    const rows = await db
      .select({
        id: cmsPageTemplates.id,
        name: cmsPageTemplates.name,
        structure: cmsPageTemplates.structure,
      })
      .from(cmsPageTemplates)
      .orderBy(desc(cmsPageTemplates.createdAt));

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      componentCount: Array.isArray(row.structure) ? row.structure.length : 0,
    }));
  } catch {
    return [];
  }
}

export default async function TemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab = "layouts" } = await searchParams;

  const [layoutTemplates, emailTemplates, pageTemplates] = await Promise.all([
    cms.layoutTemplates.findAll().catch(() => []),
    cms.emailTemplates.findAll().catch(() => []),
    fetchPageTemplates(),
  ]);

  return (
    <TemplatesClient
      initialTab={(tab as "layouts" | "email" | "page") ?? "layouts"}
      layoutTemplates={layoutTemplates}
      emailTemplates={emailTemplates}
      pageTemplates={pageTemplates}
    />
  );
}
