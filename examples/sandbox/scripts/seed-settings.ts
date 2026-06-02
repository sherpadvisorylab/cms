import { readSeedEntries } from "./seed-helpers";

type SeedSettingsDefinition = Record<string, unknown>;

async function readSeedSettings() {
  return readSeedEntries<SeedSettingsDefinition>("settings", ".settings.json");
}

export async function seedSettings(cms: any) {
  const [seedSettingsEntries, existingSettings] = await Promise.all([
    readSeedSettings(),
    cms.settings.get().catch(() => null),
  ]);

  if (existingSettings) {
    console.log("  -> skip settings (exists): global");
    return;
  }

  const merged = seedSettingsEntries.reduce<Record<string, unknown>>(
    (acc, entry) => ({ ...acc, ...entry }),
    {},
  );

  await cms.settings.save({
    id: "global",
    ...merged,
  });

  console.log("  + created settings: global");
}
