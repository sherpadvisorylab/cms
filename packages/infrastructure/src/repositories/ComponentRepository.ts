import type { CmsComponent, ComponentVersion } from "@cms/domain";
import type { IComponentRepository, IComponentVersionRepository } from "@cms/domain";
import type { StorageAdapter } from "../adapters/StorageAdapter";
import { generateId } from "../utils/storage";

export class ComponentRepository implements IComponentRepository {
  constructor(private adapter: StorageAdapter) {}

  async findAll(): Promise<CmsComponent[]> {
    return this.adapter.getAll<CmsComponent>("components");
  }

  async findById(id: string): Promise<CmsComponent | null> {
    return this.adapter.getById<CmsComponent>("components", id);
  }

  async create(component: Omit<CmsComponent, "id" | "createdAt" | "updatedAt">): Promise<CmsComponent> {
    const newComponent: CmsComponent = {
      ...component,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    return this.adapter.create("components", newComponent);
  }

  async update(id: string, updates: Partial<CmsComponent>): Promise<CmsComponent> {
    return this.adapter.update<CmsComponent>("components", id, { ...updates, updatedAt: new Date() });
  }

  async delete(id: string): Promise<void> {
    return this.adapter.delete("components", id);
  }
}

export class ComponentVersionRepository implements IComponentVersionRepository {
  constructor(private adapter: StorageAdapter) {}

  async createVersion(
    componentId: string,
    data: {
      templateLiquid: string;
      schema?: unknown;
      css?: string;
      js?: string;
      createdBy?: string;
    },
  ): Promise<ComponentVersion> {
    const versions = await this.adapter.getAll<ComponentVersion>("componentVersions", { componentId });
    const nextVersion = (Math.max(0, ...versions.map((v) => v.version)) || 0) + 1;

    const version: ComponentVersion = {
      id: generateId(),
      componentId,
      version: nextVersion,
      templateLiquid: data.templateLiquid,
      schema: (data.schema as ComponentVersion["schema"]) ?? null,
      css: data.css ?? null,
      js: data.js ?? null,
      createdBy: data.createdBy ?? null,
      createdAt: new Date(),
    };

    return this.adapter.create("componentVersions", version);
  }

  async getLatest(componentId: string): Promise<ComponentVersion | null> {
    const versions = await this.adapter.getAll<ComponentVersion>("componentVersions", { componentId });
    return versions.sort((a, b) => b.version - a.version)[0] ?? null;
  }
}
