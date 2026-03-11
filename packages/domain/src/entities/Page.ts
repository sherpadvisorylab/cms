export type PageStatus = "draft" | "published" | "archived";
export const PAGE_STATUSES = ["draft", "published", "archived"] as const;

export interface CmsPageSeo {
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string;
}

export interface CmsPageStyle {
  colorPalette?: string;
  layoutMode?: string;
}

export interface CmsPage {
  id: string;
  area: string;
  slug: string;
  title: string;
  parentId?: string | null;
  status: PageStatus;
  structure: ComponentInstance[];
  content?: Record<string, unknown>;
  seo?: CmsPageSeo;
  style?: CmsPageStyle;
  /** @deprecated Use seo.metaTitle instead */
  seoTitle?: string | null;
  /** @deprecated Use seo.metaDescription instead */
  seoDescription?: string | null;
  ogImageUrl?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ComponentInstance {
  componentId: string;
  props: Record<string, unknown>;
  globals?: Record<string, unknown>;
}

export interface PageVersion {
  id: string;
  pageId: string;
  version: number;
  structure: ComponentInstance[];
  content?: Record<string, unknown>;
  publishedAt?: Date | null;
  createdBy?: string | null;
  createdAt: Date;
}
