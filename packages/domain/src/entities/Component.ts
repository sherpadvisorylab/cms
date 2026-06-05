export type ComponentStatus = "draft" | "published";
export const COMPONENT_STATUSES = ["draft", "published"] as const;

export type ComponentType = "page" | "ui";
export const COMPONENT_TYPES = ["page", "ui"] as const;

export const COMPONENT_TYPE_LABELS: Record<ComponentType, string> = {
  page: "Page components",
  ui: "UI components",
};

export const COMPONENT_CATEGORIES_BY_TYPE: Record<ComponentType, string[]> = {
  page: [
    "Hero", "Content block", "Features", "Testimonials", "CTA",
    "Team", "Pricing", "FAQ", "Contact", "Footer",
    "Gallery", "Stats", "Newsletter", "Map",
  ],
  ui: [
    "Container", "Wrapper", "Grid", "Columns", "Spacer",
    "Divider", "Layout block", "Fixed block", "Decorative",
  ],
};

export interface CmsComponent {
  id: string;
  name: string;
  namespace?: string | null;
  type?: ComponentType;
  category?: string;
  description?: string;
  status: ComponentStatus;
  /** Bitmap thumbnail shown in the picker. Falls back to a type-icon when null. */
  previewImageUrl?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ComponentVersion {
  id: string;
  componentId: string;
  version: number;
  templateLiquid: string;
  schema?: ComponentSchemaField[] | null;
  css?: string | null;
  js?: string | null;
  schemaOrgTemplate?: string | null;
  createdBy?: string | null;
  createdAt: Date;
}

export type SchemaFieldType = "text" | "textarea" | "richtext" | "image_url" | "video_url" | "color" | "toggle" | "number" | "select" | "list";
export const SCHEMA_FIELD_TYPES: SchemaFieldType[] = ["text", "textarea", "richtext", "image_url", "video_url", "color", "toggle", "number", "select", "list"];

export interface ComponentSchemaField {
  key: string;
  label: string;
  type: SchemaFieldType;
  defaultValue?: unknown;
  options?: { label: string; value: string }[];
  /** Inline help text shown next to the label as a tooltip. Optional. */
  helpText?: string;
  /**
   * For `list` fields: the schema of each item. Nested lists are not supported
   * (one level only) for storage tractability and editor UX.
   * The stored prop value is `Array<Record<string, unknown>>`.
   */
  childSchema?: ComponentSchemaField[];
}
