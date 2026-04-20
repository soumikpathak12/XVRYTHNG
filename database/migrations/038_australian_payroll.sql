-- ============================================================================
-- Australian payroll schema (PAYG / Super Guarantee / leave accrual columns)
-- Mirrors: backend/database/migrationRunner.js → V013__australian_payroll
-- ============================================================================
-- Run once against your database. If a statement fails with "Duplicate column",
-- that column already exists — comment out that block or skip it.
--
-- Prefer (same result): cd backend && npm run migrate
-- ============================================================================

-- company_payroll_settings
ALTER TABLE company_payroll_settings
  ADD COLUMN payroll_region VARCHAR(8) NOT NULL DEFAULT 'AU'
    COMMENT 'AU = Schedule 1 PAYG + SG; OTHER = legacy flat tax only';

ALTER TABLE company_payroll_settings
  ADD COLUMN super_guarantee_rate DECIMAL(6,5) NOT NULL DEFAULT 0.12000
    COMMENT 'Employer SG rate on ordinary time earnings';

ALTER TABLE company_payroll_settings
  ADD COLUMN au_annual_leave_weeks DECIMAL(5,2) NOT NULL DEFAULT 4.00
    COMMENT 'NES annual leave entitlement in weeks/year for accrual display';

ALTER TABLE company_payroll_settings
  ADD COLUMN au_personal_leave_weeks DECIMAL(5,2) NOT NULL DEFAULT 2.00
    COMMENT 'Personal/sick-carer leave weeks/year for accrual display';

-- employees
ALTER TABLE employees
  ADD COLUMN au_payg_scale TINYINT UNSIGNED NOT NULL DEFAULT 2
    COMMENT 'Schedule 1 PAYG scale (2 = TFN tax-free threshold)';

ALTER TABLE employees
  ADD COLUMN super_fund_name VARCHAR(160) NULL DEFAULT NULL;

-- payroll_details (order matters: ordinary_time_earnings after gross_pay)
ALTER TABLE payroll_details
  ADD COLUMN ordinary_time_earnings DECIMAL(12,2) NOT NULL DEFAULT 0.00
    AFTER gross_pay;

ALTER TABLE payroll_details
  ADD COLUMN super_guarantee_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00
    AFTER tax_deductions;

ALTER TABLE payroll_details
  ADD COLUMN annual_leave_accrued_hours DECIMAL(10,4) NOT NULL DEFAULT 0.0000
    AFTER super_guarantee_amount;

ALTER TABLE payroll_details
  ADD COLUMN personal_leave_accrued_hours DECIMAL(10,4) NOT NULL DEFAULT 0.0000
    AFTER annual_leave_accrued_hours;
