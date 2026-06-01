# Vertical Project Setup Guide

This guide walks you through creating a new vertical project that consumes the CMS packages.
Follow every step in order. At the end you will have a running Next.js app with a protected
admin area, backed by Supabase Postgres and ready for GitHub-connected auto-migrations.

---

## Two Scenarios

Every step in this guide that involves paths or commands splits into two scenarios.
**Pick one and follow it consistently throughout.**

| | Scenario A — Standalone repo | Scenario B — Inside the CMS monorepo |
|---|---|---|
| **When to use** | Real vertical project with its own git repo | Development / examples inside the CMS repo |
| **Example path** | `~/projects/<project-name>/` | `cms/examples/<project-name>/` |
| **`@cms/*` deps** | Published npm packages | Resolved from local workspace |
| **`npm install`** | From the project root | From the CMS monorepo root |
| **GitHub repo** | Dedicated repo for the vertical project | The CMS monorepo (`sherpadvisorylab/cms`) |

Throughout this guide, replace `<project-name>` with your actual project name (e.g. `sandbox`, `acme-site`).

---

## Prerequisites

| Tool | Version | Check |
|------|---------|-------|
| Node.js | ≥ 18.18 | `node -v` |
| npm | ≥ 9 | `npm -v` |
| Supabase CLI | latest | `npx supabase --version` |
| Git | any | `git --version` |

