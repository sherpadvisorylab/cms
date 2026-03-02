import type { CmsTemplate, ITemplateRepository } from "@cms/domain";
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

  async create(template: Omit<CmsTemplate, "id" | "createdAt">): Promise<CmsTemplate> {
    const newTemplate: CmsTemplate = {
      ...template,
      id: generateId(),
      createdAt: new Date(),
    };
    return this.adapter.create("templates", newTemplate);
  }

  async delete(id: string): Promise<void> {
    return this.adapter.delete("templates", id);
  }
}
