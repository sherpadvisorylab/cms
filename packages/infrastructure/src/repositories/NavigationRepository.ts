import type { CmsNavigation, INavigationRepository } from "@cms/domain";
import type { StorageAdapter } from "../adapters/StorageAdapter";
import { generateId } from "../utils/storage";

export class NavigationRepository implements INavigationRepository {
  constructor(private adapter: StorageAdapter) {}

  async findAll(): Promise<CmsNavigation[]> {
    return this.adapter.getAll<CmsNavigation>("navigations");
  }

  async findById(id: string): Promise<CmsNavigation | null> {
    return this.adapter.getById<CmsNavigation>("navigations", id);
  }

  async create(nav: Omit<CmsNavigation, "id">): Promise<CmsNavigation> {
    const newNav: CmsNavigation = {
      ...nav,
      id: generateId(),
    };
    return this.adapter.create("navigations", newNav);
  }

  async update(id: string, updates: Partial<CmsNavigation>): Promise<CmsNavigation> {
    return this.adapter.update<CmsNavigation>("navigations", id, updates);
  }

  async delete(id: string): Promise<void> {
    return this.adapter.delete("navigations", id);
  }
}
