import { cms } from "@/lib/cms";
import { TemplatesClient } from "./TemplatesClient";
import { buildAdminMetadata } from "@/lib/adminMetadata";

const TEMPLATE_TAB_METADATA = {
  layouts: buildAdminMetadata(
    "Layout Templates",
    "Manage reusable head and body layout templates used across areas.",
  ),
  navigation: buildAdminMetadata(
    "Navigation Templates",
    "Manage reusable navigation templates used in menus and site navigation.",
  ),
  email: buildAdminMetadata(
    "Email Templates",
    "Manage reusable email templates, keys, and delivery-ready content.",
  ),
  page: buildAdminMetadata(
    "Page Templates",
    "Manage reusable page templates that can be applied when creating new pages.",
  ),
} as const;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab = "layouts" } = await searchParams;
  return TEMPLATE_TAB_METADATA[(tab as keyof typeof TEMPLATE_TAB_METADATA) ?? "layouts"] ??
    TEMPLATE_TAB_METADATA.layouts;
}

export default async function TemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab = "layouts" } = await searchParams;

  const [templates, emailTemplates, settings, translationEntries] = await Promise.all([
    cms.templates.findAll().catch(() => []),
    cms.emailTemplates.findAll().catch(() => []),
    cms.settings.get().catch(() => null),
    cms.translations.findAll().catch(() => []),
  ]);

  return (
    <TemplatesClient
      initialTab={(tab as "layouts" | "navigation" | "email" | "page") ?? "layouts"}
      templates={templates}
      emailTemplates={emailTemplates}
      settings={settings}
      translationEntries={translationEntries}
    />
  );
}
