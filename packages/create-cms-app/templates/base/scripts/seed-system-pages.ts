import { readSeedEntries } from "./seed-helpers";

type SeedSystemPageDef = {
  systemPageType: string;
  title: string;
  slug: string;
  area?: string;
  seedComponentName?: string;
  defaultContent?: Record<string, unknown>;
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

  const [areas, allPages, allComponents, defaultAreaName] = await Promise.all([
    cms.areas.findAll().catch(() => []),
    cms.pages.findAll().catch(() => []),
    cms.components.findAll().catch(() => []),
    getDefaultAreaName(cms),
  ]);

  for (const def of defs) {
    const areaName = def.area || defaultAreaName;
    const areaObj  = areas.find((a: any) => a.name === areaName);

    if (areaObj?.systemPages?.[def.systemPageType]) {
      console.log(`  -> skip system page (already assigned): ${def.systemPageType}`);
      continue;
    }

    const structure: any[] = [];
    if (def.seedComponentName) {
      const comp = allComponents.find((c: any) => c.name === def.seedComponentName);
      if (comp) {
        structure.push({ componentId: comp.id, content: def.defaultContent ?? {} });
      } else {
        console.warn(`  warning: component not found for system page ${def.systemPageType}: "${def.seedComponentName}"`);
      }
    }

    let page = allPages.find((p: any) => p.area === areaName && p.slug === def.slug);

    if (!page) {
      page = await cms.pages.create({
        area:     areaName,
        slug:     def.slug,
        title:    def.title,
        status:   "draft",
        parentId: null,
        structure,
        content:  {},
        seo:      def.seo ?? {},
      });
    }

    await cms.pageVersions.createVersion(page.id, {
      structure,
      content: {},
      publish: true,
    });

    await cms.pages.update(page.id, { status: "published" });
    await cms.assignSystemPage(areaName, def.systemPageType, page.id);

    const note = structure.length ? "" : " (empty — design in admin)";
    console.log(`  + seeded system page (${def.systemPageType}): ${def.title} [${areaName}]${note}`);
  }
}
