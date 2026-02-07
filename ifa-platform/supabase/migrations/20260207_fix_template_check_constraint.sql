-- Drop the outdated check constraint that blocks plannetic_* assessment types.
-- The valid_template_assessment_type CHECK was created before Plannetic signing
-- templates (prefixed plannetic_*) were added, causing inserts to fail with:
--   "new row for relation "document_templates" violates check constraint "valid_template_assessment_type""
ALTER TABLE document_templates DROP CONSTRAINT IF EXISTS valid_template_assessment_type;
