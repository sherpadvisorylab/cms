import { cms } from "@/lib/cms";
import { getPrimaryPublicAreaName } from "@/lib/publicPageResolver";

export const dynamic = "force-dynamic";
export const revalidate = 60;

export async function GET() {
  try {
    const [areaName, settings] = await Promise.all([
      getPrimaryPublicAreaName(),
      cms.settings.get().catch(() => null),
    ]);
    const area = await cms.areas.findByKey(areaName);

    const branding = settings?.branding;
    const multiLanguageEnabled = branding?.multiLanguageEnabled ?? false;

    // Derive defaultLocale: area override → locales[isDefault] → branding.defaultLanguage → env → "en"
    const globalLocales = branding?.locales ?? [];
    const defaultEntry = globalLocales.find((l) => l.isDefault) ?? globalLocales[0];

    const defaultLocale =
      area?.defaultLocale ??
      defaultEntry?.code ??
      branding?.defaultLanguage ??
      process.env.SHERPA_DEFAULT_LOCALE ??
      "en";

    const supportedLocales =
      area?.supportedLocales ??
      (multiLanguageEnabled && globalLocales.length > 0
        ? globalLocales.map((l) => l.code)
        : branding?.supportedLocales) ??
      [defaultLocale];

    return Response.json({ defaultLocale, supportedLocales, multiLanguageEnabled });
  } catch {
    const fallback = process.env.SHERPA_DEFAULT_LOCALE ?? "en";
    return Response.json({ defaultLocale: fallback, supportedLocales: [fallback], multiLanguageEnabled: false });
  }
}
