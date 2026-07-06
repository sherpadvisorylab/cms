import { cms } from "@/lib/cms";
import { buildAdminMetadata } from "@/lib/adminMetadata";
import { CollectionManagerClient } from "./CollectionManagerClient";

export const metadata = buildAdminMetadata(
  "Collections",
  "Manage reusable structured data collections (FAQs, team members, testimonials, etc.).",
);

export default async function CollectionsPage() {
  const [collections, components, settings, translationEntries] = await Promise.all([
    cms.collections.findAll().catch(() => []),
    cms.components.findAll().catch(() => []),
    cms.settings.get().catch(() => null),
    cms.translations.findAll().catch(() => []),
  ]);

  const componentTemplates = await Promise.all(
    components.map(async (c) => {
      const version = await cms.componentVersions.getLatest(c.id).catch(() => null);
      return {
        id: c.id,
        name: c.name,
        html: version?.templateLiquid ?? "",
        css: version?.css ?? "",
        js: version?.js ?? "",
        schema: version?.schema ?? [],
      };
    }),
  );

  const collectionsWithRecords = await Promise.all(
    collections.map(async (col) => ({
      ...col,
      records: await cms.collections.findRecords(col.id).catch(() => []),
    })),
  );

  return (
    <CollectionManagerClient
      initialCollections={collectionsWithRecords}
      componentTemplates={componentTemplates}
      settings={settings}
      translationEntries={translationEntries}
    />
  );
}
