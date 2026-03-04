/**
 * System variables available in Liquid templates.
 * Used for CodeMirror autocomplete hints in the admin UI.
 */

/** Variables available in the head template (area design) */
export const HEAD_SYSTEM_VARS: Array<{ key: string; description: string }> = [
  { key: "{{pageTitle}}", description: "Page SEO title or fallback to page title" },
  { key: "{{siteName}}", description: "Area site name" },
  { key: "{{metaTags}}", description: "Auto-generated SEO meta tags (description, OG, keywords)" },
  { key: "{{styles}}", description: "Compiled CSS <link> tags + head tracking scripts" },
  { key: "{{scripts}}", description: "Compiled JS <script> tags" },
];

/** Variables available in body/component Liquid templates */
export const BODY_SYSTEM_VARS: Array<{ key: string; description: string }> = [
  { key: "page.title", description: "Page display title" },
  { key: "page.slug", description: "Page URL slug" },
  { key: "site.name", description: "Area site name" },
  { key: "area.name", description: "Area key identifier" },
  { key: "area.displayName", description: "Area display name" },
  { key: "area.siteName", description: "Area site name" },
  { key: "area.rootPath", description: "Area root URL path" },
  { key: "area.style.logoLight", description: "Light mode logo URL" },
  { key: "area.style.logoDark", description: "Dark mode logo URL" },
  { key: "area.style.favicon", description: "Favicon URL" },
];

/** Variables available in menu Liquid templates */
export const MENU_SYSTEM_VARS: Array<{ key: string; description: string }> = [
  { key: "items", description: "Array of menu items ({ label, href, isExternal, children })" },
  { key: "item.label", description: "Menu item display label" },
  { key: "item.href", description: "Menu item URL" },
  { key: "item.isExternal", description: "Whether the link opens externally" },
  { key: "item.children", description: "Nested child menu items" },
  { key: "site.name", description: "Area site name" },
  { key: "area.style.logoLight", description: "Light mode logo URL" },
  { key: "area.style.logoDark", description: "Dark mode logo URL" },
];
