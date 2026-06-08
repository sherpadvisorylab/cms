import { cms } from "@/lib/cms";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { updatePage, deletePage } from "../actions";
import { PageSettingsActions } from "./PageSettingsActions";
import { PageSchemaEditor } from "./PageSchemaEditor";
import type { ComponentSchemaEntry, PageSchemaConfig } from "./PageSchemaEditor";
import { PageEditorHeader } from "./PageEditorHeader";
import { VersionBadge } from "@/components/admin/VersionBadge";
import { buildAdminDocumentTitle } from "@/lib/adminMetadata";
import { PageSettingsFormSections } from "./PageSettingsFormSections";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const pages = await cms.pages.findAll();
  const page = pages.find((entry) => entry.id === id);
  const pageTitle = page?.title?.trim() || "Page";

  return {
    title: buildAdminDocumentTitle("Settings", pageTitle, "📄"),
    description:
      `Edit settings, SEO metadata, system page assignment, and schema configuration for "${pageTitle}".`,
  };
}

export default async function PageSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [allPages, areas, allComponents] = await Promise.all([
    cms.pages.findAll(),
    cms.areas.findAll(),
    cms.components.findAll(),
  ]);

  const pageArea = areas.find((area) => area.name === allPages.find((page) => page.id === id)?.area);
  const currentSystemType = pageArea?.systemPages
    ? Object.entries(pageArea.systemPages).find(([, pageId]) => pageId === id)?.[0] ?? null
    : null;
  const isSystemPage = !!currentSystemType;
  const page = allPages.find((entry) => entry.id === id);
  if (!page) notFound();

  const [latestVersion, publishedVersion] = await Promise.all([
    cms.pageVersions.getLatest(id).catch(() => null),
    cms.pageVersions.getLatestPublished(id).catch(() => null),
  ]);

  const structure = latestVersion?.structure ?? [];
  const componentEntries: ComponentSchemaEntry[] = (
    await Promise.all(
      structure.map(async (instance, index) => {
        const component = allComponents.find((entry) => entry.id === instance.componentId);
        if (!component) return null;
        const version = await cms.componentVersions.getLatest(instance.componentId).catch(() => null);
        return {
          instanceIndex: index,
          componentId: component.id,
          componentName: component.name,
          namespace: component.namespace ?? null,
          schemaOrgTemplate: (version as { schemaOrgTemplate?: string })?.schemaOrgTemplate ?? "",
          fields: (version?.schema ?? []).map((field: { key: string; label: string; type: string }) => ({
            key: field.key,
            label: field.label,
            type: field.type,
          })),
        } satisfies ComponentSchemaEntry;
      }),
    )
  ).filter((entry): entry is ComponentSchemaEntry => entry !== null);

  const savedConfig = (page.seo as { schemaConfig?: PageSchemaConfig })?.schemaConfig ?? null;
  const isPublished = page.status === "published" && !!publishedVersion;
  const update = updatePage.bind(null, id);

  return (
    <div>
      <PageEditorHeader
        id={id}
        title={page.title}
        isPublished={isPublished}
        badge={<VersionBadge versionNumber={latestVersion?.version ?? null} />}
        actions={
          <PageSettingsActions
            pageId={id}
            initialIsPublished={isPublished}
            publishedVersionNumber={publishedVersion?.version ?? null}
            publishedVersionId={publishedVersion?.id ?? null}
            pageSlug={page.permalink ?? page.slug}
            isSystemPage={isSystemPage}
          />
        }
      />

      <form id="settings-form" action={update}>
        <PageSettingsFormSections
          allPages={allPages}
          areas={areas}
          currentPageId={id}
          initialPage={page}
          currentSystemType={currentSystemType}
          isSystemPage={isSystemPage}
          onDelete={deletePage.bind(null, id)}
        />
      </form>

      <PageSchemaEditor pageId={id} components={componentEntries} savedConfig={savedConfig} />
    </div>
  );
}
