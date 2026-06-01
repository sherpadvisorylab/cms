# CR-003 — Schema.org / JSON-LD Engine Rendering

**Status:** Proposed  
**Priority:** Medium  
**Affects:** `@cms/domain`, `@cms/infrastructure`, `@cms/cms`, SQL schema

---

## Summary

The CMS engine must render Schema.org JSON-LD blocks into the `<head>` of each
page. Blocks are defined at two levels:

1. **Component level** — each component version carries a Liquid JSON-LD
   template (`schema_org_template`). The engine renders it with the component's
   instance props and emits a `<script type="application/ld+json">` block.

2. **Page level** — a `cms_page_schema` row stores per-page overrides and
   manual blocks that appear alongside (or instead of) component-derived blocks.

---

## Architecture

```
Page render
  └─ for each ComponentInstance in structure:
       render component.schema_org_template → JSON-LD block (if enabled)
  └─ load cms_page_schema row for this page:
       render custom_blocks[] → JSON-LD blocks (if enabled)
  └─ inject all enabled blocks as <script type="application/ld+json"> in <head>
```

---

## DB Changes

### 1. `cms_component_versions` — add `schema_org_template`

```sql
ALTER TABLE cms_component_versions
  ADD COLUMN schema_org_template TEXT DEFAULT '';
```

Drizzle:
```ts
schemaOrgTemplate: text("schema_org_template").default(""),
```

Contains a **Liquid template** that resolves component instance props:
```liquid
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "{{ title }}",
  "description": "{{ description }}",
  "image": "{{ image_url }}"
}
```

### 2. NEW TABLE `cms_page_schema`

```sql
CREATE TABLE IF NOT EXISTS cms_page_schema (
  id           TEXT        PRIMARY KEY,
  page_id      TEXT        NOT NULL REFERENCES cms_pages(id) ON DELETE CASCADE,
  custom_blocks JSONB      DEFAULT '[]',
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cms_page_schema_page
  ON cms_page_schema (page_id);
```

`custom_blocks` is an array of:
```ts
{
  id:       string;      // uuid
  label:    string;      // human-readable name
  enabled:  boolean;
  template: string;      // Liquid JSON-LD template, may use {{comp:slug.varname}}
}
```

Drizzle:
```ts
export const cmsPageSchema = pgTable("cms_page_schema", {
  id:           text("id").primaryKey(),
  pageId:       text("page_id").notNull().references(() => cmsPages.id, { onDelete: "cascade" }),
  customBlocks: jsonb("custom_blocks").default([]),
  updatedAt:    timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
```

---

## Variable Syntax in Templates

| Scope | Syntax | Resolved by |
|---|---|---|
| Component instance props | `{{ title }}` | LiquidJS (data props) |
| System/style vars | `{{ system:bg-primary }}` | Pre-resolved before LiquidJS |
| Component var from page | `{{ comp:hero-1.title }}` | Page-level resolver |

`{{comp:slug.varname}}` in page-level templates is resolved by looking up the
component instance whose component has slug `slug`, then reading `instance.props.varname`.

---

## Engine Changes (`packages/cms/src/CMS.ts`)

### `resolveComponentSchemaOrg(instance, version, props)`

Called inside the existing render loop for each component:
```ts
if (version.schemaOrgTemplate?.trim() && instance.schemaOrgEnabled !== false) {
  const rendered = await this.render.render({
    template: version.schemaOrgTemplate,
    data: { ...expandedProps, ...systemVars },
    globals: {},
  });
  schemaBlocks.push(rendered.trim());
}
```

### `resolvePageSchema(pageId, structure)`

Called after the component loop:
```ts
const pageSchema = await this.pageSchemaRepo?.findByPageId(pageId);
for (const block of pageSchema?.customBlocks ?? []) {
  if (!block.enabled) continue;
  // resolve {{comp:slug.varname}} references
  const resolved = resolveCompVarEmbeds(block.template, structure, componentSlugsMap);
  schemaBlocks.push(resolved);
}
```

### Injection in `<head>`

```ts
const schemaScripts = schemaBlocks
  .map(b => `<script type="application/ld+json">\n${b}\n</script>`)
  .join("\n");
headHtml = headHtml.replace(/\{\{metaTags\}\}/g, metaTags + "\n" + schemaScripts);
```

---

## Domain Changes

New port `IPageSchemaRepository`:
```ts
interface IPageSchemaRepository {
  findByPageId(pageId: string): Promise<CmsPageSchema | null>;
  save(schema: CmsPageSchema): Promise<CmsPageSchema>;
}
```

New entity `CmsPageSchema`:
```ts
interface CmsPageSchema {
  id:           string;
  pageId:       string;
  customBlocks: CmsSchemaBlock[];
  updatedAt?:   Date;
}

interface CmsSchemaBlock {
  id:       string;
  label:    string;
  enabled:  boolean;
  template: string;
}
```

---

## Acceptance Criteria

- [ ] `schema_org_template` column exists on `cms_component_versions`
- [ ] `cms_page_schema` table exists with UNIQUE constraint on `page_id`
- [ ] Component schema Liquid template is rendered with instance props
- [ ] `{{comp:slug.varname}}` in page custom blocks is resolved correctly
- [ ] Disabled blocks are NOT injected
- [ ] All enabled blocks appear as `<script type="application/ld+json">` in `<head>`
- [ ] Admin UI saves/loads both component and page schema configs
