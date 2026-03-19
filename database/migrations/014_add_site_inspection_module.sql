-- Add module: site_inspection (for Job Role module toggles)
-- Safe to run multiple times.

INSERT IGNORE INTO modules (key_name, display_name)
VALUES ('site_inspection', 'Site Inspection');

-- Enable this module for all company types by default (so it can be toggled per role).
INSERT IGNORE INTO company_type_modules (company_type_id, module_key)
SELECT ct.id, 'site_inspection'
FROM company_types ct;

