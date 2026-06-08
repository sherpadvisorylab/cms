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
} from "@sherpacms/infrastructure";
import {
  normalizeVariableAliases,
  CmsArea,
  CmsNavigationItem,
  CmsPage,
  CmsSettings,
  CmsVariableDefinition,
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

const DEFAULT_STYLE_VARIABLES: CmsVariableDefinition[] = [
  { namespace: "styles", key: "bgPrimary", label: "Background Primary", type: "text", value: "bg-primary" },
  { namespace: "styles", key: "bgSecondary", label: "Background Secondary", type: "text", value: "bg-secondary" },
  { namespace: "styles", key: "bgAccent", label: "Background Accent", type: "text", value: "bg-accent" },
  { namespace: "styles", key: "bgSurface", label: "Background Surface", type: "text", value: "bg-surface" },
  { namespace: "styles", key: "textPrimary", label: "Text Primary", type: "text", value: "text-primary" },
  { namespace: "styles", key: "textSecondary", label: "Text Secondary", type: "text", value: "text-secondary" },
  { namespace: "styles", key: "textMuted", label: "Text Muted", type: "text", value: "text-muted" },
  { namespace: "styles", key: "textAccent", label: "Text Accent", type: "text", value: "text-accent" },
  { namespace: "styles", key: "borderPrimary", label: "Border Primary", type: "text", value: "border-primary" },
  { namespace: "styles", key: "borderSecondary", label: "Border Secondary", type: "text", value: "border-secondary" },
  { namespace: "styles", key: "borderMuted", label: "Border Muted", type: "text", value: "border-muted" },
];

/** Options passed to the CMS constructor. */
export interface CMSOptions {
  /**
   * Called after a page is published/updated so the hosting framework can
   * invalidate its page cache (e.g. Next.js revalidateTag / revalidatePath).
   * Receives the list of public permalinks that changed.
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
    this.render = new LiquidRenderEngine();
  }

  // ── System pages ─────────────────────────────────────────────────────────────

  /**
   * Render a system page (home, 404, …) for an area as a full HTML document.
   * Returns null if no system page of that type is configured or the page is unpublished.
   *
   * Use this in Route Handlers (returns a complete HTML string).
   */
  async renderSystemPage(
    areaKey: string,
    type: string,
    opts?: { draft?: boolean },
  ): Promise<string | null> {
    const area = await this.areas.findByKey(areaKey);
    const pageId = area?.systemPages?.[type];
    if (!pageId) return null;
    const allPages = await this.pages.findAll(areaKey);
    const page = allPages.find((p) => p.id === pageId) ?? null;
    if (!page) return null;
    return this.renderPage(areaKey, page.permalink ?? page.slug, opts);
  }

  /**
   * Render a system page as structured content { html, css, js }.
   * Returns null if no system page of that type is configured or the page is unpublished.
   *
   * Use this in Next.js page.tsx components (CSS can be injected separately).
   */
  async renderSystemContent(
    areaKey: string,
    type: string,
  ): Promise<RenderContentResult | null> {
    const area = await this.areas.findByKey(areaKey);
    const pageId = area?.systemPages?.[type];
    if (!pageId) return null;
    const allPages = await this.pages.findAll(areaKey);
    const page = allPages.find((p) => p.id === pageId) ?? null;
    if (!page) return null;
    return this.renderContent(areaKey, page.permalink ?? page.slug);
  }

  /**
   * Assign a page as the system page of a given type for an area.
   *
   * If a different page was previously the system page of that type, it is
   * demoted: its slug gains a `_bkp` suffix and its status is set to `draft`.
   */
  async assignSystemPage(
    areaKey: string,
    type: string,
    pageId: string,
  ): Promise<void> {
    const area = await this.areas.findByKey(areaKey);
    if (!area) throw new Error(`Area not found: ${areaKey}`);

    const prevPageId = area.systemPages?.[type];

    // Demote the previous system page (if different)
    if (prevPageId && prevPageId !== pageId) {
      const allPages = await this.pages.findAll(areaKey);
      const prevPage = allPages.find((p) => p.id === prevPageId);
      if (prevPage) {
        await this.pages.update(prevPageId, {
          slug: `${prevPage.slug.replace(/_bkp$/, "")}_bkp`,
          permalink: replacePermalinkLeaf(
            prevPage.permalink ?? `/${prevPage.slug}`,
            `${prevPage.slug.replace(/_bkp$/, "")}_bkp`,
          ),
          status: "draft",
        });
      }
    }

    // Update area
    const systemPages = { ...(area.systemPages ?? {}), [type]: pageId };
    await this.areas.update(area.id, { systemPages });
  }

  /**
   * Remove the system page assignment for a type in an area.
   * The page itself is not modified.
   */
  async removeSystemPage(areaKey: string, type: string): Promise<void> {
    const area = await this.areas.findByKey(areaKey);
    if (!area) return;
    const systemPages = { ...(area.systemPages ?? {}) };
    delete systemPages[type];
    await this.areas.update(area.id, { systemPages });
  }

  /**
   * Notify the hosting framework that one or more public pages have changed
   * and their cached output should be invalidated.
   *
   * Call this after publishing or updating page content.
   * The actual cache invalidation is performed by the `onRevalidate` callback
   * provided in the constructor options — typically `revalidateTag()` in Next.js.
   *
   * @param slug - A single public permalink string or an array of permalinks to invalidate.
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
            "  <title>{{page.metaTitle}} | {{site.name}}</title>",
            "  {{site.metaTags}}",
            "  {{site.styles}}",
            "</head>",
          ].join("\n"),
          bodyTemplate: [
            "<body>",
            "  {{page.content}}",
            "  {{site.trackingScripts}}",
            "  {{site.scripts}}",
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
        variables: DEFAULT_STYLE_VARIABLES.map((variable) => ({ ...variable })),
      });
    }
  }

  /**
   * Render a complete page by area key and permalink.
   * Returns full HTML document or null if page not found / not published.
   *
   * Flow per docs/13_workflow.md:
   * 1. Resolve page by area + permalink
   * 2. Load area (head/body templates, style, design)
   * 3. Render each component in page structure with content + system vars
   * 4. Collect component CSS/JS
   * 5. Concatenate → content HTML
   * 6. Resolve {{navigation:id}} and {{form:variable}} in content
   * 7. Fill {{page.content}} in the area body template
   * 8. Resolve design bodyElements (custom variables) in body
   * 9. Resolve navigation/form in body template too
   * 10. Build head from area head template
   * 11. Assemble full HTML document
   */
  async renderPage(areaKey: string, permalink: string, opts?: { draft?: boolean }): Promise<string | null> {
    const draft = opts?.draft === true;

    // 1. Resolve page
    let page = await this.pages.findByPermalink(areaKey, permalink);
    if (!page && draft) {
      const all = await this.pages.findAll(areaKey);
      const normalizedPermalink = normalizePermalink(permalink);
      page = all.find((p) => normalizePermalink(p.permalink ?? p.slug) === normalizedPermalink) ?? null;
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

    const basePage = this.buildPageContext(page);
    const baseSite = this.buildSiteContext(area, settingsObj, page);
    const baseStyles = this.buildStylesContext(area, settingsObj);

    // 4. Render each component + collect CSS/JS
    let contentHtml = "";
    let componentCss = "";
    let componentJs = "";
    const seenComponentIds = new Set<string>();

    for (const instance of version.structure) {
      if (instance.disabled) continue;

      const component = await this.components.findById(instance.componentId);
      if (!component) continue;

      const componentVersion = await this.componentVersions.getLatest(instance.componentId);
      if (!componentVersion) continue;

      const safeTemplate = protectCmsPlaceholders(normalizeVariableAliases(componentVersion.templateLiquid));

      // Resolve linked props: if this instance has linkedFrom, use the origin instance's props/globals
      let resolvedProps = instance.props;
      let resolvedGlobals = instance.globals;
      if (instance.linkedFrom) {
        const originPage = await this.pages.findAll().then((pages) =>
          pages.find((p) => p.id === instance.linkedFrom!.pageId) ?? null,
        );
        if (originPage) {
          const originVersion = await this.pageVersions.getLatest(originPage.id);
          const originInstance = originVersion?.structure.find(
            (s) => s.instanceId === instance.linkedFrom!.instanceId,
          );
          if (originInstance) {
            resolvedProps = originInstance.props;
            resolvedGlobals = originInstance.globals;
          }
        }
      }

      const expandedProps = this.expandImageProps(resolvedProps, componentVersion.schema);
      const rendered = await this.render.render({
        template: safeTemplate,
        data: expandedProps,
        globals: {
          page: basePage,
          site: baseSite,
          styles: baseStyles,
          component: {
            name: component.name,
            namespace: component.namespace ?? "",
          },
          ...resolvedGlobals,
        },
      }).then(restoreCmsPlaceholders);

      contentHtml += wrapAnimation(rendered, instance.animation);

      if (!seenComponentIds.has(instance.componentId)) {
        seenComponentIds.add(instance.componentId);
        if (componentVersion.css) componentCss += componentVersion.css + "\n";
        if (componentVersion.js) componentJs += componentVersion.js + "\n";
      }
    }

    const metaTags = this.buildMetaTags(
      page as CmsPage,
      this.buildPublicPageUrl(area, settingsObj, page),
    );
    const trackingScripts = this.buildTrackingScripts(area, "body-bottom");

    // Build CSS/JS tags early so they can be injected into site.* globals
    const areaCss = area?.design?.areaCss ?? "";
    const areaJs = area?.design?.areaJs ?? "";
    const allCss = [areaCss, componentCss].filter(Boolean).join("\n");
    const allJs = [areaJs, componentJs].filter(Boolean).join("\n");
    const stylesTag = allCss ? `<style>${allCss}</style>` : "";
    const scriptsTag = allJs ? `<script>${allJs}</script>` : "";
    const headTrackingScripts = this.buildTrackingScripts(area, "head");

    const contentContext = {
      page: basePage,
        site: this.buildSiteContext(area, settingsObj, page),
      styles: baseStyles,
    };
    contentHtml = await this.resolveComponentEmbeds(contentHtml, contentContext);
    contentHtml = await this.resolveNavigations(contentHtml, contentContext);
    contentHtml = await this.resolveForms(contentHtml);

    const pageContext = this.buildPageContext(page, contentHtml);
    const siteContext = this.buildSiteContext(
      area,
        settingsObj,
        page,
        metaTags,
      stylesTag + headTrackingScripts,
      scriptsTag,
      trackingScripts,
    );

    // 6. Render body template with the same globals contract used by component Liquid
    const bodyTemplate = protectCmsPlaceholders(normalizeVariableAliases(area?.design?.bodyTemplate ?? "{{page.content}}"));
    let bodyHtml = await this.render.render({
      template: bodyTemplate,
      data: {},
      globals: {
        page: pageContext,
        site: siteContext,
        styles: baseStyles,
      },
    }).then(restoreCmsPlaceholders);

    if (area?.design?.bodyElements) {
      for (const el of area.design.bodyElements) {
        const pattern = new RegExp(escapeRegex(el.variable), "g");
        bodyHtml = bodyHtml.replace(pattern, el.content);
      }
    }

    bodyHtml = await this.resolveComponentEmbeds(bodyHtml, { page: pageContext, site: siteContext, styles: baseStyles });
    bodyHtml = await this.resolveNavigations(bodyHtml, { page: pageContext, site: siteContext, styles: baseStyles });
    bodyHtml = await this.resolveForms(bodyHtml);

    // 11. Render head template with namespaced globals
    const headTemplate = protectCmsPlaceholders(
      normalizeVariableAliases(area?.design?.headTemplate ?? "<head><title>{{page.metaTitle}}</title></head>"),
    );
    const headHtml = await this.render.render({
      template: headTemplate,
      data: {},
      globals: {
        page: pageContext,
        site: siteContext,
        styles: baseStyles,
      },
    }).then(restoreCmsPlaceholders);

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

  private getMergedSettingVariables(settings: CmsSettings | null): CmsVariableDefinition[] {
    const merged = new Map<string, CmsVariableDefinition>();

    for (const variable of DEFAULT_STYLE_VARIABLES) {
      merged.set(`${variable.namespace}.${variable.key}`, { ...variable });
    }

    for (const variable of settings?.variables ?? []) {
      merged.set(`${variable.namespace}.${variable.key}`, { ...variable });
    }

    return [...merged.values()];
  }

  private resolveVariableValue(variable: CmsVariableDefinition): string {
    if (variable.type === "select") {
      return variable.value ?? variable.options?.[0]?.value ?? "";
    }
    return variable.value ?? "";
  }

  private buildStylesContext(area: CmsArea | null, settings: CmsSettings | null): Record<string, string> {
    const styles = Object.fromEntries(
      this.getMergedSettingVariables(settings)
        .filter((variable) => variable.namespace === "styles")
        .map((variable) => [variable.key, this.resolveVariableValue(variable)]),
    );

    const defaultSchema = area?.style?.colorSchemas?.find((schema) => schema.isDefault) ?? area?.style?.colorSchemas?.[0];
    const colors = defaultSchema?.colors ?? {};

    if (colors.primary) styles.bgPrimary = colors.primary;
    if (colors.secondary) styles.bgSecondary = colors.secondary;
    if (colors.accent) styles.bgAccent = colors.accent;
    if (colors.surface ?? colors.background) styles.bgSurface = colors.surface ?? colors.background ?? styles.bgSurface;
    if (colors.text) styles.textPrimary = colors.text;
    if (colors["text-muted"]) styles.textMuted = colors["text-muted"];
    if (colors.border) styles.borderPrimary = colors.border;

    return styles;
  }

  private buildSiteContext(
    area: CmsArea | null,
    settings: CmsSettings | null,
    page: CmsPage | null = null,
    metaTags = "",
    stylesMarkup = "",
    scriptsMarkup = "",
    trackingScripts = "",
  ): Record<string, string> {
    const site = Object.fromEntries(
      this.getMergedSettingVariables(settings)
        .filter((variable) => variable.namespace === "site")
        .map((variable) => [variable.key, this.resolveVariableValue(variable)]),
    );

    site.name = area?.siteName || site.name || settings?.branding?.projectName || area?.displayName || area?.name || "";
    site.permalink = page ? this.buildPublicPageUrl(area, settings, page) : (site.permalink || "");
    site.logo = area?.style?.logoLight || site.logo || settings?.branding?.logoLight || "";
    site.logoDark = area?.style?.logoDark || site.logoDark || settings?.branding?.logoDark || "";
    site.favicon = area?.style?.favicon || site.favicon || settings?.branding?.favicon || "";
    site.metaTags = metaTags;
    site.styles = stylesMarkup;
    site.scripts = scriptsMarkup;
    site.trackingScripts = trackingScripts;

    return site;
  }

  private buildPublicPageUrl(area: CmsArea | null, settings: CmsSettings | null, page: CmsPage): string {
    const pagePermalink = normalizePermalink(page.permalink ?? page.slug);
    const rootPath = normalizeAreaRootPath(area?.rootPath);
    const relativePath = pagePermalink === "/" ? (rootPath || "/") : `${rootPath}${pagePermalink}`;
    const siteUrl = normalizeSiteUrl(settings?.branding?.siteUrl);

    if (!siteUrl) return relativePath || "/";
    return relativePath === "/" ? `${siteUrl}/` : `${siteUrl}${relativePath}`;
  }

  private buildPageContext(page: CmsPage, content = ""): Record<string, string> {
    return {
      title: page.title,
      slug: page.slug,
      permalink: page.permalink ?? normalizePermalink(page.slug),
      metaTitle: page.seo?.metaTitle ?? page.seoTitle ?? page.title,
      metaDescription: page.seo?.metaDescription ?? page.seoDescription ?? "",
      content,
    };
  }

  /**
   * Resolve {{navigation:id}} or {{navigation:name}} placeholders in HTML.
   */
  private async resolveNavigations(
    html: string,
    ctx: { site: Record<string, string>; page: Record<string, string>; styles: Record<string, string> },
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
          const menuData = buildNavigationTemplateData(nav.items ?? []);
          const rendered = await this.render.render({
            template: normalizeVariableAliases(nav.template),
            data:    { menu: menuData },
            globals: { site: ctx.site, page: ctx.page, styles: ctx.styles },
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

  private async resolveComponentEmbeds(
    html: string,
    ctx: { site: Record<string, string>; page: Record<string, string>; styles: Record<string, string> },
  ): Promise<string> {
    let result = html;
    const allComponents = await this.components.findAll().catch(() => []);

    for (let depth = 0; depth < 5; depth++) {
      const matches = [...result.matchAll(/\{\{component:([^}]+)\}\}/g)];
      if (matches.length === 0) break;

      for (const match of matches) {
        const full = match[0];
        const ref = match[1];
        const component =
          await this.components.findById(ref)
          ?? allComponents.find((entry) => normalizeComponentReference(entry.name) === ref.toLowerCase())
          ?? null;

        if (!component) {
          result = result.replace(full, "");
          continue;
        }

        const version = await this.componentVersions.getLatest(component.id);
        if (!version) {
          result = result.replace(full, "");
          continue;
        }

        const rendered = await this.render.render({
          template: protectCmsPlaceholders(normalizeVariableAliases(version.templateLiquid)),
          data: {},
          globals: {
            site: ctx.site,
            page: ctx.page,
            styles: ctx.styles,
            component: {
              name: component.name,
              namespace: component.namespace ?? "",
            },
          },
        }).then(restoreCmsPlaceholders);

        const css = version.css ? `<style>${version.css}</style>` : "";
        const js = version.js ? `<script>${version.js}</script>` : "";
        result = result.replace(full, `${css}${rendered}${js}`);
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
  private buildMetaTags(page: CmsPage, canonicalUrl: string): string {
    const tags: string[] = [];
    const desc = page.seo?.metaDescription ?? page.seoDescription;
    const keywords = page.seo?.keywords;
    if (canonicalUrl) {
      tags.push(`<link rel="canonical" href="${escapeAttr(canonicalUrl)}">`);
    }
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
    permalink: string,
    opts?: { draft?: boolean },
  ): Promise<RenderContentResult | null> {
    const draft = opts?.draft === true;

    // 1. Resolve page — findByPermalink only returns published rows, so for draft
    //    preview we fall back to a full scan filtered by area + permalink.
    let page = await this.pages.findByPermalink(areaKey, permalink);
    if (!page && draft) {
      const all = await this.pages.findAll(areaKey);
      const normalizedPermalink = normalizePermalink(permalink);
      page = all.find((p) => normalizePermalink(p.permalink ?? p.slug) === normalizedPermalink) ?? null;
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

    const pageContext = this.buildPageContext(page);
    const siteContext = this.buildSiteContext(area, settingsObj, page);
    const stylesContext = this.buildStylesContext(area, settingsObj);

    // 4. Render each component + collect CSS/JS
    let contentHtml = "";
    let componentCss = "";
    let componentJs = "";
    const seenComponentIds = new Set<string>();

    for (const instance of version.structure) {
      if (instance.disabled) continue;

      const component = await this.components.findById(instance.componentId);
      if (!component) continue;

      const componentVersion = await this.componentVersions.getLatest(instance.componentId);
      if (!componentVersion) continue;

      const safeTemplate = protectCmsPlaceholders(normalizeVariableAliases(componentVersion.templateLiquid));

      // Resolve linked props: if this instance has linkedFrom, use the origin instance's props/globals
      let resolvedProps = instance.props;
      let resolvedGlobals = instance.globals;
      if (instance.linkedFrom) {
        const originPage = await this.pages.findAll().then((pages) =>
          pages.find((p) => p.id === instance.linkedFrom!.pageId) ?? null,
        );
        if (originPage) {
          const originVersion = await this.pageVersions.getLatest(originPage.id);
          const originInstance = originVersion?.structure.find(
            (s) => s.instanceId === instance.linkedFrom!.instanceId,
          );
          if (originInstance) {
            resolvedProps = originInstance.props;
            resolvedGlobals = originInstance.globals;
          }
        }
      }

      const expandedProps = this.expandImageProps(resolvedProps, componentVersion.schema);
      const rendered = await this.render.render({
        template: safeTemplate,
        data: expandedProps,
        globals: {
          page: pageContext,
          site: siteContext,
          styles: stylesContext,
          component: {
            name: component.name,
            namespace: component.namespace ?? "",
          },
          ...resolvedGlobals,
        },
      }).then(restoreCmsPlaceholders);

      contentHtml += wrapAnimation(rendered, instance.animation);

      if (!seenComponentIds.has(instance.componentId)) {
        seenComponentIds.add(instance.componentId);
        if (componentVersion.css) componentCss += componentVersion.css + "\n";
        if (componentVersion.js) componentJs += componentVersion.js + "\n";
      }
    }

    // 5. Resolve component, navigation and form embeds
    contentHtml = await this.resolveComponentEmbeds(contentHtml, { site: siteContext, page: pageContext, styles: stylesContext });
    contentHtml = await this.resolveNavigations(contentHtml, { site: siteContext, page: pageContext, styles: stylesContext });
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

        const pagePermalink = normalizePermalink(page.permalink ?? page.slug);
        const isHome = pagePermalink === "/";
        const loc = isHome
          ? `${baseUrl}${rootPath || "/"}`
          : `${baseUrl}${rootPath}${pagePermalink === "/" ? "" : pagePermalink}`;

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

type NavigationTemplateNode = {
  key: string;
  type: "page" | "custom";
  label: string;
  url: string;
  target: "_self" | "_blank";
  description: string;
  items: NavigationTemplateNode[];
  [key: string]: unknown;
};

function buildNavigationTemplateData(items: CmsNavigationItem[]) {
  const normalizedItems = normalizeNavigationItems(items);
  const root = createNavigationTemplateContainer(normalizedItems);
  return root;
}

function normalizeNavigationItems(items: CmsNavigationItem[]) {
  const usedKeys = new Set<string>();
  return items.map((item, index) => normalizeNavigationItemNode(item, usedKeys, `item-${index + 1}`));
}

function normalizeNavigationItemNode(
  item: CmsNavigationItem,
  usedSiblingKeys: Set<string>,
  fallbackKey: string,
): CmsNavigationItem {
  const nextItems = normalizeNavigationItemChildren(item);
  const key = ensureUniqueNavigationKey(item.key ?? deriveNavigationKey(item), usedSiblingKeys, fallbackKey);
  const usedChildKeys = new Set<string>();

  return {
    ...item,
    key,
    items: nextItems.map((child, index) => normalizeNavigationItemNode(child, usedChildKeys, `${key}-item-${index + 1}`)),
  };
}

function normalizeNavigationItemChildren(item: CmsNavigationItem) {
  const legacyChildren = Array.isArray((item as CmsNavigationItem & { children?: CmsNavigationItem[] }).children)
    ? ((item as CmsNavigationItem & { children?: CmsNavigationItem[] }).children ?? [])
    : [];
  const nextItems = Array.isArray(item.items) ? item.items : legacyChildren;
  return nextItems;
}

function deriveNavigationKey(item: CmsNavigationItem) {
  const labelCandidate = slugifyNavigationSegment(item.label);
  return labelCandidate || "";
}

function slugifyNavigationSegment(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function ensureUniqueNavigationKey(
  requestedKey: string,
  usedKeys: Set<string>,
  fallbackKey: string,
) {
  const base = slugifyNavigationSegment(requestedKey) || slugifyNavigationSegment(fallbackKey) || "item";
  let candidate = base;
  let suffix = 2;
  while (usedKeys.has(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  usedKeys.add(candidate);
  return candidate;
}

function createNavigationTemplateContainer(items: CmsNavigationItem[]) {
  const root: Record<string, unknown> = {
    items: items.map((item) => createNavigationTemplateNode(item)),
  };

  for (const item of root.items as NavigationTemplateNode[]) {
    root[item.key] = item;
  }

  return root;
}

function createNavigationTemplateNode(item: CmsNavigationItem): NavigationTemplateNode {
  const nodeItems = (item.items ?? []).map((child) => createNavigationTemplateNode(child));
  const node: NavigationTemplateNode = {
    key: item.key,
    type: item.type,
    label: item.label,
    url: item.url,
    target: item.target === "_blank" ? "_blank" : "_self",
    description: typeof item.description === "string" ? item.description : "",
    items: nodeItems,
  };

  for (const [key, value] of Object.entries(item)) {
    if (key === "items" || key === "children") continue;
    if (key in node) continue;
    node[key] = value;
  }

  for (const child of nodeItems) {
    node[child.key] = child;
  }

  return node;
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
    .replace(/\{\{component:([^}]+)\}\}/g, "__CMS_COMPONENT_$1__");
}

/** Restore CMS placeholders after Liquid rendering */
function restoreCmsPlaceholders(html: string): string {
  return html
    .replace(/__CMS_FORM_([^_]+)__/g, "{{form:$1}}")
    .replace(/__CMS_NAV_([^_]+)__/g, "{{navigation:$1}}")
    .replace(/__CMS_COMPONENT_([^_]+)__/g, "{{component:$1}}");
}

function normalizeComponentReference(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function normalizePermalink(value: string | null | undefined): string {
  const raw = (value ?? "").trim();
  if (!raw || raw === "/") return "/";
  const collapsed = raw.replace(/\/+/g, "/");
  const withLeadingSlash = collapsed.startsWith("/") ? collapsed : `/${collapsed}`;
  return withLeadingSlash.length > 1
    ? withLeadingSlash.replace(/\/+$/g, "")
    : withLeadingSlash;
}

function normalizeAreaRootPath(value: string | null | undefined): string {
  const raw = (value ?? "").trim();
  if (!raw || raw === "/") return "";
  const normalized = normalizePermalink(raw);
  return normalized === "/" ? "" : normalized;
}

function normalizeSiteUrl(value: string | null | undefined): string {
  const raw = (value ?? "").trim();
  if (!raw) return "";
  return raw.replace(/\/+$/g, "");
}

function replacePermalinkLeaf(permalink: string, nextSlug: string): string {
  const normalizedPermalink = normalizePermalink(permalink);
  if (normalizedPermalink === "/") return `/${nextSlug}`;
  const parentPath = normalizedPermalink.replace(/\/[^/]+$/, "") || "/";
  return parentPath === "/" ? `/${nextSlug}` : `${parentPath}/${nextSlug}`;
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
