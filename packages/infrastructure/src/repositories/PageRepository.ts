import type { CmsPage, PageVersion } from "@cms/domain";
import type { IPageRepository, IPageVersionRepository } from "@cms/domain";
import { getFromStorage, setToStorage, generateId } from "../utils/storage";

const PAGES_KEY = "cms:pages";
const PAGE_VERSIONS_KEY = "cms:pageVersions";

export class PageRepository implements IPageRepository {
  async findBySlug(area: string, slug: string): Promise<CmsPage | null> {
    const pages = getFromStorage<CmsPage[]>(PAGES_KEY) ?? [];
    return (
      pages.find(
        (p) => p.area === area && p.slug === slug && p.status === "published"
      ) ?? null
    );
  }

  async findAll(area?: string): Promise<CmsPage[]> {
    const pages = getFromStorage<CmsPage[]>(PAGES_KEY) ?? [];
    return area ? pages.filter((p) => p.area === area) : pages;
  }

  async create(
    page: Omit<CmsPage, "id" | "createdAt" | "updatedAt">
  ): Promise<CmsPage> {
    const pages = getFromStorage<CmsPage[]>(PAGES_KEY) ?? [];
    const newPage: CmsPage = {
      ...page,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    pages.push(newPage);
    setToStorage(PAGES_KEY, pages);
    return newPage;
  }

  async update(id: string, updates: Partial<CmsPage>): Promise<CmsPage> {
    const pages = getFromStorage<CmsPage[]>(PAGES_KEY) ?? [];
    const index = pages.findIndex((p) => p.id === id);
    if (index === -1) {
      throw new Error(`Page ${id} not found`);
    }

    pages[index] = {
      ...pages[index],
      ...updates,
      updatedAt: new Date(),
    };
    setToStorage(PAGES_KEY, pages);
    return pages[index];
  }

  async delete(id: string): Promise<void> {
    const pages = getFromStorage<CmsPage[]>(PAGES_KEY) ?? [];
    const filtered = pages.filter((p) => p.id !== id);
    setToStorage(PAGES_KEY, filtered);
  }
}

export class PageVersionRepository implements IPageVersionRepository {
  async createVersion(
    pageId: string,
    data: {
      structure: unknown;
      content?: unknown;
      createdBy?: string;
      publish?: boolean;
    }
  ): Promise<PageVersion> {
    const versions = getFromStorage<PageVersion[]>(PAGE_VERSIONS_KEY) ?? [];
    const pageVersions = versions.filter((v) => v.pageId === pageId);
    const nextVersion =
      (Math.max(0, ...pageVersions.map((v) => v.version)) || 0) + 1;

    const version: PageVersion = {
      id: generateId(),
      pageId,
      version: nextVersion,
      structure: data.structure as any,
      content: data.content as Record<string, unknown> | undefined,
      publishedAt: data.publish ? new Date() : null,
      createdBy: data.createdBy ?? null,
      createdAt: new Date(),
    };

    versions.push(version);
    setToStorage(PAGE_VERSIONS_KEY, versions);
    return version;
  }

  async getLatestPublished(pageId: string): Promise<PageVersion | null> {
    const versions = getFromStorage<PageVersion[]>(PAGE_VERSIONS_KEY) ?? [];
    const published = versions
      .filter((v) => v.pageId === pageId && v.publishedAt !== null)
      .sort((a, b) => b.version - a.version);
    return published[0] ?? null;
  }
}
