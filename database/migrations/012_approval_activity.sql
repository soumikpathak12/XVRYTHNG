-- 012_approval_activity.sql
-- Unified approvals activity log (manager/director decisions)

CREATE TABLE IF NOT EXISTS approval_activity (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id INT UNSIGNED NOT NULL,
  approval_type ENUM('leave','expense','attendance') NOT NULL,
  approval_id INT UNSIGNED NOT NULL,
  employee_id INT UNSIGNED NOT NULL,
  actor_user_id INT UNSIGNED NOT NULL,
  action ENUM('approved','rejected') NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_approval_activity_company (company_id),
  INDEX idx_approval_activity_target (approval_type, approval_id),
  INDEX idx_approval_activity_employee (employee_id),
  INDEX idx_approval_activity_actor (actor_user_id),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

