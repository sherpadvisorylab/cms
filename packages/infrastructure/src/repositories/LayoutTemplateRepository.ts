import type { CmsLayoutTemplate, LayoutTemplateType, ILayoutTemplateRepository } from "@cms/domain";
import type { StorageAdapter } from "../adapters/StorageAdapter";
import { generateId } from "../utils/storage";

export class LayoutTemplateRepository implements ILayoutTemplateRepository {
  constructor(private adapter: StorageAdapter) {}

  async findAll(): Promise<CmsLayoutTemplate[]> {
    return this.adapter.getAll<CmsLayoutTemplate>("layoutTemplates");
  }

  async findById(id: string): Promise<CmsLayoutTemplate | null> {
    return this.adapter.getById<CmsLayoutTemplate>("layoutTemplates", id);
  }

  async findByType(type: LayoutTemplateType): Promise<CmsLayoutTemplate[]> {
    return this.adapter.getAll<CmsLayoutTemplate>("layoutTemplates", { type });
  }

  async create(data: Omit<CmsLayoutTemplate, "id" | "createdAt" | "updatedAt">): Promise<CmsLayoutTemplate> {
    const item: CmsLayoutTemplate = {
      ...data,
      id: generateId(),
      createdAt: new Date(),
    };
    return this.adapter.create("layoutTemplates", item);
  }

  async update(id: string, data: Partial<Omit<CmsLayoutTemplate, "id" | "createdAt">>): Promise<CmsLayoutTemplate> {
    return this.adapter.update<CmsLayoutTemplate>("layoutTemplates", id, data);
  }

  async delete(id: string): Promise<void> {
    return this.adapter.delete("layoutTemplates", id);
  }
}
