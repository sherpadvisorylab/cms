/**
 * Navigation item: either a page link or a custom link.
 * Flat object with reserved keys + any custom properties.
 */
export interface CmsNavigationItem {
  type: "page" | "custom";
  label: string;
  url: string;
  image?: string;
  description?: string;
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
  items: CmsNavigationItem[];
  template?: string;
  additionalCss?: string;
  additionalJs?: string;
}
