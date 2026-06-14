-- Migration: Add i18n locale fields to pages and areas
-- Phase: 0006

-- Add locale fields to cms_pages
ALTER TABLE cms_pages
  ADD COLUMN IF NOT EXISTS locale TEXT,
  ADD COLUMN IF NOT EXISTS translation_key TEXT;

-- Add locale config to cms_areas
ALTER TABLE cms_areas
  ADD COLUMN IF NOT EXISTS default_locale TEXT,
  ADD COLUMN IF NOT EXISTS supported_locales JSONB;

-- Indexes for efficient locale-filtered page queries
CREATE INDEX IF NOT EXISTS idx_cms_pages_area_locale
  ON cms_pages (area, locale);

CREATE INDEX IF NOT EXISTS idx_cms_pages_area_locale_status
  ON cms_pages (area, locale, status);

CREATE INDEX IF NOT EXISTS idx_cms_pages_translation_key
  ON cms_pages (translation_key)
  WHERE translation_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cms_pages_translation_key_status
  ON cms_pages (translation_key, status)
  WHERE translation_key IS NOT NULL;
