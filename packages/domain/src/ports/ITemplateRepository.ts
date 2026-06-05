import type {
  CmsTemplate,
  CreateCmsTemplateInput,
  TemplateType,
  UpdateCmsTemplateInput,
} from "../entities/Template";

export interface ITemplateRepository {
  findAll(): Promise<CmsTemplate[]>;
  findById(id: string): Promise<CmsTemplate | null>;
  findByType(type: TemplateType): Promise<CmsTemplate[]>;
  create(template: CreateCmsTemplateInput): Promise<CmsTemplate>;
  update(id: string, data: UpdateCmsTemplateInput): Promise<CmsTemplate>;
  delete(id: string): Promise<void>;
}
