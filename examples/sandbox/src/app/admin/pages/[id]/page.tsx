import { cms } from "@/lib/cms";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { updatePage, deletePage } from "../actions";
import { PageSettingsActions } from "./PageSettingsActions";
import { PageSchemaEditor } from "./PageSchemaEditor";
import type { ComponentSchemaEntry, PageSchemaConfig } from "./PageSchemaEditor";
import { PageEditorHeader } from "./PageEditorHeader";
import { VersionBadge } from "@/components/admin/VersionBadge";
import { buildAdminDocumentTitle } from "@/lib/adminMetadata";
import { PageSettingsFormSections } from "./PageSettingsFormSections";
import { TranslationsPanel } from "./TranslationsPanel";
import { ADMIN_LOCALE_COOKIE } from "@/lib/i18n";

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

  const cookieStore = await cookies();
  const adminLocale = cookieStore.get(ADMIN_LOCALE_COOKIE)?.value ?? "";

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
        const version = await cms.componentVersions.getLatest(instance.componentId ?? "").catch(() => null);
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

  // Translations sidebar data
  const translationSiblings = page.translationKey
    ? await cms.pages.findByTranslationKey(page.translationKey).catch(() => [])
    : [];
  const translationSiblingsData = translationSiblings.map((p) => ({
    id: p.id,
    title: p.title,
    locale: p.locale ?? "",
    status: p.status,
    permalink: allPages.find((a) => a.id === p.id)?.permalink ?? p.slug ?? "",
  }));

  const areaLocales = pageArea?.supportedLocales ?? [];

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
          initialLocale={page.locale ?? adminLocale ?? pageArea?.defaultLocale ?? ""}
          onDelete={deletePage.bind(null, id)}
        />
      </form>

      <PageSchemaEditor pageId={id} components={componentEntries} savedConfig={savedConfig} />

      {areaLocales.length > 1 && (
        <TranslationsPanel
          pageId={id}
          currentLocale={page.locale ?? adminLocale ?? pageArea?.defaultLocale ?? ""}
          translationKey={page.translationKey ?? null}
          siblings={translationSiblingsData}
        />
      )}
    </div>
  );
}
