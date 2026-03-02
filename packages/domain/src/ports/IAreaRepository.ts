import type { CmsArea } from "../entities/Area";

export interface IAreaRepository {
  findAll(): Promise<CmsArea[]>;
  findByKey(key: string): Promise<CmsArea | null>;
  create(area: Omit<CmsArea, "id" | "createdAt" | "updatedAt">): Promise<CmsArea>;
  update(id: string, updates: Partial<CmsArea>): Promise<CmsArea>;
  delete(id: string): Promise<void>;
}
