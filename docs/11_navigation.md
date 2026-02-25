# CMS – Navigation

This document describes the **CMS Navigation** feature: how navigation blocks (e.g. Main Header, Footer Links) are defined, how items (pages and custom links) are structured and edited, and how the display template and variable popup work. For the overall CMS logic, see [01 – Overview](./01_overview.md). Navigation blocks are embedded in area design as `{{navigation:id}}` (see [02 – Areas](./02_areas.md)).

## Table of Contents

1. [Overview](#overview)
2. [Navigation list and editor](#navigation-list-and-editor)
3. [Item model (extended)](#item-model-extended)
4. [Add existing page](#add-existing-page)
5. [Add custom link](#add-custom-link)
6. [Edit existing items](#edit-existing-items)
7. [Display template and item variable popup](#display-template-and-item-variable-popup)
8. [Additional CSS and JS](#additional-css-and-js)
9. [Load template from component](#load-template-from-component)
10. [Data model and storage](#data-model-and-storage)

---

## Overview

**Navigation** blocks are named sets of links (e.g. “Main Header”, “Footer Links”) used in area head/body templates. Each block has:

- A **list of items** (each item is either an “existing page” or a “custom link”).
- A **display template** (HTML + Liquid) that renders the items (e.g. `<ul>…</ul>`, cards, mega menu).
- Optional **Additional CSS** and **Additional JS** for that block.

Items are **extended** with optional fields (**image**, **description**) and with **custom properties** (flat key-value) so that templates can use `{{ item.label }}`, `{{ item.url }}`, `{{ item.image }}`, `{{ item.description }}`, and any `{{ item.customKey }}`. When adding an item from a page, fields are **mapped** from the page; when adding a custom link, the user enters values directly. Custom property names are **remembered** per navigation so that new items can reuse the same set of fields.

**Prototype file**: `pmp_admin_cms_navigation.html`.

---

## Navigation list and editor

- **Left panel**: List of navigation blocks (cards with name and item count). Button **+** to create a new navigation.
- **Right panel** (when one block is selected): Name (editable), **Save**, then:
  - **Items**: “Add existing page” and “Add custom link”, plus a sortable list of items (drag handle, label, url, type badge, **Edit**, **Delete**).
  - **Display template**: CodeMirror editor (HTML + Liquid), **Load** button to copy from a Menu component, and help text. Typing **`{`** in the template opens the **item variable popup** (see below).
  - **Additional CSS** and **Additional JS**: Collapsible cards with CodeMirror (mode `css` and `javascript`).

There is **no “ACTIVE” badge** on the block; the block name and Save are sufficient.

---

## Item model (extended)

Each item is a **flat object** (no nested `attributes`). Reserved keys:

| Key | Required | Description |
|-----|----------|-------------|
| `type` | Yes | `'page'` or `'custom'` |
| `label` | Yes | Link label (text) |
| `url` | Yes | Link URL or path |
| `image` | No | Optional image URL or path (e.g. for cards, thumbnails) |
| `description` | No | Optional description text |

Any other key is a **custom property** (e.g. `icon`, `badge`, `subtitle`). In the display template you use `{{ item.label }}`, `{{ item.url }}`, `{{ item.image }}`, `{{ item.description }}`, and `{{ item.<customKey> }}`. If an item does not define a property, it renders empty.

---

## Add existing page

When the user clicks **Add existing page**:

1. **Page** select: choose a page (e.g. Home, About Us, Programs). The list is driven by a page source (e.g. `PAGES_BY_PATH` in the prototype).
2. **Label** and **URL**: Pre-filled from the selected page (mapping: page title → label, page path → url) and **editable**.
3. **Image**: Dropdown “— None —” or **map to a page field** (e.g. Title, Path, Excerpt, Featured image). The chosen field’s value is stored on the item as `item.image`.
4. **Description**: Same idea — dropdown to map a page field to `item.description`.
5. **Custom fields**: One row per **custom property**. Each row has:
   - **Property name** (extends the item object).
   - **Map to page field** (dropdown): which page field fills that property.
   - Rows can be added with “Add field”. Property names already used in the current navigation are **pre-filled** so new items can reuse the same shape; values can be left blank (optional).

On **Add**, the item is built from the form: `type: 'page'`, `label`, `url`, `image` and `description` from the mapping (or empty), and each custom property from its mapped page field. The item is appended to the list.

**Page field mapping** (prototype): The page object is expected to have fields such as `title`, `path`, `excerpt`, `image` (e.g. featured image). These are the options in the Image and Description dropdowns and in the custom-field “Map to page field” dropdown.

---

## Add custom link

When the user clicks **Add custom link**:

1. **Label** and **URL**: Required, free text.
2. **Image**: Optional single-line input (URL or path).
3. **Description**: Optional textarea.
4. **Custom fields**: Same idea as for pages — property name + **fixed value** (input). The same set of custom property names (from existing items in the navigation) is pre-filled; the user types the value for each. All optional.

On **Add**, the item is built with `type: 'custom'` and all entered values; it is appended to the list.

---

## Edit existing items

Each item in the list has an **Edit** button (pencil icon). Clicking it opens the **same modal** as Add (Add existing page or Add custom link, depending on `item.type`), in **edit mode**:

- **Edit existing page**: Modal title “Edit existing page”. Form pre-filled with the item’s label, url, and (where possible) image/description mapping inferred from the current values and the page source. Custom fields are pre-filled with property names and mappings. The user can change the page selection, labels, mappings, and custom fields. On **Add** (in the modal), the **existing item at that index is replaced** (no new item is appended).
- **Edit custom link**: Modal title “Edit custom link”. Form pre-filled with label, url, image, description, and all custom properties. On **Add**, the existing item at that index is replaced.

If the edited “page” item’s URL is not in the page list (e.g. custom path), the Image and Description mappings may show “— None —”; on save, the existing `image` and `description` (and custom values) are preserved so data is not lost.

---

## Display template and item variable popup

The **Display template** is an HTML + Liquid template (e.g. `{% for item in items %}…{% endfor %}`). It is edited in a **CodeMirror** editor (mode `html-liquid`).

- Typing **`{`** in the editor opens a **popup** (“Item properties”) **at the cursor** (positioned contextually where you typed) that lists all available item properties: **label**, **url**, **image**, **description**, plus every **custom property name** that appears on at least one item in the current navigation (merge of all items). Clicking an entry inserts `{{ item.<property> }}` at the cursor (replacing the typed `{` or `{{`). If an item does not have that property, it renders empty at runtime.
- The popup closes on Escape or click outside.

This behaves like the **system variables popup** in the component HTML editor (e.g. style variables, form embeds), but the list is derived from the navigation’s item structure.

---

## Additional CSS and JS

In the Display template section, two **collapsible cards** (closed by default) are available:

- **Additional CSS**: CodeMirror editor, mode `css`. Injected for this navigation block when rendered.
- **Additional JS**: CodeMirror editor, mode `javascript`. Injected for this navigation block when rendered.

They match the same concept as in **Area edit** (Additional CSS / Additional JS) and in **Component edit** (Additional CSS / Additional JS). Values are stored on the navigation object as `additionalCss` and `additionalJs`.

---

## Load template from component

The **Load** button next to the Display template opens a modal **“Load template from component”**:

- It lists only **Menu**-type components from the CMS component library (type Navigation, category Menu).
- Components are shown as **cards** (icon/image, name, category). Choosing one copies that component’s **HTML template** into the Display template editor; the component itself is not modified.
- A **note box** explains what the action does and that the list shows only Menu components. The note is **collapsible**: it starts **closed** and can be toggled via a **blue info icon** next to the modal title. There is **no Cancel button**; the modal is closed with the **X** or by choosing a component.

---

## Data model and storage

- **Storage key**: `pmp_cms_navigations` (object keyed by navigation ID).

- **Navigation object** (per block):

  - `name`: Display name of the block.
  - `items`: Array of **item objects** (see [Item model](#item-model-extended)).
  - `template`: HTML + Liquid string for the display template.
  - `additionalCss`: Optional CSS string.
  - `additionalJs`: Optional JavaScript string.

- **Item object**: Flat object with `type`, `label`, `url`, optional `image`, `description`, and any custom keys. No separate `attributes` object.

- **Page source** (prototype): e.g. `PAGES_BY_PATH` (path → `{ title, path, excerpt, image }`) and `PAGE_FIELDS` (list of mappable fields: title, path, excerpt, image). In a real CMS, page data would come from the pages/area API.

---

## References

- [01 – Overview](./01_overview.md) — CMS concepts and where Navigation fits.
- [02 – Areas](./02_areas.md) — Design tab, variable popup, embedding `{{navigation:id}}`.
- [04 – Components](./04_components.md) — Navigation/Menu components and Load template source.
- [10 – Data and technical](./10_data_and_technical.md) — localStorage keys and navigation structure.
