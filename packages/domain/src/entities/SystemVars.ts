/**
 * System variables available in Liquid templates.
 * Used for CodeMirror autocomplete hints in the admin UI.
 */

export const VARIABLE_ALIASES = {
  content: "page.content",
  pageTitle: "page.metaTitle",
  pageSlug: "page.slug",
  siteName: "site.name",
  siteLogo: "site.logo",
  siteLogoDark: "site.logoDark",
  favicon: "site.favicon",
  metaTags: "site.metaTags",
  styles: "site.styles",
  scripts: "site.scripts",
  trackingScripts: "site.trackingScripts",
} as const;

export type VariableAlias = keyof typeof VARIABLE_ALIASES;

export function normalizeVariableAliases(template: string): string {
  return template.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (fullMatch, rawExpression: string) => {
    const expression = rawExpression.trim();
    const target = VARIABLE_ALIASES[expression as VariableAlias];
    if (!target) return fullMatch;
    return `{{${target}}}`;
  });
}

/** Variables available in the head template (area design) */
export const HEAD_SYSTEM_VARS: Array<{ key: string; description: string }> = [
  { key: "{{page.metaTitle}}", description: "Page SEO title or fallback to page title" },
  { key: "{{site.name}}", description: "Area/site display name" },
  { key: "{{site.metaTags}}", description: "Auto-generated SEO meta tags (description, OG, keywords)" },
  { key: "{{site.styles}}", description: "Compiled CSS plus head tracking scripts" },
  { key: "{{site.scripts}}", description: "Compiled JS <script> tags" },
];

/** Variables available in body/component Liquid templates */
export const BODY_SYSTEM_VARS: Array<{ key: string; description: string }> = [
  { key: "page.title", description: "Page display title" },
  { key: "page.slug", description: "Page URL slug" },
  { key: "page.metaTitle", description: "Page SEO meta title" },
  { key: "page.metaDescription", description: "Page SEO meta description" },
  { key: "page.content", description: "Rendered page component output" },
  { key: "site.name", description: "Area/site display name" },
  { key: "site.logo", description: "Primary logo URL" },
  { key: "site.logoDark", description: "Dark mode logo URL" },
  { key: "site.favicon", description: "Favicon URL" },
  { key: "styles.bgPrimary", description: "Primary background token" },
  { key: "styles.textPrimary", description: "Primary text token" },
  { key: "styles.borderPrimary", description: "Primary border token" },
];

/** Variables available in menu Liquid templates */
export const MENU_SYSTEM_VARS: Array<{ key: string; description: string }> = [
  { key: "items", description: "Array of menu items ({ label, href, isExternal, children })" },
  { key: "item.label", description: "Menu item display label" },
  { key: "item.href", description: "Menu item URL" },
  { key: "item.isExternal", description: "Whether the link opens externally" },
  { key: "item.children", description: "Nested child menu items" },
  { key: "site.name", description: "Area/site display name" },
  { key: "site.logo", description: "Primary logo URL" },
  { key: "site.logoDark", description: "Dark mode logo URL" },
  { key: "styles.bgPrimary", description: "Primary background token" },
];
