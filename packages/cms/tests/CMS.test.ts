import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryAdapter } from "@sherpacms/infrastructure";
import { CMS } from "../src/CMS";

describe("CMS", () => {
  let adapter: InMemoryAdapter;
  let cms: CMS;

  beforeEach(() => {
    adapter = new InMemoryAdapter();
    cms = new CMS(adapter);
  });

  describe("constructor", () => {
    it("wires all repositories", () => {
      expect(cms.pages).toBeDefined();
      expect(cms.pageVersions).toBeDefined();
      expect(cms.components).toBeDefined();
      expect(cms.componentVersions).toBeDefined();
      expect(cms.menus).toBeDefined();
      expect(cms.areas).toBeDefined();
      expect(cms.templates).toBeDefined();
      expect(cms.emailTemplates).toBeDefined();
      expect(cms.navigations).toBeDefined();
      expect(cms.settings).toBeDefined();
      expect(cms.users).toBeDefined();
      expect(cms.forms).toBeDefined();
      expect(cms.render).toBeDefined();
    });
  });

  describe("bootstrap", () => {
    it("creates default areas", async () => {
      await cms.bootstrap();
      const areas = await cms.areas.findAll();
      expect(areas.length).toBeGreaterThanOrEqual(1);
      expect(areas[0].name).toBe("Public");
    });

    it("creates default settings", async () => {
      await cms.bootstrap();
      const settings = await cms.settings.get();
      expect(settings).not.toBeNull();
      expect(settings!.branding!.projectName).toBe("My Project");
      expect(settings!.variables).toBeDefined();
      expect(settings!.variables!.some((variable) => variable.namespace === "styles" && variable.key === "bgPrimary" && variable.value === "bg-primary")).toBe(true);
    });

    it("does not duplicate on second call", async () => {
      await cms.bootstrap();
      await cms.bootstrap();
      const areas = await cms.areas.findAll();
      expect(areas).toHaveLength(1);
    });
  });

  describe("renderPage", () => {
    async function setupBasicPage() {
      // Create area
      await cms.areas.create({
        name: "public",
        displayName: "Public",
        siteName: "Test Site",
        rootPath: "/",
        status: "active",
        design: {
          headTemplate: "<head><title>{{page.metaTitle}} | {{site.name}}</title>{{site.metaTags}}{{site.styles}}</head>",
          bodyTemplate: "<body>{{page.content}}{{site.trackingScripts}}{{site.scripts}}</body>",
        },
      });

      // Create component with template
      const comp = await cms.components.create({
        name: "hero",
        namespace: "page",
        status: "published",
      });

      await cms.componentVersions.createVersion(comp.id, {
        templateLiquid: "<h1>{{title}}</h1><p>{{description}}</p>",
      });

      // Create page
      const page = await cms.pages.create({
        area: "public",
        slug: "home",
        title: "Home Page",
        status: "published",
        structure: [],
      });

      // Create published page version with components
      await cms.pageVersions.createVersion(page.id, {
        structure: [
          {
            componentId: comp.id,
            props: { title: "Welcome", description: "Hello World" },
          },
        ],
        publish: true,
      });

      return { page, comp };
    }

    it("returns null for non-existent page", async () => {
      const result = await cms.renderPage("public", "no-such-page");
      expect(result).toBeNull();
    });

    it("returns null for draft page", async () => {
      await cms.areas.create({
        name: "public",
        status: "active",
      });
      await cms.pages.create({
        area: "public",
        slug: "draft",
        title: "Draft",
        status: "draft",
        structure: [],
      });

      const result = await cms.renderPage("public", "draft");
      expect(result).toBeNull();
    });

    it("renders a basic page with components", async () => {
      await setupBasicPage();
      const result = await cms.renderPage("public", "home");

      expect(result).not.toBeNull();
      expect(result).toContain("<!DOCTYPE html>");
      expect(result).toContain("<h1>Welcome</h1>");
      expect(result).toContain("<p>Hello World</p>");
    });

    it("wraps content with area head/body templates", async () => {
      await setupBasicPage();
      const result = await cms.renderPage("public", "home");

      expect(result).toContain("<head>");
      expect(result).toContain("Home Page | Test Site");
      expect(result).toContain("<body>");
    });

    it("resolves {{navigation:id}} in body template", async () => {
      // Create navigation block first to get its id
      const nav = await cms.navigations.create({
        name: "Main Header",
        items: [
          { key: "home", type: "page", label: "Home", url: "/" },
          { key: "about", type: "page", label: "About", url: "/about" },
        ],
        template: '<nav>{% for item in menu.items %}<a href="{{ item.url }}">{{ item.label }}</a>{% endfor %}</nav>',
      });

      // Create area with navigation placeholder in body using actual id
      await cms.areas.create({
        name: "public",
        siteName: "Test",
        status: "active",
        design: {
          headTemplate: "<head><title>{{page.metaTitle}}</title></head>",
          bodyTemplate: `<body>{{navigation:${nav.id}}}{{page.content}}</body>`,
        },
      });

      // Create component and page
      const comp = await cms.components.create({
        name: "text",
        status: "published",
      });
      await cms.componentVersions.createVersion(comp.id, {
        templateLiquid: "<p>Content here</p>",
      });

      const page = await cms.pages.create({
        area: "public",
        slug: "test",
        title: "Test",
        status: "published",
        structure: [],
      });
      await cms.pageVersions.createVersion(page.id, {
        structure: [{ componentId: comp.id, props: {} }],
        publish: true,
      });

      const result = await cms.renderPage("public", "test");
      expect(result).not.toBeNull();
      expect(result).toContain("<nav>");
      expect(result).toContain("Home");
      expect(result).toContain("About");
    });

    it("resolves {{form:variable}} in content", async () => {
      // Create area
      await cms.areas.create({
        name: "public",
        status: "active",
        design: {
          headTemplate: "<head><title>{{page.metaTitle}}</title></head>",
          bodyTemplate: "<body>{{page.content}}</body>",
        },
      });

      // Create form
      await cms.forms.create({
        name: "Contact",
        variable: "contact",
        schema: {
          groups: [
            {
              id: "g1",
              label: "Contact Us",
              orderIndex: 0,
              collapsed: false,
              fields: [
                {
                  id: "f1",
                  groupId: "g1",
                  label: "Name",
                  type: "text",
                  required: true,
                  width: "col-12",
                  validator: "none",
                  orderIndex: 0,
                },
              ],
            },
          ],
        },
      });

      // Create component that embeds a form via its template
      const comp = await cms.components.create({
        name: "form-embed",
        status: "published",
      });
      await cms.componentVersions.createVersion(comp.id, {
        templateLiquid: "<div>{{form:contact}}</div>",
      });

      const page = await cms.pages.create({
        area: "public",
        slug: "contact",
        title: "Contact",
        status: "published",
        structure: [],
      });
      await cms.pageVersions.createVersion(page.id, {
        structure: [{ componentId: comp.id, props: {} }],
        publish: true,
      });

      const result = await cms.renderPage("public", "contact");
      expect(result).not.toBeNull();
      expect(result).toContain("cms-form");
      expect(result).toContain("Name");
    });

    it("resolves design bodyElements (custom variables)", async () => {
      await cms.areas.create({
        name: "public",
        status: "active",
        design: {
          headTemplate: "<head><title>{{page.metaTitle}}</title></head>",
          bodyTemplate: "<body>{{header}}{{page.content}}{{footer}}</body>",
          bodyElements: [
            { variable: "{{header}}", content: "<header>Site Header</header>" },
            { variable: "{{footer}}", content: "<footer>Site Footer</footer>" },
          ],
        },
      });

      const comp = await cms.components.create({ name: "block", status: "published" });
      await cms.componentVersions.createVersion(comp.id, {
        templateLiquid: "<main>Main</main>",
      });

      const page = await cms.pages.create({
        area: "public",
        slug: "home",
        title: "Home",
        status: "published",
        structure: [],
      });
      await cms.pageVersions.createVersion(page.id, {
        structure: [{ componentId: comp.id, props: {} }],
        publish: true,
      });

      const result = await cms.renderPage("public", "home");
      expect(result).not.toBeNull();
      expect(result).toContain("<header>Site Header</header>");
      expect(result).toContain("<main>Main</main>");
      expect(result).toContain("<footer>Site Footer</footer>");
    });

    it("collects component CSS and JS", async () => {
      await cms.areas.create({
        name: "public",
        status: "active",
        design: {
          headTemplate: "<head><title>{{page.metaTitle}}</title>{{site.styles}}</head>",
          bodyTemplate: "<body>{{page.content}}{{site.scripts}}</body>",
        },
      });

      const comp = await cms.components.create({ name: "styled", status: "published" });
      await cms.componentVersions.createVersion(comp.id, {
        templateLiquid: "<div>Styled</div>",
        css: ".styled { color: red; }",
        js: "console.log('hello');",
      });

      const page = await cms.pages.create({
        area: "public",
        slug: "styled",
        title: "Styled",
        status: "published",
        structure: [],
      });
      await cms.pageVersions.createVersion(page.id, {
        structure: [{ componentId: comp.id, props: {} }],
        publish: true,
      });

      const result = await cms.renderPage("public", "styled");
      expect(result).not.toBeNull();
      expect(result).toContain(".styled { color: red; }");
      expect(result).toContain("console.log('hello');");
    });

    it("resolves legacy variable aliases in area and component templates", async () => {
      await cms.areas.create({
        name: "public",
        siteName: "Legacy Site",
        status: "active",
        design: {
          headTemplate: "<head><title>{{pageTitle}} | {{siteName}}</title>{{metaTags}}{{styles}}</head>",
          bodyTemplate: "<body>{{content}}{{trackingScripts}}{{scripts}}</body>",
        },
      });

      const comp = await cms.components.create({ name: "legacy-block", status: "published" });
      await cms.componentVersions.createVersion(comp.id, {
        templateLiquid: "<section><h1>{{pageTitle}}</h1><p>{{siteName}}</p><div>{{content}}</div></section>",
      });

      const page = await cms.pages.create({
        area: "public",
        slug: "legacy",
        title: "Legacy Page",
        status: "published",
        structure: [],
        seo: {
          metaTitle: "Legacy Meta Title",
          metaDescription: "Legacy description",
        },
      });

      await cms.pageVersions.createVersion(page.id, {
        structure: [{ componentId: comp.id, props: {} }],
        publish: true,
      });

      const result = await cms.renderPage("public", "legacy");
      expect(result).not.toBeNull();
      expect(result).toContain("<title>Legacy Meta Title | Legacy Site</title>");
      expect(result).toContain("<h1>Legacy Meta Title</h1>");
      expect(result).toContain("<p>Legacy Site</p>");
    });

    it("resolves legacy aliases inside navigation templates", async () => {
      const nav = await cms.navigations.create({
        name: "Legacy Nav",
        items: [{ key: "home", type: "page", label: "Home", url: "/" }],
        template: "<nav aria-label='{{siteName}}'>{% for item in items %}<a href='{{ item.url }}'>{{ item.label }}</a>{% endfor %}</nav>",
      });

      await cms.areas.create({
        name: "public",
        siteName: "Legacy Site",
        status: "active",
        design: {
          headTemplate: "<head><title>{{page.metaTitle}}</title></head>",
          bodyTemplate: `<body>{{navigation:${nav.id}}}{{page.content}}</body>`,
        },
      });

      const comp = await cms.components.create({ name: "block", status: "published" });
      await cms.componentVersions.createVersion(comp.id, {
        templateLiquid: "<main>Legacy nav content</main>",
      });

      const page = await cms.pages.create({
        area: "public",
        slug: "legacy-nav",
        title: "Legacy Nav Page",
        status: "published",
        structure: [],
      });

      await cms.pageVersions.createVersion(page.id, {
        structure: [{ componentId: comp.id, props: {} }],
        publish: true,
      });

      const result = await cms.renderPage("public", "legacy-nav");
      expect(result).not.toBeNull();
      expect(result).toContain("<nav aria-label='Legacy Site'>");
      expect(result).toContain("Legacy nav content");
    });

    it("exposes {{site.locale}} and {{site.default_locale}} in Liquid context", async () => {
      await cms.areas.create({
        name: "public",
        status: "active",
        defaultLocale: "it",
        supportedLocales: ["it", "en"],
        design: {
          headTemplate: "<head><title>{{page.metaTitle}}</title></head>",
          bodyTemplate: "<body>{{page.content}}</body>",
        },
      });

      const comp = await cms.components.create({ name: "locale-display", status: "published" });
      await cms.componentVersions.createVersion(comp.id, {
        templateLiquid: "<span>{{site.locale}}|{{site.default_locale}}</span>",
      });

      const page = await cms.pages.create({
        area: "public",
        slug: "test",
        title: "Test",
        status: "published",
        structure: [],
        locale: "en",
      });
      await cms.pageVersions.createVersion(page.id, {
        structure: [{ componentId: comp.id, props: {} }],
        publish: true,
      });

      const result = await cms.renderPage("public", "test", { locale: "en" });
      expect(result).not.toBeNull();
      expect(result).toContain("en|it");
    });

    it("injects hreflang tags when page has translations", async () => {
      await cms.areas.create({
        name: "public",
        status: "active",
        rootPath: "/",
        defaultLocale: "it",
        supportedLocales: ["it", "en"],
        design: {
          headTemplate: "<head>{{site.metaTags}}</head>",
          bodyTemplate: "<body>{{page.content}}</body>",
        },
      });

      await cms.settings.save({ id: "global", branding: { siteUrl: "https://example.com" } });

      const comp = await cms.components.create({ name: "block", status: "published" });
      await cms.componentVersions.createVersion(comp.id, { templateLiquid: "<p>Content</p>" });

      const key = "test-translation-key";
      const pageIt = await cms.pages.create({
        area: "public", slug: "pagina", title: "Pagina IT", status: "published", structure: [], locale: "it", translationKey: key,
      });
      await cms.pageVersions.createVersion(pageIt.id, { structure: [{ componentId: comp.id, props: {} }], publish: true });

      const pageEn = await cms.pages.create({
        area: "public", slug: "page", title: "Page EN", status: "published", structure: [], locale: "en", translationKey: key,
      });
      await cms.pageVersions.createVersion(pageEn.id, { structure: [{ componentId: comp.id, props: {} }], publish: true });

      const result = await cms.renderPage("public", "pagina", { locale: "it" });
      expect(result).not.toBeNull();
      expect(result).toContain('hreflang="it"');
      expect(result).toContain('hreflang="en"');
      expect(result).toContain('hreflang="x-default"');
    });

    it("prefixes non-default-locale hreflang URLs with the locale even when the area has no defaultLocale set, falling back to settings.branding.defaultLanguage", async () => {
      await cms.areas.create({
        name: "public",
        status: "active",
        rootPath: "/",
        supportedLocales: ["it", "en"],
        design: {
          headTemplate: "<head>{{site.metaTags}}</head>",
          bodyTemplate: "<body>{{page.content}}</body>",
        },
      });

      await cms.settings.save({ id: "global", branding: { siteUrl: "https://example.com", defaultLanguage: "it" } });

      const comp = await cms.components.create({ name: "block", status: "published" });
      await cms.componentVersions.createVersion(comp.id, { templateLiquid: "<p>Content</p>" });

      const key = "test-translation-key-2";
      const pageIt = await cms.pages.create({
        area: "public", slug: "chi-siamo", title: "Chi siamo", status: "published", structure: [], locale: "it", translationKey: key,
      });
      await cms.pageVersions.createVersion(pageIt.id, { structure: [{ componentId: comp.id, props: {} }], publish: true });

      const pageEn = await cms.pages.create({
        area: "public", slug: "about-us", title: "About us", status: "published", structure: [], locale: "en", translationKey: key,
      });
      await cms.pageVersions.createVersion(pageEn.id, { structure: [{ componentId: comp.id, props: {} }], publish: true });

      const result = await cms.renderPage("public", "chi-siamo", { locale: "it" });
      expect(result).not.toBeNull();
      expect(result).toContain('hreflang="en" href="https://example.com/en/about-us"');
      expect(result).toContain('hreflang="it" href="https://example.com/chi-siamo"');

      // Regression: the un-prefixed catch-all route calls renderPage with no `locale`
      // opt at all (it only sets one from the `/[locale]/...` rewrite's x-locale header).
      // The default-locale page must still resolve via the area.defaultLocale/settings
      // fallback chain, while the English-only page must stay unreachable without /en.
      const bareDefault = await cms.renderPage("public", "chi-siamo");
      expect(bareDefault).not.toBeNull();
      const bareNonDefault = await cms.renderPage("public", "about-us");
      expect(bareNonDefault).toBeNull();
      const prefixedNonDefault = await cms.renderPage("public", "about-us", { locale: "en" });
      expect(prefixedNonDefault).not.toBeNull();
    });

    it("exposes {{page.translations}} array in Liquid", async () => {
      await cms.areas.create({
        name: "public",
        status: "active",
        defaultLocale: "it",
        supportedLocales: ["it", "en"],
        design: {
          headTemplate: "<head></head>",
          bodyTemplate: "<body>{{page.content}}</body>",
        },
      });

      const comp = await cms.components.create({ name: "switcher", status: "published" });
      await cms.componentVersions.createVersion(comp.id, {
        templateLiquid: "{% for t in page.translations %}{{t.locale}}{% endfor %}",
      });

      const key = "switcher-key";
      const pageIt = await cms.pages.create({
        area: "public", slug: "it-page", title: "IT", status: "published", structure: [], locale: "it", translationKey: key,
      });
      await cms.pageVersions.createVersion(pageIt.id, { structure: [{ componentId: comp.id, props: {} }], publish: true });

      const pageEn = await cms.pages.create({
        area: "public", slug: "en-page", title: "EN", status: "published", structure: [], locale: "en", translationKey: key,
      });
      await cms.pageVersions.createVersion(pageEn.id, { structure: [{ componentId: comp.id, props: {} }], publish: true });

      const result = await cms.renderPage("public", "it-page", { locale: "it" });
      expect(result).not.toBeNull();
      expect(result).toContain("it");
      expect(result).toContain("en");
    });
  });
});
