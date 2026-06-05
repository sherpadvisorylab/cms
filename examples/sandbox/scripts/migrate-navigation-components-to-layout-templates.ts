/**
 * Migration: move legacy navigation components into layout templates.
 *
 * Old model:
 * - components(type = "navigation")
 * - componentVersions(templateLiquid/css/js)
 *
 * New model:
 * - templates(type = "navigation")
 *
 * Usage:
 *   npm run migrate:navigation-templates
 */
import { config } from "dotenv";
import type { CmsComponent, ComponentVersion } from "@sherpacms/domain";

config({ path: ".env.local" });

type LegacyNavigationComponent = CmsComponent & {
  type?: string;
};

function normalizeName(value: string) {
  return value
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function buildNavigationTemplateHtml(version: ComponentVersion | null) {
  if (!version) return "";

  const parts = [version.templateLiquid.trim()];

  if (version.css?.trim()) {
    parts.push(`<style>\n${version.css.trim()}\n</style>`);
  }

  if (version.js?.trim()) {
    parts.push(`<script>\n${version.js.trim()}\n</script>`);
  }

  return parts.filter(Boolean).join("\n\n");
}

async function migrate() {
  const { cms } = await import("../src/lib/cms");

  console.log("Migration: navigation components -> navigation templates\n");

  const [components, existingTemplates] = await Promise.all([
    cms.components.findAll() as Promise<LegacyNavigationComponent[]>,
    cms.templates.findAll().catch(() => []),
  ]);

  const navigationComponents = components.filter(
    (component) => String(component.type ?? "") === "navigation",
  );

  if (navigationComponents.length === 0) {
    console.log("  No legacy navigation components found.");
    return;
  }

  const existingTemplateNames = new Set(
    existingTemplates
      .filter((template) => template.type === "navigation")
      .map((template) => normalizeName(template.name)),
  );

  let createdCount = 0;
  let deletedCount = 0;

  for (const component of navigationComponents) {
    const normalizedName = normalizeName(component.name);
    const version = await cms.componentVersions.getLatest(component.id);

    if (!existingTemplateNames.has(normalizedName)) {
      await cms.templates.create({
        name: component.name,
        description: component.description ?? "",
        type: "navigation",
        html: buildNavigationTemplateHtml(version),
      });
      existingTemplateNames.add(normalizedName);
      createdCount += 1;
      console.log(`  + created navigation template: ${component.name}`);
    } else {
      console.log(`  -> skip template (exists): ${component.name}`);
    }

    await cms.components.delete(component.id);
    deletedCount += 1;
    console.log(`  - removed legacy component: ${component.name}${version ? " (latest version migrated)" : ""}`);
  }

  console.log(`\nDone. Created ${createdCount} template(s), removed ${deletedCount} legacy component(s).`);
}

migrate().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
