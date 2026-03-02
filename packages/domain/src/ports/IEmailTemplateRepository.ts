import type { EmailTemplate } from "../entities/EmailTemplate";

export interface IEmailTemplateRepository {
  findAll(): Promise<EmailTemplate[]>;
  findByKey(key: string): Promise<EmailTemplate | null>;
  create(template: Omit<EmailTemplate, "id" | "createdAt" | "updatedAt">): Promise<EmailTemplate>;
  update(id: string, updates: Partial<Pick<EmailTemplate, "subject" | "body">>): Promise<EmailTemplate>;
  resetToDefault(key: string): Promise<EmailTemplate | null>;
}
