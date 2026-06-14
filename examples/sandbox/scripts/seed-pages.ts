import { readSeedEntries } from "./seed-helpers";
import { joinParentPermalink, normalizePermalink } from "../src/lib/pagePermalinks";

type SeedPageDefinition = {
  title: string;
  slug: string;
  area?: string;
  status?: "draft" | "published" | "archived";
  parentId?: string | null;
  locale?: string;
  translationKey?: string;
  structure?: unknown[];
  content?: Record<string, unknown>;
  seo?: Record<string, unknown>;
  /** Marks this page as a system page and assigns it that role after creation. */
  systemPageType?: string;
  /** Name of a seeded component to include as the page's starter content. */
  seedComponentName?: string;
  /** Default field values for the seed component instance. */
  defaultContent?: Record<string, unknown>;
};

async function readSeedPages() {
  return readSeedEntries<SeedPageDefinition>("templates/pages", ".page.json");
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
  const [seedPageDefs, existingPages, defaultAreaName, allComponents, areas] = await Promise.all([
    readSeedPages(),
    cms.pages.findAll().catch(() => []),
    getDefaultAreaName(cms),
    cms.components.findAll().catch(() => []),
    cms.areas.findAll().catch(() => []),
  ]);
  const knownPages = [...existingPages];

  for (const pageDef of seedPageDefs) {
    const area = pageDef.area || defaultAreaName;
    const slug = pageDef.slug ?? "";
    const areaObj = areas.find((a: any) => a.name === area);

    // Skip if system page type already assigned for this area
    if (pageDef.systemPageType) {
      if (areaObj?.systemPages?.[pageDef.systemPageType]) {
        console.log(`  -> skip system page (already assigned): ${pageDef.systemPageType}`);
        continue;
      }
    }

    const existing = knownPages.find((page: any) => page.area === area && page.slug === slug);
    if (existing && !pageDef.systemPageType) {
      console.log(`  -> skip (exists): ${pageDef.title} [${area}] /${slug}`);
      continue;
    }

    // Build structure from named seed component if provided
    let structure = pageDef.structure ?? [];
    if (pageDef.seedComponentName && structure.length === 0) {
      const comp = allComponents.find((c: any) => c.name === pageDef.seedComponentName);
      if (comp) {
        structure = [{ componentId: comp.id, content: pageDef.defaultContent ?? {} }];
      } else {
        console.warn(`  warning: component "${pageDef.seedComponentName}" not found for page "${pageDef.title}"`);
      }
    }

    const parentPermalink = pageDef.parentId
      ? normalizePermalink(
          knownPages.find((page: any) => page.id === pageDef.parentId)?.permalink
          ?? knownPages.find((page: any) => page.id === pageDef.parentId)?.slug
          ?? "/",
        )
      : "/";
    const permalink = joinParentPermalink(parentPermalink, slug);

    const areaLocale = areaObj?.defaultLocale ?? undefined;
    const pageLocale = pageDef.locale ?? areaLocale;

    const page = existing ?? await cms.pages.create({
      area,
      slug,
      permalink,
      hasCustomPermalink: false,
      title:          pageDef.title,
      status:         pageDef.status ?? "draft",
      parentId:       pageDef.parentId ?? null,
      locale:         pageLocale ?? null,
      translationKey: pageDef.translationKey ?? null,
      structure,
      content:        pageDef.content ?? {},
      seo:            pageDef.seo ?? {},
    });
    if (!existing) {
      knownPages.push(page);
    }

    await cms.pageVersions.createVersion(page.id, {
      structure,
      content: pageDef.content ?? {},
      publish: (pageDef.status ?? "draft") === "published",
    });

    if (pageDef.systemPageType) {
      await cms.pages.update(page.id, { status: "published" });
      await cms.assignSystemPage(area, pageDef.systemPageType, page.id);
      console.log(`  + created system page (${pageDef.systemPageType}): ${pageDef.title} [${area}] /${slug}`);
    } else {
      console.log(`  + created page: ${pageDef.title} [${area}] /${slug}`);
    }
  }
}
