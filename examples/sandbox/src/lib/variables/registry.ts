import type { CmsSettings, CmsVariableDefinition, CmsVariableNamespace } from "@sherpacms/domain";
import type { ComponentEmbed, FormEmbed, LocalVar, NavEmbed } from "@/components/admin/CodeEditor";
import type { PickerSection } from "@/components/admin/VariablePickerPopup";

type RegistryNamespace = CmsVariableNamespace | "page" | "component";

export type VariablePickerContext =
  | "area_head"
  | "area_body"
  | "component_template"
  | "component_schema"
  | "navigation_template"
  | "layout_template"
  | "page_schema_manual"
  | "collection_template";

type BuiltInVariableDefinition = {
  namespace: RegistryNamespace;
  key: string;
  label: string;
  description: string;
};

type BuiltInStyleVariable = {
  key: string;
  label: string;
  description: string;
  defaultValue: string;
};

type PickerSources = {
  settings?: CmsSettings | null;
  localVars?: LocalVar[];
  localVarsLabel?: string;
  formEmbeds?: FormEmbed[];
  navEmbeds?: NavEmbed[];
  componentEmbeds?: ComponentEmbed[];
};

type PickerContextConfig = {
  namespaces: RegistryNamespace[];
  allowLocalVariables: boolean;
  localSectionLabel?: string;
  allowFormEmbeds: boolean;
  allowNavigationEmbeds: boolean;
  allowComponentEmbeds: boolean;
  allowIfHelper: boolean;
  allowForHelper: boolean;
};

export const BUILT_IN_STYLE_VARIABLES: BuiltInStyleVariable[] = [
  { key: "bgPrimary", label: "Background Primary", description: "Primary background token", defaultValue: "bg-primary" },
  { key: "bgSecondary", label: "Background Secondary", description: "Secondary background token", defaultValue: "bg-secondary" },
  { key: "bgAccent", label: "Background Accent", description: "Accent background token", defaultValue: "bg-accent" },
  { key: "bgSurface", label: "Background Surface", description: "Surface background token", defaultValue: "bg-surface" },
  { key: "textPrimary", label: "Text Primary", description: "Primary text token", defaultValue: "text-primary" },
  { key: "textSecondary", label: "Text Secondary", description: "Secondary text token", defaultValue: "text-secondary" },
  { key: "textMuted", label: "Text Muted", description: "Muted text token", defaultValue: "text-muted" },
  { key: "textAccent", label: "Text Accent", description: "Accent text token", defaultValue: "text-accent" },
  { key: "borderPrimary", label: "Border Primary", description: "Primary border token", defaultValue: "border-primary" },
  { key: "borderSecondary", label: "Border Secondary", description: "Secondary border token", defaultValue: "border-secondary" },
  { key: "borderMuted", label: "Border Muted", description: "Muted border token", defaultValue: "border-muted" },
];

const BUILT_IN_VARIABLES: BuiltInVariableDefinition[] = [
  { namespace: "site", key: "name", label: "Site Name", description: "Primary site name" },
  { namespace: "site", key: "permalink", label: "Site Permalink", description: "Current page canonical URL" },
  { namespace: "site", key: "logo", label: "Site Logo", description: "Primary logo URL" },
  { namespace: "site", key: "logoDark", label: "Site Logo Dark", description: "Dark-mode logo URL" },
  { namespace: "site", key: "favicon", label: "Favicon", description: "Site favicon URL" },
  { namespace: "site", key: "metaTags", label: "Meta Tags", description: "Auto-generated SEO meta tags" },
  { namespace: "site", key: "styles", label: "Injected Styles", description: "Rendered CSS for the current page" },
  { namespace: "site", key: "scripts", label: "Injected Scripts", description: "Rendered JavaScript for the current page" },
  { namespace: "site", key: "trackingScripts", label: "Tracking Scripts", description: "Tracking scripts injected in the body wrapper" },
  { namespace: "page", key: "title", label: "Page Title", description: "Current page title" },
  { namespace: "page", key: "slug", label: "Page Slug", description: "Current page slug" },
  { namespace: "page", key: "permalink", label: "Page Permalink", description: "Current canonical page route" },
  { namespace: "page", key: "metaTitle", label: "Page Meta Title", description: "SEO meta title or page title" },
  { namespace: "page", key: "metaDescription", label: "Page Meta Description", description: "SEO meta description" },
  { namespace: "page", key: "content", label: "Rendered Content", description: "Rendered page component output" },
  { namespace: "component", key: "name", label: "Component Name", description: "Current component name" },
  { namespace: "component", key: "namespace", label: "Component Namespace", description: "Current component namespace" },
];

