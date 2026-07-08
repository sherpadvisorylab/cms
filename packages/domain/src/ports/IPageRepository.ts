import type { CmsPage, PageVersion } from "../entities/Page";

export interface IPageRepository {
  /**
   * Finds the published page at `permalink` in `area`. If multiple pages share the same
   * permalink (locale variants of the same logical page, e.g. Home in every language served
   * at "/"), pass `locale` to disambiguate — falls back to the locale-less variant, then the
   * first match, when no exact locale match exists.
   */
  findByPermalink(area: string, permalink: string, locale?: string): Promise<CmsPage | null>;
  findBySlug(area: string, slug: string): Promise<CmsPage | null>;
  /** Returns all pages, optionally filtered by area and/or locale. */
  findAll(area?: string, locale?: string): Promise<CmsPage[]>;
  /** Returns all pages for an area that have a specific locale. */
  findByLocale(area: string, locale: string): Promise<CmsPage[]>;
  /**
   * Returns all pages sharing the same translationKey (all locale versions
   * of the same logical page). Used for hreflang resolution and translation panels.
   */
  findByTranslationKey(translationKey: string): Promise<CmsPage[]>;
  /**
   * Returns only published pages sharing the same translationKey.
   * Used by renderPage() to auto-inject hreflang tags.
   */
  findPublishedByTranslationKey(translationKey: string): Promise<CmsPage[]>;
  create(page: Omit<CmsPage, "id" | "createdAt" | "updatedAt">): Promise<CmsPage>;
  update(id: string, updates: Partial<CmsPage>): Promise<CmsPage>;
  delete(id: string): Promise<void>;
}

export interface IPageVersionRepository {
  createVersion(
    pageId: string,
    data: {
      structure: unknown;
      content?: unknown;
      createdBy?: string;
      publish?: boolean;
    }
  ): Promise<PageVersion>;
  getLatestPublished(pageId: string): Promise<PageVersion | null>;
  /** Latest version regardless of published status — used for draft preview. */
  getLatest(pageId: string): Promise<PageVersion | null>;
}
