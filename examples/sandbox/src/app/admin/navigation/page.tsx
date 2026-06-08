import { cms } from "@/lib/cms";
import type { CmsRenderTemplate } from "@sherpacms/domain";
import { NavigationManagerClient } from "./NavigationManagerClient";
import { buildAdminMetadata } from "@/lib/adminMetadata";
import { buildPermalinkMap, normalizePermalink } from "@/lib/pagePermalinks";

export const metadata = buildAdminMetadata(
  "Navigation",
  "Manage menus, navigation trees, and reusable navigation templates.",
);

type RenderTemplateWithAssets = CmsRenderTemplate & { css?: string | null; js?: string | null };

export default async function NavigationPage() {
  const [navs, templates, allPages, areas, settings] = await Promise.all([
    cms.navigations.findAll().catch(() => []),
    cms.templates.findAll().catch(() => []),
    cms.pages.findAll().catch(() => []),
    cms.areas.findAll().catch(() => []),
    cms.settings.get().catch(() => null),
  ]);
  const renderTemplates = templates.filter(
    (template): template is RenderTemplateWithAssets => template.type !== "page",
  ) as RenderTemplateWithAssets[];
  const permalinkMap = buildPermalinkMap(allPages);

  return (
    <NavigationManagerClient
      initialNavs={navs}
      settings={settings}
      navTemplates={renderTemplates
        .filter((template) => template.type === "navigation")
        .map((template) => ({
          id: template.id,
          name: template.name,
          html: template.html,
          css: template.css ?? "",
          js: template.js ?? "",
        }))}
      pages={allPages.map((p) => {
          const area = areas.find((a) => a.name === p.area || a.id === p.area);
          const rootPath = area?.rootPath ?? "/";
          const normalizedRootPath =
            rootPath === "/"
              ? ""
              : `/${String(rootPath).replace(/^\/+|\/+$/g, "")}`;
          const permalink = permalinkMap[p.id] ?? normalizePermalink(p.permalink ?? p.slug);
          const url = permalink === "/"
            ? (normalizedRootPath || "/")
            : `${normalizedRootPath}${permalink}`;
          return { id: p.id, title: p.title, slug: permalink, url, areaName: area?.displayName ?? p.area };
        })}
    />
  );
}
