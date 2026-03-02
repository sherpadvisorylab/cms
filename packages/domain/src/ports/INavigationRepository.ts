import type { CmsNavigation } from "../entities/Navigation";

export interface INavigationRepository {
  findAll(): Promise<CmsNavigation[]>;
  findById(id: string): Promise<CmsNavigation | null>;
  create(nav: Omit<CmsNavigation, "id">): Promise<CmsNavigation>;
  update(id: string, updates: Partial<CmsNavigation>): Promise<CmsNavigation>;
  delete(id: string): Promise<void>;
}
