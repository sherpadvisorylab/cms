# CMS – Overview

This document is the single entry point for the Content Management System (CMS) documentation. It explains what the CMS is, how its parts fit together, and where to find detailed and technical documentation for each topic.

---

## 1. What is the CMS

The **Content Management System (CMS)** is the engine that manages website content, pages, and configuration. It provides a modular architecture so that administrators can create, edit, and organize content through the admin interface. The CMS can drive both **public** pages (landing, apply, legal) and **internal** pages (e.g. startup area resources), using the same concepts and tooling.

### 1.1 Key capabilities

- **Multi-area organization**: Content is grouped into **areas** (e.g. Public, Startup). Each area has its own visual identity, design templates, legal and cookie settings, tracking, and optional access policy.
- **Page-based structure**: **Pages** belong to an area, have a URL path and optional parent, and are built from a list of **components** with content data, SEO, and style options.
- **Component-based building**: **Components** are reusable UI blocks (HTML/Liquid, CSS, JS) with a variable schema; pages are composed by adding and ordering components.
- **Templates**: **Templates** are saved page structures (component lists) used to create new pages quickly.
- **Design and variables**: Areas define **head and body HTML templates** with variables (e.g. `{{pageTitle}}`, `{{content}}`, `{{navigation:id}}`). **System variables** (style tokens, form embeds) are configured in Settings and used in components and area templates.
- **Forms and navigation**: The **Form generator** produces embeddable forms (`{{form:id}}`). **Navigation** blocks (e.g. header, footer) are defined in CMS Navigation and embedded as `{{navigation:id}}`.
- **Emails and authentication**: **Email templates** (onboarding, activation, etc.) and **authentication** flows (login, registration, recovery) are part of the CMS and documented in the detail docs.

---

## 2. Core concepts and how they relate

The logic of the CMS is organized around a few core entities and how they connect.

### 2.1 Areas

**Areas** are the top-level containers. Each area has:

- **Basic data**: Name (internal ID), site name, root path (e.g. `/`, `/startup`), status.
- **Style**: Logos (light/dark), favicon, custom fonts, icon fonts, **color schemas** (one can be default). These feed **style variables** (e.g. `{{bg-primary}}`, `{{text-muted}}`) used in templates and components.
- **Design**: **Head** and **body** HTML templates that wrap every page in the area. Templates use variables: page/site placeholders, style variables, form embeds, navigation blocks, and custom variables (each with editable HTML content).
- **Legal**: Legal pages (e.g. Privacy, Terms) and cookie consent bar with categories.
- **Tracking**: Google Analytics, GTM, and custom scripts with position (head, body top/bottom).
- **Access policy**: Optional restricted area with redirect URL, registration page, recover-password page.

Pages belong to exactly one area. The area’s design templates and styles apply to all its pages.

→ Full detail: [02 – Areas](./02_areas.md) (list, edit, tabs, data model, navigation blocks).

### 2.2 Pages

**Pages** are the content entities users visit. Each page:

- Belongs to one **area**.
- Has a **path** (slug, optional parent, full path).
- Has a **structure**: an ordered list of **components** (from the component library).
- Has **content data** (per-component fields), **SEO** (meta title, description, keywords), and **style variants** (e.g. color palette, layout mode).
- Has a **status**: Published, Draft, or Archived.

Pages can be created from **templates** (predefined component lists). Creating a page from a template copies the structure; content and SEO are then edited on the page.

→ Full detail: [03 – Pages](./03_pages.md) (list, create, structure, content, SEO, hierarchy).

### 2.3 Components

**Components** are reusable UI building blocks. Each component has:

- **HTML template** (Liquid syntax: `{{ variable }}`, `{% ... %}`), optional **CSS** and **JavaScript**.
- **Variable schema** (attributes): names and types (text, image URL, color, toggle, number) used in the backend and at runtime.
- **Positioning**: Optional 12-column grid layout per view (desktop/tablet/mobile).
- **Preview**: Rendered preview with variable labels.

