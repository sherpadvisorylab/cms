import { readSeedEntries } from "./seed-helpers";

type SeedPageDefinition = {
  title: string;
  slug: string;
  area?: string;
  status?: "draft" | "published" | "archived";
  parentId?: string | null;
  structure?: unknown[];
  content?: Record<string, unknown>;
  seo?: Record<string, unknown>;
};

async function readSeedPages() {
  return readSeedEntries<SeedPageDefinition>("pages", ".page.json");
}

async function getDefaultAreaName(cms: any) {
  const areas = await cms.areas.findAll().catch(() => []);
  return (
    areas.find((area: any) => area.rootPath === "/" && (!area.status || area.status === "active"))?.name
    ?? areas.find((area: any) => area.rootPath === "/")?.name
    ?? areas.find((area: any) => !area.status || area.status === "active")?.name
    ?? areas[0]?.name
    ?? "Public"
  );
}

export async function seedPages(cms: any) {
  const [seedPages, existingPages, defaultAreaName] = await Promise.all([
    readSeedPages(),
    cms.pages.findAll().catch(() => []),
    getDefaultAreaName(cms),
  ]);

  for (const pageDef of seedPages) {
    const area = pageDef.area || defaultAreaName;
    const slug = pageDef.slug ?? "";
    const existing = existingPages.find((page: any) => page.area === area && page.slug === slug);

    if (existing) {
      console.log(`  -> skip (exists): ${pageDef.title} [${area}] /${slug}`);
      continue;
    }

    const page = await cms.pages.create({
      area,
      slug,
      title: pageDef.title,
      status: pageDef.status ?? "draft",
      parentId: pageDef.parentId ?? null,
      structure: pageDef.structure ?? [],
      content: pageDef.content ?? {},
      seo: pageDef.seo ?? {},
    });

    await cms.pageVersions.createVersion(page.id, {
      structure: pageDef.structure ?? [],
      content: pageDef.content ?? {},
      publish: (pageDef.status ?? "draft") === "published",
    });

    console.log(`  + created page: ${pageDef.title} [${area}] /${slug}`);
  }
}
