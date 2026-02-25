# CMS – Areas

This document describes the Areas feature in detail: list page, area edit (all tabs), design variables, data model. For the overall CMS logic and concepts, see [01 – Overview](./01_overview.md).

## Table of Contents

1. [Overview](#overview)
2. [Areas List Page](#areas-list-page)
3. [Creating an Area](#creating-an-area)
4. [Area Edit Page](#area-edit-page)
5. [Basic Data](#basic-data)
6. [Style Settings](#style-settings)
7. [Design Structure](#design-structure)
8. [Legal](#legal)
9. [Tracking & Analytics](#tracking--analytics)
10. [Access Policy](#access-policy)
11. [Data Model and Storage](#data-model-and-storage)
12. [Integration with Pages and CMS](#integration-with-pages-and-cms)
13. [Best Practices](#best-practices)

---

## Overview

**CMS Areas** are logical containers that group pages and define their visual identity, structure, legal compliance, tracking, and access rules. Each area has a **root path** (e.g. `/`, `/startup`) and its own configuration for logos, fonts, color schemas, HTML head/body templates, legal pages, cookie consent, tracking scripts, and optional authentication.

### Key Features

- **Multi-area organization**: Separate public, startup, admin (or other) sections with distinct URLs and styling
- **Full visual identity**: Logos (light/dark), favicon, custom fonts, icon fonts, multiple color schemas with default selection
- **Design structure**: Head and body HTML templates with Liquid-style variables (`{{pageTitle}}`, `{{content}}`, etc.); Area CSS and Area JS applied to all pages in the area
- **Legal**: Configurable legal pages (Privacy Policy, Terms & Conditions, etc.) and cookie consent bar with categories
- **Tracking**: Google Analytics, Google Tag Manager, and custom scripts with configurable position (Head, Body Top, Body Bottom)
- **Access policy**: Optional restricted area with redirect URL, registration page, and recover-password page

### Prototype Pages

| Page | File | Purpose |
|------|------|--------|
| Areas list | `pmp_admin_cms_areas.html` | List areas, add area (modal), edit (navigate to edit page), delete |
| Area edit | `pmp_admin_cms_area_edit.html` | Full editor with tabs: Basic Data, Style, Design, Legal, Tracking, Access Policy |

---

## Areas List Page

**File**: `pmp_admin_cms_areas.html`

### Layout

- **Header**: Title “CMS Areas”, subtitle “Manage content areas used to organize and filter pages in the CMS.”
- **Card “Content Areas”**: Table of areas with button “Add Area”.
- **Table columns**: Area Name (with icon), Display Name, Badge Style, Pages Count, Status, Actions (Edit, Delete).

### Data Source

- Areas are read from **localStorage** key **`pmp_cms_areas`** (array). Default seed: `Public` and `Startup` with `name`, `displayName`, `description`, `badgeColor`, `icon`, `status`, `pagesCount`.

### Actions

- **Add Area**: Opens modal “Create New Area” with form (Area Name, Display Name, Description, Badge Color, Icon, Status). On submit, new area is pushed to the array and table is re-rendered; duplicate name is rejected.
- **Edit**: Navigates to `pmp_admin_cms_area_edit.html?area=<areaName>`.
- **Delete**: Confirmation; removes area from array (pages are not deleted but need to be reassigned).

### Create/Edit Modal (list page)

- **Area Name (Internal ID)**: Required, pattern `[A-Za-z0-9_]+`, no spaces or special characters; used as unique identifier.
- **Display Name**: Required; shown in UI (tabs, badges).
- **Description**: Optional textarea.
- **Badge Color**: Select — Info (Blue), Success (Green), Warning (Orange/Yellow), Danger (Red), Secondary (Gray).
- **Icon**: Text input + “Pick Icon” button; opens icon picker modal (Font Awesome icons, searchable).
- **Status**: Active | Inactive (inactive areas do not appear in filters).

The list page does **not** edit root path, style, design, legal, tracking or access; those are only on the full edit page.

---

## Creating an Area

1. On the Areas list page, click **Add Area**.
2. Fill **Area Name** (internal ID, cannot be changed later in the prototype), **Display Name**, optional Description, **Badge Color**, **Icon**, **Status**.
3. Click **Save Area**. The area is added with `pagesCount: 0`.
4. Click **Edit** on the new row to open the full editor and set **Root Path**, Style, Design, Legal, Tracking, and Access Policy.

---

## Area Edit Page

**File**: `pmp_admin_cms_area_edit.html`

### URL Parameter

- **`area`**: Area name (internal ID), e.g. `Public`, `Startup`. Required; if missing or not found in `pmp_cms_areas`, user is redirected to the list.

### Layout

- **Header**: “Back to Areas” link, title “Edit Area: &lt;displayName&gt;”, subtitle “Configure area settings and preferences.”
- **Tabs**: Basic Data | Style | Design | Legal | Tracking | Access Policy. Only one section is visible at a time.
- **Footer**: Cancel (link back to list), “Save Area Settings” submit button.

### Save Behaviour

- On form submit, area data is collected from all sections (basic, style, design, legal, tracking, accessPolicy), merged into the area object in the `pmp_cms_areas` array, and saved to localStorage. The list page and other consumers read from the same key.

---

## Basic Data

- **Area Name (Internal ID)**: Read-only text input; cannot be changed (identifier from list).
- **Icon**: Text input + “Pick Icon” button (same icon picker modal as list page).
- **Description**: Textarea.
- **Site Name**: Required; name shown in the UI.
- **Root Path**: Base URL path for the area (e.g. `/`, `/startup`). Default `/`.
- **Status**: Active | Inactive.

---

## Style Settings

### Logos

- **Light Logo** / **Dark Logo**: Two upload zones (hover to upload). Images stored as data URLs or paths; preview shown in the box. Default or placeholder logos can be used if none set.
- **Favicon**: Single upload; preview in multiple sizes (16×16, 32×32, 48×48, 64×64, 128×128, 180×180) in two columns: light background and dark background (“Preview” and “Preview Dark”).

### Fonts

- **Custom Fonts (via URL)**: List of items; each has **Name** and **URL** (CSS URL, e.g. Google Fonts). Add/remove dynamically (“Add Font URL”).
- **Icon Fonts (via URL)**: Same pattern; **Name** and **URL** for icon libraries (e.g. Font Awesome, Material Icons).

### Color Schemas

- **Multiple color schemas**; each schema has:
  - **Name** (editable).
  - **Colors**: Primary, Secondary, Accent, Success, Warning, Error, Info, Background, Surface, Text, Text Muted, Border. Each has color picker, hex text input, and small preview swatch.
  - One schema can be marked as **Default** (movable “Default” badge); the default schema cannot be removed.
- **Add Schema**: New schema with all color slots.
- **Import Styles from URL**: Button opens modal “Import Styles from Website”; user enters a URL; the app attempts to extract colors and fonts from that page and import them as a new schema (subject to CORS; may require proxy in production).

---

## Design Structure

### Head and Body Templates

- **Head Template**: Contenteditable div with placeholder showing example `<head>` with variables (e.g. `{{pageTitle}}`, `{{siteName}}`, `{{styles}}`, `{{scripts}}`).
- **Body Template**: Contenteditable div with placeholder showing example `<body>` with `{{header}}`, `{{content}}`, `{{footer}}`, `{{trackingScripts}}`.

Variables are **clickable**: clicking `{{name}}` opens a modal to edit that variable’s HTML content. Typing **`{`** opens a **variable popup at the cursor** (positioned contextually where you typed) with three sections:
- **Style variables**: Theme tokens (e.g. `{{bg-primary}}`, `{{text-muted}}`) from the area’s style settings.
- **Form (embed)**: Forms from CMS Forms; inserts `{{form:id}}`.
- **Navigation**: Blocks from CMS Navigation (e.g. Main Header, Footer Links); inserts `{{navigation:id}}`. If none are saved, default entries (Main Header, Footer Links) are shown.

Click an item to insert it. To create a **custom variable**, type its name, then `}}` and press **Enter** to open the modal and set its HTML content. Variables are stored in `designVariableContents` and saved as `design.bodyElements` (array of `{ variable, content }`).

### Area CSS and Area JS

- **Area CSS**: Textarea (or CodeMirror) for CSS injected into every page of this area.
- **Area JS**: Textarea (or CodeMirror) for JavaScript run on every page of this area.

Both are saved under `design.areaCss` and `design.areaJs`. The help panel explains that Area CSS/JS apply to all pages under the area and that tags typed in the template are shown as text (not executed) in the editor.

---

## Legal

### Legal Pages

- **Dynamic list** of legal pages (e.g. Privacy Policy, Terms & Conditions). Each page has:
  - **Title**: Shown in `<h1>`.
  - **Path**: Relative path (root path is prefixed when saving; full path preview shown).
  - **Content**: WYSIWYG editor (Quill.js) for rich text.
- **Add Legal Page**: Button adds a new collapsible block. Pages can be collapsed; when collapsed, the title is still visible.
- **Default pages**: If no legal data exists, default Privacy Policy and Terms & Conditions pages are added (addDefaultLegalPages).

### Cookie Consent Bar

- **Enable Cookie Consent Banner**: Checkbox; when unchecked, the rest of the bar settings are hidden.
- **Label**: Button/link text (e.g. “Cookie Preferences”).
- **Description**: Textarea for the banner text.
- **Cookie Categories**:
  - **Essential Cookies**: Always enabled, cannot be disabled; optional WYSIWYG description when expanded.
  - **Analytics**, **Marketing**, **Functional**: Optional; each has checkbox and optional WYSIWYG description.
  - **Add Custom Category**: Adds a custom category with name, short description, and WYSIWYG description.

---

## Tracking & Analytics

- **Google Analytics**: ID (e.g. G-XXXXXXXXXX) and **Position** (Head, Body Top, Body Bottom).
- **Google Tag Manager**: ID (e.g. GTM-XXXXXXX) and **Position** (Head, Body Top, Body Bottom).
- **Custom Tracking Scripts**: List of items; each has **Name/Description**, **Script code** (textarea), **Position** (Head, Body Top, Body Bottom). Add via “Add Tracking Script”.

Saved under `tracking.gaId`, `tracking.gaPosition`, `tracking.gtmId`, `tracking.gtmPosition`, `tracking.customScripts` (array of `{ name, code, position }`).

---

## Access Policy

- **This is a restricted area (requires authentication)**: Checkbox. When checked, the following fields are shown:
  - **Redirect URL (if unauthorized)**: e.g. `/login`.
  - **Registration Page**: Checkbox to enable + path (e.g. `/register`).
  - **Recover Password Page**: Checkbox to enable + path (e.g. `/recover-password`).

Saved under `accessPolicy.isRestricted`, `accessPolicy.redirectUrl`, `accessPolicy.registrationEnabled`, `accessPolicy.registrationPage`, `accessPolicy.recoverPasswordEnabled`, `accessPolicy.recoverPasswordPage`. Legacy `loginPage` is mapped to `redirectUrl` on load.

---

## Data Model and Storage

### localStorage Key

- **`pmp_cms_areas`**: JSON array of area objects.

### Area Object (full structure)

```javascript
{
  name: string,              // Internal ID (unique)
  displayName: string,
  description: string,
  badgeColor: string,        // 'info' | 'success' | 'warning' | 'danger' | 'secondary'
  icon: string,             // e.g. 'fa-solid fa-globe'
  status: 'active' | 'inactive',
  pagesCount: number,       // optional, used in list
  rootPath: string,          // e.g. '/', '/startup'
  style: {
    logoLight: string,      // data URL or path
    logoDark: string,
    favicon: string,
    customFonts: [ { name, url } ],
    iconFonts: [ { name, url } ],
    colorSchemas: [
      { id, name, colors: { primary, secondary, accent, ... }, isDefault?: true }
    ],
    defaultColorSchemaId: number
  },
  design: {
    headTemplate: string,
    bodyTemplate: string,
    bodyElements: [ { variable: '{{content}}', content: '<div>...' } ],
    areaCss: string,
    areaJs: string
  },
  legal: {
    pages: [ { title, path, content } ],
    cookieBar: {
      enabled: boolean,
      label: string,
      description: string,
      categories: [ { id, name?, shortDescription?, description?, enabled, custom? } ]
    }
  },
  tracking: {
    gaId: string,
    gaPosition: string,
    gtmId: string,
    gtmPosition: string,
    customScripts: [ { name, code, position } ]
  },
  accessPolicy: {
    isRestricted: boolean,
    redirectUrl: string,
    registrationEnabled: boolean,
    registrationPage: string,
    recoverPasswordEnabled: boolean,
    recoverPasswordPage: string
  }
}
```

The list page only stores a subset (name, displayName, description, badgeColor, icon, status, pagesCount); the edit page loads the full object (if present) and merges back all sections on save.

---

## Integration with Pages and CMS

- **Pages**: Each page belongs to an area (target area). The area’s root path is the base for the page URL. Area style, design, legal, tracking and access policy apply to all pages in that area.
- **Templates**: Templates can be area-agnostic; when a page is created from a template, the chosen area supplies the design and behaviour.
- **Navigation**: Navigation blocks can be area-specific; the Design tab variable popup can insert `{{navigation:id}}` from stored navigations.
- **Components**: Components are global; area styling (color schemas, fonts) affects how they render when used in pages of that area.

---

## Best Practices

1. **Set root path early**: Use `/` for the main public area and something like `/startup` or `/admin` for others so page paths are consistent.
2. **Configure style first**: Define at least one color schema and default before adding many pages so pages can use the palette.
3. **Legal and cookie bar**: Enable and fill legal pages and cookie consent for compliance before going live.
4. **Tracking**: Prefer Body Bottom or Body Top for analytics so content loads first; use Head only when required by the script.
5. **Access policy**: For restricted areas, set redirect URL and optional registration/recover-password paths so auth flows work.
6. **Design templates**: Keep head/body templates simple; use variables for content, header, footer, and tracking so the runtime can inject the right fragments.

---

---

## References

- **Overview and concepts**: [01 – Overview](./01_overview.md)
- **Data model and technical**: [10 – Data and technical](./10_data_and_technical.md)

*Last updated: February 2025*
