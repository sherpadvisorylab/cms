export type ComponentStatus = "draft" | "published";

export type ComponentType = "page" | "ui" | "navigation";

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

export interface ComponentSchemaField {
  key: string;
  label: string;
  type: "text" | "textarea" | "image_url" | "color" | "toggle" | "number" | "select";
  defaultValue?: unknown;
  options?: { label: string; value: string }[];
}
