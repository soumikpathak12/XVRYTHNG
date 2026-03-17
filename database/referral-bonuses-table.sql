-- Create referral_bonuses table to track bonus payments
CREATE TABLE IF NOT EXISTS referral_bonuses (
  id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  referral_lead_id BIGINT(20) UNSIGNED NOT NULL,
  bonus_amount DECIMAL(10, 2) NOT NULL,
  bonus_paid_at DATETIME NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_referral_lead_id (referral_lead_id),
  INDEX idx_bonus_paid_at (bonus_paid_at),
  FOREIGN KEY (referral_lead_id) REFERENCES leads(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
