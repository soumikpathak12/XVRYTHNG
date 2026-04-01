-- XVRYTHNG - Support ticket SLA compensation tracking + referral settings table

ALTER TABLE support_tickets
  ADD COLUMN response_due_at DATETIME NULL DEFAULT NULL AFTER updated_at,
  ADD COLUMN first_staff_reply_at DATETIME NULL DEFAULT NULL AFTER response_due_at,
  ADD COLUMN company_compensation_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER first_staff_reply_at,
  ADD COLUMN xvrything_compensation_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER company_compensation_amount,
  ADD COLUMN compensation_status ENUM('none','company_due','company_paid','xvrything_paid','company_removed') NOT NULL DEFAULT 'none' AFTER xvrything_compensation_amount,
  ADD COLUMN company_compensation_paid_at DATETIME NULL DEFAULT NULL AFTER compensation_status,
  ADD COLUMN xvrything_compensation_paid_at DATETIME NULL DEFAULT NULL AFTER company_compensation_paid_at,
  ADD COLUMN company_removed_at DATETIME NULL DEFAULT NULL AFTER xvrything_compensation_paid_at,
  ADD COLUMN policy_snapshot_json JSON NULL AFTER company_removed_at;

CREATE TABLE IF NOT EXISTS referral_settings (
  id INT UNSIGNED PRIMARY KEY,
  settings_json JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
