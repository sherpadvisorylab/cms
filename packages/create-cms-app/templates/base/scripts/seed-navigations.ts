import { readSeedEntries } from "./seed-helpers";

type SeedNavigationItem = {
  type: "page" | "custom";
  label: string;
  url: string;
  icon?: string;
  badge?: string;
  [key: string]: unknown;
};

type SeedNavigationDefinition = {
  name: string;
  slug?: string;
  template?: string;
  additionalCss?: string;
  additionalJs?: string;
  items?: SeedNavigationItem[];
};

async function readSeedNavigations() {
  return readSeedEntries<SeedNavigationDefinition>("navigations", ".navigation.json");
}

export async function seedNavigations(cms: any) {
  const navDefs = await readSeedNavigations();

  for (const navDef of navDefs) {
    const all: any[] = await cms.navigations.findAll().catch(() => []);
    const slug = navDef.slug ?? navDef.name.toLowerCase().replace(/\s+/g, "-");
    const existing = all.find(
      (n: any) => n.slug === slug || n.name.toLowerCase() === navDef.name.toLowerCase(),
    );

    if (existing) {
      console.log(`  -> skip navigation (exists): ${navDef.name}`);
      continue;
    }

    await cms.navigations.create({
      name:          navDef.name,
      slug:          slug,
      template:      navDef.template ?? "",
      additionalCss: navDef.additionalCss ?? "",
      additionalJs:  navDef.additionalJs ?? "",
      items:         navDef.items ?? [],
    });

    console.log(`  + created navigation: ${navDef.name}`);
  }
}
