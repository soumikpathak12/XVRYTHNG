-- Idempotent SQL migration for shared resource library
-- Usage:
--   USE your_database_name;
--   SOURCE backend/database/migrate-resource-library.sql;

CREATE TABLE IF NOT EXISTS resource_library_items (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  company_id INT UNSIGNED NULL,
  created_by INT UNSIGNED NOT NULL,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'sticker',
  section_name VARCHAR(120) NOT NULL DEFAULT 'General',
  resource_type VARCHAR(20) NOT NULL DEFAULT 'photo',
  image_url VARCHAR(1000) NULL,
  link_url VARCHAR(1000) NULL,
  notes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_resource_company (company_id),
  INDEX idx_resource_category (category),
  INDEX idx_resource_created_by (created_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE resource_library_items
  ADD COLUMN IF NOT EXISTS section_name VARCHAR(120) NOT NULL DEFAULT 'General' AFTER category;
