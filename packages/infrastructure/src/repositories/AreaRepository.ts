import type { CmsArea, CmsAreaKey } from "@cms/domain";
import { getFromStorage, setToStorage, generateId } from "../utils/storage";

const AREAS_KEY = "cms:areas";

export interface IAreaRepository {
  findAll(): Promise<CmsArea[]>;
  findByKey(key: CmsAreaKey): Promise<CmsArea | null>;
  create(area: Omit<CmsArea, "id" | "createdAt" | "updatedAt">): Promise<CmsArea>;
  update(id: string, updates: Partial<CmsArea>): Promise<CmsArea>;
  delete(id: string): Promise<void>;
}

export class AreaRepository implements IAreaRepository {
  async findAll(): Promise<CmsArea[]> {
    return getFromStorage<CmsArea[]>(AREAS_KEY) ?? [];
  }

  async findByKey(key: CmsAreaKey): Promise<CmsArea | null> {
    const areas = getFromStorage<CmsArea[]>(AREAS_KEY) ?? [];
    return areas.find((a) => a.key === key) ?? null;
  }

  async create(
    area: Omit<CmsArea, "id" | "createdAt" | "updatedAt">
  ): Promise<CmsArea> {
    const areas = getFromStorage<CmsArea[]>(AREAS_KEY) ?? [];
    const newArea: CmsArea = {
      ...area,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    areas.push(newArea);
    setToStorage(AREAS_KEY, areas);
    return newArea;
  }

  async update(id: string, updates: Partial<CmsArea>): Promise<CmsArea> {
    const areas = getFromStorage<CmsArea[]>(AREAS_KEY) ?? [];
    const index = areas.findIndex((a) => a.id === id);
    if (index === -1) {
      throw new Error(`Area ${id} not found`);
    }

    areas[index] = {
      ...areas[index],
      ...updates,
      updatedAt: new Date(),
    };
    setToStorage(AREAS_KEY, areas);
    return areas[index];
  }

  async delete(id: string): Promise<void> {
    const areas = getFromStorage<CmsArea[]>(AREAS_KEY) ?? [];
    const filtered = areas.filter((a) => a.id !== id);
    setToStorage(AREAS_KEY, filtered);
  }
}
