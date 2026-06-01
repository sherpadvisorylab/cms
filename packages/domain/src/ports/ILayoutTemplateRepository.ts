import type { CmsLayoutTemplate, LayoutTemplateType } from "../entities/LayoutTemplate";

export interface ILayoutTemplateRepository {
  findAll(): Promise<CmsLayoutTemplate[]>;
  findById(id: string): Promise<CmsLayoutTemplate | null>;
  findByType(type: LayoutTemplateType): Promise<CmsLayoutTemplate[]>;
  create(data: Omit<CmsLayoutTemplate, "id" | "createdAt" | "updatedAt">): Promise<CmsLayoutTemplate>;
  update(id: string, data: Partial<Omit<CmsLayoutTemplate, "id" | "createdAt">>): Promise<CmsLayoutTemplate>;
  delete(id: string): Promise<void>;
}
