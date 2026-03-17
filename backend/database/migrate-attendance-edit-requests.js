// backend/database/migrate-attendance-edit-requests.js
// Run: node --env-file=.env database/migrate-attendance-edit-requests.js

import db from '../src/config/db.js';

const sql = `
  CREATE TABLE IF NOT EXISTS attendance_edit_requests (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    company_id      INT UNSIGNED NOT NULL,
    employee_id     INT UNSIGNED NOT NULL,
    attendance_id   INT UNSIGNED NOT NULL,

    -- Original values (snapshot at time of request)
    orig_check_in   DATETIME,
    orig_check_out  DATETIME,
    orig_hours      DECIMAL(5,2),

    -- Requested corrected values
    req_check_in    DATETIME     NOT NULL,
    req_check_out   DATETIME     NOT NULL,
    reason          TEXT         NOT NULL,

    -- Approval workflow
    status          ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
    reviewed_by     INT UNSIGNED,
    reviewed_at     DATETIME,
    reviewer_note   TEXT,

    created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_company_status (company_id, status),
    INDEX idx_employee        (employee_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

try {
  await db.query(sql);
  console.log('✅  attendance_edit_requests table created (or already exists).');
} catch (err) {
  console.error('❌  Migration failed:', err.message);
}
process.exit(0);
