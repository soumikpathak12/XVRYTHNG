-- Adds template fields to lead_site_inspections (safe/idempotent)

ALTER TABLE lead_site_inspections
  ADD COLUMN IF NOT EXISTS template_key VARCHAR(64) DEFAULT NULL AFTER additional_notes,
  ADD COLUMN IF NOT EXISTS template_version INT DEFAULT NULL AFTER template_key;

-- Optional backfill (requires MySQL 5.7+/8.0 JSON functions and valid JSON in additional_notes)
-- UPDATE lead_site_inspections
-- SET
--   template_key = COALESCE(
--     template_key,
--     NULLIF(JSON_UNQUOTE(JSON_EXTRACT(additional_notes, '$._t')), '')
--   ),
--   template_version = COALESCE(
--     template_version,
--     CAST(JSON_UNQUOTE(JSON_EXTRACT(additional_notes, '$._v')) AS UNSIGNED)
--   )
-- WHERE additional_notes IS NOT NULL;

