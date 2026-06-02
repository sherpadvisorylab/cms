# Vertical Project Setup Guide

This guide walks you through creating a new vertical project that consumes the CMS packages.
Follow every step in order. At the end you will have a running Next.js app with a protected
admin area and a fully wired CMS backend.

---

## Choose a Provider

The scaffolder supports two backend providers. Pick one before you start and follow the
column for that provider throughout.

| | Supabase | Firebase |
|---|---|---|
| **Database** | Postgres (via Drizzle) | Firestore |
| **Auth** | Supabase Auth | Firebase Auth |
| **File storage** | Supabase Storage | Firebase Storage |
| **Hosting** | Any (Vercel recommended) | Firebase App Hosting |
| **Scaffold flag** | `--provider=supabase` *(default)* | `--provider=firebase` |

---

## Two Deployment Scenarios

Every step splits into two scenarios. **Pick one and follow it consistently.**

| | Scenario A — Standalone repo | Scenario B — Inside the CMS monorepo |
|---|---|---|
| **When to use** | Real vertical project with its own git repo | Development / examples inside the CMS repo |
| **Example path** | `~/projects/<project-name>/` | `cms/examples/<project-name>/` |
| **`@cms/*` deps** | Published npm packages | Resolved from local workspace |
| **`npm install`** | From the project root | From the CMS monorepo root |

Throughout this guide, replace `<project-name>` with your actual project name.

---

## Prerequisites

| Tool | Version | Check |
|------|---------|-------|
| Node.js | ≥ 18.18 | `node -v` |
| npm | ≥ 9 | `npm -v` |
| Git | any | `git --version` |
| Supabase CLI *(Supabase only)* | latest | `npx supabase --version` |
| Firebase CLI *(Firebase only)* | latest | `npx firebase --version` |

---

## Architecture Overview

```
CMS monorepo (this repo)          Vertical project (your new repo)
──────────────────────────        ────────────────────────────────────
packages/
  @cms/domain          ──────────▶  dependencies in package.json
  @cms/infrastructure  ──────────▶  imported via @cms/cms
  @cms/form-generator  ──────────▶
  @cms/cms             ──────────▶  new CMS(new DrizzleAdapter())     [Supabase]
                                    new CMS(new FirebaseAdapter())    [Firebase]

packages/create-cms-app           npx @cms/create-cms-app <project-name> [--provider=...]
  templates/
    base/              ──────────▶  shared admin UI + public pages
    providers/
      supabase/        ──────────▶  DrizzleAdapter, Supabase Auth/Storage
      firebase/        ──────────▶  FirebaseAdapter, Firebase Auth/Storage
```

---

## Step 1 — Create the Backend Project

### Supabase

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**
2. Fill in project name, database password, region
3. Click **Create new project** and wait ~2 minutes
4. Open **Project Settings → API** and collect:

| Variable | Where |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon / public key |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key (**keep secret**) |

5. Open **Project Settings → Database → Connection string → URI** (Session mode, port 5432):

| Variable | Where |
|---|---|
| `DATABASE_URL` | URI — replace `[YOUR-PASSWORD]` with the password saved above |

### Firebase

