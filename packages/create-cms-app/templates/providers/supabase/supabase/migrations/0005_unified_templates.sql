ALTER TABLE cms_templates ADD COLUMN IF NOT EXISTS type text;
ALTER TABLE cms_templates ADD COLUMN IF NOT EXISTS html text NOT NULL DEFAULT '';
ALTER TABLE cms_templates ADD COLUMN IF NOT EXISTS css text;
ALTER TABLE cms_templates ADD COLUMN IF NOT EXISTS js text;
ALTER TABLE cms_templates ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

UPDATE cms_templates
SET type = COALESCE(NULLIF(type, ''), 'page'),
    css = COALESCE(css, NULL),
    js = COALESCE(js, NULL),
    updated_at = COALESCE(updated_at, created_at, now());

ALTER TABLE cms_templates ALTER COLUMN type SET DEFAULT 'page';
ALTER TABLE cms_templates ALTER COLUMN type SET NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'cms_layout_templates'
  ) THEN
    INSERT INTO cms_templates (id, name, description, type, html, css, js, structure, created_at, updated_at)
    SELECT
      id,
      name,
      description,
      CASE type
        WHEN 'head' THEN 'area_head'
        WHEN 'body' THEN 'area_body'
        ELSE 'navigation'
      END,
      html,
      NULL,
      NULL,
      '[]'::jsonb,
      created_at,
      COALESCE(updated_at, created_at, now())
    FROM cms_layout_templates
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'cms_page_templates'
  ) THEN
    INSERT INTO cms_templates (id, name, description, type, html, css, js, structure, created_at, updated_at)
    SELECT
      id,
      name,
      NULL,
      'page',
      '',
      NULL,
      NULL,
      structure,
      created_at,
      COALESCE(created_at, now())
    FROM cms_page_templates
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

DROP TABLE IF EXISTS cms_layout_templates;
DROP TABLE IF EXISTS cms_page_templates;
