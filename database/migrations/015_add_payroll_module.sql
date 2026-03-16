-- Migration: 015_add_payroll_module.sql
-- Add payroll module to modules table

INSERT INTO `modules` (`key_name`, `display_name`, `created_at`) VALUES
('payroll', 'Payroll', NOW());