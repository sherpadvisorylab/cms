-- Page structure templates (used by "Save as Template" and "New from Template" features)
CREATE TABLE IF NOT EXISTS cms_page_templates (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  structure   JSONB NOT NULL DEFAULT '[]',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
