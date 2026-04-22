ALTER TABLE `users`
  ADD COLUMN `mobile_pin_hash` VARCHAR(255) NULL,
  ADD COLUMN `mobile_pin_question` VARCHAR(255) NULL,
  ADD COLUMN `mobile_pin_answer_hash` VARCHAR(255) NULL,
  ADD COLUMN `mobile_pin_set_at` DATETIME NULL,
  ADD COLUMN `mobile_pin_recovery_code_hash` VARCHAR(255) NULL,
  ADD COLUMN `mobile_pin_recovery_expires_at` DATETIME NULL,
  ADD COLUMN `mobile_pin_recovery_sent_at` DATETIME NULL,
  ADD COLUMN `mobile_pin_recovery_attempts` TINYINT UNSIGNED NOT NULL DEFAULT 0;