const CONTEXT_MATRIX: Record<VariablePickerContext, PickerContextConfig> = {
  area_head: {
    namespaces: ["site", "page", "styles"],
    allowLocalVariables: false,
    allowFormEmbeds: false,
    allowNavigationEmbeds: false,
    allowComponentEmbeds: false,
    allowIfHelper: false,
    allowForHelper: false,
  },
  area_body: {
    namespaces: ["site", "page", "styles"],
    allowLocalVariables: false,
    allowFormEmbeds: true,
    allowNavigationEmbeds: true,
    allowComponentEmbeds: true,
    allowIfHelper: true,
    allowForHelper: true,
  },
  component_template: {
    namespaces: ["site", "page", "styles"],
    allowLocalVariables: true,
    localSectionLabel: "Component Variables",
    allowFormEmbeds: true,
    allowNavigationEmbeds: true,
    allowComponentEmbeds: true,
    allowIfHelper: true,
    allowForHelper: true,
  },
  component_schema: {
    namespaces: ["site", "page", "styles"],
    allowLocalVariables: true,
    localSectionLabel: "Component Variables",
    allowFormEmbeds: false,
    allowNavigationEmbeds: true,
    allowComponentEmbeds: false,
    allowIfHelper: false,
    allowForHelper: false,
  },
  navigation_template: {
    namespaces: ["site", "page", "styles"],
    allowLocalVariables: true,
    localSectionLabel: "Menu Variables",
    allowFormEmbeds: false,
    allowNavigationEmbeds: false,
    allowComponentEmbeds: false,
    allowIfHelper: true,
    allowForHelper: true,
  },
  layout_template: {
    namespaces: ["site", "page", "styles"],
    allowLocalVariables: false,
    allowFormEmbeds: true,
    allowNavigationEmbeds: true,
    allowComponentEmbeds: true,
    allowIfHelper: true,
    allowForHelper: true,
  },
  page_schema_manual: {
    namespaces: ["site", "page", "styles", "component"],
    allowLocalVariables: true,
    localSectionLabel: "Schema Variables",
    allowFormEmbeds: false,
    allowNavigationEmbeds: false,
    allowComponentEmbeds: false,
    allowIfHelper: false,
    allowForHelper: false,
  },
  collection_template: {
    namespaces: ["site", "page", "styles"],
    allowLocalVariables: true,
    localSectionLabel: "Collection Variables",
    allowFormEmbeds: false,
    allowNavigationEmbeds: true,
    allowComponentEmbeds: true,
    allowIfHelper: true,
    allowForHelper: true,
  },
};

export function getPickerContextConfig(context: VariablePickerContext): PickerContextConfig {
  return CONTEXT_MATRIX[context];
}

export function getStoredVariableDefinitions(settings?: CmsSettings | null): CmsVariableDefinition[] {
  return [...(settings?.variables ?? [])];
}

export function getDefaultStyleVariableDefinitions(): CmsVariableDefinition[] {
  return BUILT_IN_STYLE_VARIABLES.map((variable) => ({
    namespace: "styles",
    key: variable.key,
    label: variable.label,
    description: variable.description,
    type: "text",
    value: variable.defaultValue,
  }));
}

export function mergeSettingVariables(settings?: CmsSettings | null): CmsVariableDefinition[] {
  const stored = new Map(
    getStoredVariableDefinitions(settings).map((variable) => [`${variable.namespace}.${variable.key}`, variable] as const),
  );

  const merged = [...getDefaultStyleVariableDefinitions()];
  for (const builtIn of merged) {
    const storedVersion = stored.get(`${builtIn.namespace}.${builtIn.key}`);
    if (storedVersion) {
      Object.assign(builtIn, storedVersion);
      stored.delete(`${builtIn.namespace}.${builtIn.key}`);
    }
  }

  for (const variable of stored.values()) {
    merged.push(variable);
  }

  return merged;
}

