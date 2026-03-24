-- Enable payroll module per company type (required for job_role_modules + sidebar / permissions)
INSERT IGNORE INTO company_type_modules (company_type_id, module_key, created_at) VALUES
(1, 'payroll', NOW()),
(2, 'payroll', NOW()),
(3, 'payroll', NOW());
