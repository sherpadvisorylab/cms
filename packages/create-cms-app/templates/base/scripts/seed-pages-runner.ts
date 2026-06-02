import { config } from "dotenv";

config({ path: ".env.local" });

async function main() {
  const { cms } = await import("../src/lib/cms");
  const { seedSettings } = await import("./seed-settings");
  const { seedAreas } = await import("./seed-areas");
  const { seedMenus } = await import("./seed-menus");
  const { seedComponents } = await import("./seed-components");
  const { seedLayoutTemplates } = await import("./seed-layouts");
  const { seedPages } = await import("./seed-pages");

  console.log("Seeding starter content...\n");
  await seedSettings(cms);
  await seedAreas(cms);
  await seedMenus(cms);
  await seedComponents(cms);
  await seedLayoutTemplates(cms);
  await seedPages(cms);

  const loadDbModule = new Function("return import('../src/lib/db/index')");
  const db = await Promise.resolve(loadDbModule()).catch(() => null);
  await db?.client?.end?.();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
