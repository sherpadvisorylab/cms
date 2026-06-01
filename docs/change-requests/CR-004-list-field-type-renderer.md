# CR-004 — `list` Field Type: Admin Renderer & Vertical Coverage

**Status:** Proposed  
**Priority:** Medium  
**Affects:** vertical admin UIs (e.g. `espressolab.singapore`), `@cms/domain`

---

## Summary

The `list` type is a valid entry in `SCHEMA_FIELD_TYPES` (defined in
`packages/domain/src/entities/Component.ts`) but has no dedicated render
case in vertical admin page-content editors. It silently falls through to the
`default` branch, which renders a plain `<input type="text">` — incorrect
for a multi-value list field.

---

## Affected File (known instance)

`apps/src/app/(pmp)/admin/pages/[id]/content/page.tsx` — `renderField()`
function, `switch (field.type)` block.

Same gap exists in any other vertical that copies this pattern.

---

## Current Behaviour

```ts
// list falls through to default ↓
default:
  return <input className="form-control" value={strValue} … />;
```

A content editor who selects `list` as a field type sees a single text box
with no way to add, remove, or reorder items.

---

## Proposed Fix

Add a `case "list":` renderer that allows managing an ordered collection of
string values. Minimum viable UI:

- A stacked list of `<input>` rows (one per item)
- **Add item** button appends an empty entry
- **Remove** button (×) on each row
- Value stored as `string[]` (JSON array serialised to props)

### Sketch

```tsx
case "list": {
  const items: string[] = Array.isArray(value) ? (value as string[]) : [];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {items.map((item, i) => (
        <div key={i} style={{ display: "flex", gap: 6 }}>
          <input
            className="form-control"
            value={item}
            onChange={(e) => {
              const next = [...items];
              next[i] = e.target.value;
              onChange(next);
            }}
          />
          <button
            className="btn-icon"
            style={{ color: "var(--danger)" }}
            onClick={() => onChange(items.filter((_, j) => j !== i))}
            title="Remove"
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
      ))}
      <button
        className="btn btn-secondary btn-sm"
        style={{ alignSelf: "flex-start" }}
        onClick={() => onChange([...items, ""])}
      >
        <i className="fa-solid fa-plus" /> Add item
      </button>
    </div>
  );
}
```

---

## Acceptance Criteria

- [ ] `renderField` handles `"list"` with a dynamic row-based editor
- [ ] Items are stored as `string[]` in component props (not a CSV string)
- [ ] Add / remove item works without losing other field values
- [ ] Existing field types (`text`, `textarea`, `richtext`, `image_url`,
      `video_url`, `color`, `toggle`, `number`, `select`) are unaffected
- [ ] Fix applied in all vertical admin content editors that use this pattern

---

## Out of Scope

- Drag-to-reorder list items (future UX enhancement)
- Typed list items (object arrays) — a separate, more complex field type
