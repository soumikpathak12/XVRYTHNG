-- Migration: 014_payroll_tables.sql
-- Create payroll related tables

-- Payroll runs table (stores payroll periods)
CREATE TABLE IF NOT EXISTS `payroll_runs` (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `company_id` int(10) UNSIGNED NOT NULL,
  `period_start` date NOT NULL,
  `period_end` date NOT NULL,
  `period_type` enum('weekly','fortnightly','monthly') NOT NULL DEFAULT 'monthly',
  `status` enum('draft','processed','paid') NOT NULL DEFAULT 'draft',
  `total_payroll_amount` decimal(12,2) DEFAULT 0.00,
  `total_employees` int(10) UNSIGNED DEFAULT 0,
  `total_hours` decimal(10,2) DEFAULT 0.00,
  `overtime_hours` decimal(10,2) DEFAULT 0.00,
  `created_by` int(10) UNSIGNED NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_payroll_runs_company` (`company_id`),
  KEY `idx_payroll_runs_period` (`period_start`, `period_end`),
  KEY `idx_payroll_runs_status` (`status`),
  CONSTRAINT `fk_payroll_runs_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_payroll_runs_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Payroll details table (employee-level payroll data)
CREATE TABLE IF NOT EXISTS `payroll_details` (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `payroll_run_id` int(10) UNSIGNED NOT NULL,
  `employee_id` int(10) UNSIGNED NOT NULL,
  `regular_hours` decimal(8,2) DEFAULT 0.00,
  `overtime_hours` decimal(8,2) DEFAULT 0.00,
  `hourly_rate` decimal(8,2) DEFAULT 0.00,
  `overtime_rate` decimal(8,2) DEFAULT 0.00,
  `gross_pay` decimal(10,2) DEFAULT 0.00,
  `deductions` decimal(10,2) DEFAULT 0.00,
  `net_pay` decimal(10,2) DEFAULT 0.00,
  `tax_deductions` decimal(10,2) DEFAULT 0.00,
  `other_deductions` decimal(10,2) DEFAULT 0.00,
  `notes` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_payroll_details_run` (`payroll_run_id`),
  KEY `idx_payroll_details_employee` (`employee_id`),
  CONSTRAINT `fk_payroll_details_run` FOREIGN KEY (`payroll_run_id`) REFERENCES `payroll_runs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_payroll_details_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Payslips table (for generated payslips)
CREATE TABLE IF NOT EXISTS `payslips` (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `payroll_detail_id` int(10) UNSIGNED NOT NULL,
  `file_path` varchar(255) NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `generated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `emailed_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_payslips_detail` (`payroll_detail_id`),
  CONSTRAINT `fk_payslips_detail` FOREIGN KEY (`payroll_detail_id`) REFERENCES `payroll_details` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;</content>
<parameter name="filePath">c:\Users\Admin\Documents\GitHub\XVRYTHNG\database\migrations\014_payroll_tables.sql