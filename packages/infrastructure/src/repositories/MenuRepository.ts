import type { CmsMenu, CmsMenuItem, MenuKey } from "@cms/domain";
import type { IMenuRepository } from "@cms/domain";
import { getFromStorage, setToStorage, generateId } from "../utils/storage";

const MENUS_KEY = "cms:menus";

export class MenuRepository implements IMenuRepository {
  async findByKey(key: MenuKey): Promise<CmsMenu | null> {
    const menus = getFromStorage<CmsMenu[]>(MENUS_KEY) ?? [];
    return menus.find((m) => m.key === key) ?? null;
  }

  async findAll(): Promise<CmsMenu[]> {
    return getFromStorage<CmsMenu[]>(MENUS_KEY) ?? [];
  }

  async upsertMenu(key: MenuKey, label: string): Promise<CmsMenu> {
    const menus = getFromStorage<CmsMenu[]>(MENUS_KEY) ?? [];
    const existing = menus.find((m) => m.key === key);

    if (existing) {
      existing.label = label;
      setToStorage(MENUS_KEY, menus);
      return existing;
    }

    const menu: CmsMenu = {
      id: generateId(),
      key,
      label,
      items: [],
    };
    menus.push(menu);
    setToStorage(MENUS_KEY, menus);
    return menu;
  }

  async setItems(
    menuId: string,
    items: Omit<CmsMenuItem, "id" | "menuId">[]
  ): Promise<CmsMenuItem[]> {
    const menus = getFromStorage<CmsMenu[]>(MENUS_KEY) ?? [];
    const menu = menus.find((m) => m.id === menuId);
    if (!menu) {
      throw new Error(`Menu ${menuId} not found`);
    }

    // Replace all items
    menu.items = items.map((item) => ({
      ...item,
      id: generateId(),
      menuId,
    }));

    setToStorage(MENUS_KEY, menus);
    return menu.items;
  }
}
