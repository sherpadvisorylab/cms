import type { CmsTemplate } from "@cms/domain";
import { getFromStorage, setToStorage, generateId } from "../utils/storage";

const TEMPLATES_KEY = "cms:templates";

export interface ITemplateRepository {
  findAll(): Promise<CmsTemplate[]>;
  findById(id: string): Promise<CmsTemplate | null>;
  create(template: Omit<CmsTemplate, "id" | "createdAt">): Promise<CmsTemplate>;
  delete(id: string): Promise<void>;
}

export class TemplateRepository implements ITemplateRepository {
  async findAll(): Promise<CmsTemplate[]> {
    return getFromStorage<CmsTemplate[]>(TEMPLATES_KEY) ?? [];
  }

  async findById(id: string): Promise<CmsTemplate | null> {
    const templates = getFromStorage<CmsTemplate[]>(TEMPLATES_KEY) ?? [];
    return templates.find((t) => t.id === id) ?? null;
  }

  async create(
    template: Omit<CmsTemplate, "id" | "createdAt">
  ): Promise<CmsTemplate> {
    const templates = getFromStorage<CmsTemplate[]>(TEMPLATES_KEY) ?? [];
    const newTemplate: CmsTemplate = {
      ...template,
      id: generateId(),
      createdAt: new Date(),
    };
    templates.push(newTemplate);
    setToStorage(TEMPLATES_KEY, templates);
    return newTemplate;
  }

  async delete(id: string): Promise<void> {
    const templates = getFromStorage<CmsTemplate[]>(TEMPLATES_KEY) ?? [];
    const filtered = templates.filter((t) => t.id !== id);
    setToStorage(TEMPLATES_KEY, filtered);
  }
}
