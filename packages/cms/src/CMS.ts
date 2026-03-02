import {
  PageRepository,
  PageVersionRepository,
  ComponentRepository,
  ComponentVersionRepository,
  MenuRepository,
  AreaRepository,
  TemplateRepository,
  EmailTemplateRepository,
  NavigationRepository,
  SettingsRepository,
  UserRepository,
  FormRepository,
  LiquidRenderEngine,
  LocalStorageAdapter,
  type StorageAdapter,
} from "@cms/infrastructure";
import type {
  CmsArea,
  CmsPage,
  CmsSettings,
  IPageRepository,
  IComponentRepository,
  IMenuRepository,
  IAreaRepository,
  ITemplateRepository,
  IEmailTemplateRepository,
  INavigationRepository,
  ISettingsRepository,
  IUserRepository,
  IFormRepository,
  IRenderEngine,
} from "@cms/domain";
import { FormRenderer } from "@cms/form-generator";
import type { FormSchema } from "@cms/form-generator";

/** Single entry in the generated sitemap */
export interface SitemapEntry {
  /** Full URL of the page */
  loc: string;
  /** Last modification date (ISO 8601) */
  lastmod?: string;
  /** Expected change frequency */
  changefreq?: string;
  /** Priority relative to other pages (0.0–1.0) */
  priority?: number;
}

/** Result of renderContent() — page content without full HTML document wrapper */
export interface RenderContentResult {
  /** Rendered component HTML (with navigation/form embeds resolved) */
  html: string;
  /** Collected component + area CSS */
  css: string;
  /** Collected component + area JS */
  js: string;
  /** Page title (from SEO or page.title) */
  pageTitle: string;
  /** SEO meta description */
  seoDescription: string | null;
  /** Open Graph image URL */
  ogImageUrl: string | null;
}

/** Built-in system variable defaults (style tokens) */
const BUILT_IN_SYSTEM_VARS: Record<string, string> = {
  "bg-primary": "bg-primary",
  "bg-secondary": "bg-secondary",
  "bg-accent": "bg-accent",
  "bg-surface": "bg-surface",
  "text-primary": "text-primary",
  "text-secondary": "text-secondary",
  "text-muted": "text-muted",
  "text-accent": "text-accent",
  "border-primary": "border-primary",
  "border-secondary": "border-secondary",
  "border-muted": "border-muted",
};

export class CMS {
  // Existing repositories
  readonly pages: IPageRepository;
  readonly pageVersions: PageVersionRepository;
  readonly components: IComponentRepository;
  readonly componentVersions: ComponentVersionRepository;
  readonly menus: IMenuRepository;
  readonly areas: IAreaRepository;
  readonly templates: ITemplateRepository;
  readonly emailTemplates: IEmailTemplateRepository;

  // New repositories
  readonly navigations: INavigationRepository;
  readonly settings: ISettingsRepository;
  readonly users: IUserRepository;
  readonly forms: IFormRepository;

  // Render engine
  readonly render: IRenderEngine;

  constructor(adapter?: StorageAdapter) {
    const storage = adapter ?? new LocalStorageAdapter();
    this.pages = new PageRepository(storage);
    this.pageVersions = new PageVersionRepository(storage);
    this.components = new ComponentRepository(storage);
    this.componentVersions = new ComponentVersionRepository(storage);
    this.menus = new MenuRepository(storage);
    this.areas = new AreaRepository(storage);
    this.templates = new TemplateRepository(storage);
    this.emailTemplates = new EmailTemplateRepository(storage);
    this.navigations = new NavigationRepository(storage);
    this.settings = new SettingsRepository(storage);
    this.users = new UserRepository(storage);
    this.forms = new FormRepository(storage);
    this.render = new LiquidRenderEngine();
  }

