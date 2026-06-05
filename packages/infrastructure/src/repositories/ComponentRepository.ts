import type { CmsComponent, ComponentVersion } from "@sherpacms/domain";
import type { IComponentRepository, IComponentVersionRepository } from "@sherpacms/domain";
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
    const versions = await this.adapter.getAll<ComponentVersion>("componentVersions", {
      componentId: id,
    });

    for (const version of versions) {
      await this.adapter.delete("componentVersions", version.id);
    }

    return this.adapter.delete("components", id);
  }
}

export class ComponentVersionRepository implements IComponentVersionRepository {
  constructor(private adapter: StorageAdapter) {}

  async findByComponentId(componentId: string): Promise<ComponentVersion[]> {
    return this.adapter.getAll<ComponentVersion>("componentVersions", { componentId });
  }

  async createVersion(
    componentId: string,
    data: {
      templateLiquid:    string;
      schema?:           unknown;
      css?:              string;
      js?:               string;
      schemaOrgTemplate?: string;
      createdBy?:        string;
    },
  ): Promise<ComponentVersion> {
    const versions = await this.findByComponentId(componentId);
    const nextVersion = (Math.max(0, ...versions.map((v) => v.version)) || 0) + 1;

    const version: ComponentVersion = {
      id: generateId(),
      componentId,
      version: nextVersion,
      templateLiquid:    data.templateLiquid,
      schema:            (data.schema as ComponentVersion["schema"]) ?? null,
      css:               data.css ?? null,
      js:                data.js ?? null,
      schemaOrgTemplate: data.schemaOrgTemplate ?? null,
      createdBy:         data.createdBy ?? null,
      createdAt:         new Date(),
    };

    return this.adapter.create("componentVersions", version);
  }

  async getLatest(componentId: string): Promise<ComponentVersion | null> {
    const versions = await this.findByComponentId(componentId);
    return versions.sort((a, b) => b.version - a.version)[0] ?? null;
  }

  async delete(id: string): Promise<void> {
    await this.adapter.delete("componentVersions", id);
  }

  async deleteByComponentId(componentId: string): Promise<number> {
    const versions = await this.findByComponentId(componentId);

    for (const version of versions) {
      await this.delete(version.id);
    }

    return versions.length;
  }
}
