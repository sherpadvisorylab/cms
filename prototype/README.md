# CMS Prototype

Prototipo HTML che mostra tutte le funzionalità del CMS: **frontend** (sito di esempio) e **backend** (admin) secondo la documentazione in `../docs/`.

## Come aprire

1. **Sito pubblico (frontend)**  
   Apri in un browser:
   - `site/index.html` — Home (contenuto da Pages + Area)
   - `site/privacy-policy.html` — Privacy Policy (contenuto da Area → Legal)
   - `site/terms.html` — Terms & Conditions
   - `site/404.html` — Pagina non trovata
   - `site/login.html`, `site/signup.html`, `site/forgot-password.html` — UI autenticazione (senza backend)

2. **Admin (backend)**  
   Apri in un browser:
   - `admin/index.html` — Dashboard con menu
   - `admin/areas.html` — Aree (lista, Add, Edit, Delete)
   - `admin/area_edit.html?area=Public` — Modifica area (tab: Basic, Style, Design, Legal, Tracking, Access Policy)
   - `admin/pages.html` — Pagine (lista, filtro area, New Page, From template, Structure, Content & SEO)
   - `admin/navigation.html` — Blocchi navigazione (items: page/custom link, display template, CSS/JS)
   - `admin/components.html` — Componenti (tab Page/UI/Navigation, categorie, grid)
   - `admin/component_edit.html?id=...` — Edit component (HTML Liquid, Attributes)
   - `admin/templates.html` — Template (lista, Create/Edit, Preview device)
   - `admin/forms.html` — Form (lista id/name per {{form:id}})
   - `admin/emails.html` — Template email (edit subject, message, variables)
   - `admin/users.html` — Utenti (lista, Add, Edit, Reset password, Delete)
   - `admin/settings.html` — Impostazioni (Branding, Authentication/SSO, System Variables)

I file sono HTML statici; per evitare problemi CORS è consigliabile servirli con un server locale (es. `npx serve .` dalla cartella `prototype` oppure dalla root del progetto CMS).

## Struttura

- **site/** — Pagine del sito pubblico (area Public, navigazione, contenuti da localStorage)
- **admin/** — Interfaccia di gestione CMS
- **assets/css/main.css** — Stili condivisi (neutri e professionali)
- **assets/js/storage.js** — Helper localStorage (chiavi come da documentazione)
- **PROTOTYPE_CHECKLIST.md** — Checklist e avanzamento

## Dati

La persistenza è in **localStorage**. Chiavi usate: vedi **PROTOTYPE_CHECKLIST.md** sezione "Chiavi localStorage". All’apertura, se le chiavi principali sono vuote, vengono inseriti dati di seed (aree Public/Startup con siteName, pagina Home, blocchi di navigazione).

## Prossimi passi

Le funzionalità principali sono implementate. Per lo stato dettagliato e gli elementi opzionali (variable popup, CodeMirror, Form generator completo, ecc.) vedi **PROTOTYPE_CHECKLIST.md**.
