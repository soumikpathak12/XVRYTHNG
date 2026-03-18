-- FK for inspector_id (run after 011; safe if column already exists).
ALTER TABLE lead_site_inspections
  ADD KEY idx_lead_site_inspections_inspector (inspector_id),
  ADD CONSTRAINT fk_lead_site_inspections_inspector
    FOREIGN KEY (inspector_id) REFERENCES employees (id) ON DELETE SET NULL ON UPDATE CASCADE;
