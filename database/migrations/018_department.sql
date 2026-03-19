-- Make `departments` match phpMyAdmin dump provided by user (MariaDB 10.4)
-- Target:
--   id INT UNSIGNED PK AI
--   company_id INT UNSIGNED NOT NULL
--   name VARCHAR(150) NOT NULL
--   code VARCHAR(50) NULL
--   created_at TIMESTAMP DEFAULT current_timestamp()
--   UNIQUE uk_dept_company_name (company_id, name)
--   FK fk_dept_company (company_id) -> companies(id) ON DELETE CASCADE
--   Data rows:
--     (1..5, company_id=1, Electrical/Sales/Operations/Projects Manangment/Executive)

-- Notes:
-- - This migration avoids truncating the entire table to reduce risk if other tables reference departments.
-- - It only replaces departments for company_id = 1.
-- - Index/FK drops are done conditionally via information_schema to make it safe to re-run.

START TRANSACTION;

-- 1) Column shape
ALTER TABLE `departments`
  MODIFY `code` varchar(50) DEFAULT NULL,
  MODIFY `name` varchar(150) NOT NULL;

-- 2) Indexes: drop xvrythng.sql ones, add phpMyAdmin ones
SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'departments'
        AND INDEX_NAME = 'uk_departments_company_code'
    ),
    'ALTER TABLE `departments` DROP INDEX `uk_departments_company_code`',
    'SELECT 1'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'departments'
        AND INDEX_NAME = 'idx_departments_company'
    ),
    'ALTER TABLE `departments` DROP INDEX `idx_departments_company`',
    'SELECT 1'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'departments'
        AND INDEX_NAME = 'uk_dept_company_name'
    ),
    'SELECT 1',
    'ALTER TABLE `departments` ADD UNIQUE KEY `uk_dept_company_name` (`company_id`,`name`)'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3) FK name: drop xvrythng.sql FK, re-add with phpMyAdmin name
SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM information_schema.TABLE_CONSTRAINTS
      WHERE CONSTRAINT_SCHEMA = DATABASE()
        AND TABLE_NAME = 'departments'
        AND CONSTRAINT_NAME = 'fk_departments_company'
        AND CONSTRAINT_TYPE = 'FOREIGN KEY'
    ),
    'ALTER TABLE `departments` DROP FOREIGN KEY `fk_departments_company`',
    'SELECT 1'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM information_schema.TABLE_CONSTRAINTS
      WHERE CONSTRAINT_SCHEMA = DATABASE()
        AND TABLE_NAME = 'departments'
        AND CONSTRAINT_NAME = 'fk_dept_company'
        AND CONSTRAINT_TYPE = 'FOREIGN KEY'
    ),
    'SELECT 1',
    'ALTER TABLE `departments` ADD CONSTRAINT `fk_dept_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 4) Data: replace phpMyAdmin rows for company_id = 1 only
DELETE FROM `departments`
WHERE `company_id` = 1;

INSERT INTO `departments` (`id`, `company_id`, `name`, `code`, `created_at`) VALUES
  (1, 1, 'Electrical', 'ELE', '2026-02-24 01:48:59'),
  (2, 1, 'Sales', 'SAL', '2026-02-24 01:48:59'),
  (3, 1, 'Operations', 'OPS', '2026-02-24 01:48:59'),
  (4, 1, 'Projects Manangment', 'PRJ', '2026-02-24 01:48:59'),
  (5, 1, 'Executive', 'EXE', '2026-02-24 01:48:59');

-- keep AUTO_INCREMENT consistent with dump (next id = 6)
ALTER TABLE `departments`
  AUTO_INCREMENT = 6;

COMMIT;

