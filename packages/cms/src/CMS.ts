import {
  PageRepository,
  PageVersionRepository,
  ComponentRepository,
  ComponentVersionRepository,
  MenuRepository,
  AreaRepository,
  TemplateRepository,
  LiquidRenderEngine,
  type IAreaRepository,
  type ITemplateRepository,
} from "@cms/infrastructure";
import type {
  IPageRepository,
  IComponentRepository,
  IMenuRepository,
  IRenderEngine,
} from "@cms/domain";

export class CMS {
  // Repositories
  readonly pages: IPageRepository;
  readonly pageVersions: PageVersionRepository;
  readonly components: IComponentRepository;
  readonly componentVersions: ComponentVersionRepository;
  readonly menus: IMenuRepository;
  readonly areas: IAreaRepository;
  readonly templates: ITemplateRepository;

  // Render engine
  readonly render: IRenderEngine;

  constructor() {
    this.pages = new PageRepository();
    this.pageVersions = new PageVersionRepository();
    this.components = new ComponentRepository();
    this.componentVersions = new ComponentVersionRepository();
    this.menus = new MenuRepository();
    this.areas = new AreaRepository();
    this.templates = new TemplateRepository();
    this.render = new LiquidRenderEngine();
  }

  /**
   * Initialize CMS with default data (areas, menus, templates).
   */
  async bootstrap(): Promise<void> {
    // Create default areas if none exist
    const areas = await this.areas.findAll();
    if (areas.length === 0) {
      await this.areas.create({
        key: "public",
        name: "Public Site",
        description: "Public-facing website",
        config: {
          logoLight: "/logo-light.svg",
          logoDark: "/logo-dark.svg",
          colorSchema: {
            primary: "#2E5A97",
            secondary: "#283963",
            accent: "#FFD300",
          },
        },
        status: "active",
      });

      await this.areas.create({
        key: "admin",
        name: "Admin Panel",
        description: "Administration area",
        config: {},
        status: "active",
      });
    }

    // Create default menus if they don't exist
    const navbar = await this.menus.findByKey("navbar");
    if (!navbar) {
      const menu = await this.menus.upsertMenu("navbar", "Main Navigation");
      await this.menus.setItems(menu.id, [
        {
          label: "Home",
          href: "/",
          orderIndex: 0,
          isExternal: false,
        },
        {
          label: "About",
          href: "/about",
          orderIndex: 1,
          isExternal: false,
        },
        {
          label: "Contact",
          href: "/contact",
          orderIndex: 2,
          isExternal: false,
        },
      ]);
    }

    const footer = await this.menus.findByKey("footer");
    if (!footer) {
      const menu = await this.menus.upsertMenu("footer", "Footer Navigation");
      await this.menus.setItems(menu.id, [
        {
          label: "Privacy Policy",
          href: "/privacy",
          orderIndex: 0,
          isExternal: false,
        },
        {
          label: "Terms & Conditions",
          href: "/terms",
          orderIndex: 1,
          isExternal: false,
        },
      ]);
    }
  }

  /**
   * Render a complete page by area and slug.
   * Returns null if page not found or not published.
   */
  async renderPage(area: string, slug: string): Promise<string | null> {
    const page = await this.pages.findBySlug(area, slug);
    if (!page || page.status !== "published") {
      return null;
    }

    const version = await this.pageVersions.getLatestPublished(page.id);
    if (!version) {
      return null;
    }

    let html = "";
    for (const instance of version.structure) {
      const component = await this.components.findById(instance.componentId);
      if (!component) continue;

      const componentVersion = await this.componentVersions.getLatest(
        instance.componentId
      );
      if (!componentVersion) continue;

      const rendered = await this.render.render({
        template: componentVersion.templateLiquid,
        data: instance.props,
        globals: {
          page: { title: page.title, slug: page.slug },
          site: { name: area },
          ...instance.globals,
        },
      });

      html += rendered;
    }

    return html;
  }

  /**
   * Clear all data from localStorage (for testing).
   */
  async reset(): Promise<void> {
    if (typeof window === "undefined" || !window.localStorage) {
      return;
    }
    const keys = [
      "cms:areas",
      "cms:pages",
      "cms:pageVersions",
      "cms:components",
      "cms:componentVersions",
      "cms:menus",
      "cms:templates",
    ];
    keys.forEach((key) => localStorage.removeItem(key));
  }
}
