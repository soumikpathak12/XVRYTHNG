-- -----------------------------------------------------------------------------
-- Migration: add `leave` module and map to company types that already have `attendance`
-- Purpose: keep role/module toggle consistent so Employee sidebar can show Submit Leave
-- Safe to run multiple times (uses INSERT IGNORE)
-- -----------------------------------------------------------------------------
-- Run manually:
--   mysql -u USER -p DATABASE < database/migrations/034_add_leave_module.sql
-- -----------------------------------------------------------------------------

INSERT IGNORE INTO modules (key_name, display_name)
VALUES ('leave', 'Leave');

INSERT IGNORE INTO company_type_modules (company_type_id, module_key)
SELECT DISTINCT ctm.company_type_id, 'leave'
FROM company_type_modules ctm
WHERE ctm.module_key = 'attendance';
