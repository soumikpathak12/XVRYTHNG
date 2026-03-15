-- XVRYTHNG – Schedule inspection: store who will inspect the lead
-- Adds inspector_id to lead_site_inspections so we can link to employees.id.
-- Optional: if your DB already has this column (e.g. from xvrythng (4).sql), skip or ignore error.
--
-- Prerequisites: lead_site_inspections, employees tables exist.
-- Run in phpMyAdmin: select database xvrythng → SQL tab → run the statement below.

ALTER TABLE lead_site_inspections
  ADD COLUMN inspector_id INT(10) UNSIGNED DEFAULT NULL AFTER lead_id;

-- Optional FK (uncomment if you want referential integrity):
-- ALTER TABLE lead_site_inspections
--   ADD CONSTRAINT fk_siteinsp_inspector FOREIGN KEY (inspector_id) REFERENCES employees(id) ON DELETE SET NULL;
