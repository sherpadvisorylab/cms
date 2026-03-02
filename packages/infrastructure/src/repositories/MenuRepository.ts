import type { CmsMenu, CmsMenuItem, MenuKey } from "@cms/domain";
import type { IMenuRepository } from "@cms/domain";
import type { StorageAdapter } from "../adapters/StorageAdapter";
import { generateId } from "../utils/storage";

export class MenuRepository implements IMenuRepository {
  constructor(private adapter: StorageAdapter) {}

  async findByKey(key: MenuKey): Promise<CmsMenu | null> {
    const menus = await this.adapter.getAll<CmsMenu>("menus", { key });
    return menus[0] ?? null;
  }

  async findAll(): Promise<CmsMenu[]> {
    return this.adapter.getAll<CmsMenu>("menus");
  }

  async upsertMenu(key: MenuKey, label: string): Promise<CmsMenu> {
    const existing = await this.findByKey(key);
    if (existing) {
      return this.adapter.update<CmsMenu>("menus", existing.id, { label });
    }
    const menu: CmsMenu = { id: generateId(), key, label, items: [] };
    return this.adapter.create("menus", menu);
  }

  async setItems(
    menuId: string,
    items: Omit<CmsMenuItem, "id" | "menuId">[],
  ): Promise<CmsMenuItem[]> {
    const menu = await this.adapter.getById<CmsMenu>("menus", menuId);
    if (!menu) throw new Error(`Menu ${menuId} not found`);

    const newItems: CmsMenuItem[] = items.map((item) => ({
      ...item,
      id: generateId(),
      menuId,
    }));

    await this.adapter.update<CmsMenu>("menus", menuId, { items: newItems });
    return newItems;
  }
}
