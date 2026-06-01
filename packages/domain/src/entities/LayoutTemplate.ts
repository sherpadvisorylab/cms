export type LayoutTemplateType = "head" | "body";

export interface CmsLayoutTemplate {
  id: string;
  name: string;
  description?: string;
  type: LayoutTemplateType;
  html: string;
  createdAt: Date;
  updatedAt?: Date;
}
