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
  LayoutTemplateRepository,
  LiquidRenderEngine,
  LocalStorageAdapter,
  type StorageAdapter,
} from "@sherpacms/infrastructure";
import type {
  CmsArea,
  CmsPage,
  CmsSettings,
  ComponentSchemaField,
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
  ILayoutTemplateRepository,
  IRenderEngine,
} from "@sherpacms/domain";
import { FormRenderer } from "@sherpacms/form-generator";
import type { FormSchema } from "@sherpacms/form-generator";

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

/** Options passed to the CMS constructor. */
export interface CMSOptions {
  /**
   * Called after a page is published/updated so the hosting framework can
   * invalidate its page cache (e.g. Next.js revalidateTag / revalidatePath).
   * Receives the list of public slugs that changed.
   */
  onRevalidate?: (slugs: string[]) => void | Promise<void>;
}

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
  readonly layoutTemplates: ILayoutTemplateRepository;

  // Render engine
  readonly render: IRenderEngine;

  private readonly onRevalidate?: (slugs: string[]) => void | Promise<void>;

  constructor(adapter?: StorageAdapter, options?: CMSOptions) {
    this.onRevalidate = options?.onRevalidate;
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
    this.layoutTemplates = new LayoutTemplateRepository(storage);
    this.render = new LiquidRenderEngine();
  }

  /**
   * Notify the hosting framework that one or more public pages have changed
   * and their cached output should be invalidated.
   *
   * Call this after publishing or updating page content.
   * The actual cache invalidation is performed by the `onRevalidate` callback
   * provided in the constructor options — typically `revalidateTag()` in Next.js.
   *
   * @param slug - A single slug string or an array of slugs to invalidate.
   */
  async revalidatePage(slug: string | string[]): Promise<void> {
    if (!this.onRevalidate) return;
    const slugs = Array.isArray(slug) ? slug : [slug];
    await this.onRevalidate(slugs);
  }

  /**
   * Initialize CMS with default data (areas, settings).
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
  async renderPage(areaKey: string, slug: string, opts?: { draft?: boolean }): Promise<string | null> {
    const draft = opts?.draft === true;

    // 1. Resolve page
    let page = await this.pages.findBySlug(areaKey, slug);
    if (!page && draft) {
      const all = await this.pages.findAll(areaKey);
      page = all.find((p) => p.slug === slug) ?? null;
    }
    if (!page) return null;
    if (!draft && page.status !== "published") return null;

    const version = draft
      ? await this.pageVersions.getLatest(page.id)
      : await this.pageVersions.getLatestPublished(page.id);
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
    const seenComponentIds = new Set<string>();

    for (const instance of version.structure) {
      const component = await this.components.findById(instance.componentId);
      if (!component) continue;

      const componentVersion = await this.componentVersions.getLatest(instance.componentId);
      if (!componentVersion) continue;

      // Protect {{form:...}} and {{navigation:...}} from Liquid parsing
      const safeTemplate = resolveSystemVarPlaceholders(
        protectCmsPlaceholders(componentVersion.templateLiquid),
        systemVars,
      );

      const expandedProps = this.expandImageProps(instance.props, componentVersion.schema);
      const rendered = await this.render.render({
        template: safeTemplate,
        data: { ...expandedProps, ...systemVars },
        globals: {
          page: { title: page.title, slug: page.slug },
          site: { name: area?.siteName ?? areaKey },
          area: area ?? {},
          ...instance.globals,
        },
      }).then(restoreCmsPlaceholders);

      contentHtml += wrapAnimation(rendered, instance.animation);

      if (!seenComponentIds.has(instance.componentId)) {
        seenComponentIds.add(instance.componentId);
        if (componentVersion.css) componentCss += componentVersion.css + "\n";
        if (componentVersion.js) componentJs += componentVersion.js + "\n";
      }
    }

    // 5. Resolve navigation and form embeds in content
    const navCtx = { systemVars, site: { name: area?.siteName ?? areaKey }, page: { title: page.title, slug: page.slug } };
    contentHtml = await this.resolveNavigations(contentHtml, navCtx);
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
    bodyHtml = await this.resolveNavigations(bodyHtml, navCtx);
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
  /**
   * Image-typed fields support both string and {url, alt} values. Before
   * handing props to Liquid we replace each image_url/video_url field with
   * its URL string and inject a companion `${key}_alt` key, so templates
   * stay simple: `{{ logoUrl }}` / `{{ logoUrl_alt }}`. Legacy string values
   * pass through with an empty alt.
   *
   * Recurses into list-typed fields using `childSchema`.
   */
  private expandImageProps(
    props: Record<string, unknown>,
    schema: ComponentSchemaField[] | null | undefined,
  ): Record<string, unknown> {
    if (!schema || schema.length === 0) return props;
    const expanded: Record<string, unknown> = { ...props };
    for (const field of schema) {
      const value = expanded[field.key];
      if (field.type === "image_url" || field.type === "video_url") {
        if (value && typeof value === "object" && !Array.isArray(value) && "url" in (value as object)) {
          const obj = value as { url?: unknown; alt?: unknown };
          expanded[field.key] = typeof obj.url === "string" ? obj.url : "";
          expanded[`${field.key}_alt`] = typeof obj.alt === "string" ? obj.alt : "";
        } else if (typeof value === "string") {
          expanded[`${field.key}_alt`] = "";
        }
      } else if (field.type === "list" && Array.isArray(value) && field.childSchema) {
        expanded[field.key] = value.map((item) =>
          item && typeof item === "object"
            ? this.expandImageProps(item as Record<string, unknown>, field.childSchema)
            : item,
        );
      }
    }
    return expanded;
  }

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
   * Resolve {{navigation:id}} or {{navigation:name}} placeholders in HTML.
   * ctx is forwarded to the nav's Liquid template so {{ siteName }}, {{ site.name }},
   * {{ page.title }}, etc. are available inside nav display templates.
   */
  private async resolveNavigations(
    html: string,
    ctx?: { systemVars?: Record<string, string>; site?: { name: string }; page?: { title: string; slug: string } }
  ): Promise<string> {
    const navPattern = /\{\{navigation:([^}]+)\}\}/g;
    let match;
    let result = html;

    // Collect all matches first to avoid infinite loop
    const matches: { full: string; id: string }[] = [];
    while ((match = navPattern.exec(html)) !== null) {
      matches.push({ full: match[0], id: match[1] });
    }

    // Load all navs once for name-based lookup
    const allNavs = await this.navigations.findAll().catch(() => []);

    for (const m of matches) {
      // Try by ID first (backward compat), then by normalized name
      const nav = await this.navigations.findById(m.id)
        ?? allNavs.find((n) => n.name.toLowerCase().replace(/\s+/g, "-") === m.id.toLowerCase())
        ?? null;
      if (nav && nav.template) {
        const rendered = await this.render.render({
          template: nav.template,
          data:    { menu: nav.items, items: nav.items, ...(ctx?.systemVars ?? {}) },
          globals: { site: ctx?.site ?? {}, page: ctx?.page ?? {} },
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
  async renderContent(
    areaKey: string,
    slug: string,
    opts?: { draft?: boolean },
  ): Promise<RenderContentResult | null> {
    const draft = opts?.draft === true;

    // 1. Resolve page — findBySlug only returns published rows, so for draft
    //    preview we fall back to a full scan filtered by area + slug.
    let page = await this.pages.findBySlug(areaKey, slug);
    if (!page && draft) {
      const all = await this.pages.findAll(areaKey);
      page = all.find((p) => p.slug === slug) ?? null;
    }
    if (!page) return null;
    if (!draft && page.status !== "published") return null;

    const version = draft
      ? await this.pageVersions.getLatest(page.id)
      : await this.pageVersions.getLatestPublished(page.id);
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
    const seenComponentIds = new Set<string>();

    for (const instance of version.structure) {
      const component = await this.components.findById(instance.componentId);
      if (!component) continue;

      const componentVersion = await this.componentVersions.getLatest(instance.componentId);
      if (!componentVersion) continue;

      const safeTemplate = resolveSystemVarPlaceholders(
        protectCmsPlaceholders(componentVersion.templateLiquid),
        systemVars,
      );

      const expandedProps = this.expandImageProps(instance.props, componentVersion.schema);
      const rendered = await this.render.render({
        template: safeTemplate,
        data: { ...expandedProps, ...systemVars },
        globals: {
          page: { title: page.title, slug: page.slug },
          site: { name: area?.siteName ?? areaKey },
          area: area ?? {},
          ...instance.globals,
        },
      }).then(restoreCmsPlaceholders);

      contentHtml += wrapAnimation(rendered, instance.animation);

      if (!seenComponentIds.has(instance.componentId)) {
        seenComponentIds.add(instance.componentId);
        if (componentVersion.css) componentCss += componentVersion.css + "\n";
        if (componentVersion.js) componentJs += componentVersion.js + "\n";
      }
    }

    // 5. Resolve navigation and form embeds
    const navCtx2 = { systemVars, site: { name: area?.siteName ?? areaKey }, page: { title: page.title, slug: page.slug } };
    contentHtml = await this.resolveNavigations(contentHtml, navCtx2);
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
    .replace(/\{\{navigation:([^}]+)\}\}/g, "__CMS_NAV_$1__")
    .replace(/\{\{system:([^}]+)\}\}/g, "__CMS_SYS_$1__");
}

/**
 * Pre-resolve {{system:key}} placeholders by substituting the actual
 * value from systemVars BEFORE passing the template to LiquidJS.
 * Called on the protected template (after protectCmsPlaceholders).
 * LiquidJS never sees {{system:*}} — the colon is not valid in Liquid identifiers.
 */
function resolveSystemVarPlaceholders(
  template: string,
  systemVars: Record<string, string>,
): string {
  return template.replace(/__CMS_SYS_([^_][^_]*)__/g, (_, key) => {
    return systemVars[key.trim()] ?? "";
  });
}

/** Restore CMS placeholders after Liquid rendering */
function restoreCmsPlaceholders(html: string): string {
  return html
    .replace(/__CMS_FORM_([^_]+)__/g, "{{form:$1}}")
    .replace(/__CMS_NAV_([^_]+)__/g, "{{navigation:$1}}");
}

/**
 * Wrap a component's rendered HTML in a reveal-on-scroll envelope when an
 * animation is configured on the instance. The wrapper has `data-cms-animate`,
 * `data-cms-delay` and `data-cms-duration` attributes which the public-site
 * client script picks up via IntersectionObserver to toggle an `is-visible`
 * class.
 */
function wrapAnimation(html: string, animation?: { type: string; delay?: number; duration?: number }): string {
  if (!animation || !animation.type || animation.type === "none") return html;
  const delay = animation.delay && animation.delay > 0 ? animation.delay : 0;
  const duration = animation.duration && animation.duration > 0 ? animation.duration : 600;
  return `<div class="cms-animate" data-cms-animate="${animation.type}" data-cms-delay="${delay}" data-cms-duration="${duration}">${html}</div>`;
}
