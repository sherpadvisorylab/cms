import type { EmailTemplate } from "@cms/domain";
import type { IEmailTemplateRepository } from "@cms/domain";
import type { StorageAdapter } from "../adapters/StorageAdapter";
import { generateId } from "../utils/storage";

export class EmailTemplateRepository implements IEmailTemplateRepository {
  constructor(private adapter: StorageAdapter) {}

  async findAll(): Promise<EmailTemplate[]> {
    return this.adapter.getAll<EmailTemplate>("emailTemplates");
  }

  async findByKey(key: string): Promise<EmailTemplate | null> {
    const templates = await this.adapter.getAll<EmailTemplate>("emailTemplates", {
      templateKey: key,
    });
    return templates[0] ?? null;
  }

  async create(
    template: Omit<EmailTemplate, "id" | "createdAt" | "updatedAt">,
  ): Promise<EmailTemplate> {
    const newTemplate: EmailTemplate = {
      ...template,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    return this.adapter.create("emailTemplates", newTemplate);
  }

  async update(
    id: string,
    updates: Partial<Pick<EmailTemplate, "subject" | "body">>,
  ): Promise<EmailTemplate> {
    return this.adapter.update<EmailTemplate>("emailTemplates", id, {
      ...updates,
      updatedAt: new Date(),
    });
  }

  /**
   * Reset a template to its factory default.
   * In this adapter-based implementation, "default" means the original seeded value.
   * For the InMemory/LocalStorage adapters there is no separate defaults store,
   * so this is a no-op that returns the current template unchanged.
   * Consumers that need reset-to-default should seed a separate "defaults" collection.
   */
  async resetToDefault(key: string): Promise<EmailTemplate | null> {
    return this.findByKey(key);
  }
}
