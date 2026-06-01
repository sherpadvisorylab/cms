# CR-001 — Nested Component Embeds

**Status:** Proposed  
**Priority:** Medium  
**Affects:** `@cms/cms` (engine), `@cms/domain` (ports), admin UI (component editor)

---

## Summary

Allow a component's Liquid template to embed another component via the
`{{component:id}}` placeholder syntax, consistent with the existing
`{{form:variable}}` and `{{navigation:id}}` patterns.

---

## Motivation

Complex layouts often reuse smaller building blocks (e.g. a "Card" component
embedded inside a "Grid" component). Without nested embeds, these must be
duplicated or hardcoded into the parent template, making maintenance harder.

---

## Proposed Syntax

```liquid
<!-- Inside a "Card Grid" component template -->
<div class="grid grid-cols-3 gap-6">
  {{component:card-component-id}}
  {{component:card-component-id}}
  {{component:card-component-id}}
</div>
```

The embedded component renders its **latest published version** with **no
instance-level props** (default/empty values). A future iteration could add
prop overrides via a JSON suffix: `{{component:id | props: {...} }}`.

---

## Engine Changes Required (`packages/cms/src/CMS.ts`)

### 1. Extend `protectCmsPlaceholders`

```ts
function protectCmsPlaceholders(template: string): string {
  return template
    .replace(/\{\{form:([^}]+)\}\}/g, "__CMS_FORM_$1__")
    .replace(/\{\{navigation:([^}]+)\}\}/g, "__CMS_NAV_$1__")
    .replace(/\{\{system:([^}]+)\}\}/g, "__CMS_SYS_$1__")
    .replace(/\{\{component:([^}]+)\}\}/g, "__CMS_COMP_$1__");  // ← NEW
}
```

### 2. Add `resolveComponentEmbeds` method

```ts
private async resolveComponentEmbeds(
  html: string,
  systemVars: Record<string, string>,
  depth: number = 0,          // current recursion depth
): Promise<string> {
  const MAX_DEPTH = 3;        // hard cap — prevents infinite loops
  const pattern = /\{\{component:([^}]+)\}\}/g;
  const matches: { full: string; id: string }[] = [];
  let m: RegExpExecArray | null;

  while ((m = pattern.exec(html)) !== null) {
    matches.push({ full: m[0], id: m[1].trim() });
  }

  for (const match of matches) {
    if (depth >= MAX_DEPTH) {
      // Replace with a visible warning comment instead of silently dropping
      html = html.replace(
        match.full,
        `<!-- [CMS] component embed skipped: max nesting depth (${MAX_DEPTH}) reached -->`,
      );
      continue;
    }

    const component = await this.components.findById(match.id);
    const version   = component
      ? await this.componentVersions.getLatest(component.id)
      : null;

    if (!version) {
      html = html.replace(match.full, "");
      continue;
    }

    // Render the embedded component (passes empty props, inherits systemVars)
    const safeTemplate = resolveSystemVarPlaceholders(
      protectCmsPlaceholders(version.templateLiquid),
      systemVars,
    );
    let embeddedHtml = await this.render.render({
      template: safeTemplate,
      data:     { ...systemVars },
      globals:  {},
    }).then(restoreCmsPlaceholders);

    // Recursively resolve nested embeds (with incremented depth counter)
    embeddedHtml = await this.resolveComponentEmbeds(embeddedHtml, systemVars, depth + 1);

    html = html.replace(match.full, embeddedHtml);
  }

  return html;
}
```

### 3. Call after `resolveForms` / `resolveNavigations` in `renderContent` and `renderPage`

```ts
// After existing resolveNavigations / resolveForms calls:
contentHtml = await this.resolveComponentEmbeds(contentHtml, systemVars);
```

---

## Recursive Loop Prevention

| Mechanism | Detail |
|---|---|
| **Depth counter** | Each recursive call increments `depth`. Stops at `MAX_DEPTH = 3`. |
| **Hard cap comment** | Exceeded embeds are replaced with an HTML comment, not silently dropped — visible in dev tools. |
| **No self-reference guard** | A component embedding itself is caught by the depth cap on the second recursion. A future improvement could add explicit cycle detection via a `Set<string>` of component IDs in the call chain. |

> **Note on cycle detection (future):** pass a `Set<string>` of already-rendered
> component IDs down the recursion. If `match.id` is already in the set, skip
> immediately and emit the comment. This catches A→B→A cycles before hitting
> the depth cap.

---

## Admin UI — Component Editor Context Menu

The `{{` variable picker in the template editor must show a **Components** section
alongside Style Variables and Form embeds.

### Current sections
- 🎨 Style Variables (from `settings.systemVariableDefaults`)
- 📋 Form (embed)

### After this CR
- 🎨 Style Variables
- 🧩 Components (embed) ← new
- 📋 Form (embed)

**Section behaviour:**
- All section headers are **always visible**, even when a section has no items.
- Empty sections show a muted "No items yet" placeholder.
- Sections are **collapsible** via an accordion with a caret icon (▶ / ▼).
- The picker is a custom React overlay (not CodeMirror native autocomplete),
  giving full control over rendering, accordion state, and empty-state handling.

### Data change in `/api/admin/[id]/data` route

```ts
components: components.map(c => ({
  id:        c.id,
  name:      c.name,
  namespace: c.namespace ?? null,
  type:      c.type,
})),
```

### Template insertion format

```
{{component:1780233887636-r9ljmz3ya}}
```

---

## Domain / Port Changes

None required for the initial implementation. The engine already has access
to `this.components` and `this.componentVersions` repositories.

A future typed port method `IComponentRepository.findById` already exists.

---

## Acceptance Criteria

- [ ] `{{component:id}}` in a template is replaced with the rendered HTML of that component
- [ ] Nesting depth > 3 emits an HTML comment and does not crash
- [ ] A→B→A self-referential cycle is caught by the depth cap
- [ ] Admin editor shows the Components section in the `{{` picker
- [ ] Components section is always visible, shows empty state when no components exist
- [ ] Sections are collapsible with caret icons
- [ ] System variables `{{system:*}}` are excluded from the Variables panel (already implemented)

---

## Out of Scope (Future CRs)

- Prop overrides on embedded components (`{{component:id | props: {...} }}`)
- Per-instance prop editing in the page builder for embedded components
- Caching rendered component HTML to avoid repeated renders