export function toLiquidVariableToken(namespace: RegistryNamespace, key: string): string {
  return `{{${namespace}.${key}}}`;
}

function buildVariableSections(
  namespaces: RegistryNamespace[],
  settings?: CmsSettings | null,
): PickerSection[] {
  const storedVariables = mergeSettingVariables(settings);
  const sections: PickerSection[] = [];

  for (const namespace of namespaces) {
    const builtIn = BUILT_IN_VARIABLES.filter((variable) => variable.namespace === namespace);
    const custom = storedVariables.filter((variable) => variable.namespace === namespace);
    const items = [
      ...builtIn.map((variable) => ({
        label: toLiquidVariableToken(namespace, variable.key),
        apply: toLiquidVariableToken(namespace, variable.key),
        detail: variable.description,
      })),
      ...custom.map((variable) => ({
        label: toLiquidVariableToken(variable.namespace, variable.key),
        apply: toLiquidVariableToken(variable.namespace, variable.key),
        detail: variable.description || variable.label,
      })),
    ];

    if (items.length === 0) continue;

    sections.push({
      id: namespace,
      icon: namespace === "site" ? "🌐" : namespace === "styles" ? "🎨" : namespace === "page" ? "📄" : "🧩",
      label: namespace === "site" ? "Site" : namespace === "styles" ? "Styles" : namespace === "page" ? "Page" : "Component",
      items,
    });
  }

  return sections;
}

function buildLocalSection(localVars: LocalVar[], label: string): PickerSection {
  return {
    id: "local",
    icon: "⬡",
    label,
    items: localVars.map((variable) => ({
      label: `{{${variable.key}}}`,
      apply: `{{${variable.key}}}`,
      detail: variable.label + (variable.type !== "text" ? ` (${variable.type})` : ""),
    })),
  };
}

function normalizeComponentEmbedLabel(component: ComponentEmbed) {
  return component.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function buildVariablePickerSections(context: VariablePickerContext, sources: PickerSources): PickerSection[] {
  const config = getPickerContextConfig(context);
  const sections: PickerSection[] = [];

  if (config.allowLocalVariables && (sources.localVars?.length ?? 0) > 0) {
    sections.push(
      buildLocalSection(
        sources.localVars ?? [],
        sources.localVarsLabel ?? config.localSectionLabel ?? "Local Variables",
      ),
    );
  }

  sections.push(...buildVariableSections(config.namespaces, sources.settings));

  if (config.allowComponentEmbeds) {
    const components = sources.componentEmbeds ?? [];
    if (components.length > 0) {
      sections.push({
        id: "components-ui",
        icon: "🧩",
        label: "UI Components",
        items: components.map((component) => ({
          label: `{{component:${normalizeComponentEmbedLabel(component)}}}`,
          apply: `{{component:${normalizeComponentEmbedLabel(component)}}}`,
          detail: component.name + (component.namespace ? ` · ${component.namespace}` : ""),
        })),
      });
    }
  }

  if (config.allowNavigationEmbeds) {
    sections.push({
      id: "navigation",
      icon: "🧭",
      label: "Navigation",
      items: (sources.navEmbeds ?? []).map((navigation) => {
        const key = navigation.name.toLowerCase().replace(/\s+/g, "-");
        return {
          label: `{{navigation:${key}}}`,
          apply: `{{navigation:${key}}}`,
          detail: navigation.name,
        };
      }),
    });
  }

  if (config.allowFormEmbeds) {
    sections.push({
      id: "forms",
      icon: "📋",
      label: "Forms",
      items: (sources.formEmbeds ?? []).map((form) => ({
        label: `{{form:${form.variable}}}`,
        apply: `{{form:${form.variable}}}`,
        detail: form.name,
      })),
    });
  }

  return sections;
}
