-- Create lead_communications table if it doesn't exist (required for lead comms, email webhooks, follow-up worker).
-- Run: mysql -u your_user -p xvrythng < database/migrations/002_lead_communications.sql

CREATE TABLE IF NOT EXISTS lead_communications (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  lead_id BIGINT UNSIGNED NOT NULL,
  direction ENUM('outbound','inbound') NOT NULL,
  channel ENUM('email','sms','call') NOT NULL DEFAULT 'email',
  subject VARCHAR(255) DEFAULT NULL,
  body MEDIUMTEXT DEFAULT NULL,
  automated TINYINT(1) NOT NULL DEFAULT 0,
  provider_message_id VARCHAR(255) DEFAULT NULL,
  related_message_id VARCHAR(255) DEFAULT NULL,
  sent_at DATETIME DEFAULT NULL,
  delivered_at DATETIME DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_lead (lead_id),
  CONSTRAINT fk_comm_lead FOREIGN KEY (lead_id) REFERENCES leads (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
