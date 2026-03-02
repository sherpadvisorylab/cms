import type { CmsMenu, CmsMenuItem, MenuKey } from "../entities/Menu";

export interface IMenuRepository {
  findByKey(key: MenuKey): Promise<CmsMenu | null>;
  findAll(): Promise<CmsMenu[]>;
  upsertMenu(key: MenuKey, label: string): Promise<CmsMenu>;
  setItems(menuId: string, items: Omit<CmsMenuItem, "id" | "menuId">[]): Promise<CmsMenuItem[]>;
}
