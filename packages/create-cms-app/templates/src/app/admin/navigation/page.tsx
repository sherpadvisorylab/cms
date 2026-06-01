import { cms } from "@/lib/cms";
import { NavigationManagerClient } from "./NavigationManagerClient";

export default async function NavigationPage() {
  const [navs, allComponents, allPages, areas, settings] = await Promise.all([
    cms.navigations.findAll().catch(() => []),
    cms.components.findAll().catch(() => []),
    cms.pages.findAll().catch(() => []),
    cms.areas.findAll().catch(() => []),
    cms.settings.get().catch(() => null),
  ]);

  // Navigation-type components with their latest template
  const navComponents = await Promise.all(
    allComponents
      .filter((c) => c.type === "navigation")
      .map(async (c) => {
        const ver = await cms.componentVersions.getLatest(c.id).catch(() => null);
        return { id: c.id, name: c.name, templateLiquid: ver?.templateLiquid ?? "" };
      })
  );

  const styleVars = Object.keys(
    (settings?.systemVariableDefaults ?? {}) as Record<string, string>
  ).map((k) => ({
    key: `system:${k}`,
    description: (settings?.systemVariableDefaults as Record<string, string>)[k] ?? k,
  }));

  return (
    <NavigationManagerClient
      initialNavs={navs}
      navComponents={navComponents}
      pages={allPages.map((p) => {
          const area = areas.find((a) => a.name === p.areaKey || a.id === p.areaKey);
          const rootPath = area?.rootPath ?? "/";
          const url = p.slug ? `${rootPath}${rootPath.endsWith("/") ? "" : "/"}${p.slug}` : rootPath;
          return { id: p.id, title: p.title, slug: p.slug, url, areaName: area?.displayName ?? p.areaKey };
        })}
      styleVars={styleVars}
    />
  );
}
