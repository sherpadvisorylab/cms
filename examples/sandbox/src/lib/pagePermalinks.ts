type PageRouteRecord = {
  id: string;
  slug: string;
  parentId?: string | null;
  permalink?: string | null;
  hasCustomPermalink?: boolean | null;
};

export function normalizeSlugSegment(slug: string | null | undefined): string {
  return (slug ?? "").trim().replace(/^\/+|\/+$/g, "");
}

/** Derives a URL-safe slug from a page title, for pages that lose their slug-exempt system-page status. */
export function slugifyTitle(title: string): string {
  return title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function normalizePermalink(permalink: string | null | undefined): string {
  const raw = (permalink ?? "").trim();
  if (!raw || raw === "/") return "/";
  const collapsed = raw.replace(/\/+/g, "/");
  const withLeadingSlash = collapsed.startsWith("/") ? collapsed : `/${collapsed}`;
  return withLeadingSlash.length > 1
    ? withLeadingSlash.replace(/\/+$/g, "")
    : withLeadingSlash;
}

export function joinParentPermalink(
  parentPermalink: string | null | undefined,
  slug: string | null | undefined,
): string {
  const parent = normalizePermalink(parentPermalink);
  const segment = normalizeSlugSegment(slug);
  if (!segment) return parent;
  return parent === "/" ? `/${segment}` : `${parent}/${segment}`;
}

function computePagePermalink(
  pageId: string,
  pagesById: Map<string, PageRouteRecord>,
  cache: Map<string, string>,
  visiting: Set<string>,
): string {
  const cached = cache.get(pageId);
  if (cached) return cached;

  const page = pagesById.get(pageId);
  if (!page) return "/";
  if (visiting.has(pageId)) return joinParentPermalink("/", page.slug);

  visiting.add(pageId);

  let nextPermalink: string;
  if (page.hasCustomPermalink && page.permalink) {
    nextPermalink = normalizePermalink(page.permalink);
  } else {
    const parentPermalink =
      page.parentId && page.parentId !== page.id && pagesById.has(page.parentId)
        ? computePagePermalink(page.parentId, pagesById, cache, visiting)
        : "/";
    nextPermalink = joinParentPermalink(parentPermalink, page.slug);
  }

  visiting.delete(pageId);
  cache.set(pageId, nextPermalink);
  return nextPermalink;
}

export function buildPermalinkMap<T extends PageRouteRecord>(pages: T[]): Record<string, string> {
  const pagesById = new Map(pages.map((page) => [page.id, page]));
  const cache = new Map<string, string>();
  const result: Record<string, string> = {};

  for (const page of pages) {
    result[page.id] = computePagePermalink(page.id, pagesById, cache, new Set<string>());
  }

  return result;
}

export function resolvePagePermalink(
  page: PageRouteRecord,
  pages: PageRouteRecord[],
): string {
  return buildPermalinkMap(pages)[page.id] ?? joinParentPermalink("/", page.slug);
}

export function applyPageRouteDraft<T extends PageRouteRecord>(
  pages: T[],
  draft: T,
): T[] {
  return pages.map((page) => (page.id === draft.id ? draft : page));
}
