import { readSeedEntries } from "./seed-helpers";

type SeedComponentVersionDefinition = {
  templateLiquid: string;
  schema?: unknown[];
  css?: string;
  js?: string;
  schemaOrgTemplate?: string;
};

type SeedComponentDefinition = {
  name: string;
  namespace?: string;
  type: "page" | "ui" | "navigation";
  category?: string;
  description?: string;
  status?: "draft" | "published";
  version: SeedComponentVersionDefinition;
};

async function readSeedComponents() {
  return readSeedEntries<SeedComponentDefinition>("components", ".component.json");
}

function normalizeComponentName(value: string) {
  return value.trim().toLowerCase();
}

export async function seedComponents(cms: any) {
  const [seedComponents, existingComponents] = await Promise.all([
    readSeedComponents(),
    cms.components.findAll().catch(() => []),
  ]);

  const existingNames = new Set(
    existingComponents.map((component: any) => normalizeComponentName(String(component.name))),
  );

  for (const componentDef of seedComponents) {
    if (existingNames.has(normalizeComponentName(componentDef.name))) {
      console.log(`  -> skip component (exists): ${componentDef.name}`);
      continue;
    }

    const component = await cms.components.create({
      name: componentDef.name,
      namespace: componentDef.namespace,
      type: componentDef.type,
      category: componentDef.category,
      description: componentDef.description,
      status: componentDef.status ?? "published",
    });

    await cms.componentVersions.createVersion(component.id, {
      templateLiquid: componentDef.version.templateLiquid,
      schema: componentDef.version.schema ?? [],
      css: componentDef.version.css || undefined,
      js: componentDef.version.js || undefined,
      schemaOrgTemplate: componentDef.version.schemaOrgTemplate || undefined,
    });

    console.log(`  + created component: ${componentDef.name}`);
  }
}
