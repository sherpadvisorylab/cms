import { cms } from "@/lib/cms";

type PublicArea = {
  name: string;
  rootPath?: string | null;
  status?: string | null;
};

type PublicPage = {
  id: string;
  area: string;
  slug: string;
  status?: string | null;
  parentId?: string | null;
};

function isActive(value?: string | null) {
  return !value || value === "active";
}

export async function getPrimaryPublicAreaName() {
  const areas = (await cms.areas.findAll().catch(() => [])) as PublicArea[];
  const activeAreas = areas.filter((area) => isActive(area.status));

  return (
    activeAreas.find((area) => area.rootPath === "/")?.name
    ?? activeAreas[0]?.name
    ?? areas.find((area) => area.rootPath === "/")?.name
    ?? areas[0]?.name
    ?? "Public"
  );
}

export async function resolveHomePageSlug() {
  const [pages, areaName] = await Promise.all([
    cms.pages.findAll().catch(() => []),
    getPrimaryPublicAreaName(),
  ]);

  const publishedPages = (pages as PublicPage[]).filter(
    (page) => page.area === areaName && page.status === "published",
  );

  const candidate = ["", "/", "home", "index"]
    .map((slug) => publishedPages.find((page) => page.slug === slug))
    .find(Boolean);

  if (candidate) {
    return { areaName, slug: candidate.slug };
  }

  const firstPublishedTopLevel = publishedPages.find((page) => !page.parentId);
  if (firstPublishedTopLevel) {
    return { areaName, slug: firstPublishedTopLevel.slug };
  }

  const firstPublished = publishedPages[0];
  if (firstPublished) {
    return { areaName, slug: firstPublished.slug };
  }

  return { areaName, slug: "home" };
}
