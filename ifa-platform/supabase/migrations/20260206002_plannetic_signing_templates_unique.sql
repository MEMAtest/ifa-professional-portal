-- ================================================================
-- Prevent duplicate Plannetic signing templates per firm
--
-- Rationale:
-- - Standard templates are provisioned on-demand (idempotent install).
-- - Concurrent installs can race and insert duplicate rows.
-- - Downstream code often expects at most one template per assessment_type.
-- ================================================================

-- If a previous race produced duplicates, keep the newest row and delete the rest.
WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY firm_id, assessment_type
      ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
    ) AS rn
  FROM document_templates
  WHERE assessment_type LIKE 'plannetic_%'
)
DELETE FROM document_templates dt
USING ranked r
WHERE dt.id = r.id
  AND r.rn > 1;

-- Enforce one template per firm per Plannetic assessment_type.
CREATE UNIQUE INDEX IF NOT EXISTS idx_document_templates_plannetic_firm_assessment_type
  ON document_templates (firm_id, assessment_type)
  WHERE assessment_type LIKE 'plannetic_%';

