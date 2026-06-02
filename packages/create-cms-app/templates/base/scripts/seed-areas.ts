import { readSeedEntries } from "./seed-helpers";

type SeedAreaDefinition = {
  name: string;
  displayName: string;
  description?: string;
  rootPath?: string;
  siteName?: string;
  status?: "active" | "inactive";
  style?: Record<string, unknown>;
  design?: Record<string, unknown>;
  legal?: Record<string, unknown>;
  tracking?: Record<string, unknown>;
  accessPolicy?: Record<string, unknown>;
};

async function readSeedAreas() {
  return readSeedEntries<SeedAreaDefinition>("areas", ".area.json");
}

export async function seedAreas(cms: any) {
  const [seedAreas, existingAreas] = await Promise.all([
    readSeedAreas(),
    cms.areas.findAll().catch(() => []),
  ]);

  for (const areaDef of seedAreas) {
    const existing = existingAreas.find((area: any) => area.name === areaDef.name);

    if (existing) {
      console.log(`  -> skip area (exists): ${areaDef.name}`);
      continue;
    }

    await cms.areas.create({
      name: areaDef.name,
      displayName: areaDef.displayName,
      description: areaDef.description,
      rootPath: areaDef.rootPath ?? "/",
      siteName: areaDef.siteName,
      status: areaDef.status ?? "active",
      style: areaDef.style,
      design: areaDef.design,
      legal: areaDef.legal,
      tracking: areaDef.tracking,
      accessPolicy: areaDef.accessPolicy,
    });

    console.log(`  + created area: ${areaDef.name}`);
  }
}
