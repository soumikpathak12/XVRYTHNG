-- Idempotent SQL migration for mobile PIN security on `users`
-- Usage:
--   USE your_database_name;
--   SOURCE backend/database/migrate-mobile-pin-security.sql;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS mobile_pin_hash VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS mobile_pin_question VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS mobile_pin_answer_hash VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS mobile_pin_set_at DATETIME NULL;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS mobile_pin_recovery_code_hash VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS mobile_pin_recovery_expires_at DATETIME NULL,
  ADD COLUMN IF NOT EXISTS mobile_pin_recovery_sent_at DATETIME NULL,
  ADD COLUMN IF NOT EXISTS mobile_pin_recovery_attempts TINYINT UNSIGNED NOT NULL DEFAULT 0;
