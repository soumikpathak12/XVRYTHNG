-- 1) 
ALTER TABLE lead_site_inspections
  ADD COLUMN id_ai BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  ADD UNIQUE KEY uk_lsi_id_ai (id_ai);
-- 2) 
UPDATE lead_site_inspections
SET id = id_ai;
-- 3) 
ALTER TABLE lead_site_inspections
  DROP INDEX uk_lsi_id_ai,
  DROP COLUMN id_ai;
-- 4) 
ALTER TABLE lead_site_inspections
  ADD PRIMARY KEY (id);
ALTER TABLE lead_site_inspections
  MODIFY COLUMN id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT;