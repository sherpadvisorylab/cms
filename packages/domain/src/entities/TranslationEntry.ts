/**
 * A single UI-string dictionary entry, referenced from Liquid templates as `{{t.key}}`.
 * Covers text baked into template "chrome" (nav display templates, component templates,
 * collection view/detail templates, area head/body) that isn't tied to any single page's
 * content and therefore has no natural home as a component prop.
 */
export interface CmsTranslationEntry {
  id: string;
  /** Stable identifier used as `{{t.key}}` in Liquid. Snake_case by convention, immutable once used in a template. */
  key: string;
  /** Optional note for editors/AI on where/how this string is used. */
  description?: string;
  /** Per-locale text, keyed by locale code. The default locale's value is the fallback for missing translations. */
  values: Record<string, string>;
}
