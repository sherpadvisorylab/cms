import { cms } from "@/lib/cms";
import { notFound } from "next/navigation";
import { AreaEditor } from "./AreaEditor";

export default async function EditAreaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [areas, navigations, forms, settings, components, layoutTemplates] = await Promise.all([
    cms.areas.findAll(),
    cms.navigations.findAll().catch(() => []),
    cms.forms.findAll().catch(() => []),
    cms.settings.get().catch(() => null),
    cms.components.findAll().catch(() => []),
    cms.layoutTemplates.findAll().catch(() => []),
  ]);
  const area = areas.find((a) => a.id === id);
  if (!area) notFound();

  const styleVars = Object.keys(
    (settings?.systemVariableDefaults ?? {}) as Record<string, string>
  ).map((k) => ({ key: `system:${k}`, description: (settings?.systemVariableDefaults as Record<string,string>)[k] ?? k }));

  return (
    <AreaEditor
      area={area}
      navigations={navigations.map((n) => ({ id: n.id, name: n.name }))}
      forms={forms.map((f) => ({ variable: f.variable, name: f.name }))}
      styleVars={styleVars}
      uiComponents={components
        .filter((c) => c.type === "ui")
        .map((c) => ({ id: c.id, name: c.name, namespace: c.namespace ?? null, type: "ui" as const }))}
      headTemplates={layoutTemplates.filter((t) => t.type === "head").map((t) => ({ id: t.id, name: t.name, html: t.html }))}
      bodyTemplates={layoutTemplates.filter((t) => t.type === "body").map((t) => ({ id: t.id, name: t.name, html: t.html }))}
    />
  );
}
