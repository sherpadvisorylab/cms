/**
 * Per-locale override of an item's translatable text fields.
 * Locales are keyed by code (e.g. "en", "fr") and come from CmsSettingsBranding.locales —
 * there is no per-item language list, translations just fill in as they're added.
 */
export interface CmsNavigationItemTranslation {
  label?: string;
  description?: string;
  /**
   * Per-locale URL override for "custom" items only (a fixed link, not backed by a CmsPage).
   * Ignored for "page" items — their URL is always re-resolved from the linked page's own
   * translation via `pageId`, never from this field.
   */
  url?: string;
}

/**
 * Navigation item: either a page link or a custom link.
 * Flat object with reserved keys + any custom properties.
 */
export interface CmsNavigationItem {
  key: string;
  type: "page" | "custom";
  /** Default-locale label. Always required — acts as the fallback for locales without a translation. */
  label: string;
  url: string;
  /**
   * Stable reference to the linked CmsPage, set only when type is "page" and the item was linked
   * via the page picker (not a freeform URL). When present, the public URL is re-resolved per
   * locale by following the target page's translationKey — if no published translation exists for
   * the requested locale, the item is omitted from that locale's rendered menu rather than showing
   * a broken or wrong-language link.
   */
  pageId?: string | null;
  target?: "_self" | "_blank";
  description?: string;
  /** Per-locale label/description overrides, keyed by locale code. */
  translations?: Record<string, CmsNavigationItemTranslation>;
  items?: CmsNavigationItem[];
  /** Custom properties (icon, badge, subtitle, etc.) */
  [key: string]: unknown;
}

/**
 * Navigation block: a named set of links with a Liquid display template.
 * Embedded in area design as {{navigation:id}}.
 */
export interface CmsNavigation {
  id: string;
  name: string;
  /** Unique slug used as Liquid variable key: {{ menus.{slug} }} */
  slug?: string;
  items: CmsNavigationItem[];
  template?: string;
  additionalCss?: string;
  additionalJs?: string;
}
