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
  permalink?: string | null;
  hasCustomPermalink?: boolean | null;
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

export type AnimationType = "none" | "fade-in" | "slide-up" | "slide-down" | "zoom-in";
export const ANIMATION_TYPES: AnimationType[] = ["none", "fade-in", "slide-up", "slide-down", "zoom-in"];

export interface ComponentAnimation {
  type: AnimationType;
  /** Milliseconds before the animation starts after the element enters the viewport. */
  delay?: number;
  /** Milliseconds the animation runs for. Default 600ms. */
  duration?: number;
}

export interface ComponentInstance {
  /** Discriminator: undefined or "component" = standard component block; "collection" = collection view block. */
  blockType?: "component" | "collection";

  // ── Component block fields (blockType === "component" or undefined) ──────────
  componentId?: string;
  props: Record<string, unknown>;
  globals?: Record<string, unknown>;
  /** Optional reveal-on-scroll animation applied to the component's rendered wrapper. */
  animation?: ComponentAnimation;
  /** Stable identifier assigned when a component is linked or copied. Auto-generated on first link. */
  instanceId?: string;
  /** When set, this instance is a link to the origin component. Props are read from the origin. */
  linkedFrom?: {
    pageId: string;
    instanceId: string;
  };

  // ── Collection block fields (blockType === "collection") ─────────────────────
  /** Slug of the collection to embed. Required when blockType is "collection". */
  collectionSlug?: string;
  /** Slug of the specific view to render. If omitted, renders the default view. */
  collectionViewSlug?: string;
  /**
   * When set, only these record IDs are rendered (in this order).
   * If empty or undefined, all records matching the view filter/sort are shown.
   */
  filteredRecordIds?: string[];

  /** When true, the block is hidden from the public render but remains visible in the admin. */
  disabled?: boolean;
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
