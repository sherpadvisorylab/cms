import type { CmsForm } from "../entities/Form";

export interface IFormRepository {
  findAll(): Promise<CmsForm[]>;
  findById(id: string): Promise<CmsForm | null>;
  findByVariable(variable: string): Promise<CmsForm | null>;
  create(form: Omit<CmsForm, "id">): Promise<CmsForm>;
  update(id: string, updates: Partial<CmsForm>): Promise<CmsForm>;
  delete(id: string): Promise<void>;
}
