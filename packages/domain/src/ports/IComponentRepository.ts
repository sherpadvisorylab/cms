import type { CmsComponent, ComponentVersion } from "../entities/Component";

export interface IComponentRepository {
  findAll(): Promise<CmsComponent[]>;
  findById(id: string): Promise<CmsComponent | null>;
  create(component: Omit<CmsComponent, "id" | "createdAt" | "updatedAt">): Promise<CmsComponent>;
  update(id: string, updates: Partial<CmsComponent>): Promise<CmsComponent>;
  delete(id: string): Promise<void>;
}

export interface IComponentVersionRepository {
  createVersion(
    componentId: string,
    data: {
      templateLiquid: string;
      schema?: unknown;
      css?: string;
      js?: string;
      createdBy?: string;
    }
  ): Promise<ComponentVersion>;
  getLatest(componentId: string): Promise<ComponentVersion | null>;
}
