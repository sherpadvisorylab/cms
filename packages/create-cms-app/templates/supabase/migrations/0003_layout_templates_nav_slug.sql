-- Migration: layout templates + navigation slug
-- Adds slug column to navigations and creates layout_templates table

ALTER TABLE cms_navigations ADD COLUMN IF NOT EXISTS slug text DEFAULT '';

CREATE TABLE IF NOT EXISTS cms_layout_templates (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text DEFAULT '',
  type text NOT NULL,
  html text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