Components are used **inside pages** (page structure) and can use **system variables**: style variables (from area/theme) and form embeds (`{{form:id}}`). **All HTML/CSS/JS editors must use a code editor** (e.g. CodeMirror). In the HTML editor, **typing `{` opens a popup at the cursor** with variables **grouped by type** (style variables, form embeds) to insert.

→ Full detail: [04 – Components](./04_components.md) (list, edit, Liquid, schema, positioning, system variables popup).

### 2.4 Templates

**Templates** are saved page structures: a name, description, and ordered list of component names. They do not store content—only the component list. When creating a new page, the user can choose a template so the page starts with that structure; then they edit content and SEO on the page.

→ Full detail: [09 – Templates](./09_templates.md).

### 2.5 Forms and navigation

- **Forms**: The CMS **Form generator** defines forms (fields, behaviour). Each form has an ID. In area templates or components, you embed a form with `{{form:id}}`. The variable popup (when typing `{`, at the cursor) lists available forms.
- **Navigation**: **Navigation** blocks (e.g. Main Header, Footer Links) are defined in CMS Navigation: items (pages or custom links, with optional image, description, and custom properties), display template (HTML + Liquid), and optional Additional CSS/JS. Items from pages use field mapping; custom links use fixed values. The display template editor offers an **item variable popup** (type `{` to open at the cursor and insert `{{ item.label }}`, `{{ item.url }}`, etc.). Blocks are embedded in area head/body templates as `{{navigation:id}}`. The area design variable popup lists available navigation blocks.

Navigation block management (items, mapping, custom fields, display template, edit) is described in [11 – Navigation](./11_navigation.md). Design structure and variable popup: [02 – Areas](./02_areas.md). Form generator: [05 – Forms](./05_forms.md).

### 2.6 Emails and authentication

- **Emails**: The CMS includes an **email system**: templates (subject, body, variables) for onboarding, acceptance, activation, notifications, etc. Templates are editable in Admin → Emails and can be sent via API.
- **Authentication**: The CMS provides **authentication** building blocks (login, registration, password recovery, SSO) and related email templates. Restricted areas use redirect URL, registration page, and recover-password page configured in the area’s Access Policy.

→ Full detail: [06 – Emails](./06_emails.md), [07 – Authentication](./07_authentication.md).

### 2.7 Settings and system variables

**Settings** (admin) hold platform-wide configuration. A central part is **CMS System Variables**: the list of managed variables (e.g. style tokens like `bg-primary`, `text-muted`, and form-embed defaults) with their **default values**. These are used in components and area templates. At runtime, a variable is resolved from (a) structure-level preferences (area, template, page) or (b) the default defined in Settings.

API keys and secrets are **not** stored in the admin UI; they are provided via environment variables or an external secret manager.

→ Full detail: [08 – Settings](./08_settings.md). Technical data model and storage: [10 – Data and technical](./10_data_and_technical.md).

---

## 3. Where to find what (admin and prototypes)

| What you want to do | Where (admin) | Prototype file (reference) |
|---------------------|---------------|-----------------------------|
| Configure areas (style, design, legal, tracking, access) | CMS → Areas → Edit | `pmp_admin_cms_areas.html`, `pmp_admin_cms_area_edit.html` |
| Manage pages (create, structure, content, SEO) | CMS → Pages | `pmp_admin_cms.html` (and related page edit/structure UIs) |
| Manage navigation blocks | CMS → Navigation | `pmp_admin_cms_navigation.html` |
| Create/edit components | CMS → Components | `pmp_admin_cms_components.html`, `pmp_admin_cms_component_edit.html` |
| Create/edit templates | CMS → Templates | `pmp_admin_cms_templates.html` |
| Manage forms (embed in pages/areas) | CMS → Forms | Form generator UI (see [05 – Forms](./05_forms.md)) |
| Edit email templates | CMS → Emails | `pmp_admin_emails.html` |
| Manage users (roles, invite, edit, status) | CMS → Users | `pmp_admin_users.html` |
| Configure Settings (system variables, integrations) | Admin → Settings | `pmp_admin_settings.html` |

