import type { CmsForm, IFormRepository } from "@cms/domain";
import type { StorageAdapter } from "../adapters/StorageAdapter";
import { generateId } from "../utils/storage";

export class FormRepository implements IFormRepository {
  constructor(private adapter: StorageAdapter) {}

  async findAll(): Promise<CmsForm[]> {
    return this.adapter.getAll<CmsForm>("forms");
  }

  async findById(id: string): Promise<CmsForm | null> {
    return this.adapter.getById<CmsForm>("forms", id);
  }

  async findByVariable(variable: string): Promise<CmsForm | null> {
    const forms = await this.adapter.getAll<CmsForm>("forms", { variable });
    return forms[0] ?? null;
  }

  async create(form: Omit<CmsForm, "id">): Promise<CmsForm> {
    const newForm: CmsForm = {
      ...form,
      id: generateId(),
    };
    return this.adapter.create("forms", newForm);
  }

  async update(id: string, updates: Partial<CmsForm>): Promise<CmsForm> {
    return this.adapter.update<CmsForm>("forms", id, updates);
  }

  async delete(id: string): Promise<void> {
    return this.adapter.delete("forms", id);
  }
}
