# CMS – Components

This document describes the Components feature in detail: list, edit/add, Liquid templates, schema, positioning, preview, system variables. For the overall CMS logic and concepts, see [01 – Overview](./01_overview.md).

## Table of Contents

1. [Overview](#overview)
2. [Component Types and Categories](#component-types-and-categories)
3. [Components List Page](#components-list-page)
4. [Component Edit / Add Page](#component-edit--add-page)
5. [HTML Template (Liquid)](#html-template-liquid)
6. [CodeMirror Editor](#codemirror-editor)
7. [Variables and Attributes](#variables-and-attributes)
8. [Positioning and Backend Layout](#positioning-and-backend-layout)
9. [Preview](#preview)
10. [Import HTML](#import-html)
11. [Data Model and Storage](#data-model-and-storage)
12. [Integration with Other CMS Features](#integration-with-other-cms-features)
13. [Best Practices](#best-practices)

---

## Overview

The CMS Components module allows administrators to create and manage **reusable UI building blocks** used in pages, navigation, and layout. Each component is defined by an **HTML template** (with Liquid syntax for variables), optional **CSS** and **JavaScript**, and a **backend configuration** (variable types, labels, positioning, and optional preview).

### Key Features

- **Three component types**: Page, UI, and Navigation — each with its own categories and use cases
- **Liquid-based templates**: Use `{{ variable_name }}` and `{% ... %}` for dynamic content; variables are auto-detected and appear in the Backend panel
- **CodeMirror editor**: HTML (with custom Liquid overlay mode), CSS, and JS editors with syntax highlighting and line numbers
- **Backend panel**: Attributes (variable config), Positioning (12-column grid per view), and Preview (form preview with desktop/tablet/mobile)
- **Import HTML**: Paste HTML (e.g. Tailwind); text content is converted to Liquid variables
- **Preview**: Modal preview of the HTML template with Tailwind CSS; variables are replaced by their labels
- **System variables popup**: Type `{` in the HTML editor to open a popup **at the cursor** that lists **style variables** (e.g. `{{bg-primary}}` for color/context) and **form (embed)** variables — CMS-generated forms that can be embedded as `{{form:id}}`. The popup is split by type for clarity.
- **Persistence**: All component data is stored in browser **localStorage** under the key `pmp_component_<id>`

### Prototype Pages

| Page | File | Purpose |
|------|------|--------|
| Components list | `pmp_admin_cms_components.html` | Browse components by type and category; open or add a component |
| Component edit/add | `pmp_admin_cms_component_edit.html` | Edit component details, HTML/CSS/JS, variables, positioning, and preview |

---

## Component Types and Categories

### Component Types

- **Page** — Used in page content; backend-configurable by copywriters (variables, positioning). Examples: hero, content block, CTA, testimonials.
- **UI** — Structural only (container, grid, spacer, etc.); not primarily for copy; for layout and fixed blocks.
- **Navigation** — Headers, menus, breadcrumbs, sidebars; pick a category and open or add components.

### Categories by Type

Categories are fixed per type and drive the sidebar on the list page and the category datalist on the edit page.

| Type | Categories |
|------|------------|
| **Page** | Hero, Content block, Features, Testimonials, CTA, Team, Pricing, FAQ, Contact, Footer, Gallery, Stats, Newsletter, Map |
| **UI** | Container, Wrapper, Grid, Columns, Spacer, Divider, Layout block, Fixed block, Decorative |
| **Navigation** | Header, Navbar, Breadcrumb, Sidebar, Sidebar nav, Footer nav, Tabs, Pagination, Menu, Mega menu, Mobile menu |

Each category has an associated Font Awesome icon (e.g. `fa-play-circle` for Hero, `fa-box` for Container). If no representative image is uploaded for a component, the card thumbnail uses the icon for the component’s category.

---

## Components List Page

**File**: `pmp_admin_cms_components.html`

### Layout

- **Header**: Title “CMS Components”, info box (“How component types work”), user profile
- **Tabs**: Page components | UI components | Navigation components — switch the active type and filter the grid
- **Action**: “Add component” button → links to `pmp_admin_cms_component_edit.html?id=new&name=Component`
- **Body**: Two-column layout
  - **Left**: Category sidebar — list of categories for the current type; clicking a category filters the grid
  - **Right**: Component grid — cards showing component name and category tag; click a card → open edit with `?id=<componentId>&name=<componentName>`

### Data Source

- Components are read from **localStorage**: keys starting with `pmp_component_`; value is a JSON object (see [Data Model and Storage](#data-model-and-storage)).
- List is filtered by current **type** and optional **category**.
- **Seed data**: On load, example components are seeded if not present (Hero, Container with banners, Menu) so the list is never empty for testing.

### Behaviour

- `switchComponentType(type)` — Sets current type, refreshes category list, selects first category that has components (or first category), re-renders grid.
- `selectCategory(cat)` — Filters grid by category.
- `selectComponent(id)` — Navigates to edit page with `id` and component name in query string.

---

## Component Edit / Add Page

**File**: `pmp_admin_cms_component_edit.html`

### URL Parameters

- **id** — Component ID (e.g. `example-hero` or `new` for a new component).
- **name** — Component name used in the page title and breadcrumb; can be “Component” for new.

### Layout

- **Header**: “Back to Components” link, dynamic title “Edit: &lt;name&gt;”, subtitle explaining that variables `{{ name }}` appear in the right panel.
- **Top row** (two columns):
  - **Component details** (left): Name*, Type*, Category (datalist), Short description, Representative image (file upload → data URL; Remove to clear).
  - **How this page works** (right): Collapsible card with instructions (Liquid, toolbar, Backend tabs, Save).
- **Main area**:
  - **Left**: HTML template (Liquid) card with toolbar (Expand, Preview, Import); type `{` to open the [system variables popup](#system-variables-popup) (style tokens and embed forms). Optional collapsible “Additional CSS” and “Additional JS” cards; “Save component” button.
  - **Right**: **Backend** card with three tabs (Attributes, Positioning, Preview) and optional view-mode toolbar (desktop/tablet/mobile) when Positioning or Preview is active.

### Component Details Form

- **Name** (required): Text input; updates the page title on input.
- **Type** (required): Select — `ui` | `page` | `navigation`.
- **Category**: Text input with `<datalist>`; options depend on Type (see [Component Types and Categories](#component-types-and-categories)).
- **Short description**: Textarea.
- **Representative image**: File input (accepts `image/*`); image is read as **data URL** and stored in the component payload; preview shown below; “Remove” clears it.

### Save

- **Save component**: Validates name and type; syncs variable order and positioning from DOM; builds payload (id, name, type, category, description, image, html, css, js, variables, variableOrder, positioningStructure); writes to `localStorage` with key `pmp_component_<id>`.
- New components use `id=new` in the URL; the saved ID is taken from the payload (so for “new” the implementation may use a generated or name-based ID — in the prototype the same `id` from the URL is used).

---

## HTML Template (Liquid)

The main template is **HTML with Liquid** syntax. This is the same language family used by Shopify, Jekyll, etc.; the prototype uses a **subset** suitable for variable output and simple control flow.

### Liquid Basics

- **Output variable**: `{{ variable_name }}` — Rendered as the value of `variable_name`. Spaces inside the braces are allowed (e.g. `{{ headline }}`). These variables are **auto-detected** from the HTML and listed in the Backend → Attributes tab; each can be configured with type, label, placeholder, required, validator.
- **Tag (control flow)**: `{% ... %}` — e.g. `{% for item in menu_items %} ... {% endfor %}`. Used for loops and conditionals; in the prototype, the CodeMirror mode highlights them as `liquid-tag` (see [CodeMirror Editor](#codemirror-editor)).

### Usage in the Template

- Prefer **Tailwind-friendly** class names and structure; the Preview modal injects Tailwind so you can design with utility classes.
- All dynamic copy and configurable content should be expressed as `{{ variable_name }}` so the backend can expose form fields and store values per page/instance.

### Example

```html
<section class="hero">
  <h1>{{ headline }}</h1>
  <p class="hero-subheadline">{{ subheadline }}</p>
  <a href="{{ cta_url }}" class="btn">{{ cta_text }}</a>
</section>
```

Variables `headline`, `subheadline`, `cta_url`, and `cta_text` will appear in Attributes and in Positioning/Preview.

### Toolbar (HTML section)

The HTML template card has a **toolbar** in the header (right-aligned) with three buttons:

- **Import** — Opens the [Import HTML](#import-html) modal. User pastes HTML into a textarea and clicks “Convert & insert”; text content is converted to Liquid variables and inserted into the editor; variable labels/placeholders are updated from the converted content.
- **Expand** — Toggles fullscreen HTML editor: the card gets class `html-section-expanded` on `body` (or equivalent), the editor fills the viewport, sidebar and header are dimmed. **Escape** exits fullscreen.
- **Preview** — Opens the [HTML Preview modal](#html-preview-modal) with the current template wrapped in a full document with Tailwind CSS; variables are replaced by their labels (or variable name if no label). View buttons (Desktop / Tablet / Mobile) set the iframe width.

Behaviour in the prototype: the three buttons are in the same row as the “HTML template (Liquid)” title; clicking each triggers the behaviour above. Typing **`{`** in the editor opens the system variables popup (style variables and form embeds).

### System variables popup

When editing the HTML template, typing **`{`** (a single open brace) opens a **system variables** popup **at the cursor** (positioned contextually where you typed). It helps insert two kinds of nestable system variables:

1. **Style variables** — Token names for color/context (e.g. for use in class attributes or CSS). The popup lists a fixed set of style tokens; selecting one inserts e.g. `{{bg-primary}}`, `{{text-muted}}`, `{{border-primary}}`. At runtime these can be resolved to the actual design tokens (e.g. Tailwind/area color schema).
   - Examples: `bg-primary`, `bg-secondary`, `bg-accent`, `bg-surface`, `text-primary`, `text-secondary`, `text-muted`, `text-accent`, `border-primary`, `border-secondary`, `border-muted`.

2. **Form (embed)** — Variables that embed an entire **CMS-generated form**. The list is populated **dynamically** from the forms defined in the CMS. Each option inserts `{{form:id}}`; at runtime the backend renders the form with that ID.
   - **Data source**: The prototype reads from **localStorage** key **`pmp_cms_forms`**. Supported formats:
     - **Array**: `[{ id: "form_1", name: "Contact" }, ...]`
     - **Object**: `{ "form_1": { name: "Contact" }, ... }`
   - If no forms are configured, the Form section shows a short message (e.g. “No forms configured. Create forms in the CMS to embed them here.”).

**Behaviour**: The popup closes on item click (insertion), **Escape**, or click outside. The inserted `{` (or `{{`) is replaced by the full `{{variable}}` or `{{form:id}}` string.

**How system variable values are resolved at runtime**: System variables are **populated at runtime** in one of two ways: **(1)** from **preferences defined when creating the page structure** (e.g. area, template or page-level overrides), or **(2)** from **default values defined in Admin → Settings**. Settings contain the **list of all managed system variables** that can be used inside components; there you can view and set default values. When a variable is overridden at page/area/template level, that value takes precedence; otherwise the default from Settings is used. See [08 – Settings](./08_settings.md).

---

## CodeMirror Editor

The edit page uses **CodeMirror 5.65.16** (cdnjs) for the HTML, CSS, and JS fields.

### Assets (cdnjs)

- `codemirror.min.css`
- `codemirror.min.js`
- `mode/xml/xml.min.js` (HTML backbone)
- `mode/css/css.min.js`
- `mode/javascript/javascript.min.js`
- `addon/mode/overlay.min.js` (for custom Liquid overlay)
- `addon/display/placeholder.min.js` (optional)

### HTML Editor — Custom Mode `html-liquid`

The HTML editor uses a **custom overlay mode** that combines:

1. **Backdrop mode**: `text/html` (CodeMirror’s HTML mode, which uses the XML mode for tags).
2. **Overlay**: Scans for Liquid constructs and assigns tokens:
   - `{{ ... }}` → token type **`liquid-var`** (styled with `.cm-liquid-var`: primary color, bold).
   - `{% ... %}` → token type **`liquid-tag`** (styled with `.cm-liquid-tag`: teal, bold).

So you get standard HTML highlighting plus clear visual distinction for Liquid variables and tags.

### CodeMirror Options (HTML)

- **mode**: `'html-liquid'`
- **lineNumbers**: true
- **lineWrapping**: true
- **indentUnit**: 2
- **indentWithTabs**: false
- **extraKeys**: Tab inserts two spaces

The wrapper has class `CodeMirror-wrap` for border and padding. On **Expand**, the editor grows to fill the viewport (min-height `calc(100vh - 120px)`).

### CSS and JS Editors

- **CSS**: mode `'css'`, line numbers, line wrapping, indent 2.
- **JS**: mode `'javascript'`, same.

Both are created from textareas and stored in `cssEditor` and `jsEditor`; values are read on Save and written on Load.

### Variable Sync

On every change in the HTML editor, `syncVariablesFromHtml()` runs: it regex-matches all `{{ ... }}` and extracts variable names. For each new name, an attribute card is added; for names no longer present, the card is hidden. This keeps the Backend → Attributes list in sync with the template.

---

## Variables and Attributes

### Detection

Variables are **detected from the HTML template** via the regex `/\{\{([^}]+)\}\}/g`. Each match’s inner trim is a variable name (e.g. `headline`, `cta_url`). No manual “add variable” is required for simple outputs.

### Attribute Card (per variable)

For each variable, the Backend → **Attributes** tab shows a **variable card** (collapsible):

- **Type**: Select (string, number, email, url, tel, date, datetime-local, time, textarea, wysiwyg, icon_picker, upload_document, upload_image, multi_upload, color, boolean, select).
- **Label**: Text input (defaults to variable name).
- **Placeholder**: Text input.
- **Required**: Checkbox.
- **Validator**: Text input (e.g. regex or rule name).

Hidden/removed variables (no longer in the template) are hidden with class `hidden` but remain in `variableStore` until save/load so ordering and positioning are preserved.

### Variable Types (VARIABLE_TYPES)

| Value | Label |
|-------|--------|
| `string` | Text (string) |
| `number` | Number |
| `email` | Email |
| `url` | URL |
| `tel` | Phone |
| `date` | Date |
| `datetime-local` | Date & time |
| `time` | Time |
| `textarea` | Textarea |
| `wysiwyg` | WYSIWYG editor |
| `icon_picker` | Icon picker |
| `upload_document` | Upload document |
| `upload_image` | Upload image |
| `multi_upload` | Multi upload |
| `color` | Color |
| `boolean` | Checkbox (boolean) |
| `select` | Select (dropdown) |

These drive the Backend form and the Preview tab; the prototype does not implement all input widgets (e.g. WYSIWYG) but the data model supports them.

### variableStore

In-memory object: `variableName → { type, label, placeholder, required, validator, width?, widthDesktop?, widthTablet?, widthMobile? }`. Widths are used by Positioning and Preview (12-column grid).

---

## Positioning and Backend Layout

### Backend card: tabs and view toolbar

The **Backend** card has:

- **Three tabs**: **Attributes** | **Positioning** | **Preview**. Only one tab is visible at a time.
- **View mode toolbar** (Desktop / Tablet / Mobile): Shown **only when the active tab is Positioning or Preview**. It controls the preview width and (in a full implementation) the column widths used per device. In the prototype, Desktop/Tablet/Mobile set the preview container width and the current view used for the Positioning grid and Preview form layout.

### Attributes tab

- **Add attribute** button (top right): Adds a new variable manually (e.g. `new_var_1`); it is appended to the variable list and optionally inserted as `{{ new_var_1 }}` in the HTML. Used when you want to define a variable before or without typing it in the template.
- **Variable cards** (one per variable): Each card is **collapsible** (summary row with label and variable name). Inside the card:
  - **Label** (text input), **Type** (select: Text, Textarea, URL, Number, Checkbox, Color, etc.), **Placeholder** (text input), **Required** (checkbox), **Validator** (text input).
  - **Actions**: Move up (↑), Move down (↓), **Remove** (removes the variable from the backend list; the variable remains in the template until you remove `{{ name }}` from the HTML).
- Variables are synced from the HTML template on change; variables no longer present in the template are hidden (class `hidden`) but kept in storage until save/load.

### Positioning Tab

- **Purpose**: Define how backend form fields are grouped and laid out per **view** (desktop, tablet, mobile). The layout matches the way the form will be rendered: variables are blocks in a **12-column grid**; when their widths allow, several variables appear on the same row.
- **View mode toolbar**: Desktop / Tablet / Mobile appear next to “Backend” when the **Positioning** or **Preview** tab is active. The **current view** determines which widths you are editing: resizing in Desktop only updates `widthDesktop`, in Mobile only `widthMobile`, and so on. Switch view to set width per device.
- **Grid layout**: Each group shows a **12-column grid**. Each variable is a **block** that spans a number of columns (1–12). By default every variable spans the **full row** (12 columns). Blocks are laid out in order, left to right; when a row is full, the next block starts on the following row. So the editor faithfully represents the width each variable will occupy in the rendered form.
- **Resize**: Drag the **left edge** or **right edge** of a variable block to change its width (column span). The left edge: drag to the right to shrink the block (fewer columns), drag to the left to extend it. The right edge: drag to the right to extend, to the left to shrink. Width is stored per view (`widthDesktop`, `widthTablet`, `widthMobile`) and is used in the Backend Preview tab and in the saved component.
- **Drag and drop**: Drag a variable block (by its label/chip) to reorder within the group or move it to another group’s grid. Order is persisted in `positioningStructure`.

### Groups

- **Default group**: The first group has **id** `'default'` and cannot be removed. It can optionally have a **label** (title) and **description**; if set, they are shown in the Backend Preview tab above its fields (like for additional groups). If left empty, the placeholder text “Default group (no wrapper in rendered form)” is used in the UI; in the rendered backend form, when the default group has no label/description, it does not add a visual wrapper. It is created automatically when there is no saved positioning structure (all variables from the template go into this single group).
- **Additional groups**: “Add group” adds a new group with optional **label** and **description**. Each group has a “Remove group” button (only non-default groups can be removed). In Preview, if a group has label or description, they are shown above its fields (with a top border for non-default groups).
- **Remove group**: Only non-default groups can be removed.

### positioningStructure

Array of items:

- **Group**: `{ type: 'group', id, label, description, items: [ { type: 'var', name }, ... ] }`.
- **id**: `'default'` for the first group; others e.g. `'group_<timestamp>'`.
- **items**: Order of variables in that group; each item `{ type: 'var', name }`.

Each variable’s **width** (column span) for the grid is stored on the variable itself: `widthDesktop`, `widthTablet`, `widthMobile` (1–12). If not set, the default is **12** (full row). On load, a flat list of `{ type: 'var', name }` is normalized into a single default group. Sync from DOM (e.g. after drag/resize) rebuilds `positioningStructure` and updates per-variable widths.

### Drag and Drop (Positioning tab)

- Variables are shown as **blocks** in a 12-column grid; each block has a label (chip) and **resize handles** on the left and right edges.
- **Drag** the block (by the label/chip) to **reorder** within the same group or to **move** it to another group’s grid: drop on another block to insert before it, or drop on the group’s grid area to append.
- **Resize** by dragging the **left or right edge** of a block (the thin strip on the border). The new width (column span) applies **only to the current view** (Desktop, Tablet, or Mobile). By default each variable spans 12 columns (full row); when you reduce a block’s width, the next block can sit on the same row if space allows.
- Order and widths are persisted in `positioningStructure` and in each variable’s `widthDesktop` / `widthTablet` / `widthMobile`; they are reflected in the Preview tab and in the saved component.

---

## Preview

### Backend Preview Tab

- Renders the **backend form** that a copywriter would see: one section per positioning group (with optional group title/description), then a 12-column grid of fields.
- Each field’s **column span** comes from the variable’s width for the **current view** (desktop/tablet/mobile). The **View mode** toolbar (Desktop / Tablet / Mobile) is visible when this tab is active; it changes the preview frame width and the column widths used for layout.
- Field type is mapped to input (text, number, email, textarea, checkbox, etc.); not all variable types have a full widget implementation in the prototype.

### HTML Preview Modal

- **Trigger**: “Preview” in the HTML template toolbar.
- **Content**: The current HTML template is wrapped in a full document with **Tailwind CSS** (e.g. `tailwindcss@2.2.19` / `cdn.tailwindcss.com`).
- **Variable substitution**: Every `{{ variable_name }}` is replaced by the variable’s **label** (or the variable name if no label) so layout and structure are visible without real data.
- **Rendering**: Either via an iframe `src` set to a blob URL of the generated HTML, or via `contentDocument.write` if blob is unavailable.
- **View buttons**: Desktop / Tablet / Mobile set the iframe container width (e.g. 320px mobile, 768px tablet, 100% desktop).
- **Escape** or overlay click closes the modal; blob URL is revoked on close.

---

## Import HTML

### Purpose

Turn static HTML (e.g. from a design or Tailwind snippet) into a template where **text content** is replaced by Liquid variables, so the backend can manage copy.

### Flow

1. User clicks **Import** in the HTML template toolbar.
2. Modal opens with a textarea; user pastes HTML.
3. User clicks **Convert & insert**.
4. **htmlToLiquidVariables(htmlString)**:
   - Parses the HTML with `innerHTML` into a DOM (in a temporary element).
   - Walks text nodes (skips `SCRIPT` and `STYLE`).
   - For each non-empty text segment, generates a **variable name** via `toVariableName(text)` (lowercase, spaces → underscores, alphanumeric + underscore, max length 28; if too long, truncates with a suffix).
   - Uniqueness: `ensureUniqueVarName(baseName, usedMap, originalText)` avoids collisions by appending `_1`, `_2`, etc.
   - Replaces the text node with `{{ var_name }}`.
   - Returns `{ html: modifiedHtml, labelByVar: { varName: originalText } }`.
5. **applyImportHtml()**:
   - Sets the HTML editor content to the modified HTML.
   - For each variable in `labelByVar`, sets `variableStore[varName].label` to a humanized name (e.g. `var_name` → “var name”) and `variableStore[varName].placeholder` to the original text.
   - Calls `syncVariablesFromHtml()` and updates the visible attribute cards (label/placeholder inputs).
6. Modal closes and focus returns to the HTML editor.

### Limitations

- Only **text node** content is converted; attributes (e.g. `placeholder`, `alt`) are not. You can still add `{{ var }}` manually in attributes.
- Variable names are derived from content; you may want to rename or adjust labels/placeholders after import.

---

## Data Model and Storage

### localStorage Key

- **Key**: `pmp_component_<id>`  
- **Value**: JSON string of the component object.

### Component Object

```javascript
{
  id: string,              // e.g. "example-hero" or "new"
  name: string,             // Display name
  type: 'page' | 'ui' | 'navigation',
  category: string,         // e.g. "Hero", "Container"
  description: string,
  image: string,            // Data URL or empty
  html: string,             // HTML + Liquid template
  css: string,
  js: string,
  variables: {              // variableName → config
    [name]: {
      type: string,
      label: string,
      placeholder: string,
      required: boolean,
      validator: string,
      width?: number,
      widthDesktop?: number,
      widthTablet?: number,
      widthMobile?: number
    }
  },
  variableOrder: string[],  // Ordered list of variable names (legacy/flat)
  positioningStructure: [    // Groups and variable order per group
    {
      type: 'group',
      id: string,
      label: string,
      description: string,
      items: [ { type: 'var', name: string }, ... ]
    }
  ]
}
```

### Migration / Normalization

- On load, if `positioningStructure` is missing or contains top-level `type: 'var'` items, it is normalized to a single group with `id: 'default'`.
- If a variable has `width` but no `widthDesktop`/`widthTablet`/`widthMobile`, they are set from `width` when loading.

### Seed Examples (List Page)

The list page seeds three example components if not present:

1. **Hero** (page, Hero): headline, subheadline, cta_text, cta_url.
2. **Container with banners** (ui, Container): banner_1, banner_2, banner_3.
3. **Menu** (navigation, Menu): menu_items (with `{% for item in menu_items %}` in the template).

---

## Integration with Other CMS Features

- **Pages**: Pages are built from a list of components; each component instance has content data keyed by variable names. The component’s `variables` and `positioningStructure` define the schema and layout of the content editor for that instance.
- **Templates**: Templates reference component names/IDs; the component library (list + edit) is the source of truth for available components and their schemas.
- **Areas**: Areas define styling and structure; components are rendered inside area templates and can use area-level CSS/fonts.
- **Navigation**: Navigation components (type **navigation**) are used in the CMS Navigation UI (e.g. menus, headers); categories such as Header, Navbar, Menu align with that.

The main documentation refers to components as “UI building blocks” and “sourced from shadcnblocks”; the **prototype** implements a full editor with Liquid, CodeMirror, and localStorage, which can be backed by a backend API and a real Liquid (e.g. LiquidJS) renderer in production.

---

## Best Practices

### Naming and Structure

- Use clear, consistent **variable names** (snake_case) and **labels** so copywriters understand fields.
- Prefer a single **default** group when all fields are equal; use **groups** when the backend form has logical sections (e.g. “Headline”, “CTA”, “Media”).

### Template and Liquid

- Prefer **Tailwind-friendly** HTML so the Preview modal and final pages render as expected.
- Use `{{ variable }}` for every configurable string or URL; use `{% for %}` (or `{% if %}`) only when the backend will provide lists or conditionals.
- Keep templates readable: indent Liquid tags like HTML.

### CodeMirror and Editor

- When integrating in a real app, keep **CodeMirror 5.65.x** and the **html-liquid** overlay in sync; if you upgrade CodeMirror, re-test the overlay and CSS classes (`.cm-liquid-var`, `.cm-liquid-tag`).
- Consider adding a **LiquidJS** (or similar) runtime on the server or in a preview service to render components with real data instead of label substitution.

### Positioning and Preview

- Set **widths** per view (desktop/tablet/mobile) so the backend form layout matches the intended UX on different screens.
- Use **Preview** and **HTML Preview** often to catch missing variables and layout issues.

### Data and Storage

- In production, replace **localStorage** with API calls; keep the same **component object** shape so the edit page logic can be reused.
- When adding new **variable types**, extend `VARIABLE_TYPES` and the Preview/Attributes rendering so new types are editable and visible in Preview.

---

## References

- **Overview and concepts**: [01 – Overview](./01_overview.md)
- **Settings and system variables**: [08 – Settings](./08_settings.md)
- **Data and technical**: [10 – Data and technical](./10_data_and_technical.md)

*Last Updated: February 2025*  
*Version: 1.0*
