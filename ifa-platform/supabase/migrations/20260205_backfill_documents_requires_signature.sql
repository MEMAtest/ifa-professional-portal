-- Backfill requires_signature for signable document types
-- Signable: suitability (full report), ATR, CFL, and service agreements

UPDATE documents
SET requires_signature = true
WHERE requires_signature IS DISTINCT FROM true
  AND (
    -- Explicit document types
    document_type ILIKE 'suitability_report'
    OR document_type ILIKE 'atr_report'
    OR document_type ILIKE 'cfl_report'
    OR document_type ILIKE 'client_agreement'
    OR document_type ILIKE 'fee_agreement'
    OR document_type ILIKE 'service_agreement'
    OR document_type ILIKE 'terms_of_service'
    -- Assessment report variants (stored in `type`)
    OR type ILIKE 'suitability_full%'
    OR type ILIKE 'atr_%'
    OR type ILIKE 'cfl_%'
    -- Agreements by category label
    OR (category ILIKE '%agreement%' AND category IS NOT NULL)
  );
