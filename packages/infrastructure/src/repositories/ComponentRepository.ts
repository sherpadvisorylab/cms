import type { CmsComponent, ComponentVersion } from "@cms/domain";
import type {
  IComponentRepository,
  IComponentVersionRepository,
} from "@cms/domain";
import { getFromStorage, setToStorage, generateId } from "../utils/storage";

const COMPONENTS_KEY = "cms:components";
const COMPONENT_VERSIONS_KEY = "cms:componentVersions";

export class ComponentRepository implements IComponentRepository {
  async findAll(): Promise<CmsComponent[]> {
    return getFromStorage<CmsComponent[]>(COMPONENTS_KEY) ?? [];
  }

  async findById(id: string): Promise<CmsComponent | null> {
    const components = getFromStorage<CmsComponent[]>(COMPONENTS_KEY) ?? [];
    return components.find((c) => c.id === id) ?? null;
  }

  async create(
    component: Omit<CmsComponent, "id" | "createdAt" | "updatedAt">
  ): Promise<CmsComponent> {
    const components = getFromStorage<CmsComponent[]>(COMPONENTS_KEY) ?? [];
    const newComponent: CmsComponent = {
      ...component,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    components.push(newComponent);
    setToStorage(COMPONENTS_KEY, components);
    return newComponent;
  }

  async update(
    id: string,
    updates: Partial<CmsComponent>
  ): Promise<CmsComponent> {
    const components = getFromStorage<CmsComponent[]>(COMPONENTS_KEY) ?? [];
    const index = components.findIndex((c) => c.id === id);
    if (index === -1) {
      throw new Error(`Component ${id} not found`);
    }

    components[index] = {
      ...components[index],
      ...updates,
      updatedAt: new Date(),
    };
    setToStorage(COMPONENTS_KEY, components);
    return components[index];
  }

  async delete(id: string): Promise<void> {
    const components = getFromStorage<CmsComponent[]>(COMPONENTS_KEY) ?? [];
    const filtered = components.filter((c) => c.id !== id);
    setToStorage(COMPONENTS_KEY, filtered);
  }
}

export class ComponentVersionRepository implements IComponentVersionRepository {
  async createVersion(
    componentId: string,
    data: {
      templateLiquid: string;
      schema?: unknown;
      css?: string;
      js?: string;
      createdBy?: string;
    }
  ): Promise<ComponentVersion> {
    const versions =
      getFromStorage<ComponentVersion[]>(COMPONENT_VERSIONS_KEY) ?? [];
    const componentVersions = versions.filter(
      (v) => v.componentId === componentId
    );
    const nextVersion =
      (Math.max(0, ...componentVersions.map((v) => v.version)) || 0) + 1;

    const version: ComponentVersion = {
      id: generateId(),
      componentId,
      version: nextVersion,
      templateLiquid: data.templateLiquid,
      schema: (data.schema as any) ?? null,
      css: data.css ?? null,
      js: data.js ?? null,
      createdBy: data.createdBy ?? null,
      createdAt: new Date(),
    };

    versions.push(version);
    setToStorage(COMPONENT_VERSIONS_KEY, versions);
    return version;
  }

  async getLatest(componentId: string): Promise<ComponentVersion | null> {
    const versions =
      getFromStorage<ComponentVersion[]>(COMPONENT_VERSIONS_KEY) ?? [];
    const componentVersions = versions
      .filter((v) => v.componentId === componentId)
      .sort((a, b) => b.version - a.version);
    return componentVersions[0] ?? null;
  }
}
