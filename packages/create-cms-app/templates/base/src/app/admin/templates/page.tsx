import { cms } from "@/lib/cms";
import { TemplatesClient } from "./TemplatesClient";

export default async function TemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab = "layouts" } = await searchParams;

  const [templates, emailTemplates, settings] = await Promise.all([
    cms.templates.findAll().catch(() => []),
    cms.emailTemplates.findAll().catch(() => []),
    cms.settings.get().catch(() => null),
  ]);

  return (
    <TemplatesClient
      initialTab={(tab as "layouts" | "navigation" | "email" | "page") ?? "layouts"}
      templates={templates}
      emailTemplates={emailTemplates}
      settings={settings}
    />
  );
}
