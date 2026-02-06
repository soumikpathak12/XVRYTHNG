ALTER TABLE users
  ADD COLUMN IF NOT EXISTS failed_attempts INT NOT NULL DEFAULT 0;

-- 2) users.lock_until
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS lock_until DATETIME NULL;

-- 3) password_reset_tokens table (create if missing)
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,                -- must match users.id type/sign
  token_hash CHAR(64) NOT NULL,                 -- SHA-256 hex
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_ip VARCHAR(45) NULL,
  user_agent VARCHAR(255) NULL,
  CONSTRAINT fk_prt_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_prt_user (user_id),
  INDEX idx_prt_token (token_hash),
  INDEX idx_prt_exp (expires_at)
) ENGINE=InnoDB;

-- 4) users.password_changed_at (for JWT revocation)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS password_changed_at DATETIME NULL;