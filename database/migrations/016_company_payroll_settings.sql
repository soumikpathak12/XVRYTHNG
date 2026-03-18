-- 016_company_payroll_settings.sql
-- Per-company payroll settings (flat tax + overtime rules)

CREATE TABLE IF NOT EXISTS company_payroll_settings (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id INT UNSIGNED NOT NULL,
  flat_tax_rate DECIMAL(6,4) NOT NULL DEFAULT 0.2000,
  weekly_threshold DECIMAL(8,2) NOT NULL DEFAULT 40.00,
  fortnight_threshold DECIMAL(8,2) NOT NULL DEFAULT 80.00,
  overtime_multiplier DECIMAL(6,3) NOT NULL DEFAULT 1.500,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_company_payroll_settings_company (company_id),
  CONSTRAINT fk_company_payroll_settings_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed defaults for existing companies
INSERT IGNORE INTO company_payroll_settings (company_id)
SELECT id FROM companies;

