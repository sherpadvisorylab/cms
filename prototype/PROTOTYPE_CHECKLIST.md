# CMS Prototype – Checklist e avanzamento

Questo file traccia l’avanzamento del prototipo HTML/CMS: frontend (sito di esempio) e backend (admin) secondo la documentazione in `docs/`.

---

## Verifica implementazione

| Modulo | File admin | Stato |
|--------|------------|--------|
| Areas | areas.html, area_edit.html | ✅ Lista, Add, Edit (6 tab), Delete, localStorage |
| Pages | pages.html | ✅ Lista, filtro area, New Page, From template, Structure, Content & SEO, localStorage |
| Navigation | navigation.html | ✅ Lista blocchi, Add block, Items (Add page/custom link), Edit item, Display template, Additional CSS/JS, localStorage |
| Components | components.html, component_edit.html | ✅ Tab tipo, sidebar categorie, grid, Edit (name, type, category, HTML Liquid, Attributes da regex), seed hero/content/cta, localStorage |
| Templates | templates.html | ✅ Lista, Create/Edit (name, desc, component list), Preview (desktop/tablet/mobile), Delete, uso in Pages dropdown, localStorage |
| Forms | forms.html | ✅ Lista form (nome, variabile normalizzata), Add/Edit/Delete, **form builder**: gruppi (label, desc, riordino), campi per gruppo (Label, Type, Required, Width, Validator, Default value, Options per select/radio/checkbox, Rating min/max), riordino campi e gruppi, embed {{form:variable}}, localStorage |
| Emails | emails.html | ✅ Lista template (id, name, category, subject), Edit (subject, message, variables), Reset to default, localStorage |
| Settings | settings.html | ✅ Tab Branding, Authentication/SSO, System Variables (theme defaults, Save, Reset), localStorage |
| Users | users.html | ✅ Lista (Name, Email, Role, Status, Last Login), Add User, Edit, Reset password, Delete, ruoli da lista, localStorage |
| Auth (site) | site/login.html, signup.html, forgot-password.html | ✅ UI Login, Signup, Forgot password (senza backend) |
| Default pages | site/404.html, privacy-policy.html, terms.html | ✅ 404, Privacy, Terms; contenuto da Area Legal |

Mancano (opzionali o da estendere): Form generator completo (groups/fields), Load template from component in Navigation, Positioning/Preview in Components. Implementati: variable popup su `{` (Components, Area Design, Navigation display template) raggruppate per tipologia; CodeMirror in component_edit per HTML/CSS/JS.

---

## Struttura

