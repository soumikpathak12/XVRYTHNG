-- XVRYTHNG - Multi-tenant company setup
-- Run after schema.sql. Ensures tenant isolation: all tenant data keyed by company_id.

-- ---------------------------------------------------------------------------
-- Company types (determines available modules)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS company_types (
  id TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_company_types_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO company_types (name, description) VALUES
  ('solar_retailer', 'Solar retailer – full CRM, projects, field'),
  ('installer', 'Installer – projects and field only'),
  ('enterprise', 'Enterprise – all modules')
ON DUPLICATE KEY UPDATE description = VALUES(description);

-- ---------------------------------------------------------------------------
-- Modules (keys used for feature flags per company type)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS company_type_modules (
  company_type_id TINYINT UNSIGNED NOT NULL,
  module_key VARCHAR(80) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (company_type_id, module_key),
  FOREIGN KEY (company_type_id) REFERENCES company_types(id) ON DELETE CASCADE,
  INDEX idx_ctm_module (module_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO company_type_modules (company_type_id, module_key)
SELECT id, 'leads' FROM company_types WHERE name = 'solar_retailer'
UNION ALL SELECT id, 'projects' FROM company_types WHERE name = 'solar_retailer'
UNION ALL SELECT id, 'on_field' FROM company_types WHERE name = 'solar_retailer'
UNION ALL SELECT id, 'operations' FROM company_types WHERE name = 'solar_retailer'
UNION ALL SELECT id, 'attendance' FROM company_types WHERE name = 'solar_retailer'
UNION ALL SELECT id, 'referrals' FROM company_types WHERE name = 'solar_retailer'
UNION ALL SELECT id, 'messages' FROM company_types WHERE name = 'solar_retailer'
UNION ALL SELECT id, 'projects' FROM company_types WHERE name = 'installer'
UNION ALL SELECT id, 'on_field' FROM company_types WHERE name = 'installer'
UNION ALL SELECT id, 'operations' FROM company_types WHERE name = 'installer'
UNION ALL SELECT id, 'leads' FROM company_types WHERE name = 'enterprise'
UNION ALL SELECT id, 'projects' FROM company_types WHERE name = 'enterprise'
UNION ALL SELECT id, 'on_field' FROM company_types WHERE name = 'enterprise'
UNION ALL SELECT id, 'operations' FROM company_types WHERE name = 'enterprise'
UNION ALL SELECT id, 'attendance' FROM company_types WHERE name = 'enterprise'
UNION ALL SELECT id, 'referrals' FROM company_types WHERE name = 'enterprise'
UNION ALL SELECT id, 'messages' FROM company_types WHERE name = 'enterprise'
ON DUPLICATE KEY UPDATE company_type_id = company_type_id;

-- ---------------------------------------------------------------------------
-- Extend companies: ABN, contact details, company type (tenant isolation)
-- Each company has unique tenant ID = companies.id
-- Run each ALTER once; for idempotent migration use: node backend/database/migrate-multi-tenant.js
-- ---------------------------------------------------------------------------
-- ALTER TABLE companies ADD COLUMN abn VARCHAR(20) NULL;
-- ALTER TABLE companies ADD COLUMN contact_email VARCHAR(255) NULL;
-- ALTER TABLE companies ADD COLUMN contact_phone VARCHAR(50) NULL;
-- ALTER TABLE companies ADD COLUMN address_line1 VARCHAR(255) NULL;
-- ALTER TABLE companies ADD COLUMN address_line2 VARCHAR(255) NULL;
-- ALTER TABLE companies ADD COLUMN city VARCHAR(100) NULL;
-- ALTER TABLE companies ADD COLUMN state VARCHAR(100) NULL;
-- ALTER TABLE companies ADD COLUMN postcode VARCHAR(20) NULL;
-- ALTER TABLE companies ADD COLUMN country VARCHAR(100) NULL DEFAULT 'Australia';
-- ALTER TABLE companies ADD COLUMN company_type_id TINYINT UNSIGNED NULL;
-- ALTER TABLE companies ADD CONSTRAINT fk_companies_type FOREIGN KEY (company_type_id) REFERENCES company_types(id) ON DELETE SET NULL;
