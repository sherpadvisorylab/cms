import type { CmsPage, PageVersion } from "@sherpacms/domain";
import type { IPageRepository, IPageVersionRepository } from "@sherpacms/domain";
import type { StorageAdapter } from "../adapters/StorageAdapter";
import { generateId } from "../utils/storage";

export class PageRepository implements IPageRepository {
  constructor(private adapter: StorageAdapter) {}

  async findByPermalink(area: string, permalink: string, locale?: string): Promise<CmsPage | null> {
    const normalizedPermalink = normalizePermalink(permalink);
    const pages = await this.adapter.getAll<CmsPage>("pages", { area, status: "published" });
    const matches = pages.filter(
      (page) => normalizePermalink(page.permalink ?? page.slug) === normalizedPermalink,
    );
    if (matches.length === 0) return null;

    // Even a single page at this permalink must still match the requested locale — a page
    // that only exists in a non-default locale (e.g. an English-only page with no Italian
    // counterpart at this permalink) must not be reachable without its locale prefix, so it
    // can't be returned just because it's the only candidate. Prefer the exact locale match,
    // then the variant with no explicit locale (treated as the area's default), otherwise
    // there's no valid match for the requested locale.
    if (locale) {
      const exact = matches.find((page) => page.locale === locale);
      if (exact) return exact;
    }
    return matches.find((page) => !page.locale) ?? null;
  }

  async findBySlug(area: string, slug: string): Promise<CmsPage | null> {
    const pages = await this.adapter.getAll<CmsPage>("pages", { area, slug, status: "published" });
    return pages[0] ?? null;
  }

  async findAll(area?: string, locale?: string): Promise<CmsPage[]> {
    const filter: Record<string, unknown> = {};
    if (area) filter.area = area;
    if (locale) filter.locale = locale;
    return this.adapter.getAll<CmsPage>("pages", Object.keys(filter).length ? filter : undefined);
  }

  async findByLocale(area: string, locale: string): Promise<CmsPage[]> {
    return this.adapter.getAll<CmsPage>("pages", { area, locale });
  }

  async findByTranslationKey(translationKey: string): Promise<CmsPage[]> {
    return this.adapter.getAll<CmsPage>("pages", { translationKey });
  }

  async findPublishedByTranslationKey(translationKey: string): Promise<CmsPage[]> {
    return this.adapter.getAll<CmsPage>("pages", { translationKey, status: "published" });
  }

  async create(page: Omit<CmsPage, "id" | "createdAt" | "updatedAt">): Promise<CmsPage> {
    const newPage: CmsPage = {
      ...page,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    return this.adapter.create("pages", newPage);
  }

  async update(id: string, updates: Partial<CmsPage>): Promise<CmsPage> {
    return this.adapter.update<CmsPage>("pages", id, { ...updates, updatedAt: new Date() });
  }

  async delete(id: string): Promise<void> {
    return this.adapter.delete("pages", id);
  }
}

function normalizePermalink(value: string | null | undefined): string {
  const raw = (value ?? "").trim();
  if (!raw || raw === "/") return "/";
  const collapsed = raw.replace(/\/+/g, "/");
  const withLeadingSlash = collapsed.startsWith("/") ? collapsed : `/${collapsed}`;
  return withLeadingSlash.length > 1
    ? withLeadingSlash.replace(/\/+$/g, "")
    : withLeadingSlash;
}

export class PageVersionRepository implements IPageVersionRepository {
  constructor(private adapter: StorageAdapter) {}

  async createVersion(
    pageId: string,
    data: {
      structure: unknown;
      content?: unknown;
      createdBy?: string;
      publish?: boolean;
    },
  ): Promise<PageVersion> {
    const versions = await this.adapter.getAll<PageVersion>("pageVersions", { pageId });
    const nextVersion = (Math.max(0, ...versions.map((v) => v.version)) || 0) + 1;

    const version: PageVersion = {
      id: generateId(),
      pageId,
      version: nextVersion,
      structure: data.structure as PageVersion["structure"],
      content: data.content as Record<string, unknown> | undefined,
      publishedAt: data.publish ? new Date() : null,
      createdBy: data.createdBy ?? null,
      createdAt: new Date(),
    };

    return this.adapter.create("pageVersions", version);
  }

  async getLatestPublished(pageId: string): Promise<PageVersion | null> {
    const versions = await this.adapter.getAll<PageVersion>("pageVersions", { pageId });
    const published = versions
      .filter((v) => v.publishedAt !== null)
      .sort((a, b) => b.version - a.version);
    return published[0] ?? null;
  }

  async getLatest(pageId: string): Promise<PageVersion | null> {
    const versions = await this.adapter.getAll<PageVersion>("pageVersions", { pageId });
    if (versions.length === 0) return null;
    return versions.sort((a, b) => b.version - a.version)[0];
  }
}
