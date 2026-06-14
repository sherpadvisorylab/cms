/**
 * Negotiate the best locale for the user based on the Accept-Language header
 * and the area's supported locales.
 *
 * Returns the best matching locale, or the defaultLocale if no match is found.
 */
export function negotiateLocale(
  acceptLanguageHeader: string | null,
  supportedLocales: string[],
  defaultLocale: string,
): string {
  if (!acceptLanguageHeader || supportedLocales.length === 0) return defaultLocale;

  const accepted = parseAcceptLanguage(acceptLanguageHeader);

  for (const { lang } of accepted) {
    const full = lang.toLowerCase();
    const short = full.split("-")[0];

    const exactMatch = supportedLocales.find((l) => l.toLowerCase() === full);
    if (exactMatch) return exactMatch;

    const shortMatch = supportedLocales.find((l) => l.toLowerCase() === short);
    if (shortMatch) return shortMatch;
  }

  return defaultLocale;
}

/** Parse Accept-Language header into sorted {lang, quality} array */
function parseAcceptLanguage(header: string): Array<{ lang: string; quality: number }> {
  return header
    .split(",")
    .map((part) => {
      const [lang, q] = part.trim().split(";q=");
      return { lang: (lang ?? "").trim(), quality: q ? parseFloat(q) : 1.0 };
    })
    .filter((e) => e.lang)
    .sort((a, b) => b.quality - a.quality);
}

/** Cookie name for persisting locale preference */
export const LOCALE_COOKIE = "NEXT_LOCALE";

/** Cookie name for admin working locale */
export const ADMIN_LOCALE_COOKIE = "SHERPA_ADMIN_LOCALE";