The **CMS menu** in the admin typically exposes: Pages, Areas, Templates, Navigation, Components, Emails, Users, Forms, depending on the product.

---

## 4. Reference documents (expand by topic)

Use the overview above for the big picture and the logic of the CMS. Use the documents below to go deeper and implement or configure each part.

| Topic | Document | What you’ll find |
|-------|----------|------------------|
| Areas (list, edit, tabs, design variables, navigation, data model) | [02 – Areas](./02_areas.md) | Areas list page, area edit (Basic Data, Style, Design, Legal, Tracking, Access Policy), head/body templates, variable popup, localStorage key and area object structure. |
| Pages (list, create, structure, content, SEO, hierarchy) | [03 – Pages](./03_pages.md) | Page list, create from scratch or template, manage structure (components), content data, SEO, style variants, status, system pages. |
| **Default pages (utility)** | [03_pages_default](./03_pages_default.md) | List of CMS default pages: 404, Privacy Policy, Terms & Conditions; utility components (`NotFoundPage`, `PrivacyPolicyPage`, `TermsConditionsPage`) and props. |
| Components (list, edit, Liquid, schema, positioning, preview) | [04 – Components](./04_components.md) | Component types and categories, HTML/CSS/JS editors, variable schema, positioning grid, preview, system variables popup, Import HTML, storage. |
| Form generator (create forms, embed as `{{form:id}}`) | [05 – Forms](./05_forms.md) | Form definition, fields, and how to embed forms in components and area templates. |
| Email system (templates, variables, API) | [06 – Emails](./06_emails.md) | Email template management, variables, sending via API, integration with CMS. |
| Authentication (login, registration, recovery, SSO) | [07 – Authentication](./07_authentication.md) | Pre-built auth components, email templates for auth flows, SSO, integration. |
| Settings and system variables (defaults, embeddable component) | [08 – Settings](./08_settings.md) | CMS System Variables list, default values, how values are resolved, embeddable component for other contexts. |
| Templates (reusable page structures) | [09 – Templates](./09_templates.md) | Template list, create/edit, component list, using templates when creating pages. |
| Navigation (items, mapping, display template, edit) | [11 – Navigation](./11_navigation.md) | Navigation list and editor, item model (label, url, image, description, custom properties), Add page / Add custom link with mapping, edit items, display template and item variable popup, Additional CSS/JS, Load from component, storage. |
| Users (platform user and role management) | [12 – Users](./12_users.md) | Users list, roles (Super Admin, Program Manager, Advisor, Startup), invite and edit flows, startup association, reset password, delete, storage. |
| Data model, storage, technical details | [10 – Data and technical](./10_data_and_technical.md) | localStorage keys, area/page/template data structures, variable system (head/body), key functions, technologies, best practices. |
| **Workflow, logic, and output** | [14 – Workflow, logic and output](./14_workflow_logic_and_output.md) | How elements intersect (Areas, Pages, Components, Templates, Navigation, Forms, Settings); diagrams; variable system (where and how); practical use cases; static output (Next.js export, Cloudflare). |

---

## 5. Glossary

- **Area**: Logical container for pages; defines style, design templates, legal, tracking, and access policy.
- **Component**: Reusable UI block with HTML (Liquid), CSS, JS, and a variable schema.
- **LCE / Liquid**: Liquid Component Engine; template syntax (`{{ var }}`, `{% ... %}`) used in components and area templates.
- **Page**: Content entity with path, area, component structure, content data, SEO, and style variants.
- **System variable**: Managed variable (e.g. style token, form embed) whose value comes from structure preferences or Settings defaults.
- **Template**: Saved list of components used to create new pages quickly.
