import type { ComponentInstance } from "./Page";

export type RenderTemplateType = "area_head" | "area_body" | "navigation";
export type TemplateType = "page" | RenderTemplateType;

interface CmsTemplateBase {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface CmsPageTemplate extends CmsTemplateBase {
  type: "page";
  structure: ComponentInstance[];
}

export interface CmsRenderTemplate extends CmsTemplateBase {
  type: RenderTemplateType;
  html: string;
  css?: string | null;
  js?: string | null;
}

export type CmsTemplate = CmsPageTemplate | CmsRenderTemplate;

export type CreateCmsTemplateInput =
  | Omit<CmsPageTemplate, "id" | "createdAt" | "updatedAt">
  | Omit<CmsRenderTemplate, "id" | "createdAt" | "updatedAt">;

export interface UpdateCmsTemplateInput {
  name?: string;
  description?: string;
  structure?: ComponentInstance[];
  html?: string;
  css?: string | null;
  js?: string | null;
}

export function isPageTemplate(template: CmsTemplate): template is CmsPageTemplate {
  return template.type === "page";
}

export function isRenderTemplate(template: CmsTemplate): template is CmsRenderTemplate {
  return template.type !== "page";
}
