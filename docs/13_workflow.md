# CMS – Workflow, logic, and output

This document explains **how CMS elements work together** to produce pages: the workflow between Areas, Pages, Components, Templates, Navigation, Forms, and Settings; **how and where variables are used**; **practical use cases**; and **where the final output goes** (static Next.js pages deployable to Cloudflare). The template system uses **LiquidJS**. For entity-level detail, see [01 – Overview](./01_overview.md) and the referenced docs.

---

## Table of Contents

1. [Page generation logic (summary)](#1-page-generation-logic-summary)
2. [High-level workflow](#2-high-level-workflow)
3. [How elements intersect to create a page](#3-how-elements-intersect-to-create-a-page)
4. [Variable system: where and how](#4-variable-system-where-and-how)
5. [Practical use cases](#5-practical-use-cases)
6. [From CMS data to static output (Next.js, Cloudflare)](#6-from-cms-data-to-static-output-nextjs-cloudflare)
7. [References](#7-references)

---

## 1. Page generation logic (summary)

This section summarizes the **exact logic** of how a generated page is produced, so it can be compared with the implementation.

1. **Path-based instantiation**  
   A generated page is created **based on its path**. The runtime resolves the route to a **page** entity (path, area, structure, content).

2. **Page structure = body**  
   The page is **composed of a series of components** that define its **body** (the main content block). The page does **not** define the full HTML document body; it defines only the content that will fill the **`{{content}}`** system variable.

3. **Data and render**  
   The page **retrieves the saved data** defined by its components (the content stored per component instance). It then **renders the body** by rendering each component in order with that data. Rendering takes into account:
   - **Base CSS/JS** (platform/theme baseline)
   - **Area CSS/JS** (area’s Design: Area CSS, Area JS — applied to every page in the area)
   - **Component additional CSS/JS** (each component can define its own Additional CSS and Additional JS, applied when the component is rendered)
   - **Page-level CSS/JS** (if any)

4. **Head from area**  
   The **head** of the page is **defined by the area** in which the page resides. The area’s **Head template** (Design tab) is used for every page in that area.

5. **`{{content}}` in body template**  
   The **rendered content of the page is not the entire body**. It **fills the system variable `{{content}}`**. That variable is **handled in the body template** of the page’s area: the area’s **Body template** contains `{{content}}` (and optionally `{{header}}`, `{{footer}}`, `{{navigation:id}}`, etc.). The output of the page’s components is injected where `{{content}}` appears.

6. **Templates: LiquidJS, system variables, form, navigation**  
   In the template system (**LiquidJS**), it is possible to:
   - Use **system variables** declared in [Settings](./08_settings.md) (e.g. `{{bg-primary}}`, `{{text-muted}}`).
   - Invoke **Form** and **Navigation** as **additional components** via variables (e.g. `{{form:id}}`, `{{navigation:id}}`).

7. **Where Navigation and Form can be used**  
   - **Inside components**: Components can reference **navigation** and **form** as variables (as well as system variables). Typing `{` in the component HTML editor opens the variable popup ([04 – Components](./04_components.md)).
   - **In the area body**: In the **body section** of the area’s Design, it is also possible to call **navigation** and **form** (e.g. `{{navigation:main-header}}`, `{{form:contact}}`).
   - **Pages**: Pages are built **only by adding components** to their layout. There is no direct “add navigation” or “add form” in the page structure; navigation and form appear only via the area body template or inside a component.

8. **Email system**  
   The **email system is centralized**: sending an email always goes through a **well-defined component**. There are **base emails** (e.g. activation, password reset, welcome, invitation); **additional emails can be registered**. See [06 – Emails](./06_emails.md).

9. **Saving the page structure (scaffold)**  
   Once a page is created and its structure (list of components) is defined, that **structure can be saved as a template** for reuse: CMS → Templates → save the current component list so that new pages can be created from it. See [09 – Templates](./09_templates.md).

---

## 2. High-level workflow

### 2.1 From configuration to a single page

The CMS is configured in the **admin** (Areas, Pages, Components, Templates, Navigation, Forms, Settings). At **build time** (or request time, depending on deployment), the **runtime** resolves a **route** to one **page**, loads its **area** and **structure**, renders **components** with **content** and **variables**, and wraps the result in the area’s **head** and **body** templates. The result is a full HTML document (or a static file).

```
  ┌─────────────────────────────────────────────────────────────┐
  │  ADMIN (configuration)                                      │
  ├─────────────────────────────────────────────────────────────┤
  │  • Settings      (defaults, system vars)                     │
  │  • Areas         (style, design, legal, tracking)           │
  │  • Templates     (component lists)                           │
  │  • Navigation    (blocks: header, footer)                    │
  │  • Forms         (embeddable {{form:id}})                    │
  │  • Pages         (per area: path, structure, content, SEO)   │
  │  • Components    (HTML/Liquid, schema, Additional CSS/JS)    │
  └─────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
  ┌─────────────────────────────────────────────────────────────┐
  │  BUILD / RUNTIME                                              │
  ├─────────────────────────────────────────────────────────────┤
  │  1. Resolve route by path → instantiate Page                 │
  │  2. Load Area (head + body template, base + area CSS/JS)      │
  │  3. Page loads data per component → render each in order     │
  │     (Liquid + content; + component CSS/JS + page CSS/JS)     │
  │  4. Concatenate → body content                               │
  │  5. Fill {{content}} in area body template                   │
  │  6. Head from area only → output full HTML                   │
  └─────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
  ┌─────────────────────────────────────────────────────────────┐
  │  OUTPUT                                                      │
  │  Static HTML + assets (out/ or dist/) → Cloudflare Pages     │
  └─────────────────────────────────────────────────────────────┘
```

### 2.2 Entity relationship (simplified)

```
  ┌─────────────┐
  │  Settings   │  platform defaults (system vars, branding)
  └──────┬──────┘
         │ defaults
         ▼
  ┌─────────────┐         ┌─────────────┐         ┌─────────────────┐
  │  Templates  │────────►│   Pages     │◄────────│     Areas       │
  │  (component │         │  path       │         │  • head template│
  │   list only)│         │  structure  │         │  • body template│
  └─────────────┘         │  content    │         │    {{content}}   │
                         │  SEO       │         │  • Area CSS/JS   │
                         └──────┬─────┘         └────────┬──────────┘
                                │                        │
                                │ structure              │ Page body = components
                                ▼                        │ only; {{content}} filled
                         ┌─────────────┐                 │ by rendered components
                         │ Components  │◄────────────────┘
                         │ HTML/Liquid │
                         │ schema      │
                         │ Additional  │
                         │ CSS, JS     │
                         └──────┬──────┘
                                │
              ┌─────────────────┼─────────────────┐
              ▼                 ▼                 ▼
       ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
       │ Navigation  │   │   Forms     │   │ Style vars  │
       │ {{nav:id}}  │   │ {{form:id}} │   │ Settings or │
       │ in area     │   │ in area     │   │ area override│
       │ body or     │   │ body or     │   └─────────────┘
       │ in component│   │ in component│
       └─────────────┘   └─────────────┘
```

- **Every page belongs to exactly one area.** The area defines the **head** (head template) and the **body** (body template). The body template contains **`{{content}}`**: the rendered output of the page’s components fills **only** that variable; it is not the entire body.
- **Page structure** is an ordered list of **components only** (no direct navigation/form in the page layout). The page retrieves saved data per component and renders the body with **base + area + component additional CSS/JS + page** CSS/JS.
- **Navigation** and **Forms** are used only in the **area body template** or **inside components** (as variables), not as items in the page structure.
- **Templates** provide a starting component list; the structure can be saved as a template for reuse.

### 2.3 Page render flow (one page)

How a single page becomes HTML, in line with the logic in §1:

```
       path (route)
            │
            ▼
  ┌─────────────────┐         ┌─────────────────────────────────┐
  │      Page       │  load   │            Area                 │
  │  path, area,    │────────►│  • Head template → <head>       │
  │  components,    │  area   │  • Body template → <body>        │
  │  content        │         │    ... {{content}} ...           │
  └────────┬────────┘         │  • Area CSS/JS (+ base)          │
           │                  └──────────────┬──────────────────┘
           │ retrieve data                    │
           │ per component                     │
           ▼                                  │
  ┌─────────────────┐                         │
  │  Render each    │  base + area + component CSS/JS + page     │
  │  component      │  Liquid + content                         │
  │  in order       │                                           │
  └────────┬────────┘                         │
           │                                  │
           │ concatenate                      │
           │ = body content                   │
           └──────────────────────────────────┘
                            │
                            ▼  fill {{content}} in body template
                   ┌─────────────────┐
                   │   Full HTML     │
                   │ head from area  │
                   │ body from area  │
                   └─────────────────┘
```

- **Head** comes only from the area’s head template.
- **Body** is the area’s body template after **`{{content}}`** (and any other placeholders like `{{navigation:id}}`) is replaced. The value of **`{{content}}`** is the concatenated output of the page’s components.

---

## 3. How elements intersect to create a page

### 3.1 Area

- **Role**: Container for pages; defines **where** (root path) and **how** (look and feel, legal, tracking, access).
- **Provides**:
  - **Root path** (e.g. `/`, `/startup`) — all pages in the area are under this path.
  - **Style**: logos, favicon, fonts, **color schemas** (one default). These feed **style variables** used in head/body and in components.
  - **Design**: **Head template** and **Body template** (HTML + Liquid). They wrap every page in the area. Placeholders like `{{pageTitle}}`, `{{siteName}}`, `{{content}}`, `{{header}}`, `{{footer}}`, `{{navigation:id}}`, `{{trackingScripts}}` are replaced at render time.
  - **Legal**: Privacy, Terms, cookie bar (content and paths).
  - **Tracking**: GA, GTM, custom scripts (position: head, body top/bottom).
  - **Access policy** (optional): redirect URL, registration page, recover-password page for restricted areas.

**Intersection**: When a page is rendered, the runtime loads its **area**. The area’s **head** template defines the document head. The area’s **body** template is the outer shell; the **rendered output of the page’s components** (in order) **fills the system variable `{{content}}`** — it does not replace the entire body. CSS/JS applied when rendering the body include **base** (platform/theme), **area** (Area CSS, Area JS from the area’s Design), **component additional CSS/JS** (each component’s Additional CSS and Additional JS), and any **page-level** styles.

### 3.2 Page

- **Role**: The content entity that answers a **route** (e.g. `/`, `/about`, `/startup/guidelines`).
- **Holds**:
  - **Path** (slug, optional parent → full path).
  - **Structure**: ordered list of components (by id/name). No content in the template — only the list.
  - **Content**: per-component data (title, text, image URL, etc.) keyed by component instance or position.
  - **SEO**: meta title, description, keywords (injected into head via `{{pageTitle}}`, `{{metaTags}}`, etc.).
  - **Style variant** (optional): e.g. color palette or layout mode override for this page.
  - **Status**: Published, Draft, Archived (only Published are typically included in static export).

**Intersection**: The page’s **structure** says which components to render and in what order. The page’s **content** is passed into each component when rendering. The page’s **area** supplies the head/body and style context.

### 3.3 Components

- **Role**: Reusable UI blocks. Each has an **HTML template** (Liquid), a **variable schema** (attributes), and optional **Additional CSS** and **Additional JS** (defined per component; applied when the component is rendered).
- **Used in**: Page structure (and in Navigation display templates).
- **Can use**:
  - **Own schema variables** (e.g. `{{title}}`, `{{description}}`) — values come from the page’s content for this component instance.
  - **System variables**: style tokens (e.g. `{{bg-primary}}`, `{{text-muted}}`) and form embeds `{{form:id}}`. Typing `{` in the component HTML editor opens the variable popup ([04 – Components](./04_components.md)).

**Intersection**: The runtime renders the page by iterating the page structure, resolving each component’s HTML with (a) the page’s content for that component and (b) resolved system variables. Each component’s **Additional CSS** and **Additional JS** are included when that component is rendered. The concatenated result is the **page content** that replaces `{{content}}` in the area’s body template.

### 3.4 Templates

- **Role**: Saved **component lists** (names/ids only). No content, no area.
- **Used when**: Creating a **new page**. The user picks a template and the new page gets a copy of that component list; then they edit content and SEO on the page.

**Intersection**: Templates only affect the **initial structure** of a page. After creation, the page’s structure can be changed independently. Templates do not wrap pages; areas do.

### 3.5 Navigation

- **Role**: Defines **blocks** (e.g. Main Header, Footer Links): list of items (page links or custom links), **display template** (HTML + Liquid over `items`), optional CSS/JS.
- **Used in**: Area **Design** — head or body template includes `{{navigation:main-header}}`, `{{navigation:footer-links}}`, etc. At render time, the block’s template is evaluated with its items and the result is injected.

**Intersection**: Navigation is not part of the page structure; it’s part of the **area design**. So changing a navigation block changes every page in that area that embeds it.

### 3.6 Forms

- **Role**: Form definitions (fields, behaviour) with an **id**. Embeddable as `{{form:id}}`.
- **Used in**: Area head/body templates or **inside component** HTML. The variable popup in the component editor lists available forms.

**Intersection**: Same as navigation — the placeholder is replaced at render time with the rendered form (or form placeholder for static export if forms are client-hydrated).

### 3.7 Settings

- **Role**: Platform-wide **defaults**: branding (logo, favicon, default color schema, fonts), system variable **default values** (e.g. `bg-primary`, `text-muted`), auth/SSO toggle, email defaults.
- **Intersection**: **Variable resolution** falls back to Settings when no area/template/page override exists. So Settings define the baseline; areas (and optionally template/page) override.

---

## 4. Variable system: where and how

### 4.1 Resolution order

System variables (style tokens, custom variables) are resolved in this order (first match wins):

1. **Page** override (if the page has a style variant or per-variable override)
2. **Template** override (if applicable)
3. **Area** override (e.g. area’s selected color schema or custom variable content)
4. **Settings** default (from the System Variables editor)

So: **Page > Template > Area > Settings**. See [08 – Settings](./08_settings.md).

### 4.2 Where variables are used

| Place | Variables used | Source |
|-------|----------------|--------|
| **Area Head template** | `{{pageTitle}}`, `{{siteName}}`, `{{styles}}`, `{{scripts}}`, `{{metaTags}}` | Page SEO, area site name, injected CSS/JS, SEO meta |
| **Area Body template** | `{{content}}`, `{{header}}`, `{{footer}}`, `{{trackingScripts}}`, `{{navigation:id}}`, `{{form:id}}`, style vars | Rendered page content; custom blocks (header/footer); tracking; nav blocks; forms; style from Area/Settings |
| **Component HTML** | Schema vars (e.g. `{{title}}`), `{{bg-primary}}`, `{{text-muted}}`, `{{form:id}}` | Page content for this component; system variables (style, form embed) |
| **Navigation display template** | `{{item.label}}`, `{{item.url}}`, `{{item.image}}`, etc. | Navigation block items |

### 4.3 Types of variables

- **Page/site placeholders**: `pageTitle`, `siteName`, `content`, `metaTags`, `styles`, `scripts` — set from page SEO and area/config at render time.
- **Style (system) variables**: e.g. `bg-primary`, `text-muted`, `border-primary`. Resolved via resolution order above; used in area templates and component HTML for theming.
- **Custom variables**: Same resolution as style; defined in Settings (custom keys) and optionally overridden at area/template/page level.
- **Navigation**: `{{navigation:id}}` — replaced by the rendered navigation block (its display template + items).
- **Form embed**: `{{form:id}}` — replaced by the form widget or placeholder.

---

## 5. Practical use cases

### Use case 1: Create and publish a new public landing page

**Goal**: Add a new page at `/campaign` in the Public area, with hero + features + CTA, and publish it.

**Steps**:

1. Ensure the **Public** area exists and has Design (head/body) and at least one color schema ([02 – Areas](./02_areas.md)).
2. **CMS → Pages** → Create new page. Choose **target area** = Public. Optionally choose a **template** (e.g. “Landing with CTA”) so the structure is pre-filled with Hero, Features Grid, CTA Banner.
3. Set **path** (e.g. slug `campaign`, parent none) → full path `/campaign`. Set **title** and **SEO** (meta title, description).
4. Edit **structure** if needed (add/remove/reorder components). Edit **content** for each component (hero title, feature texts, CTA button label, etc.).
5. Set **status** to **Published**. Save.
6. At **build time**, the static site generator (e.g. Next.js) will generate a route for `/campaign` using this page, its area’s head/body, and the resolved components and variables.

**Elements involved**: Area (Public), Page (path, structure, content, SEO), Template (optional), Components (Hero, Features, CTA), Settings (default style vars if no area override).

---

### Use case 2: Add a legal page (Privacy Policy) to an area

**Goal**: Have a Privacy Policy page at `/privacy-policy` with editable content from the CMS.

**Option A — Area Legal tab**:

1. **CMS → Areas** → Edit Public area → **Legal** tab.
2. Add a legal page: **Title** “Privacy Policy”, **Path** `/privacy-policy`, **Content** (WYSIWYG). Save area.
3. The area’s legal pages are stored in the area object. The **vertical** can either render them via a default page component (e.g. `PrivacyPolicyPage`) that reads this content, or the build step can generate a static route that renders the same content.

**Option B — Normal CMS page**:

1. **CMS → Pages** → Create new page in Public area, path `/privacy-policy`, structure = one “Content block” component. Fill the component with the privacy text. Publish.
2. The page is generated like any other page; the content is in the component.

**Elements involved**: Area (Legal tab or not), Page (if Option B), Component (content block or default legal component), [03_pages_default](./03_pages_default.md) for default legal components.

---

### Use case 3: Change the header for all pages in an area

**Goal**: Update the main header (logo + nav links) for every page in the Public area.

**Steps**:

1. **CMS → Navigation** → Edit the block used as the main header (e.g. “Main Header”). Update **items** (add/remove/reorder links) or **display template** (HTML/Liquid). Save.
2. **CMS → Areas** → Edit Public area → **Design** tab. Ensure the **Body template** contains `{{navigation:main-header}}` (or the correct block id). Save area.
3. Every page in the Public area uses the same body template, so every page will show the updated header. No per-page change.

**Elements involved**: Area (body template), Navigation (block items and display template).

---

### Use case 4: Build a page from scratch (no template)

**Goal**: Create a page with a custom set of components, without using a template.

**Steps**:

1. **CMS → Pages** → Create new page. Select area and path. Leave template empty or “From scratch”.
2. **Structure**: Add components one by one (e.g. Container → Hero → Spacer → Content block → CTA). Reorder as needed.
3. **Content**: For each component in the structure, fill in the attributes (title, text, image URL, etc.) in the page’s content editor.
4. **SEO**: Set meta title, description, keywords.
5. **Style**: Optionally set a style variant (e.g. alternate color palette) for this page.
6. Publish.

**Elements involved**: Area, Page (structure + content + SEO + style variant), Components (each used in structure).

---

## 6. From CMS data to static output (Next.js, Cloudflare)

### 6.1 Build-time flow

1. **Data source**: The vertical’s build (e.g. Next.js) loads CMS data: areas, pages (published only), components, templates, navigation, forms, and system variable defaults. This can be via **API** (CMS backend) or **exported JSON/files** (e.g. from the admin or a CI job).
2. **Route list**: For each **published** page, the full path is `area.rootPath + page.path` (e.g. `/` + `campaign` → `/campaign`). Static generation creates one output per route.
3. **Per-route render**:
   - Resolve **area** for the page (style, head template, body template).
   - Resolve **variables** (page/template/area/settings order).
   - Render **components** in order: for each component in the page structure, load component HTML (and CSS/JS), inject page content for that component, resolve system variables, run Liquid. Concatenate results → **page content**.
   - Replace `{{content}}` (and other placeholders) in the area’s **body** template. Replace `{{pageTitle}}`, `{{metaTags}}`, etc. in the **head** template.
   - Output **full HTML** (and collect CSS/JS for the bundle).
4. **Static export**: Next.js with `output: 'export'` (or equivalent) writes each route to a **static file** under `out/` (or `dist/`): e.g. `out/campaign.html`, `out/index.html`. Assets (JS, CSS, images) go into `out/_next/` and similar.

### 6.2 Where the output is stored

- **Build output directory**: Typically `out/` (Next.js static export) or `dist/`. This directory contains:
  - **HTML files** per route (e.g. `index.html`, `campaign.html`, `privacy-policy.html`, `startup/guidelines.html`).
  - **Assets**: JS chunks, CSS, images, fonts (paths adjusted for static hosting).
- **No server-side rendering at request time**: All variable resolution and Liquid rendering is done **at build time**. The CMS does not run on Cloudflare; only the **pre-built static files** are served.

### 6.3 Deployment to Cloudflare

- **Cloudflare Pages**: Connect the repo (or upload the `out/` directory). Set **build command** to the Next.js build (e.g. `npm run build` or `next build`). Set **output directory** to `out` (or `dist`). Each deployment produces a set of static files; Cloudflare serves them at the project URL.
- **Result**: Visiting `https://your-project.pages.dev/campaign` serves the pre-rendered HTML for that page. Fast, cacheable, no CMS runtime on the edge.

### 6.4 Summary diagram

```
       CMS data (API or export)
                │
                ▼
  ┌─────────────────────────────────────────┐
  │  Next.js build                           │
  │  • getStaticPaths → list page paths      │
  │  • getStaticProps → area, page,         │
  │    components; resolve vars; render      │
  │  • output: 'export' → static HTML       │
  └─────────────────────────────────────────┘
                │
                ▼
       out/  (or dist/)
       ├── index.html
       ├── campaign.html
       ├── privacy-policy.html
       ├── startup/
       │   └── guidelines.html
       └── _next/  (assets)
                │
                ▼
  ┌─────────────────────────────────────────┐
  │  Cloudflare Pages                       │
  │  Upload out/ → URLs serve static HTML   │
  │  No CMS or Node at request time         │
  └─────────────────────────────────────────┘
```

---

## 7. References

| Topic | Document |
|-------|----------|
| Overview and concepts | [01 – Overview](./01_overview.md) |
| Areas (style, design, legal, tracking) | [02 – Areas](./02_areas.md) |
| Pages (list, create, structure, content, SEO) | [03 – Pages](./03_pages.md) |
| Default pages (404, Privacy, T&C) | [03_pages_default](./03_pages_default.md) |
| Components (Liquid, schema, system variables popup) | [04 – Components](./04_components.md) |
| Forms (embed as `{{form:id}}`) | [05 – Forms](./05_forms.md) |
| Email system (base and registered templates) | [06 – Emails](./06_emails.md) |
| Settings and system variables (resolution, defaults) | [08 – Settings](./08_settings.md) |
| Templates (component lists, save structure) | [09 – Templates](./09_templates.md) |
| Data model, storage, variable list | [10 – Data and technical](./10_data_and_technical.md) |
| Navigation (blocks, display template) | [11 – Navigation](./11_navigation.md) |
