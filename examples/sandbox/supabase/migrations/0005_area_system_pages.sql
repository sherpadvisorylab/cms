-- Add system_pages column to cms_areas for system page assignments (home, 404, etc.)
ALTER TABLE cms_areas ADD COLUMN IF NOT EXISTS system_pages JSONB NOT NULL DEFAULT '{}';
