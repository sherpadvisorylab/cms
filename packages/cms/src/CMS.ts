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
  RedirectRepository,
  CollectionRepository,
  TranslationDictionaryRepository,
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
  IRedirectRepository,
  ICollectionRepository,
  ITranslationDictionaryRepository,
  CmsTranslationEntry,
  IRenderEngine,
  CmsCollection,
  CmsCollectionView,
  CmsCollectionRecord,
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
  readonly redirects: IRedirectRepository;
  readonly collections: ICollectionRepository;
  readonly translations: ITranslationDictionaryRepository;

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
    this.redirects = new RedirectRepository(storage);
    this.collections = new CollectionRepository(storage);
    this.translations = new TranslationDictionaryRepository(storage);
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
    opts?: { draft?: boolean; locale?: string },
  ): Promise<string | null> {
    const area = await this.areas.findByKey(areaKey);
    const pageId = area?.systemPages?.[type];
    if (!pageId) return null;
    const allPages = await this.pages.findAll(areaKey);
    const page = allPages.find((p) => p.id === pageId) ?? null;
    if (!page) return null;
    return this.renderPage(areaKey, this.resolveSystemPagePath(type), opts);
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
    return this.renderContent(areaKey, this.resolveSystemPagePath(type));
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
  async renderPage(areaKey: string, permalink: string, opts?: { draft?: boolean; locale?: string; searchParams?: Record<string, string> }): Promise<string | null> {
    const draft = opts?.draft === true;
    const area = await this.areas.findByKey(areaKey);

    // 1. Resolve page
    let page = await this.pages.findByPermalink(areaKey, permalink, opts?.locale);
    if (!page) {
      page = await this.findSystemPageByCanonicalPermalink(areaKey, area, permalink);
    }
    if (!page && draft) {
      const all = await this.pages.findAll(areaKey);
      const normalizedPermalink = normalizePermalink(permalink);
      page = all.find((p) => {
        const pagePermalink = this.resolveCanonicalPagePermalink(area, p);
        return pagePermalink === normalizedPermalink
          || normalizePermalink(p.permalink ?? p.slug) === normalizedPermalink;
      }) ?? null;
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
    const settingsObj = await this.settings.get();

    const effectiveLocale = opts?.locale ?? page.locale ?? area?.defaultLocale ?? settingsObj?.branding?.defaultLanguage ?? "";
    const translations = await this.resolvePageTranslations(page, area, settingsObj, effectiveLocale);
    const t = await this.buildTranslationGlobals(effectiveLocale, area?.defaultLocale ?? settingsObj?.branding?.defaultLanguage ?? "");

    const basePage = this.buildPageContext(page, "", translations, area);
    const baseSite = this.buildSiteContext(area, settingsObj, page, "", "", "", "", effectiveLocale);
    const baseStyles = this.buildStylesContext(area, settingsObj);

    // 4. Render each component + collect CSS/JS
    let contentHtml = "";
    let componentCss = "";
    let componentJs = "";
    const seenComponentIds = new Set<string>();
    const collectionPropsMap = new Map<string, Record<string, Record<string, unknown>>>();

    for (const instance of version.structure) {
      if (instance.disabled) continue;

      if (instance.blockType === "collection" && instance.collectionSlug) {
        const viewPart = instance.collectionViewSlug ?? "";
        const filterPart = instance.filteredRecordIds?.length ? instance.filteredRecordIds.join(",") : "";
        let token = `{{collection:${instance.collectionSlug}`;
        if (viewPart || filterPart) token += `:${viewPart}`;
        if (filterPart) token += `|${filterPart}`;
        token += "}}";
        contentHtml += wrapAnimation(token, instance.animation);
        if (instance.collectionComponentProps) {
          collectionPropsMap.set(`${instance.collectionSlug}:${viewPart}`, instance.collectionComponentProps);
        }
        continue;
      }

      if (!instance.componentId) continue;
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

      const propsWithRelations = await this.resolveRelationFields(
        resolvedProps,
        componentVersion.schema,
        { site: baseSite, page: basePage, styles: baseStyles, t },
        new Set(),
      );
      const expandedProps = this.expandImageProps(propsWithRelations, componentVersion.schema);
      const rendered = await this.render.render({
        template: safeTemplate,
        data: expandedProps,
        globals: {
          page: basePage,
          site: baseSite,
          styles: baseStyles,
          t,
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

    const hreflangEntries = translations.map((t) => ({
      locale: t.locale,
      url: t.url,
      isDefault: t.locale === (area?.defaultLocale ?? ""),
    }));
    const metaTags = this.buildMetaTags(
      page as CmsPage,
      this.buildPublicPageUrl(area, settingsObj, page, effectiveLocale, area?.defaultLocale ?? ""),
      hreflangEntries,
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
      site: this.buildSiteContext(area, settingsObj, page, "", "", "", "", effectiveLocale),
      styles: baseStyles,
      t,
    };
    contentHtml = await this.resolveComponentEmbeds(contentHtml, contentContext);
    contentHtml = await this.resolveNavigations(contentHtml, contentContext);
    contentHtml = await this.resolveCollections(contentHtml, contentContext, opts?.searchParams, collectionPropsMap);
    contentHtml = await this.resolveForms(contentHtml);

    const pageContext = this.buildPageContext(page, contentHtml, translations, area);
    const siteContext = this.buildSiteContext(
      area,
      settingsObj,
      page,
      metaTags,
      stylesTag + headTrackingScripts,
      scriptsTag,
      trackingScripts,
      effectiveLocale,
    );

    // 6. Render body template with the same globals contract used by component Liquid
    // bodyElements are passed as top-level globals so {{variableName}} resolves via Liquid
    const bodyElementsGlobals: Record<string, string> = {};
    if (area?.design?.bodyElements) {
      for (const el of area.design.bodyElements) {
        const key = el.variable.replace(/^\{\{|\}\}$/g, "").trim();
        if (key) bodyElementsGlobals[key] = el.content;
      }
    }

    const bodyTemplate = protectCmsPlaceholders(normalizeVariableAliases(area?.design?.bodyTemplate ?? "{{page.content}}"));
    let bodyHtml = await this.render.render({
      template: bodyTemplate,
      data: {},
      globals: {
        page: pageContext,
        site: siteContext,
        styles: baseStyles,
        t,
        ...bodyElementsGlobals,
      },
    }).then(restoreCmsPlaceholders);

    bodyHtml = await this.resolveComponentEmbeds(bodyHtml, { page: pageContext, site: siteContext, styles: baseStyles, t });
    bodyHtml = await this.resolveNavigations(bodyHtml, { page: pageContext, site: siteContext, styles: baseStyles, t });
    bodyHtml = await this.resolveCollections(bodyHtml, { page: pageContext, site: siteContext, styles: baseStyles, t }, opts?.searchParams);
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
        t,
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

  /**
   * Resolves the whole UI-string dictionary into a flat `{ key: text }` map for `locale`,
   * falling back to `defaultLocale` and then to any available value. Exposed to every Liquid
   * render as the `t` global — `{{t.key}}` — covering hardcoded "chrome" text (nav templates,
   * component templates, collection views) that has no natural home as a page/component field.
   */
  private async buildTranslationGlobals(locale: string, defaultLocale: string): Promise<Record<string, string>> {
    const entries = await this.translations.findAll().catch(() => []);
    const map: Record<string, string> = {};
    for (const entry of entries) {
      map[entry.key] =
        (locale && entry.values[locale]) ||
        entry.values[defaultLocale] ||
        Object.values(entry.values).find((value) => value) ||
        "";
    }
    return map;
  }

  private buildSiteContext(
    area: CmsArea | null,
    settings: CmsSettings | null,
    page: CmsPage | null = null,
    metaTags = "",
    stylesMarkup = "",
    scriptsMarkup = "",
    trackingScripts = "",
    effectiveLocale = "",
  ): Record<string, unknown> {
    const site: Record<string, unknown> = Object.fromEntries(
      this.getMergedSettingVariables(settings)
        .filter((variable) => variable.namespace === "site")
        .map((variable) => [variable.key, this.resolveVariableValue(variable)]),
    );

    site.name = area?.siteName || (site.name as string) || settings?.branding?.projectName || area?.displayName || area?.name || "";
    site.permalink = page ? this.buildPublicPageUrl(area, settings, page, effectiveLocale, area?.defaultLocale ?? "") : ((site.permalink as string) || "");
    site.logo = area?.style?.logoLight || (site.logo as string) || settings?.branding?.logoLight || "";
    site.logoDark = area?.style?.logoDark || (site.logoDark as string) || settings?.branding?.logoDark || "";
    site.favicon = area?.style?.favicon || (site.favicon as string) || settings?.branding?.favicon || "";
    site.metaTags = metaTags;
    site.styles = stylesMarkup;
    site.scripts = scriptsMarkup;
    site.trackingScripts = trackingScripts;
    site.locale = effectiveLocale || area?.defaultLocale || settings?.branding?.defaultLanguage || "";
    site.default_locale = area?.defaultLocale || settings?.branding?.defaultLanguage || "";
    site.supported_locales = area?.supportedLocales ?? [];

    return site;
  }

  private buildPublicPageUrl(
    area: CmsArea | null,
    settings: CmsSettings | null,
    page: CmsPage,
    effectiveLocale = "",
    defaultLocale = "",
  ): string {
    const pagePermalink = this.resolveCanonicalPagePermalink(area, page);
    const rootPath = normalizeAreaRootPath(area?.rootPath);

    const resolvedDefaultLocale = defaultLocale || area?.defaultLocale || "";
    const isNonDefaultLocale = effectiveLocale && resolvedDefaultLocale && effectiveLocale !== resolvedDefaultLocale;
    const localePrefix = isNonDefaultLocale ? `/${effectiveLocale}` : "";

    const relativePath = pagePermalink === "/"
      ? (localePrefix || rootPath || "/")
      : `${localePrefix}${rootPath}${pagePermalink}`;

    const siteUrl = normalizeSiteUrl(settings?.branding?.siteUrl);
    if (!siteUrl) return relativePath || "/";
    return relativePath === "/" ? `${siteUrl}/` : `${siteUrl}${relativePath}`;
  }

  /**
   * Resolve published translations for a page (all locale versions linked by translationKey).
   * Returns an array ready for {{page.translations}} Liquid context.
   */
  private async resolvePageTranslations(
    page: CmsPage,
    area: CmsArea | null,
    settings: CmsSettings | null,
    effectiveLocale: string,
  ): Promise<Array<{ locale: string; label: string; url: string; is_current: boolean }>> {
    if (!page.translationKey) return [];
    const siblings = await this.pages.findPublishedByTranslationKey(page.translationKey).catch(() => []);
    if (siblings.length <= 1) return [];
    return siblings.map((p) => {
      const loc = p.locale ?? area?.defaultLocale ?? "";
      return {
        locale: loc,
        label: loc.toUpperCase(),
        url: this.buildPublicPageUrl(area, settings, p, loc, area?.defaultLocale ?? ""),
        is_current: loc === effectiveLocale,
      };
    });
  }

  private buildPageContext(
    page: CmsPage,
    content = "",
    translations: Array<{ locale: string; label: string; url: string; is_current: boolean }> = [],
    area: CmsArea | null = null,
  ): Record<string, unknown> {
    return {
      title: page.title,
      slug: page.slug,
      permalink: this.resolveCanonicalPagePermalink(area, page),
      metaTitle: page.seo?.metaTitle ?? page.seoTitle ?? page.title,
      metaDescription: page.seo?.metaDescription ?? page.seoDescription ?? "",
      content,
      locale: page.locale ?? "",
      translation_key: page.translationKey ?? "",
      translations,
    };
  }

  private resolveSystemPagePath(type: string): string {
    return type === "home" ? "/" : normalizePermalink(`/${type}`);
  }

  private resolveCanonicalPagePermalink(area: CmsArea | null, page: CmsPage): string {
    if (area?.systemPages) {
      const matchedEntry = Object.entries(area.systemPages).find(([, pageId]) => pageId === page.id);
      if (matchedEntry) {
        return this.resolveSystemPagePath(matchedEntry[0]);
      }
    }
    return normalizePermalink(page.permalink ?? page.slug);
  }

  private async findSystemPageByCanonicalPermalink(
    areaKey: string,
    area: CmsArea | null,
    permalink: string,
  ): Promise<CmsPage | null> {
    const normalizedPermalink = normalizePermalink(permalink);
    if (!area?.systemPages) return null;

    const systemEntry = Object.entries(area.systemPages).find(
      ([type]) => this.resolveSystemPagePath(type) === normalizedPermalink,
    );
    if (!systemEntry) return null;

    const pageId = systemEntry[1];
    if (!pageId) return null;
    const allPages = await this.pages.findAll(areaKey);
    return allPages.find((p) => p.id === pageId) ?? null;
  }

  /**
   * Resolve {{navigation:id}} or {{navigation:name}} placeholders in HTML.
   */
  private async resolveNavigations(
    html: string,
    ctx: { site: Record<string, unknown>; page: Record<string, unknown>; styles: Record<string, unknown>; t?: Record<string, string> },
  ): Promise<string> {
    const navPattern = /\{\{navigation:([^}]+)\}\}/g;
    let match;
    let result = html;

    // Collect all matches first to avoid infinite loop
    const matches: { full: string; id: string }[] = [];
    while ((match = navPattern.exec(html)) !== null) {
      matches.push({ full: match[0], id: match[1] });
    }
    if (!matches.length) return html;

    // Load all navs once for name-based lookup
    const allNavs = await this.navigations.findAll().catch(() => []);
    const locale = (ctx.site?.locale as string) || "";

    const linkedPageIds = new Set<string>();
    collectNavigationPageIds(allNavs.flatMap((n) => n.items ?? []), linkedPageIds);
    const linkCtx = linkedPageIds.size ? await this.buildNavigationPageLinkContext() : null;

    for (const m of matches) {
      // Try by ID first (backward compat), then by normalized name
      const nav = await this.navigations.findById(m.id)
        ?? allNavs.find((n) => n.name.toLowerCase().replace(/\s+/g, "-") === m.id.toLowerCase())
        ?? null;
        if (nav && nav.template) {
          const localizedItems = this.resolveNavigationItemsForLocale(nav.items ?? [], locale, linkCtx);
          const menuData = buildNavigationTemplateData(localizedItems);
          const rendered = await this.render.render({
            template: normalizeVariableAliases(nav.template),
            data:    { menu: menuData },
            globals: { site: ctx.site, page: ctx.page, styles: ctx.styles, t: ctx.t ?? {} },
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
   * Fetches everything needed to resolve `page`-type nav items to a locale-specific URL:
   * the linked page, its area (for the URL prefix/rootPath), and its translation siblings.
   * Only built when at least one navigation item actually references a page by id.
   */
  private async buildNavigationPageLinkContext(): Promise<NavigationPageLinkContext> {
    const [allPages, allAreas, settings] = await Promise.all([
      this.pages.findAll().catch(() => []),
      this.areas.findAll().catch(() => []),
      this.settings.get().catch(() => null),
    ]);
    // CmsPage.area may store either the area's name or its id depending on how the page was
    // created — index by both so the lookup in resolveNavigationPageLinkUrl always finds it.
    const areasByKey = new Map<string, CmsArea>();
    for (const area of allAreas) {
      if (area.name) areasByKey.set(area.name, area);
      areasByKey.set(area.id, area);
    }
    return {
      allPages,
      pagesById: new Map(allPages.map((p) => [p.id, p])),
      areasByKey,
      settings,
    };
  }

  /**
   * Resolves label/description for `locale` (falling back to the item's default text). For items
   * linked to a page via `pageId`, re-resolves the URL to that page's translation for `locale` — if
   * none is published, the item (and its subtree) is omitted rather than showing a broken or
   * wrong-language link. For "custom" items (no `pageId`), the URL instead uses the per-locale
   * `translations[locale].url` override when set, falling back to the item's default URL.
   */
  private resolveNavigationItemsForLocale(
    items: CmsNavigationItem[],
    locale: string,
    linkCtx: NavigationPageLinkContext | null,
  ): CmsNavigationItem[] {
    const resolved: CmsNavigationItem[] = [];

    for (const item of items) {
      let url = item.url;
      const translation = locale ? item.translations?.[locale] : undefined;

      if (item.pageId) {
        if (!linkCtx) continue;
        const resolvedUrl = this.resolveNavigationPageLinkUrl(item.pageId, locale, linkCtx);
        if (resolvedUrl === null) continue;
        url = resolvedUrl;
      } else if (translation?.url) {
        // Custom (non-page) links have no page to resolve from — the translated URL is manual/AI-set.
        url = translation.url;
      }

      resolved.push({
        ...item,
        label: translation?.label || item.label,
        description: translation?.description ?? item.description,
        url,
        items: item.items ? this.resolveNavigationItemsForLocale(item.items, locale, linkCtx) : item.items,
      });
    }

    return resolved;
  }

  /** Returns the locale-specific public URL for a linked page, or null if no published translation exists for `locale`. */
  private resolveNavigationPageLinkUrl(
    pageId: string,
    locale: string,
    linkCtx: NavigationPageLinkContext,
  ): string | null {
    const page = linkCtx.pagesById.get(pageId);
    if (!page) return null;

    const pageArea = linkCtx.areasByKey.get(page.area || "") ?? null;
    const fallbackDefaultLocale = pageArea?.defaultLocale || linkCtx.settings?.branding?.defaultLanguage || "";
    const pageLocale = page.locale || fallbackDefaultLocale;

    let targetPage = page;
    let targetArea = pageArea;

    if (locale && pageLocale !== locale) {
      if (!page.translationKey) return null;
      const sibling = linkCtx.allPages.find(
        (candidate) =>
          candidate.translationKey === page.translationKey &&
          candidate.status === "published" &&
          (candidate.locale || fallbackDefaultLocale) === locale,
      );
      if (!sibling) return null;
      targetPage = sibling;
      targetArea = linkCtx.areasByKey.get(sibling.area || "") ?? pageArea;
    }

    return this.buildPublicPageUrl(targetArea, linkCtx.settings, targetPage, locale, targetArea?.defaultLocale ?? fallbackDefaultLocale);
  }

  // ── Collection pattern helpers ─────────────────────────────────────────────

  /** Resolve a {field} pattern string against a variable map. slugifyValues = true for slug/permalink. */
  private resolvePattern(
    pattern: string,
    vars: Record<string, unknown>,
    slugifyValues = false,
  ): string {
    return pattern.replace(/\{([^}]+)\}/g, (_, key) => {
      const raw = String(vars[key] ?? "");
      return slugifyValues ? raw.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") : raw;
    });
  }

  /**
   * Merges a record's `translations[locale]` overrides on top of `data` for URL/metadata
   * purposes (slug, permalink, meta title/description): falls back to the default-locale value
   * when untranslated, so links and page metadata stay valid even before a field is translated.
   * Content shown in templates uses `mergeRecordLocaleContent` instead, which never falls back to
   * the wrong language.
   */
  private mergeRecordLocaleForUrl(
    record: { data: Record<string, unknown>; translations?: Record<string, Record<string, unknown>> },
    locale: string,
  ): Record<string, unknown> {
    const overrides = locale ? record.translations?.[locale] : undefined;
    return overrides ? { ...record.data, ...overrides } : record.data;
  }

  /**
   * Merges a record's `translations[locale]` overrides on top of `data` for display in templates.
   * Fields marked `translatable` in `schema` are blanked out (never fall back to the default
   * locale) when no override exists for `locale` — showing nothing is preferable to showing text
   * in the wrong language. Non-translatable fields always come from `data` (locale-agnostic).
   * Returns `data` unchanged when `locale` is empty or is the site's default locale.
   */
  private mergeRecordLocaleContent(
    record: { data: Record<string, unknown>; translations?: Record<string, Record<string, unknown>> },
    locale: string,
    defaultLocale: string,
    schema: ComponentSchemaField[],
  ): Record<string, unknown> {
    if (!locale || locale === defaultLocale) return record.data;
    const overrides = record.translations?.[locale];
    const result: Record<string, unknown> = { ...record.data };
    for (const field of schema) {
      if (!field.translatable) continue;
      result[field.key] = overrides?.[field.key] ?? "";
    }
    return result;
  }

  /** Build the computed fields (slug, permalink, metaTitle, metaDescription) for a record. */
  private buildRecordComputedFields(
    record: { id: string; data: Record<string, unknown>; translations?: Record<string, Record<string, unknown>> },
    collection: import("@sherpacms/domain").CmsCollection,
    siteName: string,
    locale = "",
  ): { slug: string; permalink: string; metaTitle: string; metaDescription: string } {
    const slugPattern = collection.slugPattern || "{id}";
    const permalinkPattern = collection.permalinkPattern || `/{collection.slug}/{record.slug}`;
    const localizedData = this.mergeRecordLocaleForUrl(record, locale);

    const slugVars = { ...localizedData, id: record.id };
    const slug = this.resolvePattern(slugPattern, slugVars, true);

    const permalinkVars = {
      ...localizedData,
      id: record.id,
      "record.slug": slug,
      "collection.slug": collection.slug,
      "collection.name": collection.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    };
    const permalink = this.resolvePattern(permalinkPattern, permalinkVars, false);

    const metaVars = { ...localizedData, id: record.id, "record.slug": slug, "record.permalink": permalink, "site.name": siteName };
    const metaTitle = collection.detailMetaTitle
      ? this.resolvePattern(collection.detailMetaTitle, metaVars, false)
      : String(localizedData[collection.schema[0]?.key ?? ""] ?? record.id);
    const metaDescription = collection.detailMetaDescription
      ? this.resolvePattern(collection.detailMetaDescription, metaVars, false)
      : "";

    return { slug, permalink, metaTitle, metaDescription };
  }

  /**
   * Render the detail page for a collection record identified by permalink.
   * Returns null if no matching collection+record is found.
   */
  async renderCollectionDetailPage(
    areaKey: string,
    permalink: string,
    opts?: { draft?: boolean; locale?: string; searchParams?: Record<string, string> },
  ): Promise<string | null> {
    const area = await this.areas.findByKey(areaKey);
    const settingsObj = await this.settings.get();
    const siteName = settingsObj?.branding?.projectName ?? area?.name ?? "";
    const siteDefaultLocale = area?.defaultLocale ?? settingsObj?.branding?.defaultLanguage ?? "";
    const effectiveLocale = opts?.locale ?? siteDefaultLocale;

    // Find the collection and record matching this permalink
    const allCollections = await this.collections.findAll().catch(() => []);
    let matchedCollection: import("@sherpacms/domain").CmsCollection | null = null;
    let matchedRecord: { id: string; data: Record<string, unknown>; translations?: Record<string, Record<string, unknown>> } | null = null;
    let matchedComputed: ReturnType<typeof this.buildRecordComputedFields> | null = null;

    for (const col of allCollections) {
      if (col.hasDetailPage === false) continue;
      if (!col.detailTemplate) continue;
      const pattern = col.permalinkPattern || `/{collection.slug}/{record.slug}`;
      // Build a regex from the pattern by expanding known static vars
      const expandedPattern = pattern
        .replace(/\{collection\.slug\}/g, col.slug)
        .replace(/\{collection\.name\}/g, col.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"));
      const regexStr = "^" + expandedPattern.replace(/\{[^}]+\}/g, "([^/]+)") + "$";
      const regex = new RegExp(regexStr);
      if (!regex.test(permalink)) continue;

      const records = await this.collections.findRecords(col.id).catch(() => []);
      for (const rec of records) {
        const computed = this.buildRecordComputedFields(rec, col, siteName, effectiveLocale);
        if (computed.permalink === permalink || normalizePermalink(computed.permalink) === normalizePermalink(permalink)) {
          matchedCollection = col;
          matchedRecord = rec;
          matchedComputed = computed;
          break;
        }
      }
      if (matchedCollection) break;
    }

    if (!matchedCollection || !matchedRecord || !matchedComputed) return null;

    const virtualPage = {
      title: matchedComputed.metaTitle,
      slug: matchedComputed.slug,
      permalink: matchedComputed.permalink,
      seo: { metaTitle: matchedComputed.metaTitle, metaDescription: matchedComputed.metaDescription },
    } as import("@sherpacms/domain").CmsPage;

    const baseSite = this.buildSiteContext(area, settingsObj, virtualPage, "", "", "", "", effectiveLocale);
    const basePage = this.buildPageContext(virtualPage);
    const baseStyles = this.buildStylesContext(area, settingsObj);
    const t = await this.buildTranslationGlobals(effectiveLocale, area?.defaultLocale ?? settingsObj?.branding?.defaultLanguage ?? "");

    const localizedRecordData = this.mergeRecordLocaleContent(matchedRecord, effectiveLocale, siteDefaultLocale, matchedCollection.schema);
    const resolvedRecordData = await this.resolveRelationFields(
      localizedRecordData,
      matchedCollection.schema,
      { site: baseSite, page: basePage, styles: baseStyles, t },
      new Set(),
    );
    const recordContext = {
      id: matchedRecord.id,
      ...resolvedRecordData,
      slug: matchedComputed.slug,
      permalink: matchedComputed.permalink,
      metaTitle: matchedComputed.metaTitle,
      metaDescription: matchedComputed.metaDescription,
    };

    // Build merged component props: collection defaults + per-record overrides
    const recordComponentProps = (matchedRecord.data.__componentProps__ ?? {}) as Record<string, Record<string, unknown>>;
    const propsMap: Record<string, Record<string, unknown>> = {};
    const templateComponentSlugs = [...(matchedCollection.detailTemplate ?? "").matchAll(/\{\{component:([^}]+)\}\}/g)].map((m) => m[1]);
    for (const slug of templateComponentSlugs) {
      const defaults = matchedCollection.componentDefaultProps?.[slug] ?? {};
      const overrides = recordComponentProps[slug] ?? {};
      propsMap[slug] = { ...defaults, ...overrides };
    }

    // Render detail template with record context
    const detailTemplate = protectCmsPlaceholders(normalizeVariableAliases(matchedCollection.detailTemplate ?? ""));
    let contentHtml = await this.render.render({
      template: detailTemplate,
      data: { record: recordContext },
      globals: { site: baseSite, page: basePage, styles: baseStyles, t },
    }).then(restoreCmsPlaceholders);

    const detailCss = matchedCollection.detailCss ?? "";
    const detailJs = matchedCollection.detailJs ?? "";

    const contentContext = { site: baseSite, page: basePage, styles: baseStyles, t };
    contentHtml = await this.resolveComponentEmbeds(contentHtml, contentContext, propsMap);
    contentHtml = await this.resolveNavigations(contentHtml, contentContext);
    contentHtml = await this.resolveCollections(contentHtml, contentContext, opts?.searchParams);

    const metaTags = this.buildMetaTags(virtualPage, matchedComputed.permalink);
    const trackingScripts = this.buildTrackingScripts(area, "body-bottom");
    const headTrackingScripts = this.buildTrackingScripts(area, "head");

    const areaCss = area?.design?.areaCss ?? "";
    const areaJs = area?.design?.areaJs ?? "";
    const allCss = [areaCss, detailCss].filter(Boolean).join("\n");
    const allJs = [areaJs, detailJs].filter(Boolean).join("\n");
    const stylesTag = allCss ? `<style>${allCss}</style>` : "";
    const scriptsTag = allJs ? `<script>${allJs}</script>` : "";

    const pageContext = this.buildPageContext(virtualPage, contentHtml);
    const siteContext = this.buildSiteContext(area, settingsObj, virtualPage, metaTags, stylesTag + headTrackingScripts, scriptsTag, trackingScripts);

    const bodyTemplate = protectCmsPlaceholders(normalizeVariableAliases(area?.design?.bodyTemplate ?? "{{page.content}}"));
    let bodyHtml = await this.render.render({
      template: bodyTemplate,
      data: {},
      globals: { page: pageContext, site: siteContext, styles: baseStyles, t },
    }).then(restoreCmsPlaceholders);

    if (area?.design?.bodyElements) {
      for (const el of area.design.bodyElements) {
        bodyHtml = bodyHtml.replace(new RegExp(escapeRegex(el.variable), "g"), el.content);
      }
    }
    bodyHtml = await this.resolveComponentEmbeds(bodyHtml, { page: pageContext, site: siteContext, styles: baseStyles, t });
    bodyHtml = await this.resolveNavigations(bodyHtml, { page: pageContext, site: siteContext, styles: baseStyles, t });
    bodyHtml = await this.resolveCollections(bodyHtml, { page: pageContext, site: siteContext, styles: baseStyles, t }, opts?.searchParams);

    const headTemplate = protectCmsPlaceholders(normalizeVariableAliases(area?.design?.headTemplate ?? "<head><title>{{page.metaTitle}}</title></head>"));
    const headHtml = await this.render.render({
      template: headTemplate,
      data: {},
      globals: { page: pageContext, site: siteContext, styles: baseStyles, t },
    }).then(restoreCmsPlaceholders);

    const bodyTopTracking = this.buildTrackingScripts(area, "body-top");
    return `<!DOCTYPE html>\n<html>\n${headHtml}\n${bodyTopTracking}${bodyHtml}\n</html>`;
  }

  /**
   * Resolve {{collection:slug}} or {{collection:slug:view-slug}} placeholders in HTML.
   * Applies view filter, sort, and pagination before rendering the view template.
   */
  private async resolveCollections(
    html: string,
    ctx: { site: Record<string, unknown>; page: Record<string, unknown>; styles: Record<string, unknown>; t?: Record<string, string> },
    searchParams?: Record<string, string>,
    collectionPropsMap?: Map<string, Record<string, Record<string, unknown>>>,
    ancestorChain: Set<string> = new Set(),
  ): Promise<string> {
    const pattern = /\{\{collection:([^}:]+)(?::([^}]*))?\}\}/g;
    const matches: { full: string; slug: string; viewSlug?: string; filteredRecordIds?: string[] }[] = [];
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const rawSecond = match[2] ?? "";
      const pipeIdx = rawSecond.indexOf("|");
      const viewSlug = pipeIdx >= 0 ? rawSecond.slice(0, pipeIdx) || undefined : rawSecond || undefined;
      const filteredRecordIds = pipeIdx >= 0 ? rawSecond.slice(pipeIdx + 1).split(",").filter(Boolean) : undefined;
      matches.push({ full: match[0], slug: match[1], viewSlug, filteredRecordIds });
    }
    if (matches.length === 0) return html;

    let result = html;

    for (const m of matches) {
      const collection = await this.collections.findBySlug(m.slug).catch(() => null);
      if (!collection) {
        result = result.replace(m.full, "");
        continue;
      }

      const view = m.viewSlug
        ? collection.views.find((v) => v.slug === m.viewSlug)
        : collection.views.sort((a, b) => a.order - b.order)[0];

      if (!view?.template) {
        result = result.replace(m.full, "");
        continue;
      }

      // Load and process records
      let records = await this.collections.findRecords(collection.id).catch(() => []);

      // If filteredRecordIds is set, use only those records in that order (skip view filter/sort)
      if (m.filteredRecordIds?.length) {
        const byId = new Map(records.map((r) => [r.id, r]));
        records = m.filteredRecordIds.map((id) => byId.get(id)).filter((r): r is typeof records[number] => r !== undefined);
      } else {
        // Filter (eq only, MVP)
        if (view.filterField && view.filterValue !== undefined && view.filterValue !== null && view.filterValue !== "") {
          records = records.filter((r) => r.data[view.filterField!] === view.filterValue);
        }
      }

      // Sort (skip when filteredRecordIds defines order)
      if (!m.filteredRecordIds?.length && view.sortField) {
        const dir = view.sortDirection === "desc" ? -1 : 1;
        records = records.slice().sort((a, b) => {
          const av = a.data[view.sortField!];
          const bv = b.data[view.sortField!];
          if (av === bv) return 0;
          if (av == null) return dir;
          if (bv == null) return -dir;
          return av < bv ? -dir : dir;
        });
      }

      // Pagination
      const pageSize = view.pageSize && view.pageSize > 0 ? view.pageSize : 0;
      const currentPage = pageSize > 0 ? Math.max(1, parseInt(searchParams?.page ?? "1", 10) || 1) : 1;
      const totalCount = records.length;
      const totalPages = pageSize > 0 ? Math.ceil(totalCount / pageSize) : 1;
      const paginatedRecords = pageSize > 0
        ? records.slice((currentPage - 1) * pageSize, currentPage * pageSize)
        : records;

      const pagination = {
        page: currentPage,
        page_size: pageSize,
        total_count: totalCount,
        total_pages: totalPages,
        has_prev: currentPage > 1,
        has_next: currentPage < totalPages,
        prev_page: Math.max(1, currentPage - 1),
        next_page: Math.min(totalPages, currentPage + 1),
      };

      const collectionKey = `${m.slug}:${m.viewSlug ?? ""}`;
      const componentPropsOverride = collectionPropsMap?.get(collectionKey);
      const html = await this.renderCollectionViewHtml(collection, view, paginatedRecords, ctx, ancestorChain, {
        collectionPropsOverride: componentPropsOverride,
        pagination,
      });

      result = result.replace(m.full, html);
    }

    return result;
  }

  /**
   * Render `view.template` for an already selected/ordered set of `collection` records.
   * Shared by `resolveCollections` (view embedded in a page via a `{{collection:...}}`
   * token) and `resolveRelationFields`'s "view" mode (view embedded via a `relation`
   * field). `ancestorChain` carries `collectionSlug:viewSlug` keys already rendered in
   * this chain, so a relation field looping back to a view already in progress renders
   * as empty instead of recursing forever.
   */
  private async renderCollectionViewHtml(
    collection: CmsCollection,
    view: CmsCollectionView,
    records: CmsCollectionRecord[],
    ctx: { site: Record<string, unknown>; page: Record<string, unknown>; styles: Record<string, unknown>; t?: Record<string, string> },
    ancestorChain: Set<string>,
    opts?: {
      collectionPropsOverride?: Record<string, Record<string, unknown>>;
      pagination?: { page: number; page_size: number; total_count: number; total_pages: number; has_prev: boolean; has_next: boolean; prev_page: number; next_page: number };
    },
  ): Promise<string> {
    const nextChain = new Set(ancestorChain);
    nextChain.add(`${collection.slug}:${view.slug}`);

    const siteNameForPattern = (ctx.site["name"] as string | undefined) ?? "";
    const locale = (ctx.site?.locale as string) || "";
    const defaultLocale = (ctx.site?.default_locale as string) || "";
    const hasDetail = collection.hasDetailPage !== false;
    const recordContexts = await Promise.all(records.map(async (r) => {
      const localizedData = this.mergeRecordLocaleContent(r, locale, defaultLocale, collection.schema);
      const resolvedData = await this.resolveRelationFields(localizedData, collection.schema, ctx, nextChain);
      if (!hasDetail) return { id: r.id, ...resolvedData };
      const computed = this.buildRecordComputedFields(r, collection, siteNameForPattern, locale);
      return { id: r.id, ...resolvedData, slug: computed.slug, permalink: computed.permalink, metaTitle: computed.metaTitle, metaDescription: computed.metaDescription };
    }));

    const collectionContext = {
      id: collection.id,
      name: collection.name,
      slug: collection.slug,
      records: recordContexts,
      pagination: opts?.pagination ?? {
        page: 1, page_size: 0, total_count: records.length, total_pages: 1,
        has_prev: false, has_next: false, prev_page: 1, next_page: 1,
      },
    };

    // Temporarily escape {{component:...}} so LiquidJS doesn't choke on the colon syntax
    const escapedTemplate = normalizeVariableAliases(view.template).replace(
      /\{\{component:([^}]+)\}\}/g,
      (_: string, slug: string) => `<!--COMP_EMBED:${slug}-->`,
    );

    const rendered = await this.render.render({
      template: escapedTemplate,
      data: { collection: collectionContext },
      globals: { site: ctx.site, page: ctx.page, styles: ctx.styles },
    });

    // Restore component embeds and resolve them
    const restoredHtml = rendered.replace(/<!--COMP_EMBED:([a-z0-9_-]+)-->/g, (_: string, slug: string) => `{{component:${slug}}}`);
    const resolvedHtml = await this.resolveComponentEmbeds(restoredHtml, ctx, opts?.collectionPropsOverride);

    let html = resolvedHtml;
    if (view.css) html = `<style>${view.css}</style>` + html;
    if (view.js) html = html + `<script>${view.js}</script>`;
    return html;
  }

  /**
   * Resolve `relation` fields in a record/prop data object into their target data.
   * "fields" mode projects the linked records into plain objects containing only
   * `relationFields` (iterable in Liquid with `{% for %}`). "view" mode pre-renders
   * `relationViewSlug` of the target collection for the linked records into an HTML
   * string, usable directly as `{{ field_key }}`. IDs pointing at deleted records are
   * silently dropped. `ancestorChain` guards "view" mode against A→B→C→A loops.
   */
  private async resolveRelationFields(
    data: Record<string, unknown>,
    schema: ComponentSchemaField[] | null | undefined,
    ctx: { site: Record<string, unknown>; page: Record<string, unknown>; styles: Record<string, unknown>; t?: Record<string, string> },
    ancestorChain: Set<string>,
  ): Promise<Record<string, unknown>> {
    const relationFields = (schema ?? []).filter((f) => f.type === "relation" && f.relationTarget);
    if (relationFields.length === 0) return data;

    const result: Record<string, unknown> = { ...data };

    for (const field of relationFields) {
      const isViewMode = field.relationMode === "view";
      const emptyValue: unknown = isViewMode ? "" : [];

      const ids = Array.isArray(data[field.key])
        ? (data[field.key] as unknown[]).filter((v): v is string => typeof v === "string")
        : [];
      if (ids.length === 0) { result[field.key] = emptyValue; continue; }

      const targetCollection = await this.collections.findBySlug(field.relationTarget!).catch(() => null);
      if (!targetCollection) { result[field.key] = emptyValue; continue; }

      const allRecords = await this.collections.findRecords(targetCollection.id).catch(() => []);
      const byId = new Map(allRecords.map((r) => [r.id, r]));
      // Orphan IDs (record deleted since the relation was set) are silently dropped.
      const linkedRecords = ids.map((id) => byId.get(id)).filter((r): r is CmsCollectionRecord => r !== undefined);
      if (linkedRecords.length === 0) { result[field.key] = emptyValue; continue; }

      if (isViewMode) {
        const view = field.relationViewSlug
          ? targetCollection.views.find((v) => v.slug === field.relationViewSlug)
          : targetCollection.views.slice().sort((a, b) => a.order - b.order)[0];
        const chainKey = `${targetCollection.slug}:${view?.slug ?? ""}`;
        if (!view?.template || ancestorChain.has(chainKey)) { result[field.key] = ""; continue; }
        result[field.key] = await this.renderCollectionViewHtml(targetCollection, view, linkedRecords, ctx, ancestorChain);
      } else {
        const exposedKeys = field.relationFields?.length ? field.relationFields : targetCollection.schema.map((f) => f.key);
        const hasDetail = targetCollection.hasDetailPage !== false;
        const siteName = (ctx.site["name"] as string | undefined) ?? "";
        const locale = (ctx.site?.locale as string) || "";
        const defaultLocale = (ctx.site?.default_locale as string) || "";
        result[field.key] = linkedRecords.map((r) => {
          const localizedData = this.mergeRecordLocaleContent(r, locale, defaultLocale, targetCollection.schema);
          const projected: Record<string, unknown> = { id: r.id };
          for (const key of exposedKeys) projected[key] = localizedData[key];
          if (hasDetail) {
            const computed = this.buildRecordComputedFields(r, targetCollection, siteName, locale);
            projected.slug = computed.slug;
            projected.permalink = computed.permalink;
          }
          return projected;
        });
      }
    }

    return result;
  }

  private async resolveComponentEmbeds(
    html: string,
    ctx: { site: Record<string, unknown>; page: Record<string, unknown>; styles: Record<string, unknown>; t?: Record<string, string> },
    propsMap?: Record<string, Record<string, unknown>>,
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

        const componentProps = propsMap?.[ref.toLowerCase()] ?? propsMap?.[normalizeComponentReference(component.name)] ?? {};
        const resolvedComponentProps = await this.resolveRelationFields(componentProps, version.schema, ctx, new Set());

        const rendered = await this.render.render({
          template: protectCmsPlaceholders(normalizeVariableAliases(version.templateLiquid)),
          data: resolvedComponentProps,
          globals: {
            site: ctx.site,
            page: ctx.page,
            styles: ctx.styles,
            t: ctx.t ?? {},
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
  private buildMetaTags(
    page: CmsPage,
    canonicalUrl: string,
    hreflangEntries: Array<{ locale: string; url: string; isDefault: boolean }> = [],
  ): string {
    const tags: string[] = [];
    const title = page.seo?.metaTitle ?? page.seoTitle ?? page.title;
    const desc = page.seo?.metaDescription ?? page.seoDescription;
    const keywords = page.seo?.keywords;
    const robotsIndex = page.seo?.robotsIndex ?? true;
    const robotsFollow = page.seo?.robotsFollow ?? true;
    const robotsContent = `${robotsIndex ? "index" : "noindex"}, ${robotsFollow ? "follow" : "nofollow"}`;
    tags.push(`<meta name="robots" content="${escapeAttr(robotsContent)}">`);
    if (canonicalUrl) {
      tags.push(`<link rel="canonical" href="${escapeAttr(canonicalUrl)}">`);
    }
    if (desc) {
      tags.push(`<meta name="description" content="${escapeAttr(desc)}">`);
    }
    if (keywords) {
      tags.push(`<meta name="keywords" content="${escapeAttr(keywords)}">`);
    }
    for (const entry of hreflangEntries) {
      tags.push(`<link rel="alternate" hreflang="${escapeAttr(entry.locale)}" href="${escapeAttr(entry.url)}">`);
      if (entry.isDefault) {
        tags.push(`<link rel="alternate" hreflang="x-default" href="${escapeAttr(entry.url)}">`);
      }
    }

    if (title) {
      tags.push(`<meta property="og:title" content="${escapeAttr(title)}">`);
      tags.push(`<meta name="twitter:title" content="${escapeAttr(title)}">`);
    }
    if (desc) {
      tags.push(`<meta property="og:description" content="${escapeAttr(desc)}">`);
      tags.push(`<meta name="twitter:description" content="${escapeAttr(desc)}">`);
    }
    if (canonicalUrl) {
      tags.push(`<meta property="og:url" content="${escapeAttr(canonicalUrl)}">`);
    }
    tags.push(`<meta property="og:type" content="website">`);

    const ogImage = this.resolveAbsoluteUrl(page.ogImageUrl, canonicalUrl);
    if (ogImage) {
      tags.push(`<meta property="og:image" content="${escapeAttr(ogImage)}">`);
      tags.push(`<meta name="twitter:card" content="summary_large_image">`);
      tags.push(`<meta name="twitter:image" content="${escapeAttr(ogImage)}">`);
    } else {
      tags.push(`<meta name="twitter:card" content="summary">`);
    }

    return tags.join("\n  ");
  }

  /** Resolve a possibly-relative asset URL against an absolute base URL. */
  private resolveAbsoluteUrl(url: string | null | undefined, base: string): string | null {
    if (!url) return null;
    if (/^https?:\/\//i.test(url)) return url;
    if (!base || !/^https?:\/\//i.test(base)) return url;
    try {
      return new URL(url, base).toString();
    } catch {
      return url;
    }
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
    opts?: { draft?: boolean; locale?: string; searchParams?: Record<string, string> },
  ): Promise<RenderContentResult | null> {
    const draft = opts?.draft === true;

    // 1. Resolve page — findByPermalink only returns published rows, so for draft
    //    preview we fall back to a full scan filtered by area + permalink.
    let page = await this.pages.findByPermalink(areaKey, permalink, opts?.locale);
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

    const effectiveLocale = opts?.locale ?? page.locale ?? area?.defaultLocale ?? settingsObj?.branding?.defaultLanguage ?? "";
    const translations = await this.resolvePageTranslations(page, area, settingsObj, effectiveLocale);
    const t = await this.buildTranslationGlobals(effectiveLocale, area?.defaultLocale ?? settingsObj?.branding?.defaultLanguage ?? "");

    const pageContext = this.buildPageContext(page, "", translations, area);
    const siteContext = this.buildSiteContext(area, settingsObj, page, "", "", "", "", effectiveLocale);
    const stylesContext = this.buildStylesContext(area, settingsObj);

    // 4. Render each component + collect CSS/JS
    let contentHtml = "";
    let componentCss = "";
    let componentJs = "";
    const seenComponentIds = new Set<string>();
    const collectionPropsMap = new Map<string, Record<string, Record<string, unknown>>>();

    for (const instance of version.structure) {
      if (instance.disabled) continue;

      if (instance.blockType === "collection" && instance.collectionSlug) {
        const viewPart = instance.collectionViewSlug ?? "";
        const filterPart = instance.filteredRecordIds?.length ? instance.filteredRecordIds.join(",") : "";
        let token = `{{collection:${instance.collectionSlug}`;
        if (viewPart || filterPart) token += `:${viewPart}`;
        if (filterPart) token += `|${filterPart}`;
        token += "}}";
        contentHtml += wrapAnimation(token, instance.animation);
        if (instance.collectionComponentProps) {
          collectionPropsMap.set(`${instance.collectionSlug}:${viewPart}`, instance.collectionComponentProps);
        }
        continue;
      }

      if (!instance.componentId) continue;
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

      const propsWithRelations = await this.resolveRelationFields(
        resolvedProps,
        componentVersion.schema,
        { site: siteContext, page: pageContext, styles: stylesContext, t },
        new Set(),
      );
      const expandedProps = this.expandImageProps(propsWithRelations, componentVersion.schema);
      const rendered = await this.render.render({
        template: safeTemplate,
        data: expandedProps,
        globals: {
          page: pageContext,
          site: siteContext,
          styles: stylesContext,
          t,
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

    // 5. Resolve component, navigation, collection and form embeds
    contentHtml = await this.resolveComponentEmbeds(contentHtml, { site: siteContext, page: pageContext, styles: stylesContext, t });
    contentHtml = await this.resolveNavigations(contentHtml, { site: siteContext, page: pageContext, styles: stylesContext, t });
    contentHtml = await this.resolveCollections(contentHtml, { site: siteContext, page: pageContext, styles: stylesContext, t }, opts?.searchParams, collectionPropsMap);
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

        const pagePermalink = this.resolveCanonicalPagePermalink(area, page);
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

type NavigationPageLinkContext = {
  allPages: CmsPage[];
  pagesById: Map<string, CmsPage>;
  areasByKey: Map<string, CmsArea>;
  settings: CmsSettings | null;
};

function collectNavigationPageIds(items: CmsNavigationItem[], into: Set<string>) {
  for (const item of items) {
    if (item.pageId) into.add(item.pageId);
    if (item.items?.length) collectNavigationPageIds(item.items, into);
  }
}

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
    .replace(/\{\{component:([^}]+)\}\}/g, "__CMS_COMPONENT_$1__")
    .replace(/\{\{collection:([^}]+)\}\}/g, (_, ref) => `__CMS_COL_START__${ref.replace(/:/g, "__COL_SEP__")}__CMS_COL_END__`);
}

/** Restore CMS placeholders after Liquid rendering */
function restoreCmsPlaceholders(html: string): string {
  return html
    .replace(/__CMS_FORM_([^_]+)__/g, "{{form:$1}}")
    .replace(/__CMS_NAV_([^_]+)__/g, "{{navigation:$1}}")
    .replace(/__CMS_COMPONENT_([^_]+)__/g, "{{component:$1}}")
    .replace(/__CMS_COL_START__(.*?)__CMS_COL_END__/g, (_, ref) => `{{collection:${ref.replace(/__COL_SEP__/g, ":")}}}`);
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
