# CMS – Templates

Templates are reusable page structures that speed up page creation. This document describes how they work and how to use them in the admin.

---

## 1. Overview

**Templates** (`pmp_admin_cms_templates.html`) store a **name**, **description**, and an **ordered list of component names**. They do **not** store content data—only the list of components. When you create a new page, you can choose a template; the page is then created with that component structure. You then add content and SEO on the page itself.

For the overall role of templates in the CMS, see [01 – Overview](./01_overview.md). For page creation and structure, see [03 – Pages](./03_pages.md).

---

## 2. Template list

- **Columns**: Template name, description, component count, last modified date.
- **Actions**: Preview, Edit, Delete.

---

## 3. Creating and editing templates

1. Click **Create Template** (or Edit on an existing template).
2. Enter **name** and **description**.
3. **Add components** from the component library (same components used in pages).
4. **Reorder** or **remove** components as needed.
5. **Save** the template.

Templates store only the **component names** (and order). The actual component configuration (content, positioning) is done at **page level** when you add content to a page created from the template.

---

## 4. Template preview

- Preview is available in different device views: **Desktop**, **Tablet**, **Mobile**.
- The preview shows a visual representation of the component layout (component placeholders in order). It does not render real content, which is defined per page.

---

## 5. Using templates when creating pages

- On the **Pages** interface, when creating a new page, use the **template** dropdown (e.g. next to “New Page”).
- Select a template; the new page is created with its **structure** (component list) pre-filled.
- Then customize **page details** (title, slug, area, parent, status) and **content** (per-component data, SEO, style) on the page.

---

## 6. Data model and storage

Templates are stored in **localStorage** under the key **`pmp_cms_templates`** (array). Each item typically has:

- `name`: Template name.
- `desc` (or `description`): Description.
- `components`: Array of component names (or IDs) in order.
- `updated`: Last modified (e.g. date or relative time).

For full data structures and keys, see [10 – Data and technical](./10_data_and_technical.md).