- **prototype/** – Root del prototipo (in root del progetto CMS)
  - **site/** – Frontend pubblico (sito generato dal CMS)
  - **admin/** – Backend admin (pagine di gestione)
  - **assets/** – CSS, JS, immagini condivisi

---

## Fasi

### Fase 0: Setup
- [x] Creare `prototype/` e `PROTOTYPE_CHECKLIST.md`
- [x] Creare cartelle `site/`, `admin/`, `assets/`

### Fase 1: Prima versione frontend
- [x] Pagina principale del sito (area Public)
- [x] Esempio di pagina con componenti (hero, content, CTA)
- [x] Header/footer con navigazione
- [x] Stile neutro e professionale
- [x] Riferimento form embedded in copy
- [x] Pagine default: 404, Privacy, Terms

### Fase 2: Prima versione backend
- [x] Layout admin con menu (Areas, Pages, Navigation, Components, Templates, Forms, Emails, Users, Settings)
- [x] Pagine placeholder per ogni voce di menu
- [x] Aree: lista + Add Area + edit completo (area_edit con tab)
- [x] Collegamento frontend ↔ backend (localStorage)

### Fase 3: Funzionalità una alla volta (dalla documentazione)

#### 3.1 Areas (doc: 02_areas)
- [x] Lista aree (`areas.html`) – tabella, Add Area, Edit, Delete
- [x] Edit area (`area_edit.html`) – tab: Basic Data, Style, Design, Legal, Tracking, Access Policy
- [x] Basic Data: name (read-only), icon, description, siteName, rootPath, status
- [x] Style: logos (URL), favicon, color schema (default)
- [x] Design: head/body template, Area CSS/JS
- [x] Legal: legal pages (title, path, content), cookie bar (enabled, label, description)
- [x] Tracking: GA, GTM, custom scripts (position)
- [x] Access Policy: restricted, redirectUrl, registration, recover password
- [x] localStorage: `pmp_cms_areas`
- [ ] Style: Custom fonts, Icon fonts, multiple schemas, Import from URL; Design: bodyElements. **Variable popup** (typing `{` → Style / Form / Navigation) implementato in prototipo.

#### 3.2 Pages (doc: 03_pages, 03_pages_default)
- [x] Lista pagine con filtro per area
- [x] Creazione da zero o da template (dropdown)
- [x] Modal creazione: title, slug, parent, area, status, structure (components)
- [x] Gestione struttura: add/remove/reorder components
- [x] Content & SEO: Content Data (per component), Style & Theme (palette, layout), SEO (meta title, description, keywords)
- [x] Status: Published, Draft, Archived
- [x] Gerarchia parent/child, full path preview
- [x] Default pages: 404, Privacy, Terms (site pages)
- [ ] System pages (cannot delete) – opzionale

#### 3.3 Components (doc: 04_components)
- [x] Lista per tipo: Page | UI | Navigation; sidebar categorie; grid
- [x] Edit/Add: name, type, category, description
- [x] HTML template (Liquid), textarea (no CodeMirror in prototype)
- [x] Attributes tab (variable schema da regex `{{ var }}`)
- [x] Variable popup: digitando `{` si apre popup con variabili raggruppate (Style, Form embed); CodeMirror per HTML/CSS/JS
- [x] localStorage: `pmp_component_<id>`, seed hero-1, content-1, cta-1
- [ ] System variables popup (`{`), Positioning (12-col), Preview modale, Import HTML

#### 3.4 Templates (doc: 09_templates)
- [x] Lista: name, description, component count, last modified
- [x] Create/Edit: name, description, ordered component list
- [x] Preview (desktop/tablet/mobile)
- [x] Uso in creazione pagina (dropdown "From template" in Pages)
- [x] localStorage: `pmp_cms_templates`

#### 3.5 Forms (doc: 05_forms)
- [x] Lista form (id, name), Add/Edit/Delete
- [x] Embed in component/area: `{{form:variable}}` (variable = nome form normalizzato; lista da pmp_cms_forms)
- [x] localStorage: `pmp_cms_forms`
- [x] Form generator UI completo (groups, fields, types, options) — Implementato in prototipo: gruppi, campi con tipo/required/width/validator/default/options/rating, riordino.

#### 3.6 Navigation (doc: 11_navigation)
- [x] Lista blocchi (nome, item count), Add block
- [x] Items: Add existing page (select page → label, url), Add custom link
- [x] Edit item (page/custom)
- [x] Display template (textarea HTML + Liquid), Additional CSS/JS (collapsible)
- [x] Variable popup: digitando `{` nel display template si apre popup variabili item (item.label, item.url, …)
- [x] localStorage: `pmp_cms_navigations`
- [ ] Load template from component (Menu)

#### 3.7 Emails (doc: 06_emails)
- [x] Lista template (id, name, category, subject)
- [x] Edit template (subject, message, variables), Reset to default
- [x] Storage: `pmp_cms_email_templates` (object keyed by id)
- [ ] API loadTemplates/send (riferimento doc; in prototype persistenza in localStorage)

#### 3.8 Authentication (doc: 07_authentication)
- [x] Pagine UI: Login (login.html), Signup (signup.html), Forgot password (forgot-password.html)
- [x] Template email auth in Emails: user_activation, password_reset, welcome_email, user_invitation
- [ ] Flussi completi con backend (prototipo: solo UI + messaggio)

#### 3.9 Settings (doc: 08_settings)
- [x] Tab: Branding & defaults, Authentication/SSO, System Variables
- [x] System variables: lista variableIds, themeDefaults, Save, Reset to theme defaults
- [x] Branding: project name, logo URL, font, favicon, sender name/email
- [x] SSO: enable/disable (no provider list in CMS)
- [x] localStorage: `pmp_cms_system_variable_defaults`, settings object per branding/auth

#### 3.10 Users (doc: 12_users)
- [x] Lista: Name, Email, Role, Status, Last Login, Actions
- [x] Add User (invite): email, role; Organization (optional) se role=Member
- [x] Edit User: name, email, role, status, organization
- [x] Reset password (conferma), Delete (conferma)
- [x] Ruoli: Administrator, Editor, Contributor, Member (lista fissa in prototype)
- [x] localStorage: `pmp_admin_users`

#### 3.11 Default pages (doc: 03_pages_default)
- [x] 404 (site/404.html): title, message, link back to home
- [x] Privacy (site/privacy-policy.html): title, content da Area Legal
- [x] Terms (site/terms.html): title, content da Area Legal
- [ ] Props espliciti NotFoundPage/PrivacyPolicyPage/TermsConditionsPage (integrazione come componenti utility)

---

## Riferimenti doc

| Doc | Argomento |
|-----|-----------|
| 01_overview.md | Concetti, dove trovare cosa |
| 02_areas.md | Aree |
| 03_pages.md | Pagine |
| 03_pages_default.md | Pagine default (404, Privacy, Terms) |
| 04_components.md | Componenti |
| 05_forms.md | Form generator |
| 06_emails.md | Email |
| 07_authentication.md | Autenticazione |
| 08_settings.md | Impostazioni |
| 09_templates.md | Template |
| 10_data_and_technical.md | Modello dati, localStorage |
| 11_navigation.md | Navigazione |
| 12_users.md | Utenti |
| 13_workflow.md | Workflow, output |

---

## Note

- **Styling**: il prototipo usa **solo Tailwind CSS** tramite CDN (`https://cdn.tailwindcss.com`) incluso in ogni pagina; nessun file CSS custom (main.css è vuoto/deprecato). **Per lo sviluppo del CMS (prototipo e applicazione) si deve usare Tailwind**; vedi `docs/01_overview.md` (§6) e `docs/10_data_and_technical.md` (§4).
- Implementazione fedele alla documentazione; non inventare funzionalità non descritte.
- Grafica: professionale, neutra, funzionale.
- Persistenza prototipo: localStorage (chiavi documentate in 10_data_and_technical e nei doc di dettaglio).

### Chiavi localStorage (prototipo)

| Chiave | Uso |
|--------|-----|
| `pmp_cms_areas` | Array aree (lista + edit) |
| `pmp_cms_templates` | Array template (nome, desc, components) |
| `pmp_cms_pages` | Array pagine (structure, content, seo, style) |
| `pmp_cms_navigations` | Oggetto blocchi (id → name, items, template, additionalCss/Js) |
| `pmp_cms_forms` | Array form { name, fields } per {{form:variable}} (variable = nome normalizzato) |
| `pmp_admin_users` | Array utenti (name, email, role, status, company) |
| `pmp_cms_system_variable_defaults` | Oggetto variableId → valore (Settings) |
| `pmp_cms_system_variable_custom_keys` | Array chiavi custom (opzionale) |
| `pmp_component_<id>` | Oggetto componente (html, css, js, variables, …) |
| `pmp_cms_settings` | Oggetto branding + SSO (admin/settings.html) |
| `pmp_cms_email_templates` | Oggetto templateId → { subject, message, variables } (admin/emails.html) |
