import type { CmsPage, PageVersion } from "@cms/domain";
import type { IPageRepository, IPageVersionRepository } from "@cms/domain";
import type { StorageAdapter } from "../adapters/StorageAdapter";
import { generateId } from "../utils/storage";

export class PageRepository implements IPageRepository {
  constructor(private adapter: StorageAdapter) {}

  async findBySlug(area: string, slug: string): Promise<CmsPage | null> {
    const pages = await this.adapter.getAll<CmsPage>("pages", { area, slug, status: "published" });
    return pages[0] ?? null;
  }

  async findAll(area?: string): Promise<CmsPage[]> {
    return this.adapter.getAll<CmsPage>("pages", area ? { area } : undefined);
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
}
