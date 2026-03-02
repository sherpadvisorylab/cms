import type { CmsTemplate } from "../entities/Template";

export interface ITemplateRepository {
  findAll(): Promise<CmsTemplate[]>;
  findById(id: string): Promise<CmsTemplate | null>;
  create(template: Omit<CmsTemplate, "id" | "createdAt">): Promise<CmsTemplate>;
  delete(id: string): Promise<void>;
}
