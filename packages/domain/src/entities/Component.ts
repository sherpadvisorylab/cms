export type ComponentStatus = "draft" | "published";
export const COMPONENT_STATUSES = ["draft", "published"] as const;

export type ComponentType = "page" | "ui" | "navigation";
export const COMPONENT_TYPES = ["page", "ui", "navigation"] as const;

export const COMPONENT_TYPE_LABELS: Record<ComponentType, string> = {
  page: "Page components",
  ui: "UI components",
  navigation: "Navigation components",
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
  navigation: [
    "Header", "Navbar", "Breadcrumb", "Sidebar", "Sidebar nav",
    "Footer nav", "Tabs", "Pagination", "Menu", "Mega menu", "Mobile menu",
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
  createdBy?: string | null;
  createdAt: Date;
}

export type SchemaFieldType = "text" | "textarea" | "image_url" | "video_url" | "color" | "toggle" | "number" | "select";
export const SCHEMA_FIELD_TYPES: SchemaFieldType[] = ["text", "textarea", "image_url", "video_url", "color", "toggle", "number", "select"];

export interface ComponentSchemaField {
  key: string;
  label: string;
  type: SchemaFieldType;
  defaultValue?: unknown;
  options?: { label: string; value: string }[];
}
