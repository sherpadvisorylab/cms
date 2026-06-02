import { config } from "dotenv";
import { readSeedEntries } from "./seed-helpers";

config({ path: ".env.local" });

type SeedLayoutDefinition = {
  name: string;
  description: string;
  type: "head" | "body";
  html: string;
};

async function readSeedLayouts() {
  return readSeedEntries<SeedLayoutDefinition>("templates/layouts", ".layout.json");
}

function normalizeLayoutName(value: string) {
  return value
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export async function seedLayoutTemplates(cms: any) {
  const [seedLayouts, existingLayouts] = await Promise.all([
    readSeedLayouts(),
    cms.layoutTemplates.findAll().catch(() => []),
  ]);

  const existingNames = new Set(
    existingLayouts.map((layout: any) => normalizeLayoutName(String(layout.name))),
  );

  for (const layout of seedLayouts) {
    if (existingNames.has(normalizeLayoutName(layout.name))) {
      console.log(`  -> skip layout (exists): ${layout.name}`);
      continue;
    }

    await cms.layoutTemplates.create({
      name: layout.name,
      description: layout.description,
      type: layout.type,
      html: layout.html,
    });

    console.log(`  + created layout: ${layout.name}`);
  }
}

async function main() {
  const { cms } = await import("../src/lib/cms");
  console.log("Seeding layout templates...");
  await seedLayoutTemplates(cms);
  console.log("Done.");

  try {
    const loadDbModule = new Function("return import('../src/lib/db/index')");
    const db = await Promise.resolve(loadDbModule()).catch(() => null);
    await db?.client?.end?.();
  } catch {
    // Some providers do not expose a DB client module to close.
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
