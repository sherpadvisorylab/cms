-- CMS Schema
-- Generated from @cms/domain TypeScript entities.
-- Apply via: npx supabase db push
-- or via GitHub connect (Supabase auto-deploys on push to main).

-- ── Areas ────────────────────────────────────────────────────────────────────
-- Top-level multi-tenant containers. Each vertical project can have
-- multiple areas (e.g. "Public", "Members", "Blog").
CREATE TABLE IF NOT EXISTS cms_areas (
  id            TEXT        PRIMARY KEY,
  name          TEXT        NOT NULL UNIQUE,
  display_name  TEXT        NOT NULL DEFAULT '',
  description   TEXT,
  badge_color   TEXT,
  icon          TEXT,
  site_name     TEXT,
  root_path     TEXT        NOT NULL DEFAULT '/',
  status        TEXT        NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active', 'inactive')),
  pages_count   INTEGER     DEFAULT 0,
  style         JSONB       DEFAULT '{}',
  design        JSONB       DEFAULT '{}',
  legal         JSONB       DEFAULT '{}',
  tracking      JSONB       DEFAULT '{}',
  access_policy JSONB       DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Pages ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cms_pages (
  id              TEXT        PRIMARY KEY,
  area            TEXT        NOT NULL,
  slug            TEXT        NOT NULL,
  title           TEXT        NOT NULL,
  parent_id       TEXT,
  status          TEXT        NOT NULL DEFAULT 'draft'
                              CHECK (status IN ('draft', 'published', 'archived')),
  structure       JSONB       DEFAULT '[]',
  content         JSONB       DEFAULT '{}',
  seo             JSONB       DEFAULT '{}',
  style           JSONB       DEFAULT '{}',
  seo_title       TEXT,
  seo_description TEXT,
  og_image_url    TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (area, slug)
);

-- ── Page Versions ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cms_page_versions (
  id           TEXT        PRIMARY KEY,
  page_id      TEXT        NOT NULL REFERENCES cms_pages(id) ON DELETE CASCADE,
  version      INTEGER     NOT NULL DEFAULT 1,
  structure    JSONB       DEFAULT '[]',
  content      JSONB       DEFAULT '{}',
  published_at TIMESTAMPTZ,
  created_by   TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── Components ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cms_components (
  id                TEXT        PRIMARY KEY,
  name              TEXT        NOT NULL,
  namespace         TEXT,
  type              TEXT        NOT NULL DEFAULT 'page'
                                CHECK (type IN ('page', 'ui', 'navigation')),
  category          TEXT,
  description       TEXT,
  status            TEXT        NOT NULL DEFAULT 'active'
                                CHECK (status IN ('active', 'inactive')),
  preview_image_url TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ── Component Versions ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cms_component_versions (
  id           TEXT        PRIMARY KEY,
  component_id TEXT        NOT NULL REFERENCES cms_components(id) ON DELETE CASCADE,
  version      INTEGER     NOT NULL DEFAULT 1,
  template_liquid TEXT     DEFAULT '',
  schema       JSONB       DEFAULT '[]',
  css          TEXT        DEFAULT '',
  js           TEXT        DEFAULT '',
  created_by   TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── Menus ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cms_menus (
  id              TEXT PRIMARY KEY,
  key             TEXT NOT NULL UNIQUE,
  label           TEXT NOT NULL,
  template_liquid TEXT DEFAULT '',
  items           JSONB DEFAULT '[]'
);

-- ── Navigations ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cms_navigations (
  id             TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  items          JSONB DEFAULT '[]',
  template       TEXT DEFAULT '',
  additional_css TEXT DEFAULT '',
  additional_js  TEXT DEFAULT ''
);

-- ── Templates (page templates) ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cms_templates (
  id          TEXT        PRIMARY KEY,
  name        TEXT        NOT NULL,
  description TEXT,
  structure   JSONB       DEFAULT '[]',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Email Templates ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cms_email_templates (
  id           TEXT        PRIMARY KEY,
  template_key TEXT        NOT NULL UNIQUE,
  name         TEXT        NOT NULL,
  description  TEXT,
  subject      TEXT        NOT NULL DEFAULT '',
  body         TEXT        NOT NULL DEFAULT '',
  variables    JSONB       DEFAULT '[]',
  is_system    BOOLEAN     DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── Forms ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cms_forms (
  id       TEXT PRIMARY KEY,
  name     TEXT NOT NULL,
  variable TEXT NOT NULL UNIQUE,
  schema   JSONB DEFAULT '{}'
);

-- ── Settings (singleton row, id = 'global') ───────────────────────────────────
CREATE TABLE IF NOT EXISTS cms_settings (
  id                       TEXT  PRIMARY KEY DEFAULT 'global',
  branding                 JSONB DEFAULT '{}',
  authentication           JSONB DEFAULT '{}',
  email_defaults           JSONB DEFAULT '{}',
  system_variable_defaults JSONB DEFAULT '{}',
  custom_variable_keys     JSONB DEFAULT '[]'
);

-- ── Users ─────────────────────────────────────────────────────────────────────
-- CMS-level user profiles (linked to Supabase Auth by email).
CREATE TABLE IF NOT EXISTS cms_users (
  id         TEXT        PRIMARY KEY,
  name       TEXT        NOT NULL,
  email      TEXT        NOT NULL UNIQUE,
  role       TEXT        NOT NULL DEFAULT 'editor'
                         CHECK (role IN ('admin', 'editor', 'viewer')),
  status     TEXT        NOT NULL DEFAULT 'active'
                         CHECK (status IN ('active', 'inactive', 'invited')),
  company    TEXT,
  last_login TIMESTAMPTZ
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_cms_pages_area        ON cms_pages (area);
CREATE INDEX IF NOT EXISTS idx_cms_pages_area_slug   ON cms_pages (area, slug);
CREATE INDEX IF NOT EXISTS idx_cms_pages_status      ON cms_pages (status);
CREATE INDEX IF NOT EXISTS idx_cms_page_versions_pid ON cms_page_versions (page_id);
CREATE INDEX IF NOT EXISTS idx_cms_comp_ver_cid      ON cms_component_versions (component_id);
CREATE INDEX IF NOT EXISTS idx_cms_users_email       ON cms_users (email);
