/**
 * Builds the canonical URL for a page exactly as the CMS render engine does
 * (mirrors the original buildPublicPageUrl logic in @sherpacms/cms).
 */
export function buildPageCanonicalUrl(options: {
  siteUrl: string;
  permalink: string;
  locale?: string;
  defaultLocale?: string;
  areaRootPath?: string;
}): string {
  const { siteUrl, permalink, locale = "", defaultLocale = "", areaRootPath = "" } = options;

  const normalizedSiteUrl = siteUrl.replace(/\/+$/, "");

  const rootPath = !areaRootPath || areaRootPath === "/"
    ? ""
    : areaRootPath.replace(/\/+$/, "");

  const isNonDefault = locale && defaultLocale && locale !== defaultLocale;
  const localePrefix = isNonDefault ? `/${locale}` : "";

  const normalizedPermalink = permalink === "/" || !permalink ? "/" : permalink;

  const relativePath = normalizedPermalink === "/"
    ? (localePrefix || rootPath || "/")
    : `${localePrefix}${rootPath}${normalizedPermalink}`;

  if (!normalizedSiteUrl) return relativePath || "/";
  return relativePath === "/" ? `${normalizedSiteUrl}/` : `${normalizedSiteUrl}${relativePath}`;
}
