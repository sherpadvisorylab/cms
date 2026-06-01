import { NextResponse } from "next/server";
import { cms } from "@/lib/cms";
import type { CmsSettings } from "@cms/domain";

// Built-in style variable keys — always included even if settings has no overrides
const BUILTIN_STYLE_KEYS = [
  "bg-primary", "bg-secondary", "bg-accent", "bg-surface",
  "text-primary", "text-secondary", "text-muted", "text-accent",
  "border-primary", "border-secondary", "border-muted",
];

function buildStyleVars(settings: CmsSettings | null): { key: string; description: string }[] {
  const defaults = (settings?.systemVariableDefaults ?? {}) as Record<string, string>;
  const customKeys = (settings?.customVariableKeys ?? []) as string[];

  // All system vars use the "system:" namespace prefix in the template editor.
  // {{system:bg-primary}} is pre-resolved by the CMS engine before LiquidJS runs.
  // The colon excludes them from the component's Variables panel automatically.
  const vars: { key: string; description: string }[] = BUILTIN_STYLE_KEYS.map((k) => ({
    key:         `system:${k}`,
    description: defaults[k] ?? k,
  }));

  // Add custom variables not already in built-ins
  for (const k of customKeys) {
    if (!BUILTIN_STYLE_KEYS.includes(k)) {
      vars.push({ key: `system:${k}`, description: defaults[k] ?? k });
    }
  }

  return vars;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [component, version, forms, settings, allComponents] = await Promise.all([
    cms.components.findById(id),
    cms.componentVersions.getLatest(id),
    cms.forms.findAll().catch(() => []),
    cms.settings.get().catch(() => null),
    cms.components.findAll().catch(() => []),
  ]);

  if (!component) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    id:              component.id,
    name:            component.name,
    namespace:       component.namespace ?? null,
    componentType:   component.type ?? "page",
    status:          component.status,
    previewImageUrl: component.previewImageUrl ?? "",
    templateLiquid:    version?.templateLiquid ?? "",
    schemaJson:        version?.schema ?? [],
    schemaOrgTemplate: version?.schemaOrgTemplate ?? "",
    css:               version?.css ?? "",
    js:                version?.js ?? "",
    version:           version?.version ?? 0,
    forms:      forms.map((f) => ({ variable: f.variable, name: f.name })),
    components: allComponents
      .filter((c) => c.id !== id) // exclude self to prevent direct self-embed
      .map((c) => ({ id: c.id, name: c.name, namespace: c.namespace ?? null, type: c.type ?? "page" })),
    // Style vars from settings: systemVariableDefaults + customVariableKeys
    // These appear in the {{ }} context menu of the template editor.
    styleVars: buildStyleVars(settings),
  });
}
