# Settings and system variables component

## 1. Overview

The **Settings** area in the admin provides platform-wide configuration. A central part of it is the **CMS System Variables** editor: the list of all **managed system variables** that can be used inside CMS components (e.g. in HTML templates as `{{ variable }}`), with their **default values**.

This editor can be implemented as an **embeddable component**: a self-contained UI that can be included in the admin Settings page or in other contexts (e.g. area-level settings, white-label config, headless admin). The component lets users view and edit the default values for each system variable; values are either **preferences defined when creating the page structure** (area, template, page) or **defaults defined in Settings**.

---

## 2. System variables: how values are resolved

At runtime, system variables are **populated** in one of two ways:

1. **Preferences defined when creating the page structure** — Overrides at area, template or page level (e.g. “use this color schema for this area”).
2. **Default values defined in Settings** — Used when no override is set. The Settings page (or the embeddable component) holds the **list of all managed system variables** and their default values, which reflect the current theme (e.g. Tailwind class names or hex colours).

So: the same variable (e.g. `bg-primary`) can come from structure-level preferences or from the default configured in Settings.

---

## 3. Embeddable component: role and use in other contexts

The **System Variables** editor is designed to be **innestabile** (embeddable) in other contexts:

- **Admin Settings** — Full Settings page (`pmp_admin_settings.html`) with Integrations, System Variables, and Program status labels.
- **Area-level settings** — E.g. “Override system variable defaults for this area” in the area editor.
- **White-label or tenant config** — Per-tenant default theme variables.
- **Headless / API-driven admin** — The same data model and defaults can be exposed via API and edited by a custom UI that reuses the component or its contract.

The component exposes:

- A **data contract**: list of variable IDs (e.g. `bg-primary`, `text-muted`) and per-variable default value (string: class name, hex, etc.).
- An **optional UI**: a form that lists all managed variables and allows editing their default values, with optional “Reset to theme defaults” and “Save”.

---

## 4. API and initialisation (embeddable component)

### 4.1 Inclusion

The component can be included in a host page by:

- **Markup**: a container element (e.g. `<div id="system-variables-editor"></div>`).
- **CSS**: host page styles or a dedicated scoped stylesheet (e.g. `.system-variables-editor`).
- **JS**: a module or IIFE that renders the form and handles save/load/reset.

### 4.2 Initialisation

```javascript
SystemVariablesEditor.init(containerId, options);
```

**Parameters**

- **`containerId`** (string): ID of the DOM element that will contain the editor.
- **`options`** (object, optional):
  - **`variableIds`** (string[]): List of system variable keys to show (e.g. `['bg-primary','text-primary',...]`). If omitted, the default list (style + any custom) is used.
  - **`themeDefaults`** (object): Map `variableId → default value` (e.g. `{ 'bg-primary': 'bg-primary', 'text-muted': 'text-muted' }`). Used for “Reset to theme defaults” and initial state.
  - **`storageKey`** (string): Key used to persist defaults (e.g. `pmp_cms_system_variable_defaults`). In non-browser contexts this can be ignored and persistence handled via callbacks.
  - **`onLoad`** (function): `() => Promise<object> | object` — Load current default values (e.g. from API or localStorage). Return a map `variableId → value`.
  - **`onSave`** (function): `(values: object) => Promise<void> | void` — Persist default values. Receives a map `variableId → value`.
  - **`readOnly`** (boolean): If true, only display values (no edit/save).

### 4.3 Exposed API (after init)

- **`getValues()`**: Returns the current default values as `{ [variableId]: string }`.
- **`setValues(values)`**: Sets form values from a map (e.g. after loading from API).
- **`resetToThemeDefaults()`**: Fills the form with `options.themeDefaults` and optionally calls `onSave` with those values.

---

## 5. Data model

### 5.1 Managed system variables (default list)

**Style (color/context)** — Used in components for classes or CSS context:

- `bg-primary`, `bg-secondary`, `bg-accent`, `bg-surface`
- `text-primary`, `text-secondary`, `text-muted`, `text-accent`
- `border-primary`, `border-secondary`, `border-muted`

Each value is a string (e.g. Tailwind class name like `bg-primary`, or hex like `#2563eb`).

**Form (embed)** — `{{form:id}}`: list of embeddable forms is built from CMS-generated forms; it is not edited as “default value” in this component but configured elsewhere (e.g. form library).

### 5.2 Persistence (prototype)

- **Key**: `pmp_cms_system_variable_defaults`
- **Value**: JSON object `{ "bg-primary": "bg-primary", "text-muted": "text-muted", ... }`

In production, persistence can be via API (e.g. `GET/PUT /api/settings/system-variables`) or backend storage; the component only needs `onLoad` and `onSave` to adapt.

---

## 6. UI behaviour (reference)

- **Layout**: Section “Style (color/context)” with a grid of label + input per variable; optional section “Form (embed)” as description only.
- **Actions**: “Reset to theme defaults” (restore `themeDefaults`), “Save default values” (call `onSave` with current form values).
- **Validation**: Optional (e.g. non-empty, or allowed format per variable type). Left to the host if needed.

---

## 7. Integration with CMS components

In the CMS component HTML editor, typing `{` opens the **system variables popup** (see [CMS Components](./cms_components.md#system-variables-popup)). The variables listed there are the same **managed system variables** whose defaults are edited in Settings. At render time:

1. The runtime resolves `{{bg-primary}}` (and similar) using area/template/page overrides if present.
2. If no override exists, it uses the **default value** from Settings (the one edited by this component).

So the embeddable System Variables editor and the component editor popup share the same list of variable IDs and the same resolution rules.

---

## 8. Secrets and API keys (Settings page)

The Settings page does **not** store API keys, client secrets or other secrets. A short note next to **Integrations** (and under each integration) states:

- **API keys and secrets**: use `.env` or an external secret manager (e.g. Cloudflare Secrets, AWS Secrets Manager, Azure Key Vault). Notes under each integration.

So the System Variables component is limited to **non-sensitive** default values (theme tokens, class names); secrets are handled only via environment or secret manager.

---

*Last updated: February 2025*
