# CMS – Default pages (utility)

This document lists the **default pages** the CMS provides as ready-to-use utilities. Like the [authentication components](./07_authentication.md) (Login, Signup, Forgot password), these default pages are **utility components**: the vertical imports them and uses them on its routes. For general page management (create, structure, content, SEO), see [03 – Pages](./03_pages.md). For area-level legal configuration, see [02 – Areas](./02_areas.md) (Legal tab).

---

## 1. What the CMS provides as default pages

The CMS offers a small set of **default pages** implemented as reusable **utility components**. Verticals import these components, assign them to routes (e.g. `/privacy-policy`, `/terms-and-conditions`, or the app’s 404 handler), and customize content and styling. They are intended for:

- **Legal compliance**: Privacy Policy and Terms & Conditions.
- **System behaviour**: Page Not Found (404).

They are **not** auto-created in the page list; the project uses the components to render those routes, optionally backed by area legal configuration (see [02 – Areas](./02_areas.md) Legal tab) and by content edited in Admin.

---

## 2. List of default pages (utility)

### 2.1 Page Not Found (404)

| Property | Description |
|----------|-------------|
| **Purpose** | Shown when the user requests a URL that does not match any page or route. |
| **Usage** | The vertical registers this component as the 404 handler (e.g. in the router or in the app’s fallback route). |
| **Content** | Standard 404 message and optional link back to home or search. Can be customized with project-specific copy and styling. |
| **Where configured** | Project routing / error boundary; optional copy or layout overrides in the vertical. |
| **CMS admin** | No dedicated 404 “page” in the page list; the component is used by the app when a route is not found. |

---

### 2.2 Privacy Policy

| Property | Description |
|----------|-------------|
| **Purpose** | Legal page required for compliance (e.g. GDPR, privacy disclosures). |
| **Usage** | The vertical uses the default Privacy Policy component on a public route (e.g. `/privacy-policy`). Content can be supplied from the area’s Legal configuration or from a CMS page. |
| **Content** | Standard structure (title, body). Content is customizable per project; often edited in **Admin → CMS → Areas → [Area] → Legal** tab (see [02 – Areas](./02_areas.md)). |
| **Where configured** | **Area edit → Legal tab**: list of legal pages (title, path, content). If no legal data exists for the area, the CMS can add default Privacy Policy and Terms & Conditions entries (`addDefaultLegalPages`). |
| **CMS admin** | Legal tab for the area; optionally a dedicated page in the Pages list if the vertical creates one and fills it with the same content. |

---

### 2.3 Terms & Conditions

| Property | Description |
|----------|-------------|
| **Purpose** | Legal page for general terms of use. |
| **Usage** | The vertical uses the default Terms & Conditions component on a public route (e.g. `/terms-and-conditions`). Content can be supplied from the area’s Legal configuration or from a CMS page. |
| **Content** | Standard structure (title, body). Content is customizable per project; often edited in **Admin → CMS → Areas → [Area] → Legal** tab. |
| **Where configured** | **Area edit → Legal tab**: same as Privacy Policy. Default entries can be added when the area has no legal pages. |
| **CMS admin** | Legal tab for the area; optionally a page in the Pages list. |

**Note:** Program-specific Terms & Conditions (e.g. for startup signup/accept-invitation) are a different concept: they are stored per program (e.g. Admin → Programs → Edit) and shown on the accept-invitation flow. They are not the same as the generic “Terms & Conditions” default page above. See the vertical’s onboarding and program docs for that flow.

---

## 3. Utility components for default pages

Each default page is implemented as a **utility component** that the vertical imports and uses on a route, in the same way as the authentication components (`LoginForm`, `ForgotPasswordForm`, etc.) in [07 – Authentication](./07_authentication.md). Below are the component names, behaviour, and typical props.

### 3.1 NotFoundPage (404)

**Component**: `NotFoundPage`

Renders the Page Not Found experience when no route matches.

#### Props

```typescript
interface NotFoundPageProps {
  title?: string;           // Optional override for the heading (e.g. "Page not found")
  message?: string;         // Optional body text
  homeLink?: string;       // URL for "Back to home" (e.g. "/")
  homeLabel?: string;      // Label for the link (e.g. "Back to home")
}
```

#### How it works

- Renders a simple layout with title and message. When `homeLink` is set, shows a link to return to the site.
- The vertical mounts this component on the 404 route (or fallback route). Props can be passed from the app config or left to defaults.

---

### 3.2 PrivacyPolicyPage

**Component**: `PrivacyPolicyPage`

Renders the Privacy Policy legal page. Content can come from the area’s Legal configuration or be passed in.

#### Props

```typescript
interface PrivacyPolicyPageProps {
  title?: string;           // Page title (e.g. "Privacy Policy")
  content?: string;         // HTML or markdown content; if omitted, resolved from area legal config
  areaId?: string;          // Optional: area from which to load legal page content (title + content)
}
```

#### How it works

- If `content` (or `title` + `content`) is provided, the component renders it. Otherwise it can resolve the legal page for the given `areaId` from the CMS (Area → Legal tab).
- The vertical uses this component on a route such as `/privacy-policy`. Content is typically edited in Admin → CMS → Areas → [Area] → Legal.

---

### 3.3 TermsConditionsPage

**Component**: `TermsConditionsPage`

Renders the Terms & Conditions legal page. Same pattern as Privacy Policy.

#### Props

```typescript
interface TermsConditionsPageProps {
  title?: string;           // Page title (e.g. "Terms & Conditions")
  content?: string;         // HTML or markdown content; if omitted, resolved from area legal config
  areaId?: string;          // Optional: area from which to load legal page content
}
```

#### How it works

- Same as `PrivacyPolicyPage`: content from props or from area legal configuration. The vertical mounts it on a route such as `/terms-and-conditions`.

---

### 3.4 Common interface

All default-page components share a common pattern so they can be used consistently:

- They are **presentational**: they render the content passed or loaded from the CMS; they do not perform auth or redirects (except 404 as the fallback route).
- **Branding** (logo, colors, fonts) comes from the area or from [Settings](./08_settings.md) (Branding & defaults); the components use the same design tokens as the rest of the app.
- **Integration**: Import the component from the CMS package and use it in the vertical’s router or page tree, in the same way as `LoginForm` / `ForgotPasswordForm` from the Authentication module.

---

## 4. Summary table

| Default page | Purpose | Utility component | Where configured |
|--------------|---------|-------------------|------------------|
| **404** | Page Not Found | `NotFoundPage` | App routing / 404 handler |
| **Privacy Policy** | Legal compliance | `PrivacyPolicyPage` | Area → Legal tab (and optionally Pages) |
| **Terms & Conditions** | Legal compliance | `TermsConditionsPage` | Area → Legal tab (and optionally Pages) |

Authentication routes (Login, Signup, Forgot password, Activation, Reset password) use separate **authentication utility components**; see [07 – Authentication](./07_authentication.md).

---

## 5. References

- [02 – Areas](./02_areas.md) — Legal tab, legal pages list, `addDefaultLegalPages`.
- [03 – Pages](./03_pages.md) — Page list, create, structure, content, SEO; default pages as components.
- [07 – Authentication](./07_authentication.md) — Authentication utility components (Login, Signup, Forgot password, etc.).
- [08 – Settings](./08_settings.md) — Branding & defaults (used by default pages and auth pages).
