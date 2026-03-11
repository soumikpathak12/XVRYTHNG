// backend/database/migrate-expenses.js
// Run: node --env-file=.env database/migrate-expenses.js

import db from '../src/config/db.js';

const sql = `
  CREATE TABLE IF NOT EXISTS expense_claims (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    company_id      INT UNSIGNED NOT NULL,
    employee_id     INT UNSIGNED NOT NULL,
    project_name    VARCHAR(255),
    category        ENUM('travel','materials','equipment','other') NOT NULL,
    amount          DECIMAL(12,2)  NOT NULL,
    currency        VARCHAR(3)     NOT NULL DEFAULT 'INR',
    expense_date    DATE           NOT NULL,
    description     TEXT           NOT NULL,
    receipt_path    VARCHAR(500),

    status          ENUM('pending','approved','rejected','cancelled') NOT NULL DEFAULT 'pending',
    reviewed_by     INT UNSIGNED,
    reviewed_at     DATETIME,
    reviewer_note   TEXT,

    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_company_status (company_id, status),
    INDEX idx_employee       (employee_id),
    INDEX idx_project        (project_name)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

try {
  await db.query(sql);
  console.log('✅  expense_claims table created (or already exists).');
} catch (err) {
  console.error('❌  Migration failed:', err.message);
}
process.exit(0);
