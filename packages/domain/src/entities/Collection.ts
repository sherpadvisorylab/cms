import type { ComponentSchemaField } from "./Component";

export interface CmsCollectionView {
  id: string;
  name: string;
  slug: string;
  template: string;
  css?: string;
  js?: string;
  /** MVP: equality filter on a single field */
  filterField?: string;
  filterValue?: unknown;
  /** Field key to sort records by */
  sortField?: string;
  sortDirection?: "asc" | "desc";
  /** Records per page. 0 or undefined = no pagination */
  pageSize?: number;
  order: number;
}

export interface CmsCollection {
  id: string;
  name: string;
  /** URL-safe slug used as Liquid variable key: {{ collection.slug }} */
  slug: string;
  /** Field schema shared by all records in this collection */
  schema: ComponentSchemaField[];
  /** Template for rendering a single record */
  detailTemplate?: string;
  detailCss?: string;
  detailJs?: string;
  /** Ordered list of list/thumb views */
  views: CmsCollectionView[];

  /**
   * Pattern used to compute each record's URL slug.
   * Supports {fieldKey} and {id}. Values are slugified automatically.
   * Example: "{name}" → "pannello-solare-400w"
   * Default: "{id}"
   */
  slugPattern?: string;

  /**
   * Pattern for the full permalink of a record detail page.
   * Supports {record.slug}, {collection.slug}, {collection.name}, plus any {fieldKey}.
   * Example: "/prodotti/{record.slug}"
   * Default: "/{collection.slug}/{record.slug}"
   */
  permalinkPattern?: string;

  /**
   * Pattern for the <title> / og:title of the detail page.
   * Supports {fieldKey}, {record.slug}, {site.name}.
   * Example: "{name} | {site.name}"
   */
  detailMetaTitle?: string;

  /**
   * Pattern for the meta description of the detail page.
   * Supports same variables as detailMetaTitle.
   */
  detailMetaDescription?: string;

  /**
   * When false the collection has no detail/permalink page.
   * The Detail tab, slug/permalink patterns and computed record fields are disabled.
   * Defaults to true for backward compatibility.
   */
  hasDetailPage?: boolean;

  /**
   * Default component props for all records.
   * Key = component slug (e.g. "2-col-title-text").
   * Values are merged with per-record overrides at render time.
   */
  componentDefaultProps?: Record<string, Record<string, unknown>>;

  createdAt: Date;
  updatedAt: Date;
}

export interface CmsCollectionRecord {
  id: string;
  collectionId: string;
  /** Field values keyed by schema field key, in the collection's/site's default locale */
  data: Record<string, unknown>;
  /**
   * Per-locale overrides for fields marked `translatable` in the collection schema.
   * Keyed by locale, then by schema field key. Missing locale/key = not yet translated,
   * falls back to `data[key]`. The default locale is never a key here — `data` is the source.
   */
  translations?: Record<string, Record<string, unknown>>;
  order?: number;
  createdAt: Date;
  updatedAt: Date;
}

/** Pagination context injected into Liquid collection views */
export interface CmsCollectionPaginationContext {
  page: number;
  page_size: number;
  total_count: number;
  total_pages: number;
  has_prev: boolean;
  has_next: boolean;
  prev_page: number;
  next_page: number;
}
