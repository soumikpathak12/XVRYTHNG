-- Store site inspection template fields in a dedicated JSON column (not nested in additional_notes).
ALTER TABLE `lead_site_inspections`
  ADD COLUMN `form_data_json` LONGTEXT DEFAULT NULL COMMENT 'Inspection form fields JSON (_t,_v,...)' AFTER `additional_notes`;

-- One-time backfill from legacy additional_notes (object-shaped JSON only).
UPDATE `lead_site_inspections`
SET `form_data_json` = `additional_notes`
WHERE (`form_data_json` IS NULL OR `form_data_json` = '')
  AND `additional_notes` IS NOT NULL
  AND TRIM(`additional_notes`) LIKE '{%';
