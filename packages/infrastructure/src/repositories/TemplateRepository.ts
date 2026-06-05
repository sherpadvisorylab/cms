import type {
  CmsTemplate,
  CreateCmsTemplateInput,
  ITemplateRepository,
  TemplateType,
  UpdateCmsTemplateInput,
} from "@sherpacms/domain";
import type { StorageAdapter } from "../adapters/StorageAdapter";
import { generateId } from "../utils/storage";

export class TemplateRepository implements ITemplateRepository {
  constructor(private adapter: StorageAdapter) {}

  async findAll(): Promise<CmsTemplate[]> {
    return this.adapter.getAll<CmsTemplate>("templates");
  }

  async findById(id: string): Promise<CmsTemplate | null> {
    return this.adapter.getById<CmsTemplate>("templates", id);
  }

  async findByType(type: TemplateType): Promise<CmsTemplate[]> {
    return this.adapter.getAll<CmsTemplate>("templates", { type });
  }

  async create(template: CreateCmsTemplateInput): Promise<CmsTemplate> {
    const newTemplate: CmsTemplate =
      template.type === "page"
        ? {
            ...template,
            id: generateId(),
            createdAt: new Date(),
          }
        : {
            ...template,
            id: generateId(),
            createdAt: new Date(),
          };
    return this.adapter.create("templates", newTemplate);
  }

  async update(id: string, data: UpdateCmsTemplateInput): Promise<CmsTemplate> {
    return this.adapter.update<CmsTemplate>("templates", id, data);
  }

  async delete(id: string): Promise<void> {
    return this.adapter.delete("templates", id);
  }
}
