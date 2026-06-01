# CR-002 — Component Slug Field

**Status:** Proposed  
**Priority:** Low  
**Affects:** `@cms/domain` (entity), `@cms/infrastructure` (repository + adapter), SQL schema

---

## Summary

Add a `slug` field to `CmsComponent` so components can be referenced by a
human-readable, URL-safe identifier instead of their auto-generated `id`.

---

## Motivation

Template embeds with `{{component:1780233887636-r9ljmz3ya}}` are opaque and
difficult to maintain. `{{component:hero-banner}}` is self-documenting and
survives data migrations (slugs are stable; IDs may not be).

---

## Domain Change (`packages/domain/src/entities/Component.ts`)

```ts
export interface CmsComponent {
  id:   string;
  slug: string;          // ← NEW — unique, kebab-case, e.g. "hero-banner"
  name: string;
  // ... existing fields
}
```

**Slug rules:**
- Lowercase, kebab-case: `Hero Banner` → `hero-banner`
- Unique per project (enforced at DB level)
- Auto-generated from `name` on creation if not provided
- Immutable after first publish (to avoid breaking existing templates)

---

## Repository Change

Add `findBySlug(slug: string): Promise<CmsComponent | null>` to
`IComponentRepository` and `ComponentRepository`.

---

## SQL Migration

```sql
ALTER TABLE cms_components
  ADD COLUMN slug TEXT UNIQUE;

-- Backfill existing rows from name
UPDATE cms_components
SET slug = lower(regexp_replace(name, '[^a-z0-9]+', '-', 'g'))
WHERE slug IS NULL;

ALTER TABLE cms_components
  ALTER COLUMN slug SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_cms_components_slug ON cms_components (slug);
```

---

## Engine Change (`packages/cms/src/CMS.ts`)

`resolveComponentEmbeds` (from CR-001) should resolve by slug:

```ts
// Current (CR-001 uses id):
const component = await this.components.findById(match.id);

// After this CR (resolve by slug first, fall back to id):
const component =
  await this.components.findBySlug(match.ref).catch(() => null) ??
  await this.components.findById(match.ref).catch(() => null);
```

---

## Admin UI

Once the engine supports slugs, the `{{` picker inserts
`{{component:hero-banner}}` instead of `{{component:1780233887636-r9ljmz3ya}}`.

**Until this CR is implemented**, the admin UI inserts the raw `id` as a
temporary workaround and displays the slug-style label alongside it so the
developer knows what the embed refers to.

---

## Acceptance Criteria

- [ ] `CmsComponent.slug` field exists and is unique
- [ ] `IComponentRepository.findBySlug()` method implemented
- [ ] SQL migration adds the column and backfills existing rows
- [ ] Engine resolves `{{component:hero-banner}}` via slug lookup
- [ ] Admin picker inserts slug-based syntax
- [ ] Creating a component auto-generates a slug from the name
