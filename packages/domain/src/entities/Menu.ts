export type MenuKey = "navbar" | "sidebar" | "footer";
export const MENU_KEYS: MenuKey[] = ["navbar", "footer", "sidebar"];
export const MENU_KEY_LABELS: Record<MenuKey, string> = {
  navbar: "Navbar",
  footer: "Footer",
  sidebar: "Sidebar",
};

export interface CmsMenu {
  id: string;
  key: MenuKey;
  label: string;
  templateLiquid?: string | null;
  items: CmsMenuItem[];
}

export interface CmsMenuItem {
  id: string;
  menuId: string;
  label: string;
  href: string;
  orderIndex: number;
  parentId?: string | null;
  isExternal: boolean;
}
