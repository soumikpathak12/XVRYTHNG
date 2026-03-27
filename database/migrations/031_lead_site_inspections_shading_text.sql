-- Allow free-text shading notes from Site Inspection form.
ALTER TABLE lead_site_inspections
  MODIFY COLUMN shading VARCHAR(255) NULL DEFAULT NULL;
