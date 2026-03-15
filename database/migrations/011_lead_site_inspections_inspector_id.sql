ALTER TABLE lead_site_inspections
  ADD COLUMN inspector_id INT(10) UNSIGNED DEFAULT NULL AFTER lead_id;