  /**
   * Initialize CMS with default data (areas, menus, settings).
   */
  async bootstrap(): Promise<void> {
    // Create default areas if none exist
    const areas = await this.areas.findAll();
    if (areas.length === 0) {
      await this.areas.create({
        name: "Public",
        displayName: "Public Site",
        description: "Public-facing website",
        rootPath: "/",
        siteName: "My Site",
        style: {
          colorSchemas: [
            {
              id: 1,
              name: "Default",
              isDefault: true,
              colors: {
                primary: "#2E5A97",
                secondary: "#283963",
                accent: "#FFD300",
                success: "#22C55E",
                warning: "#F59E0B",
                error: "#EF4444",
                info: "#3B82F6",
                background: "#FFFFFF",
                surface: "#F8FAFC",
                text: "#1E293B",
                "text-muted": "#64748B",
                border: "#E2E8F0",
              },
            },
          ],
          defaultColorSchemaId: 1,
        },
        design: {
          headTemplate: [
            "<head>",
            '  <meta charset="UTF-8">',
            '  <meta name="viewport" content="width=device-width, initial-scale=1.0">',
            "  <title>{{pageTitle}} | {{siteName}}</title>",
            "  {{metaTags}}",
            "  {{styles}}",
            "</head>",
          ].join("\n"),
          bodyTemplate: [
            "<body>",
            "  {{content}}",
            "  {{trackingScripts}}",
            "  {{scripts}}",
            "</body>",
          ].join("\n"),
        },
        status: "active",
      });
    }

    // Create default menus if they don't exist
    const navbar = await this.menus.findByKey("navbar");
    if (!navbar) {
      const menu = await this.menus.upsertMenu("navbar", "Main Navigation");
      await this.menus.setItems(menu.id, [
        { label: "Home", href: "/", orderIndex: 0, isExternal: false },
        { label: "About", href: "/about", orderIndex: 1, isExternal: false },
        { label: "Contact", href: "/contact", orderIndex: 2, isExternal: false },
      ]);
    }

    const footer = await this.menus.findByKey("footer");
    if (!footer) {
      const menu = await this.menus.upsertMenu("footer", "Footer Navigation");
      await this.menus.setItems(menu.id, [
        { label: "Privacy Policy", href: "/privacy", orderIndex: 0, isExternal: false },
        { label: "Terms & Conditions", href: "/terms", orderIndex: 1, isExternal: false },
      ]);
    }

    // Create default settings if none exist
    const existingSettings = await this.settings.get();
    if (!existingSettings) {
      await this.settings.save({
        id: "global",
        branding: { projectName: "My Project" },
        authentication: { ssoEnabled: false },
        emailDefaults: { senderName: "No Reply", senderEmail: "no-reply@example.com" },
        systemVariableDefaults: { ...BUILT_IN_SYSTEM_VARS },
      });
    }
  }

