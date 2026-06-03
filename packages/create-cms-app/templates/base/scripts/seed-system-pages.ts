import { readSeedEntries } from "./seed-helpers";

type SeedSystemPageDef = {
  systemPageType: string;
  title: string;
  slug: string;
  area?: string;
  structure?: unknown[];
  content?: Record<string, unknown>;
  seo?: Record<string, unknown>;
};

async function getDefaultAreaName(cms: any): Promise<string> {
  const areas = await cms.areas.findAll().catch(() => []);
  return (
    areas.find((a: any) => a.rootPath === "/" && (!a.status || a.status === "active"))?.name
    ?? areas.find((a: any) => a.rootPath === "/")?.name
    ?? areas[0]?.name
    ?? "Public"
  );
}

export async function seedSystemPages(cms: any) {
  const defs = await readSeedEntries<SeedSystemPageDef>("system-pages", ".system-page.json");

  const [areas, allPages, defaultAreaName] = await Promise.all([
    cms.areas.findAll().catch(() => []),
    cms.pages.findAll().catch(() => []),
    getDefaultAreaName(cms),
  ]);

  for (const def of defs) {
    const areaName = def.area || defaultAreaName;
    const areaObj  = areas.find((a: any) => a.name === areaName);

    // Skip if already assigned
    if (areaObj?.systemPages?.[def.systemPageType]) {
      console.log(`  -> skip system page (already assigned): ${def.systemPageType}`);
      continue;
    }

    // Reuse existing page with same slug, or create a new one
    let page = allPages.find((p: any) => p.area === areaName && p.slug === def.slug);

    if (!page) {
      page = await cms.pages.create({
        area:      areaName,
        slug:      def.slug,
        title:     def.title,
        status:    "draft",
        parentId:  null,
        structure: def.structure ?? [],
        content:   def.content ?? {},
        seo:       def.seo ?? {},
      });
    }

    // Create a published version
    await cms.pageVersions.createVersion(page.id, {
      structure: def.structure ?? [],
      content:   def.content ?? {},
      publish:   true,
    });

    // Mark page status as published
    await cms.pages.update(page.id, { status: "published" });

    // Assign as system page (updates area.systemPages)
    await cms.assignSystemPage(areaName, def.systemPageType, page.id);

    console.log(`  + seeded system page (${def.systemPageType}): ${def.title} [${areaName}]`);
  }
}
