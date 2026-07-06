import { cms } from "@/lib/cms";
import { TranslationsManagerClient } from "./TranslationsManagerClient";
import { buildAdminMetadata } from "@/lib/adminMetadata";

export const metadata = buildAdminMetadata(
  "Translations",
  "Manage the {{t.key}} UI-string dictionary used across Liquid templates.",
);

export default async function TranslationsPage() {
  const [entries, settings] = await Promise.all([
    cms.translations.findAll().catch(() => []),
    cms.settings.get().catch(() => null),
  ]);

  const branding = settings?.branding;
  const multiLanguageEnabled = branding?.multiLanguageEnabled ?? false;
  const globalLocales = branding?.locales ?? [];
  const defaultLocale =
    (globalLocales.find((l) => l.isDefault) ?? globalLocales[0])?.code ??
    branding?.defaultLanguage ??
    "en";
  const supportedLocales =
    multiLanguageEnabled && globalLocales.length > 0
      ? globalLocales.map((l) => l.code)
      : branding?.supportedLocales ?? [defaultLocale];

  return (
    <TranslationsManagerClient
      initialEntries={entries}
      defaultLocale={defaultLocale}
      supportedLocales={multiLanguageEnabled ? supportedLocales : [defaultLocale]}
    />
  );
}
