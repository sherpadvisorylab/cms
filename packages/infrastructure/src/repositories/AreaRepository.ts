import type { CmsArea, IAreaRepository } from "@cms/domain";
import type { StorageAdapter } from "../adapters/StorageAdapter";
import { generateId } from "../utils/storage";

export class AreaRepository implements IAreaRepository {
  constructor(private adapter: StorageAdapter) {}

  async findAll(): Promise<CmsArea[]> {
    return this.adapter.getAll<CmsArea>("areas");
  }

  async findByKey(key: string): Promise<CmsArea | null> {
    const areas = await this.adapter.getAll<CmsArea>("areas", { name: key });
    return areas[0] ?? null;
  }

  async create(area: Omit<CmsArea, "id" | "createdAt" | "updatedAt">): Promise<CmsArea> {
    const newArea: CmsArea = {
      ...area,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    return this.adapter.create("areas", newArea);
  }

  async update(id: string, updates: Partial<CmsArea>): Promise<CmsArea> {
    return this.adapter.update<CmsArea>("areas", id, { ...updates, updatedAt: new Date() });
  }

  async delete(id: string): Promise<void> {
    return this.adapter.delete("areas", id);
  }
}