  /**
   * Render a complete page by area key and slug.
   * Returns full HTML document or null if page not found / not published.
   *
   * Flow per docs/13_workflow.md:
   * 1. Resolve page by area + slug
   * 2. Load area (head/body templates, style, design)
   * 3. Render each component in page structure with content + system vars
   * 4. Collect component CSS/JS
   * 5. Concatenate → content HTML
   * 6. Resolve {{navigation:id}} and {{form:variable}} in content
   * 7. Fill {{content}} in area body template
   * 8. Resolve design bodyElements (custom variables) in body
   * 9. Resolve navigation/form in body template too
   * 10. Build head from area head template
   * 11. Assemble full HTML document
   */
  async renderPage(areaKey: string, slug: string): Promise<string | null> {
    // 1. Resolve page
    const page = await this.pages.findBySlug(areaKey, slug);
    if (!page || page.status !== "published") {
      return null;
    }

    const version = await this.pageVersions.getLatestPublished(page.id);
    if (!version) {
      return null;
    }

    // 2. Load area and settings
    const area = await this.areas.findByKey(areaKey);
    const settingsObj = await this.settings.get();

    // 3. Resolve system variables (Page > Area > Settings)
    const systemVars = this.resolveSystemVariables(area, settingsObj, page);

    // 4. Render each component + collect CSS/JS
    let contentHtml = "";
    let componentCss = "";
    let componentJs = "";

    for (const instance of version.structure) {
      const component = await this.components.findById(instance.componentId);
      if (!component) continue;

      const componentVersion = await this.componentVersions.getLatest(instance.componentId);
      if (!componentVersion) continue;

      // Protect {{form:...}} and {{navigation:...}} from Liquid parsing
      const safeTemplate = protectCmsPlaceholders(componentVersion.templateLiquid);

      const rendered = await this.render.render({
        template: safeTemplate,
        data: { ...instance.props, ...systemVars },
        globals: {
          page: { title: page.title, slug: page.slug },
          site: { name: area?.siteName ?? areaKey },
          area: area ?? {},
          ...instance.globals,
        },
      }).then(restoreCmsPlaceholders);

      contentHtml += rendered;

      if (componentVersion.css) componentCss += componentVersion.css + "\n";
      if (componentVersion.js) componentJs += componentVersion.js + "\n";
    }

    // 5. Resolve navigation and form embeds in content
    contentHtml = await this.resolveNavigations(contentHtml);
    contentHtml = await this.resolveForms(contentHtml);

    // 6. Fill body template
    let bodyHtml = area?.design?.bodyTemplate ?? "{{content}}";
    bodyHtml = bodyHtml.replace(/\{\{content\}\}/g, contentHtml);

    // 8. Resolve design bodyElements (custom variables)
    if (area?.design?.bodyElements) {
      for (const el of area.design.bodyElements) {
        const pattern = new RegExp(escapeRegex(el.variable), "g");
        bodyHtml = bodyHtml.replace(pattern, el.content);
      }
    }

    // 9. Resolve navigation and form in body template
    bodyHtml = await this.resolveNavigations(bodyHtml);
    bodyHtml = await this.resolveForms(bodyHtml);

    // Replace remaining system variables in body
    for (const [key, value] of Object.entries(systemVars)) {
      bodyHtml = bodyHtml.replace(new RegExp(`\\{\\{${escapeRegex(key)}\\}\\}`, "g"), String(value));
    }

    // 10. Build tracking scripts and replace page-level placeholders in body
    const trackingScripts = this.buildTrackingScripts(area, "body-bottom");
    bodyHtml = bodyHtml.replace(/\{\{trackingScripts\}\}/g, trackingScripts);

    // Build CSS/JS tags early so they can be replaced in both head and body
    const areaCss = area?.design?.areaCss ?? "";
    const areaJs = area?.design?.areaJs ?? "";
    const allCss = [areaCss, componentCss].filter(Boolean).join("\n");
    const allJs = [areaJs, componentJs].filter(Boolean).join("\n");
    const stylesTag = allCss ? `<style>${allCss}</style>` : "";
    const scriptsTag = allJs ? `<script>${allJs}</script>` : "";

    // Replace {{styles}} and {{scripts}} in body too
    bodyHtml = bodyHtml.replace(/\{\{styles\}\}/g, stylesTag);
    bodyHtml = bodyHtml.replace(/\{\{scripts\}\}/g, scriptsTag);

    // 11. Build head
    let headHtml = area?.design?.headTemplate ?? "<head><title>{{pageTitle}}</title></head>";
    const pageTitle = page.seo?.metaTitle ?? page.seoTitle ?? page.title;
    const siteName = area?.siteName ?? "";
    const metaTags = this.buildMetaTags(page as CmsPage);
    const headTrackingScripts = this.buildTrackingScripts(area, "head");

    headHtml = headHtml
      .replace(/\{\{pageTitle\}\}/g, pageTitle)
      .replace(/\{\{siteName\}\}/g, siteName)
      .replace(/\{\{metaTags\}\}/g, metaTags)
      .replace(/\{\{styles\}\}/g, stylesTag + headTrackingScripts)
      .replace(/\{\{scripts\}\}/g, scriptsTag);

    // Replace system variables in head too
    for (const [key, value] of Object.entries(systemVars)) {
      headHtml = headHtml.replace(new RegExp(`\\{\\{${escapeRegex(key)}\\}\\}`, "g"), String(value));
    }

    // 12. Assemble full HTML
    const bodyTopTracking = this.buildTrackingScripts(area, "body-top");
    const fullBodyContent = bodyTopTracking + bodyHtml;

    return `<!DOCTYPE html>\n<html>\n${headHtml}\n${fullBodyContent}\n</html>`;
  }

  /**
   * Resolve system variables with priority: Page > Area > Settings.
   */
  private resolveSystemVariables(
    area: CmsArea | null,
    settings: CmsSettings | null,
    page: CmsPage
  ): Record<string, string> {
    const vars: Record<string, string> = {};

    // Start from Settings defaults (lowest priority)
    if (settings?.systemVariableDefaults) {
      Object.assign(vars, settings.systemVariableDefaults);
    }

    // Area color schema overrides (extract colors as style variables)
    if (area?.style?.colorSchemas) {
      const defaultSchema = area.style.colorSchemas.find((s) => s.isDefault) ?? area.style.colorSchemas[0];
      if (defaultSchema?.colors) {
        for (const [colorKey, colorValue] of Object.entries(defaultSchema.colors)) {
          vars[`bg-${colorKey}`] = colorValue;
          vars[`text-${colorKey}`] = colorValue;
          vars[`border-${colorKey}`] = colorValue;
          // Also store the raw color key
          vars[colorKey] = colorValue;
        }
      }
    }

    // Page-level overrides would go here (highest priority)
    // Currently page.style only has colorPalette/layoutMode, not per-variable overrides

    return vars;
  }

