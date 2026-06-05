import { cms } from "@/lib/cms";
import type { CmsRenderTemplate } from "@sherpacms/domain";
import { notFound } from "next/navigation";
import { AreaEditor } from "./AreaEditor";

type RenderTemplateWithAssets = CmsRenderTemplate & { css?: string | null; js?: string | null };

export default async function EditAreaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [areas, navigations, forms, settings, components, templates] = await Promise.all([
    cms.areas.findAll(),
    cms.navigations.findAll().catch(() => []),
    cms.forms.findAll().catch(() => []),
    cms.settings.get().catch(() => null),
    cms.components.findAll().catch(() => []),
    cms.templates.findAll().catch(() => []),
  ]);
  const area = areas.find((a) => a.id === id);
  if (!area) notFound();

  const renderTemplates = templates.filter(
    (template): template is RenderTemplateWithAssets => template.type !== "page",
  ) as RenderTemplateWithAssets[];

  return (
    <AreaEditor
      area={area}
      settings={settings}
      navigations={navigations.map((n) => ({ id: n.id, name: n.name }))}
      forms={forms.map((f) => ({ variable: f.variable, name: f.name }))}
      uiComponents={components
        .filter((c) => c.type === "ui")
        .map((c) => ({ id: c.id, name: c.name, namespace: c.namespace ?? null, type: "ui" as const }))}
      headTemplates={renderTemplates
        .filter((t) => t.type === "area_head")
        .map((t) => ({ id: t.id, name: t.name, html: t.html, css: t.css ?? "", js: t.js ?? "" }))}
      bodyTemplates={renderTemplates
        .filter((t) => t.type === "area_body")
        .map((t) => ({ id: t.id, name: t.name, html: t.html, css: t.css ?? "", js: t.js ?? "" }))}
    />
  );
}
