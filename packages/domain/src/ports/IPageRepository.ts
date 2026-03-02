import type { CmsPage, PageVersion } from "../entities/Page";

export interface IPageRepository {
  findBySlug(area: string, slug: string): Promise<CmsPage | null>;
  findAll(area?: string): Promise<CmsPage[]>;
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
}
