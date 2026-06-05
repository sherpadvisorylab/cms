/**
 * Navigation item: either a page link or a custom link.
 * Flat object with reserved keys + any custom properties.
 */
export interface CmsNavigationItem {
  key: string;
  type: "page" | "custom";
  label: string;
  url: string;
  target?: "_self" | "_blank";
  description?: string;
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
