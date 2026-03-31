-- Site inspection form JSON can exceed MySQL TEXT (64KB); use LONGTEXT for drafts/submits with many fields/photos metadata.
ALTER TABLE `lead_site_inspections`
  MODIFY COLUMN `additional_notes` LONGTEXT DEFAULT NULL;