  /**
   * Resolve {{navigation:id}} placeholders in HTML.
   */
  private async resolveNavigations(html: string): Promise<string> {
    const navPattern = /\{\{navigation:([^}]+)\}\}/g;
    let match;
    let result = html;

    // Collect all matches first to avoid infinite loop
    const matches: { full: string; id: string }[] = [];
    while ((match = navPattern.exec(html)) !== null) {
      matches.push({ full: match[0], id: match[1] });
    }

    for (const m of matches) {
      const nav = await this.navigations.findById(m.id);
      if (nav && nav.template) {
        const rendered = await this.render.render({
          template: nav.template,
          data: { items: nav.items },
        });
        let navHtml = rendered;
        if (nav.additionalCss) {
          navHtml = `<style>${nav.additionalCss}</style>` + navHtml;
        }
        if (nav.additionalJs) {
          navHtml = navHtml + `<script>${nav.additionalJs}</script>`;
        }
        result = result.replace(m.full, navHtml);
      } else {
        result = result.replace(m.full, "");
      }
    }

    return result;
  }

  /**
   * Resolve {{form:variable}} placeholders in HTML.
   */
  private async resolveForms(html: string): Promise<string> {
    const formPattern = /\{\{form:([^}]+)\}\}/g;
    let match;
    let result = html;

    const matches: { full: string; variable: string }[] = [];
    while ((match = formPattern.exec(html)) !== null) {
      matches.push({ full: match[0], variable: match[1] });
    }

    for (const m of matches) {
      const form = await this.forms.findByVariable(m.variable);
      if (form?.schema) {
        const formHtml = FormRenderer.renderForm(form.schema as FormSchema);
        result = result.replace(m.full, formHtml);
      } else {
        result = result.replace(m.full, "");
      }
    }

    return result;
  }

  /**
   * Build meta tags from page SEO data.
   * Supports both new nested seo object and legacy flat fields.
   */
  private buildMetaTags(page: CmsPage): string {
    const tags: string[] = [];
    const desc = page.seo?.metaDescription ?? page.seoDescription;
    const keywords = page.seo?.keywords;
    if (desc) {
      tags.push(`<meta name="description" content="${escapeAttr(desc)}">`);
    }
    if (keywords) {
      tags.push(`<meta name="keywords" content="${escapeAttr(keywords)}">`);
    }
    return tags.join("\n  ");
  }

  /**
   * Build tracking scripts for the given position.
   */
  private buildTrackingScripts(area: CmsArea | null, position: string): string {
    if (!area?.tracking) return "";
    const scripts: string[] = [];

    if (area.tracking.gaId && area.tracking.gaPosition === position) {
      scripts.push(
        `<script async src="https://www.googletagmanager.com/gtag/js?id=${area.tracking.gaId}"></script>`,
        `<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${area.tracking.gaId}');</script>`
      );
    }

    if (area.tracking.gtmId && area.tracking.gtmPosition === position) {
      scripts.push(
        `<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${area.tracking.gtmId}');</script>`
      );
    }

    if (area.tracking.customScripts) {
      for (const script of area.tracking.customScripts) {
        if (script.position === position) {
          scripts.push(script.code);
        }
      }
    }

    return scripts.join("\n");
  }

  /**
   * Render page content without the full HTML document wrapper.
   * Returns component HTML, CSS, JS, and SEO metadata for the host
   * framework (e.g., Next.js) to assemble into its own layout.
   */
  async renderContent(areaKey: string, slug: string): Promise<RenderContentResult | null> {
    // 1. Resolve page
    const page = await this.pages.findBySlug(areaKey, slug);
    if (!page || page.status !== "published") return null;

    const version = await this.pageVersions.getLatestPublished(page.id);
    if (!version) return null;

    // 2. Load area and settings
    const area = await this.areas.findByKey(areaKey);
    const settingsObj = await this.settings.get();

    // 3. Resolve system variables
    const systemVars = this.resolveSystemVariables(area, settingsObj, page);

    // 4. Render each component + collect CSS/JS
    let contentHtml = "";
    let componentCss = "";
    let componentJs = "";

    for (const instance of version.structure) {
      const component = await this.components.findById(instance.componentId);
      if (!component) continue;

      const componentVersion = await this.componentVersions.getLatest(instance.componentId);
      if (!componentVersion) continue;

      const safeTemplate = protectCmsPlaceholders(componentVersion.templateLiquid);

      const rendered = await this.render.render({
        template: safeTemplate,
        data: { ...instance.props, ...systemVars },
        globals: {
          page: { title: page.title, slug: page.slug },
          site: { name: area?.siteName ?? areaKey },
          area: area ?? {},
          ...instance.globals,
        },
      }).then(restoreCmsPlaceholders);

      contentHtml += rendered;
      if (componentVersion.css) componentCss += componentVersion.css + "\n";
      if (componentVersion.js) componentJs += componentVersion.js + "\n";
    }

    // 5. Resolve navigation and form embeds
    contentHtml = await this.resolveNavigations(contentHtml);
    contentHtml = await this.resolveForms(contentHtml);

    // 6. Append area-level CSS/JS
    const areaCss = area?.design?.areaCss ?? "";
    const areaJs = area?.design?.areaJs ?? "";
    const allCss = [areaCss, componentCss].filter(Boolean).join("\n");
    const allJs = [areaJs, componentJs].filter(Boolean).join("\n");

    return {
      html: contentHtml,
      css: allCss,
      js: allJs,
      pageTitle: page.seo?.metaTitle ?? page.seoTitle ?? page.title,
      seoDescription: page.seo?.metaDescription ?? page.seoDescription ?? null,
      ogImageUrl: page.ogImageUrl ?? null,
    };
  }

  /**
   * Generate sitemap entries for all published pages in public areas.
   * Only includes areas that are active and not restricted.
   */
  async generateSitemap(baseUrl: string): Promise<SitemapEntry[]> {
    const areas = await this.areas.findAll();
    const entries: SitemapEntry[] = [];

    for (const area of areas) {
      // Skip inactive or restricted areas
      if (area.status !== "active") continue;
      if (area.accessPolicy?.isRestricted) continue;

      const pages = await this.pages.findAll(area.name);
      const rootPath = (area.rootPath ?? "/").replace(/\/+$/, "");

      for (const page of pages) {
        if (page.status !== "published") continue;

        // Build URL: home page maps to rootPath, others append slug
        const isHome = page.slug === "home" || page.slug === "";
        const loc = isHome
          ? `${baseUrl}${rootPath || "/"}`
          : `${baseUrl}${rootPath}/${page.slug}`;

        entries.push({
          loc,
          lastmod: page.updatedAt.toISOString(),
          changefreq: "weekly",
          priority: isHome ? 1.0 : 0.8,
        });
      }
    }

    return entries;
  }

  /**
   * Generate a complete sitemap.xml document string.
   */
  async generateSitemapXml(baseUrl: string): Promise<string> {
    const entries = await this.generateSitemap(baseUrl);

    const urls = entries
      .map(
        (e) =>
          `  <url>\n` +
          `    <loc>${escapeXml(e.loc)}</loc>\n` +
          (e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>\n` : "") +
          (e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>\n` : "") +
          (e.priority != null ? `    <priority>${e.priority.toFixed(1)}</priority>\n` : "") +
          `  </url>`
      )
      .join("\n");

    return (
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      urls +
      (urls ? "\n" : "") +
      `</urlset>\n`
    );
  }

  /**
   * Clear all data (for testing).
   */
  async reset(): Promise<void> {
    // No-op at this level — consumers should reset their adapter directly
  }
}

/** Escape a string for use in a RegExp */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Escape a string for use in an HTML attribute */
function escapeAttr(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Escape a string for use in XML content */
function escapeXml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

/**
 * Replace {{form:xxx}} and {{navigation:xxx}} with safe placeholders
 * so LiquidJS doesn't try to parse the colon as a filter separator.
 */
function protectCmsPlaceholders(template: string): string {
  return template
    .replace(/\{\{form:([^}]+)\}\}/g, "__CMS_FORM_$1__")
    .replace(/\{\{navigation:([^}]+)\}\}/g, "__CMS_NAV_$1__");
}

/** Restore CMS placeholders after Liquid rendering */
function restoreCmsPlaceholders(html: string): string {
  return html
    .replace(/__CMS_FORM_([^_]+)__/g, "{{form:$1}}")
    .replace(/__CMS_NAV_([^_]+)__/g, "{{navigation:$1}}");
}
