INSERT IGNORE INTO modules (key_name, display_name)
VALUES ('leave', 'Leave');

INSERT IGNORE INTO company_type_modules (company_type_id, module_key)
SELECT DISTINCT ctm.company_type_id, 'leave'
FROM company_type_modules ctm
WHERE ctm.module_key = 'attendance';
