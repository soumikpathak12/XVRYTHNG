-- XVRYTHNG - Add support module and permissions for admin/staff access

-- Add support permission (if permissions table exists)
INSERT IGNORE INTO permissions (resource, action, description) VALUES
  ('support', 'view', 'View support tickets'),
  ('support', 'edit', 'Reply to and manage support tickets');

-- Create modules table if missing, then add support module
CREATE TABLE IF NOT EXISTS modules (
  key_name VARCHAR(80) NOT NULL PRIMARY KEY,
  display_name VARCHAR(150) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO modules (key_name, display_name) VALUES ('support', 'Support Tickets');

-- Add support to company_type_modules for solar_retailer and enterprise (if tables exist)
INSERT IGNORE INTO company_type_modules (company_type_id, module_key)
  SELECT id, 'support' FROM company_types WHERE name IN ('solar_retailer', 'enterprise');
