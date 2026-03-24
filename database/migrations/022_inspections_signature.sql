-- Add customer sign-off fields to lead_site_inspections table
ALTER TABLE `lead_site_inspections`
ADD COLUMN `customer_name` varchar(120) DEFAULT NULL AFTER `inspector_name`,
ADD COLUMN `signature_url` varchar(255) DEFAULT NULL AFTER `customer_name`,
ADD COLUMN `customer_notes` text DEFAULT NULL AFTER `signature_url`;

-- Add index on customer_name for faster lookups
ALTER TABLE `lead_site_inspections`
ADD INDEX `idx_customer_name` (`customer_name`);
