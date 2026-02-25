# CMS – Settings and system variables

This document describes the **Settings** component of the CMS: platform-wide configuration including **branding and defaults**, **Authentication / SSO**, and **CMS System Variables** (default values, embeddable component). For the overall CMS logic and concepts, see [01 – Overview](./01_overview.md).

---

## 1. Overview

The **Settings** area in the admin provides platform-wide configuration. The **Settings page** is **orchestrated by the vertical** (the project): the project owns the page layout and navigation; some inner blocks are **CMS utility components** (e.g. Branding & defaults, System Variables editor) made available by the CMS and embedded in the vertical’s Settings page. The Settings component typically includes:

1. **Branding and defaults** — Default logo, project name, default color scheme, default font, default icon font, default favicon. These values are used by the auth pages (login, signup, recover password) and the app shell when no area-level override is set.
2. **Authentication / SSO** — Enable or disable SSO on the Login and Signup pages. Which SSO providers are shown is **delegated to the external auth layer** (e.g. Supabase, Auth0); the CMS does not select providers. See [§2 Authentication / SSO](#2-authentication--sso).
3. **CMS System Variables** — The list of all **managed system variables** (e.g. `{{ variable }}` in templates) and their **default values**. This part can be implemented as an **embeddable component** for use in the Settings page or other contexts (e.g. area-level settings, white-label config). Values are either **preferences defined when creating the page structure** (area, template, page) or **defaults defined in Settings**.

---

## 2. System variables: how values are resolved

At runtime, system variables are **populated** in one of two ways:

1. **Preferences defined when creating the page structure** — Overrides at area, template or page level (e.g. “use this color schema for this area”).
2. **Default values defined in Settings** — Used when no override is set. The Settings page (or the embeddable component) holds the **list of all managed system variables** and their default values, which reflect the current theme (e.g. Tailwind class names or hex colours).

So: the same variable (e.g. `bg-primary`) can come from structure-level preferences or from the default configured in Settings.

---

## 2. Authentication / SSO

In the Settings component, the administrator configures **whether SSO is enabled** on the Login and Signup pages (see [07 – Authentication](./07_authentication.md)). The CMS does **not** implement SSO logic nor choose which providers to offer: that is **delegated to the external auth layer** (e.g. Supabase, Auth0, or another identity provider used by the project).

- **Enable SSO**: Single toggle or checkbox. When **enabled**, the Login and Signup forms show an SSO block (buttons or links); the actual providers and their configuration (Google, Microsoft, GitHub, SAML, etc.) are determined by the external layer. When **disabled**, the forms show only email/password.
- **No provider selection in Settings**: Which SSO providers are available and how they are configured is entirely up to the project’s auth layer. The CMS Settings component only stores the **enable/disable** flag; the vertical (project) passes this to the auth components and the external layer handles provider list and credentials.

---

## 3. Branding and defaults

In the same Settings component (or in a dedicated “Branding” section), the following **defaults** can be configured. They are used by the auth pages and the app shell when no area-level override exists.

| Setting | Description |
|--------|-------------|
| **Project name** | Display name of the project (e.g. in the login header or browser title). |
| **Default language** | Default locale/language for the platform (e.g. English); selectable from a dropdown. |
| **Default timezone** | Default timezone in **IANA** format (e.g. `Europe/Rome`, `UTC`, `America/New_York`); selectable from a dropdown. |
| **Default logo** | Logo image (e.g. light and dark variant) used on login, signup, and in the shell. |
| **Default color schema** | A **single** default theme/color palette (primary, secondary, accent, success, warning, error, info, background, surface, text, text muted, border). No multiple schemas; this is the platform default used when no area-level override is set. |
| **Default font** | Default text font family (e.g. Inter, system-ui); custom and icon fonts via URL list. |
| **Default icon font** | Default icon font or set (e.g. Font Awesome, custom). |
| **Default favicon** | Default favicon for the browser tab. |

**Email defaults (CMS utility)** — The CMS provides a utility block used by the vertical for transactional emails (activation, password reset, notifications): **Sender name** (e.g. “No Reply”) and **Sender email (from)** (e.g. “no-reply@example.com”). These are the default “from” values when the project sends emails; the vertical embeds this block in the Settings page.

These values are optional; if not set, the CMS or the project can fall back to built-in defaults. Area-level settings (see [02 – Areas](./02_areas.md)) can override them per area.

### 3.1 Settings page structure (tabs)

The Settings page can be organised with **tabs** (e.g. Branding & defaults | Authentication | Integrations | System variables | Program labels), in line with other admin pages (e.g. area edit). Each tab shows the relevant section; the **Branding & defaults** tab mirrors the structure used in the area editor (Basic / Style) for consistency. The vertical is responsible for the tab layout and for embedding the CMS utility components in the appropriate tab content.

---

## 4. Embeddable component: role and use in other contexts

The **System Variables** editor is designed to be **embeddable** in other contexts:

- **Admin Settings** — Full Settings page (e.g. `pmp_admin_settings.html`) with **Branding & defaults**, **Authentication / SSO**, Integrations, **CMS System Variables**, and (if applicable) Program status labels or other project-specific sections.
- **Area-level settings** — E.g. “Override system variable defaults for this area” in the area editor.
- **White-label or tenant config** — Per-tenant default theme variables.
- **Headless / API-driven admin** — The same data model and defaults can be exposed via API and edited by a custom UI that reuses the component or its contract.

The component exposes:

- A **data contract**: list of variable IDs (e.g. `bg-primary`, `text-muted`) and per-variable default value (string: class name, hex, etc.).
- An **optional UI**: a form that lists all managed variables and allows editing their default values, with optional “Reset to theme defaults” and “Save”.

---

## 5. API and initialisation (embeddable component)

### 5.1 Inclusion

The component can be included in a host page by:

- **Markup**: a container element (e.g. `<div id="system-variables-editor"></div>`).
- **CSS**: host page styles or a dedicated scoped stylesheet (e.g. `.system-variables-editor`).
- **JS**: a module or IIFE that renders the form and handles save/load/reset.

### 5.2 Initialisation

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

### 5.3 Exposed API (after init)

- **`getValues()`**: Returns the current default values as `{ [variableId]: string }`.
- **`setValues(values)`**: Sets form values from a map (e.g. after loading from API).
- **`resetToThemeDefaults()`**: Fills the form with `options.themeDefaults` and optionally calls `onSave` with those values.

---

## 6. Data model

### 6.1 Managed system variables (built-in and custom)

**Style (color/context)** — Built-in variables used in components for classes or CSS context:

- `bg-primary`, `bg-secondary`, `bg-accent`, `bg-surface`
- `text-primary`, `text-secondary`, `text-muted`, `text-accent`
- `border-primary`, `border-secondary`, `border-muted`

Each value is a string (e.g. Tailwind class name like `bg-primary`, or hex like `#2563eb`).

**Custom variables** — Administrators can add **custom** system variables: a key (e.g. `hero-title-size`, `footer-bg`) and a default value. Custom variables use the same resolution rules as built-in ones: they can be overridden at area/template/page level and are available in the component editor popup (typing `{{` shows all managed variables, including custom). Use `{{variable-key}}` in component HTML to inject the resolved value.

**Form (embed)** — `{{form:id}}`: list of embeddable forms is built from CMS-generated forms; it is not edited as “default value” in this component but configured elsewhere (e.g. form library).

### 6.2 Persistence (prototype)

- **Defaults**: `pmp_cms_system_variable_defaults` — JSON object `{ "bg-primary": "bg-primary", "text-muted": "text-muted", "hero-title-size": "text-2xl", ... }` (built-in + custom keys).
- **Custom keys list** (optional): e.g. `pmp_cms_system_variable_custom_keys` — JSON array of custom variable keys, used by the UI to render the “Custom variables” section and allow add/remove. Values for custom keys live in the same defaults object.

In production, persistence can be via API (e.g. `GET/PUT /api/settings/system-variables`) or backend storage; the component only needs `onLoad` and `onSave` to adapt.

---

## 7. UI behaviour (reference)

- **Layout**: Card-based sections for clarity. **Style (color/context)**: grid of label + input per built-in variable. **Custom variables**: list of rows, each with key input, value input, and remove button; “Add variable” button to append a new row. **Form (embed)**: short description only (no editable list here).
- **Custom variables**: Key must be unique and not equal to a built-in variable id; typically lowercase with hyphens (e.g. `hero-title-size`). On save, only rows with a non-empty key are persisted; built-in keys are never removed.
- **Actions**: “Reset to theme defaults” restores built-in style variables to `themeDefaults` (custom variables are left unchanged); “Save default values” persists both built-in and custom (call `onSave` with the full map).
- **Validation**: Optional (e.g. non-empty key, unique key, or allowed format per variable type). Left to the host if needed.

---

## 8. Integration with CMS components

In the CMS component HTML editor, typing `{` opens the **system variables popup** (see [04 – Components](./04_components.md#system-variables-popup)). The variables listed there are the same **managed system variables** (built-in + custom) whose defaults are edited in Settings. At render time:

1. The runtime resolves `{{variable-key}}` using area/template/page overrides if present.
2. If no override exists, it uses the **default value** from Settings (built-in or custom).

So the embeddable System Variables editor and the component editor popup share the same list of variable IDs (including custom keys) and the same resolution rules.

---

## 9. Secrets and API keys (Settings page)

The Settings page does **not** store API keys, client secrets or other secrets. A short note next to **Integrations** (and under each integration) states:

- **API keys and secrets**: use `.env` or an external secret manager (e.g. Cloudflare Secrets, AWS Secrets Manager, Azure Key Vault). Notes under each integration.

So the System Variables component is limited to **non-sensitive** default values (theme tokens, class names); secrets are handled only via environment or secret manager.

---

## References

- **Overview and concepts**: [01 – Overview](./01_overview.md)
- **Authentication (Login, Signup, SSO)**: [07 – Authentication](./07_authentication.md) — SSO enable/disable from Settings; provider list from external auth layer
- **Areas (style overrides)**: [02 – Areas](./02_areas.md)
- **Components (system variables popup)**: [04 – Components](./04_components.md#system-variables-popup)
- **Data and technical**: [10 – Data and technical](./10_data_and_technical.md)

*Last updated: February 2025*
