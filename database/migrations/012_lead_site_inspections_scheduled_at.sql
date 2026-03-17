ALTER TABLE lead_site_inspections
  ADD COLUMN scheduled_at DATETIME DEFAULT NULL AFTER inspector_name;
