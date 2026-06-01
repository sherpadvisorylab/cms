import { cms } from "@/lib/cms";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { TemplatesClient } from "./TemplatesClient";

export default async function TemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab = "layouts" } = await searchParams;

  const [layoutTemplates, emailTemplates, pageTemplates] = await Promise.all([
    cms.layoutTemplates.findAll().catch(() => []),
    cms.emailTemplates.findAll().catch(() => []),
    cms.templates.findAll().catch(() => []),
  ]);

  return (
    <TemplatesClient
      initialTab={(tab as "layouts" | "email" | "page") ?? "layouts"}
      layoutTemplates={layoutTemplates}
      emailTemplates={emailTemplates}
      pageTemplates={pageTemplates}
    />
  );
}
