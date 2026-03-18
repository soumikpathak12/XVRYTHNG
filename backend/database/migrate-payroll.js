import db from '../src/config/db.js';

const payrollRunsSql = `
CREATE TABLE IF NOT EXISTS payroll_runs (
  id int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  company_id int(10) UNSIGNED NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  period_type enum('weekly','fortnightly','monthly') NOT NULL DEFAULT 'monthly',
  status enum('draft','processed','paid') NOT NULL DEFAULT 'draft',
  total_payroll_amount decimal(12,2) DEFAULT 0.00,
  total_employees int(10) UNSIGNED DEFAULT 0,
  total_hours decimal(10,2) DEFAULT 0.00,
  overtime_hours decimal(10,2) DEFAULT 0.00,
  created_by int(10) UNSIGNED NOT NULL,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_payroll_runs_company (company_id),
  KEY idx_payroll_runs_period (period_start, period_end),
  KEY idx_payroll_runs_status (status),
  CONSTRAINT fk_payroll_runs_company FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE CASCADE,
  CONSTRAINT fk_payroll_runs_created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

const payrollDetailsSql = `
CREATE TABLE IF NOT EXISTS payroll_details (
  id int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  payroll_run_id int(10) UNSIGNED NOT NULL,
  employee_id int(10) UNSIGNED NOT NULL,
  regular_hours decimal(8,2) DEFAULT 0.00,
  overtime_hours decimal(8,2) DEFAULT 0.00,
  hourly_rate decimal(8,2) DEFAULT 0.00,
  overtime_rate decimal(8,2) DEFAULT 0.00,
  gross_pay decimal(10,2) DEFAULT 0.00,
  deductions decimal(10,2) DEFAULT 0.00,
  net_pay decimal(10,2) DEFAULT 0.00,
  tax_deductions decimal(10,2) DEFAULT 0.00,
  other_deductions decimal(10,2) DEFAULT 0.00,
  notes text,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_payroll_details_run (payroll_run_id),
  KEY idx_payroll_details_employee (employee_id),
  CONSTRAINT fk_payroll_details_run FOREIGN KEY (payroll_run_id) REFERENCES payroll_runs (id) ON DELETE CASCADE,
  CONSTRAINT fk_payroll_details_employee FOREIGN KEY (employee_id) REFERENCES employees (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

const payslipsSql = `
CREATE TABLE IF NOT EXISTS payslips (
  id int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  payroll_detail_id int(10) UNSIGNED NOT NULL,
  file_path varchar(255) NOT NULL,
  file_name varchar(255) NOT NULL,
  generated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  emailed_at timestamp NULL DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_payslips_detail (payroll_detail_id),
  CONSTRAINT fk_payslips_detail FOREIGN KEY (payroll_detail_id) REFERENCES payroll_details (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

const addPayrollModuleSql = `
INSERT INTO modules (key_name, display_name, created_at) VALUES
('payroll', 'Payroll', NOW())
ON DUPLICATE KEY UPDATE display_name = 'Payroll';
`;

async function migrate() {
  try {
    console.log('Running payroll migration...');

    // Disable foreign key checks
    await db.query('SET FOREIGN_KEY_CHECKS=0;');

    // Create tables
    console.log('Creating payroll_runs table...');
    await db.query(payrollRunsSql);

    console.log('Creating payroll_details table...');
    await db.query(payrollDetailsSql);

    console.log('Creating payslips table...');
    await db.query(payslipsSql);

    // Add payroll module
    console.log('Adding payroll module...');
    await db.query(addPayrollModuleSql);

    // Re-enable foreign key checks
    await db.query('SET FOREIGN_KEY_CHECKS=1;');

    console.log('Payroll migration completed successfully!');
  } catch (err) {
    console.error('Payroll migration failed:', err);
    throw err;
  }
}

migrate().catch((err) => {
  console.error('Migration error:', err);
  process.exit(1);
});