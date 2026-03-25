-- US-085: Per-company module toggles (JSON). NULL = all toggles default to enabled in app logic.
ALTER TABLE companies
  ADD COLUMN enabled_modules JSON NULL DEFAULT NULL
  COMMENT 'Feature toggles: sales, on_field, project_management, operations, customer_portal, communications';
