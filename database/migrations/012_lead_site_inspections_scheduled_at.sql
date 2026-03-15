-- Store scheduled inspection date/time on lead_site_inspections (in addition to leads.site_inspection_date).
-- Run in phpMyAdmin: select database → SQL tab → run the statement below.

ALTER TABLE lead_site_inspections
  ADD COLUMN scheduled_at DATETIME DEFAULT NULL AFTER inspector_name;
