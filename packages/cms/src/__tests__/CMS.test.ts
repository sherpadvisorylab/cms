import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryAdapter } from "@cms/infrastructure";
import { CMS } from "../CMS";

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

    it("creates default menus", async () => {
      await cms.bootstrap();
      const navbar = await cms.menus.findByKey("navbar");
      expect(navbar).not.toBeNull();
      const footer = await cms.menus.findByKey("footer");
      expect(footer).not.toBeNull();
    });

    it("creates default settings", async () => {
      await cms.bootstrap();
      const settings = await cms.settings.get();
      expect(settings).not.toBeNull();
      expect(settings!.branding!.projectName).toBe("My Project");
      expect(settings!.systemVariableDefaults).toBeDefined();
      expect(settings!.systemVariableDefaults!["bg-primary"]).toBe("bg-primary");
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
          headTemplate: "<head><title>{{pageTitle}} | {{siteName}}</title>{{metaTags}}{{styles}}</head>",
          bodyTemplate: "<body>{{content}}{{trackingScripts}}{{scripts}}</body>",
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
          { type: "page", label: "Home", url: "/" },
          { type: "page", label: "About", url: "/about" },
        ],
        template: '<nav>{% for item in items %}<a href="{{ item.url }}">{{ item.label }}</a>{% endfor %}</nav>',
      });

      // Create area with navigation placeholder in body using actual id
      await cms.areas.create({
        name: "public",
        siteName: "Test",
        status: "active",
        design: {
          headTemplate: "<head><title>{{pageTitle}}</title></head>",
          bodyTemplate: `<body>{{navigation:${nav.id}}}{{content}}</body>`,
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
          headTemplate: "<head><title>{{pageTitle}}</title></head>",
          bodyTemplate: "<body>{{content}}</body>",
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
          headTemplate: "<head><title>{{pageTitle}}</title></head>",
          bodyTemplate: "<body>{{header}}{{content}}{{footer}}</body>",
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
          headTemplate: "<head><title>{{pageTitle}}</title>{{styles}}</head>",
          bodyTemplate: "<body>{{content}}{{scripts}}</body>",
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
  });
});
