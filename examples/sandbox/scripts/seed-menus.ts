import { readSeedEntries } from "./seed-helpers";

type SeedMenuItem = {
  label: string;
  href: string;
  orderIndex?: number;
  isExternal?: boolean;
};

type SeedMenuDefinition = {
  key: string;
  label: string;
  items?: SeedMenuItem[];
};

async function readSeedMenus() {
  return readSeedEntries<SeedMenuDefinition>("menus", ".menu.json");
}

export async function seedMenus(cms: any) {
  const seedMenus = await readSeedMenus();

  for (const menuDef of seedMenus) {
    const existing = await cms.menus.findByKey(menuDef.key).catch(() => null);

    if (existing) {
      console.log(`  -> skip menu (exists): ${menuDef.key}`);
      continue;
    }

    const menu = await cms.menus.upsertMenu(menuDef.key, menuDef.label);
    await cms.menus.setItems(
      menu.id,
      (menuDef.items ?? []).map((item, index) => ({
        label: item.label,
        href: item.href,
        orderIndex: item.orderIndex ?? index,
        isExternal: item.isExternal ?? false,
      })),
    );

    console.log(`  + created menu: ${menuDef.key}`);
  }
}
