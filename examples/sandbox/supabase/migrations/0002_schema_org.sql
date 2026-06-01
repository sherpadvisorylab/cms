-- CR-003: Schema.org / JSON-LD support
-- Migration 0002 — adds schema fields to component_versions and a new page_schema table.

-- 1. Add schema_org_template to component versions
ALTER TABLE cms_component_versions
  ADD COLUMN IF NOT EXISTS schema_org_template TEXT DEFAULT '';

-- 2. New table for per-page schema config (custom blocks + per-component overrides)
CREATE TABLE IF NOT EXISTS cms_page_schema (
  id            TEXT        PRIMARY KEY,
  page_id       TEXT        NOT NULL REFERENCES cms_pages(id) ON DELETE CASCADE,
  custom_blocks JSONB       DEFAULT '[]',
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cms_page_schema_page
  ON cms_page_schema (page_id);
