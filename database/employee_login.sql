ALTER TABLE users
  ADD COLUMN must_change_password TINYINT(1) NOT NULL DEFAULT 0 AFTER status,
  ADD COLUMN password_changed_at DATETIME NULL AFTER must_change_password;