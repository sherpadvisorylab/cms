/** Finds every distinct `{{t.key}}` reference in a Liquid template, in first-seen order. */
export function extractUsedTranslationKeys(source: string): string[] {
  const keys: string[] = [];
  const seen = new Set<string>();
  const pattern = /\{\{\s*t\.([a-zA-Z_][a-zA-Z0-9_]*)/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source)) !== null) {
    if (!seen.has(match[1])) {
      seen.add(match[1]);
      keys.push(match[1]);
    }
  }
  return keys;
}

/** Derives the configured locale codes + default locale from CmsSettings branding, mirroring the logic used across admin pages. */
export function resolveConfiguredLocales(settings?: { branding?: { multiLanguageEnabled?: boolean; locales?: { code: string; isDefault?: boolean }[]; defaultLanguage?: string; supportedLocales?: string[] } } | null): {
  locales: string[];
  defaultLocale: string;
} {
  const branding = settings?.branding;
  const multiLanguageEnabled = branding?.multiLanguageEnabled ?? false;
  const globalLocales = branding?.locales ?? [];
  const defaultLocale =
    (globalLocales.find((l) => l.isDefault) ?? globalLocales[0])?.code ?? branding?.defaultLanguage ?? "en";
  if (!multiLanguageEnabled) return { locales: [defaultLocale], defaultLocale };
  const locales =
    globalLocales.length > 0 ? globalLocales.map((l) => l.code) : branding?.supportedLocales ?? [defaultLocale];
  return { locales, defaultLocale };
}
