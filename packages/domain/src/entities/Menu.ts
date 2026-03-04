export type MenuKey = "navbar" | "sidebar" | "footer";

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