1. Go to [console.firebase.google.com](https://console.firebase.google.com) → **Add project**
2. Enable **Firestore Database** (production mode), **Authentication** (Email/Password), **Storage**
3. Open **Project Settings → Service accounts → Generate new private key** — download the JSON
4. Collect from the JSON and the project settings:

| Variable | Where |
|---|---|
| `FIREBASE_PROJECT_ID` | `project_id` in the JSON |
| `FIREBASE_CLIENT_EMAIL` | `client_email` in the JSON |
| `FIREBASE_PRIVATE_KEY` | `private_key` in the JSON |
| `FIREBASE_STORAGE_BUCKET` | Project Settings → General → Default Storage bucket |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Project Settings → General → Web app config |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Web app config |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Web app config |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Web app config |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Web app config |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Web app config |

---

## Step 2 — Scaffold the Project

### Scenario A — Standalone repo

```bash
# Supabase (default)
npx @cms/create-cms-app <project-name>

# Firebase
npx @cms/create-cms-app <project-name> --provider=firebase

cd <project-name>
npm install
```

### Scenario B — Inside the CMS monorepo

> Run from the **CMS monorepo root**.

```bash
# Supabase (default)
npx tsx packages/create-cms-app/src/index.ts examples/<project-name> --workspace

# Firebase
npx tsx packages/create-cms-app/src/index.ts examples/<project-name> --workspace --provider=firebase

# Install all workspace dependencies from the monorepo root
npm install
```

The `--workspace` flag sets `"@cms/cms": "*"` and adds `examples/*` to the root workspaces automatically.

---

## Step 3 — Configure Environment Variables

```bash
# Scenario A
cd <project-name>

# Scenario B
cd examples/<project-name>

cp .env.local.example .env.local
```

Open `.env.local` and fill in the values collected in Step 1.

> `.env.local` is listed in `.gitignore` — it will never be committed.

---

## Step 4 — Initialise the Database

### Supabase — Apply SQL migrations

The scaffolded project includes `supabase/migrations/0001_cms_schema.sql` which creates
all CMS tables.

**Option A — Supabase CLI (immediate):**

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push
```

**Option B — GitHub connect (automatic on push):**

Go to **Supabase dashboard → Project Settings → Integrations → GitHub** and set:

| Setting | Scenario A | Scenario B |
|---|---|---|
| GitHub Repository | your vertical project repo | CMS monorepo |
| Working directory | `.` | `examples/<project-name>` |
| Deploy to production | ✅ ON | ✅ ON |
| Production branch name | `main` | `main` |

Then commit and push `supabase/migrations/0001_cms_schema.sql`.

### Firebase — Deploy security rules

Firestore is schema-less — no SQL migrations needed. The `FirebaseAdapter` creates
documents on first write. Deploy the security rules once:

```bash
npx firebase login
npx firebase use <project-id>
npx firebase deploy --only firestore:rules,firestore:indexes,storage
```

The scaffolded `firestore.rules` blocks all direct client reads/writes (all access goes
through the server-side Admin SDK). The `storage.rules` allows public reads on `cms-assets/`
and blocks direct client uploads.

---

## Step 5 — Create the Storage Bucket

### Supabase

1. Open your Supabase dashboard → **Storage**
2. Click **New bucket**, name it `cms-assets`, toggle **Public bucket** ON
3. Click **Save**

### Firebase

No manual setup needed. Firebase Storage is configured by the rules deployed in Step 4.
The `cms-assets/` prefix is created automatically on first upload.

---

## Step 6 — Seed the Admin User

Run from **inside the project directory**:

```bash
# Supabase or Firebase
npm run seed
```

Expected output:

```
✅ Seed complete!

  Email:    admin@example.com
  Password: changeme123!

Change the password after first login.
```

> The Supabase seed generates a random password printed once.
> The Firebase seed uses `SEED_ADMIN_PASSWORD` from `.env.local` (defaults to `changeme123!`).
> Change it after first login in both cases.

Running the seed again is safe — it detects the existing user and skips creation.

---

## Step 7 — Start the Development Server

```bash
npm run dev
```

| URL | What you see |
|---|---|
| `http://localhost:3000` | Public site (empty until you create pages) |
| `http://localhost:3000/admin` | Redirects to `/login` |

Log in with the credentials from Step 6.

---

## Step 8 — Deploy to Production

### Supabase + Vercel (recommended)

```bash
npm i -g vercel
vercel
# Follow prompts — add all .env.local vars as Vercel environment variables
```

### Firebase App Hosting

```bash
npx firebase apphosting:backends:create
npx firebase deploy
```

> Set secret env vars (`FIREBASE_PRIVATE_KEY`, etc.) in the Firebase App Hosting console
> under **Secrets** — do not put them in `apphosting.yaml`.

---

## Step 9 — GitHub Actions for Migrations (Supabase only)

### Scenario A — Standalone repo

```yaml
# .github/workflows/migrate.yml
name: Database Migrations
on:
  push:
    branches: [main]
    paths:
      - 'supabase/migrations/**'
jobs:
  migrate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
        with:
          version: latest
      - run: npx supabase db push --linked
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          SUPABASE_DB_PASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD }}
```

### Scenario B — Monorepo

```yaml
# .github/workflows/migrate-<project-name>.yml
name: Database Migrations — <project-name>
on:
  push:
    branches: [main]
    paths:
      - 'examples/<project-name>/supabase/migrations/**'
jobs:
  migrate:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: examples/<project-name>
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
        with:
          version: latest
      - run: npx supabase db push --linked
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          SUPABASE_DB_PASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD }}
```

---

## Project Structure Reference

### Supabase project

```
<project-name>/
├── supabase/
│   ├── config.toml
│   └── migrations/
│       └── 0001_cms_schema.sql
├── src/
│   ├── middleware.ts                 ← protects /admin/* with Supabase Auth
│   ├── app/
│   │   ├── [slug]/route.ts          ← public pages (draft preview via Supabase Auth)
│   │   ├── login/page.tsx
│   │   └── admin/                   ← full admin UI
│   └── lib/
│       ├── cms.ts                   ← new CMS(new DrizzleAdapter())
│       ├── supabase/                ← client.ts, server.ts, admin.ts
│       └── db/                      ← index.ts, schema.ts, adapter.ts
├── scripts/seed.ts
├── drizzle.config.ts
└── .env.local.example
```

### Firebase project

```
<project-name>/
├── firebase.json
├── apphosting.yaml
├── firestore.rules
├── firestore.indexes.json
├── storage.rules
├── src/
│   ├── middleware.ts                 ← protects /admin/* with Firebase session cookie
│   ├── app/
│   │   ├── [slug]/route.ts          ← public pages (draft preview via firebase-admin)
│   │   ├── login/page.tsx
│   │   ├── api/auth/session/        ← creates/destroys Firebase session cookie
│   │   └── admin/                   ← full admin UI (identical to Supabase)
│   └── lib/
│       ├── cms.ts                   ← new CMS(new FirebaseAdapter())
│       ├── firebase/                ← admin.ts (firebase-admin init), client.ts
│       └── db/adapter.ts            ← FirebaseAdapter implements StorageAdapter
├── scripts/seed.ts
└── .env.local.example
```

---

## Adding a New Migration (Supabase only)

```bash
# Write SQL manually: supabase/migrations/0002_<name>.sql
# OR generate from Drizzle schema changes:
npm run db:generate

# Apply immediately
npx supabase db push

# Or commit + push to main if GitHub connect / Actions are active
```

Never rename or edit already-applied migration files — Supabase tracks them by filename.

---

## Troubleshooting

### `EDUPLICATEWORKSPACE` on `npm install`

Two workspace packages share the same `name` field. Check `examples/` for duplicate or
leftover folders.

### `DATABASE_URL` connection refused (Supabase)

Use the **Session mode** connection string (port **5432**), not Transaction mode (port 6543).
Format: `postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres`

### `@cms/cms` not found after `npm install`

Scenario B only: run `npm install` from the **CMS monorepo root**, not from inside the project subfolder.

### Seed fails with env var errors

Make sure `.env.local` exists in the project directory and you are running the seed command
from **inside the project directory**.

### `ERR_TOO_MANY_REDIRECTS` on `/admin/login` (Supabase)

Clear browser cookies for `localhost`: Chrome → 🔒 icon → **Cookies** → delete all for localhost.

### Admin redirects to login after signing in (Firebase)

The session cookie (`__session`) is created by `POST /api/auth/session`. Check:
1. `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` are set in `.env.local`
2. The private key value has literal `\n` sequences (not real newlines) — the adapter handles the replacement
3. **Email/Password** provider is enabled in Firebase console → Authentication → Sign-in method

### Firestore permission denied (Firebase)

All CMS operations go through the Admin SDK server-side. If you see permission errors,
verify that `initAdmin()` is called before any Firestore access and that the service account
credentials are correct.

### Firebase Storage upload fails

Ensure `FIREBASE_STORAGE_BUCKET` matches the bucket shown in **Firebase console → Storage**
(usually `<project-id>.firebasestorage.app`). The bucket must exist before the first upload.
