# CMS – Data model and technical details

This document describes the data model, persistence model, variable system, and technical implementation details of the CMS. The CMS is **agnostic of the storage backend**: it defines data structures and exposes load/save methods for its components; a **driver** (outside the CMS) is responsible for reading and writing to the real database. For the overall logic and concepts, see [01 – Overview](./01_overview.md).

---

## 1. Persistence and data flow: CMS-agnostic storage

The CMS **does not manage** the database or the storage backend. It is supported by a **real database** (or other persistence store): data is **retrieved from the store according to business-layer logic** and **passed into the CMS components** for management. The CMS defines the **data structures**; it does not assume *where* data is loaded from or saved to.

### 1.1 Driver and CMS agnosticism

A **persistence driver** (or adapter) sits **outside** the CMS. The driver is responsible for reading and writing to the actual store (e.g. relational or document database). Keeping the driver outside the CMS makes the CMS **agnostic** of the storage: the same CMS can work with different databases or backends without change. The CMS exposes **methods to load and save** data structures that are compatible with the needs of each CMS component; the driver implements those operations against the real store.

In other words: the CMS defines *what* is loaded and saved (the structures and logical “keys” or namespaces); the driver decides *where* and *how* (tables, collections, APIs). Components receive data through the CMS load interface and persist changes through the CMS save interface; they do not talk to the database directly.

### 1.2 Data structures defined by the CMS

The following table lists the **logical data kinds** (and typical identifiers) that the CMS uses. The **structures** are defined by the CMS; the driver must be able to **load** and **save** data in these shapes for the components that need them.

| Logical key / namespace | Content (structure defined by CMS) |
|-------------------------|------------------------------------|
| areas | Array of area objects (basic data, style, design, legal, tracking, accessPolicy). |
| templates | Array of template objects (name, description, component list, updated). |
| pages | Array of page data (or equivalent; structure depends on implementation). |
| components | Component list or config (component definitions may be stored per component, e.g. by id). |
| navigations | Object of navigation blocks (e.g. `main-header`, `footer-links`) for area design variables. Each block has `name`, `items`, `template`, `additionalCss`, `additionalJs`. See [11 – Navigation](./11_navigation.md). |
| forms | Form definitions used for form-embed variables (`{{form:id}}`). |
| users | Array of platform user objects (name, email, role, status, company for startup). See [12 – Users](./12_users.md). |
| pages_structure | Object keyed by page id; each value is an array of `{ name, category }` for the page’s component structure (e.g. used by the Pages structure modal). |

Component data is often stored per component (e.g. one record or document per component id), as noted in [04 – Components](./04_components.md). Area edit stores design variable contents in the area object (e.g. `design.bodyElements`). The business layer loads these structures from the database and passes them to the CMS; when a component saves, the CMS exposes the updated structure and the driver persists it to the store.

---

## 2. Data structure examples

### 2.1 Area object

```javascript
{
  name: "Public",
  displayName: "Public Area",
  description: "Public-facing pages",
  icon: "fa-solid fa-globe",
  status: "active",
  rootPath: "/",
  siteName: "My Site",
  style: {
    logoLight: "...",
    logoDark: "...",
    favicon: "...",
    customFonts: [{ name: "Inter", url: "..." }],
    iconFonts: [{ name: "Font Awesome", url: "..." }],
    colorSchemas: [
      { name: "Default", isDefault: true, colors: { primary: "#...", ... } }
    ]
  },
  design: {
    headTemplate: "<head>...</head>",
    bodyTemplate: "<body>...</body>",
    areaCss: "...",
    areaJs: "...",
    bodyElements: [{ variable: "{{header}}", content: "<div>...</div>" }]
  },
  legal: {
    pages: [{ title: "Privacy Policy", path: "/privacy-policy", content: "<p>...</p>" }],
    cookieBar: { enabled: true, label: "...", description: "...", categories: [...] }
  },
  tracking: {
    gaId: "G-XXXXXXXXXX",
    gaPosition: "body-bottom",
    gtmId: "GTM-XXXXXXX",
    gtmPosition: "body-top",
    customScripts: [...]
  },
  accessPolicy: {
    isRestricted: false,
    redirectUrl: "/login",
    registrationPage: "/register",
    recoverPasswordPage: "/recover-password"
  }
}
```

Full area field reference: [02 – Areas](./02_areas.md).

### 2.2 Navigation block object

In the **navigations** structure, each key is a navigation ID; the value is an object:

```javascript
{
  name: "Main Header",
  items: [
    { type: "page", label: "Home", url: "/", image: "", description: "" },
    { type: "custom", label: "Docs", url: "/docs", image: "", description: "", icon: "fa-book" }
  ],
  template: "<ul class=\"nav\">\n{% for item in items %}...{% endfor %}</ul>",
  additionalCss: "/* optional */",
  additionalJs: "// optional"
}
```

- **items**: Array of item objects. Each item has required `type` (`'page'` | `'custom'`), `label`, `url`, and optional `image`, `description`. Any other key is a custom property (flat, no nested `attributes`).
- **template**: HTML + Liquid string for rendering the block (uses `items` and `item` properties such as `item.label`, `item.url`, `item.image`, `item.description`, and custom keys).
- **additionalCss**, **additionalJs**: Optional strings injected when the block is rendered.

Full reference: [11 – Navigation](./11_navigation.md).

### 2.3 Template object

```javascript
{
  name: "Standard Landing",
  desc: "Hero + Features + CTA",
  components: ["Hero Section", "Features Grid", "CTA Banner"],
  updated: "2 days ago"
}
```

### 2.4 Page object (inferred)

