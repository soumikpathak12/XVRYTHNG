// backend/database/migrate-leave.js
// Run: node --env-file=.env database/migrate-leave.js

import db from '../src/config/db.js';

const balancesSQL = `
  CREATE TABLE IF NOT EXISTS leave_balances (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    company_id      INT UNSIGNED NOT NULL,
    employee_id     INT UNSIGNED NOT NULL,
    leave_type      ENUM('annual','sick','personal','unpaid') NOT NULL,
    total_days      DECIMAL(5,1) NOT NULL DEFAULT 0,
    used_days       DECIMAL(5,1) NOT NULL DEFAULT 0,
    year            SMALLINT UNSIGNED NOT NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_emp_type_year (employee_id, leave_type, year),
    INDEX idx_company (company_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

const requestsSQL = `
  CREATE TABLE IF NOT EXISTS leave_requests (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    company_id      INT UNSIGNED NOT NULL,
    employee_id     INT UNSIGNED NOT NULL,
    leave_type      ENUM('annual','sick','personal','unpaid') NOT NULL,
    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,
    days_count      DECIMAL(5,1) NOT NULL,
    reason          TEXT NOT NULL,
    status          ENUM('pending','approved','rejected','cancelled') NOT NULL DEFAULT 'pending',
    reviewed_by     INT UNSIGNED,
    reviewed_at     DATETIME,
    reviewer_note   TEXT,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_company_status (company_id, status),
    INDEX idx_employee (employee_id),
    INDEX idx_dates (start_date, end_date)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

try {
  await db.query(balancesSQL);
  console.log('✅  leave_balances table created (or already exists).');
  await db.query(requestsSQL);
  console.log('✅  leave_requests table created (or already exists).');
} catch (err) {
  console.error('❌  Migration failed:', err.message);
}
process.exit(0);
