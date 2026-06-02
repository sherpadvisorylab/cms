ALTER TABLE cms_components
  DROP CONSTRAINT IF EXISTS cms_components_status_check;

UPDATE cms_components
SET status = 'draft'
WHERE status NOT IN ('draft', 'published');

ALTER TABLE cms_components
  ALTER COLUMN status SET DEFAULT 'draft';

ALTER TABLE cms_components
  ADD CONSTRAINT cms_components_status_check
  CHECK (status IN ('draft', 'published'));