```javascript
{
  id: 1,
  title: "Home Landing",
  slug: "/",
  fullPath: "/",
  area: "Public",
  status: "Published",
  parentId: null,
  structure: [
    { componentId: "hero-1", order: 1 },
    { componentId: "features-1", order: 2 }
  ],
  content: { /* component-specific content data */ },
  seo: {
    metaTitle: "...",
    metaDescription: "...",
    keywords: "..."
  },
  style: {
    colorPalette: "Default",
    layoutMode: "Full Width"
  }
}
```

---

## 3. Variable system

### 3.1 Head template variables (area design)

- `{{pageTitle}}`: Current page title  
- `{{siteName}}`: Area site name  
- `{{styles}}`: Injected CSS (area + theme)  
- `{{scripts}}`: Injected JavaScript  
- `{{metaTags}}`: SEO meta tags  

### 3.2 Body template variables (area design)

- `{{content}}`: Main page content  
- `{{footer}}`: Footer content  
- `{{trackingScripts}}`: Tracking scripts (by position settings)  

Custom variables (e.g. `{{header}}`, `{{myBlock}}`) are defined in the area design and their HTML content is stored in `design.bodyElements` (or equivalent). Style variables (`{{bg-primary}}`, `{{text-muted}}`), form embeds (`{{form:id}}`), and navigation (`{{navigation:id}}`) are resolved from area/style and CMS Forms/Navigation. See [02 – Areas](./02_areas.md) and [08 – Settings](./08_settings.md).

---

## 4. Technologies and prototype note

- **HTML5 / CSS3**: Markup and styling  
- **JavaScript (vanilla)**: CMS logic and UI behaviour  
- **Quill.js**: WYSIWYG for legal pages and cookie descriptions  
- **Font Awesome**: Icons and icon picker  
- **CodeMirror** (where used): HTML/CSS/JS editors with syntax highlighting  

**Editor and variable popup (requirement):** All editing surfaces for HTML, CSS, and JavaScript (component HTML/CSS/JS, area head/body templates and Area CSS/JS, navigation display template and Additional CSS/JS) **must** use a **code editor** (e.g. CodeMirror) with syntax highlighting and line numbers. In any editor where template variables are allowed (component HTML, area head/body, navigation display template), typing **`{`** **must** open a **variable popup at the cursor** (positioned contextually where the user typed). The popup must show a **bucket of variables grouped by type** (e.g. Style variables, Form (embed), Navigation) so the user can pick one to insert. Clicking an item inserts the full `{{variable}}` or `{{form:id}}` / `{{navigation:id}}` and closes the popup. See [04 – Components](./04_components.md#system-variables-popup), [02 – Areas](./02_areas.md#design-structure), [11 – Navigation](./11_navigation.md#display-template-and-item-variable-popup).

In production, persistence is via the **driver** and a real database (see §1). In the **prototype** only, a client-side store (e.g. localStorage) may be used to simulate load/save; the CMS still uses the same load/save interface, with a driver that reads/writes localStorage.  

---

## 5. Key functions (reference)

### Page management

- `normalizeSlug(text)`: Converts text to URL-friendly slug  
- `handleTitleInput(val)`: Auto-generates slug from title  
- `updatePathPreview()`: Updates full path from parent and slug  
- `addComponentToPage(name, category)`: Adds component to page structure  
- `generateFullContentEditor()`: Builds content fields from page structure  

### Area management

- `loadAreaData()`: Loads area data (via the CMS load interface; the driver fetches from the store and passes the structure to the component).  
- `saveAreaData()`: Saves area data (the component passes the structure to the CMS save interface; the driver persists to the store).  
- `addColorSchema()`: Adds new color schema
- `setDefaultSchema(id)`: Sets default color schema
- `importStylesFromUrl()`: Imports styles from URL (may require CORS proxy)
- `addLegalPage()`, `addCookieCategory()`, `addTrackingScript()`: Add legal/tracking items

### Template management

- `selectTemplate(tpl)`: Applies template to new page  
- `showPreview(index)`: Opens template preview modal  
- `setPreviewDevice(device)`: Switches preview device (desktop/tablet/mobile)  

### Component management

- `selectComponent(id)`: Selects component for configuration  
- `addField()`: Adds variable field to schema  
- `updateSchema()`: Updates JSON schema from fields
- `saveComponent()`: Saves component configuration

---

## 6. CORS, icon picker, WYSIWYG

- **Import styles from URL**: The “Import Styles from URL” feature fetches external pages; CORS may block. A CORS proxy may be required in production.  
- **Icon picker**: Modal with search and grid of Font Awesome icons; selection writes the icon class into the field.  
- **WYSIWYG (Quill.js)**: Used for legal page content and cookie category descriptions; content is synced to a hidden field or area data.  

---

## 7. Best practices

### Areas

1. Set up areas before creating pages.  
2. Configure the default color schema first.  
3. Use “Import styles from URL” when starting from a reference site.  
4. Set up legal pages early for compliance.  
5. Configure tracking scripts before going live.  

### Pages

1. Use templates for common page types.  
2. Define page structure before filling content.  
3. Set SEO for all public pages.  
4. Use the hierarchy (parent/child) for clearer organization.  
5. Test in draft before publishing.  

### Components

1. Configure component schemas before using in pages.  
2. Use consistent variable naming.  
3. Document component purpose in descriptions.  
4. Reuse components across pages for consistency.  

### Templates

1. Create templates for frequently used structures.  
2. Use descriptive names.  
3. Update templates when the component set changes.  
4. Preview before using.  

---

## 8. References

- **Overview and concepts**: [01 – Overview](./01_overview.md)  
- **Settings and system variables**: [08 – Settings](./08_settings.md)  
- **Area data model**: [02 – Areas](./02_areas.md)  
- **Components storage**: [04 – Components](./04_components.md)  
