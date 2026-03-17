-- 013_activity_logs.sql
-- Sales / lead activity feed

CREATE TABLE IF NOT EXISTS activity_logs (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id   INT UNSIGNED DEFAULT NULL,
  user_id      INT UNSIGNED DEFAULT NULL,
  lead_id      BIGINT UNSIGNED DEFAULT NULL,
  action_type  ENUM('lead_created','stage_changed','proposal_sent','call_logged') NOT NULL,
  description  VARCHAR(255) NOT NULL,
  meta_json    JSON DEFAULT NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_activity_company_created (company_id, created_at),
  INDEX idx_activity_lead_created    (lead_id, created_at),
  INDEX idx_activity_user_created    (user_id, created_at),
  CONSTRAINT fk_activity_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL,
  CONSTRAINT fk_activity_user    FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE SET NULL,
  CONSTRAINT fk_activity_lead    FOREIGN KEY (lead_id)    REFERENCES leads(id)    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