You also need:
- A [Supabase](https://supabase.com) account (free tier is fine)
- A GitHub account with access to the target repository

---

## Architecture Overview

```
CMS monorepo (this repo)          Vertical project (your new repo)
──────────────────────────        ────────────────────────────────────
packages/
  @cms/domain          ──────────▶  dependencies in package.json
  @cms/infrastructure  ──────────▶  imported via @cms/cms
  @cms/form-generator  ──────────▶
  @cms/cms             ──────────▶  new CMS(new DrizzleAdapter())

packages/create-cms-app           npx @cms/create-cms-app <project-name>
  └─ templates/        ──────────▶  scaffolded project files
```

Every vertical project:
- Has its **own Supabase project** (its own Postgres database)
- Has its **own GitHub repository** connected to Supabase for auto-migrations
- Implements `DrizzleAdapter` (scaffolded for you) to connect the CMS to Postgres
- Uses `Supabase Auth` to protect the `/admin` area

---

## Step 1 — Create the Supabase Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**
2. Choose your organisation
3. **Connect GitHub** — click **Connect GitHub**, authorise Supabase, and select the target repository:
   - **Scenario A:** your dedicated vertical project repo
   - **Scenario B:** the CMS monorepo (`sherpadvisorylab/cms`)
4. Fill in:
   - **Project name** — matches `<project-name>` for clarity
   - **Database password** — generate a strong one and **save it** (needed for `DATABASE_URL`)
   - **Region** — closest to your users
5. Click **Create new project** and wait ~2 minutes

### Collect the credentials

Once the project is ready, open **Project Settings → API**:

| Variable | Where to find it |
|----------|-----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Settings → API → anon / public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Settings → API → service_role key (**keep secret**) |

Open **Project Settings → Database → Connection string → URI** (Session mode, port 5432):

| Variable | Where to find it |
|----------|-----------------|
| `DATABASE_URL` | Connection string (URI) — replace `[YOUR-PASSWORD]` with the password saved above |

> **Security note:** `SUPABASE_SERVICE_ROLE_KEY` has full admin rights.
> It is only used in the seed script and must **never** be exposed to the browser or committed to git.

---

## Step 2 — Scaffold the Project

### Scenario A — Standalone repo

```bash
# From anywhere on your machine
npx @cms/create-cms-app <project-name>

cd <project-name>
npm install
```

### Scenario B — Inside the CMS monorepo

> Run these commands from the **CMS monorepo root** — the directory that contains the root
> `package.json`. Never run them from inside a subfolder.

```bash
# From the CMS monorepo root
npx tsx packages/create-cms-app/src/index.ts examples/<project-name> --workspace

# Install all workspace dependencies (from the monorepo root, not from the project subfolder)
npm install
```

The `--workspace` flag makes the scaffolder:
- Set `"@cms/cms": "*"` so npm resolves it from the local workspace
- Add `examples/*` to the root `package.json` workspaces automatically

---

## Step 3 — Configure Environment Variables

### Scenario A

```bash
cd <project-name>
cp .env.local.example .env.local
```

### Scenario B

```bash
cd examples/<project-name>
cp .env.local.example .env.local
```

---

Open `.env.local` and fill in the four values from Step 1:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
DATABASE_URL=postgresql://postgres.<project-ref>:<db-password>@aws-0-<region>.pooler.supabase.com:5432/postgres
```

> `.env.local` is listed in `.gitignore` — it will never be committed.

---

## Step 4 — Apply the Database Migrations

The scaffolded project includes `supabase/migrations/0001_cms_schema.sql` which creates
all 12 CMS tables in your Supabase Postgres database.

### Option 4a — Supabase CLI (immediate)

Run from **inside the project directory**:

```bash
# One-time: authenticate the CLI with your Supabase account (opens the browser)
npx supabase login

# One-time: link to the remote Supabase project
npx supabase link --project-ref <project-ref>

# Push all migrations
npx supabase db push
```

`<project-ref>` is the subdomain of your Supabase URL: `https://<project-ref>.supabase.co`

### Option 4b — GitHub connect (automatic on push)

Supabase applies migrations automatically when you push to the configured branch.

#### Configure the GitHub Integration in Supabase

Go to **Supabase dashboard → Project Settings → Integrations → GitHub**.

Check and set the following:

| Setting | Scenario A | Scenario B |
|---------|-----------|-----------|
| **GitHub Repository** | your vertical project repo | CMS monorepo (`sherpadvisorylab/cms`) |
| **Working directory** | `.` | `examples/<project-name>` |
| **Deploy to production** | ✅ **must be ON** | ✅ **must be ON** |
| **Production branch name** | `main` | `main` |

> **Working directory** tells Supabase where to find the `supabase/` folder relative to the
> repo root. If it points to the wrong folder, no migrations will be detected.
>
> **Deploy to production** must be enabled or pushes to `main` will have no effect.

#### Commit and push

Run from the **git repository root** (i.e. the repo root, not the project subfolder):

```bash
# Scenario A — standalone repo
git add supabase/migrations/0001_cms_schema.sql

# Scenario B — monorepo
git add examples/<project-name>/supabase/migrations/0001_cms_schema.sql

git commit -m "feat: initial CMS schema"
git push origin main
```

Supabase will apply the migration within seconds. Monitor it in
**Supabase dashboard → Database → Migrations**.

### Verify

In the Supabase dashboard go to **Table Editor** — you should see all `cms_*` tables.

---

## Step 5 — Create the Storage Bucket

The CMS admin uses Supabase Storage to upload images (logos, favicon, component previews).
You need to create a public bucket named `cms-assets` once per project.

1. Open your Supabase dashboard → **Storage**
2. Click **New bucket**
3. Name: `cms-assets`
4. Toggle **Public bucket** → ON
5. Click **Save**

> The CMS engine stores only the resulting public URL — it never reads or writes to Storage
> directly. The browser uploads the file and receives the public URL, which is then saved
> to the CMS settings or component record.

---

## Step 6 — Seed the Admin User

Run from **inside the project directory**:

```bash
# Scenario A
cd <project-name>

# Scenario B
cd examples/<project-name>

npm run db:seed
```

Expected output:

```
Seeding <project-name>...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Admin user created — save these credentials:
  Email:    admin@<project-name>.local
  Password: <generated-password>
  These will NOT be shown again.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Bootstrapping CMS defaults...
Done. CMS bootstrapped with default area, menus, and settings.
```

> **Save the password now.** Generated with `crypto.randomBytes`, printed once.
> If you lose it, reset it from **Supabase dashboard → Authentication → Users**.

Running `db:seed` again is safe — it detects the existing user and skips creation.

---

## Step 7 — Start the Development Server

Run from **inside the project directory**:

```bash
# Scenario A
cd <project-name>

# Scenario B
cd examples/<project-name>

npm run dev
```

| URL | What you see |
|-----|-------------|
| `http://localhost:3000` | Public site (empty until you create pages) |
| `http://localhost:3000/admin` | Redirects to `/admin/login` |

Log in with the credentials from Step 5. You should see the admin dashboard.

---

## Step 8 — GitHub Actions for Migrations (optional)

Alternative to the Supabase GitHub connect UI: a GitHub Actions workflow gives you
more control (e.g. run only on certain paths, add approval steps).

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

Add to your GitHub repository secrets:
- `SUPABASE_ACCESS_TOKEN` — from [supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens)
- `SUPABASE_DB_PASSWORD` — the database password saved in Step 1

---

## Project Structure Reference

```
<project-name>/
├── supabase/
│   ├── config.toml                   ← Supabase local dev config
│   └── migrations/
│       └── 0001_cms_schema.sql       ← all 12 CMS tables
├── src/
│   ├── middleware.ts                 ← protects /admin/* with Supabase Auth
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                  ← public home (renders CMS "home" page)
│   │   ├── [slug]/page.tsx           ← dynamic public pages
│   │   └── admin/
│   │       ├── layout.tsx            ← sidebar shell (auth-guarded)
│   │       ├── page.tsx              ← dashboard
│   │       └── login/page.tsx
│   └── lib/
│       ├── cms.ts                    ← CMS singleton (new CMS(new DrizzleAdapter()))
│       ├── supabase/
│       │   ├── client.ts             ← browser Supabase client
│       │   └── server.ts             ← server Supabase client (RSC / middleware)
│       └── db/
│           ├── index.ts              ← Drizzle db instance
│           ├── schema.ts             ← Drizzle schema (mirrors SQL migration)
│           └── adapter.ts            ← DrizzleAdapter implements StorageAdapter
├── scripts/
│   └── seed.ts                       ← creates admin user + CMS bootstrap
├── .env.local.example
├── drizzle.config.ts
├── next.config.ts                    ← transpiles @cms/* workspace packages
└── package.json
```

---

## Adding a New Migration

Always run from **inside the project directory**.

```bash
# Option 1: write SQL manually
# Scenario A:  supabase/migrations/0002_<name>.sql
# Scenario B:  examples/<project-name>/supabase/migrations/0002_<name>.sql

# Option 2: generate from Drizzle schema changes
# After editing src/lib/db/schema.ts:
npm run db:generate   # writes a new file to supabase/migrations/

# Apply immediately
npx supabase db push

# Or commit and push to main if GitHub connect / Actions are active
```

Never rename or edit already-applied migration files — Supabase tracks them by filename.

---

## Troubleshooting

### `EDUPLICATEWORKSPACE` on `npm install`

Two workspace packages share the same `name` field. Check `examples/` for duplicate or
leftover folders and remove them.

### `DATABASE_URL` connection refused

Use the **Session mode** connection string (port **5432**), not Transaction mode (port 6543).
Format: `postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres`

### `@cms/cms` not found after `npm install`

Scenario B only: run `npm install` from the **CMS monorepo root**, not from inside the project subfolder.

### Seed fails with "DATABASE_URL environment variable is not set"

The seed script loads `.env.local` with `dotenv`. Make sure:
- The file `.env.local` exists in the project directory and contains `DATABASE_URL`
- You are running `npm run db:seed` from **inside the project directory**, not from the monorepo root

### Seed fails with "Invalid API key"

`SUPABASE_SERVICE_ROLE_KEY` must be the **service_role** key, not the anon key.

### `ERR_TOO_MANY_REDIRECTS` on `/admin/login`

This should not happen with the current middleware, which calls `supabase.auth.signOut()`
automatically when `getUser()` returns an error, clearing any stale cookie before redirecting.

If it still occurs (e.g. after upgrading Supabase packages), clear browser cookies for
`localhost` manually: Chrome address bar → 🔒 icon → **Cookies** → delete all for localhost.

### Admin redirects to login even after signing in

Usually a missing or incorrect `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
Check `.env.local` and restart the dev server.

### Migrations not applied after push (GitHub connect)

Verify in **Project Settings → Integrations → GitHub**:
- **Working directory** points to the correct folder (see Step 4)
- **Deploy to production** is **ON**
- **Production branch name** matches the branch you pushed to
