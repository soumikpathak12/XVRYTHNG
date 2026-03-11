import db from '../src/config/db.js';

const sql = `
CREATE TABLE IF NOT EXISTS employee_attendance (
  id int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  company_id int(10) UNSIGNED NOT NULL,
  employee_id int(10) UNSIGNED NOT NULL,
  check_in_time datetime NOT NULL,
  check_in_lat decimal(10,8) DEFAULT NULL,
  check_in_lng decimal(11,8) DEFAULT NULL,
  check_out_time datetime DEFAULT NULL,
  check_out_lat decimal(10,8) DEFAULT NULL,
  check_out_lng decimal(11,8) DEFAULT NULL,
  hours_worked decimal(5,2) DEFAULT NULL,
  date date NOT NULL,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_emp_attendance_company (company_id),
  KEY idx_emp_attendance_employee (employee_id),
  KEY idx_emp_attendance_date (date),
  CONSTRAINT fk_attendance_company FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE CASCADE,
  CONSTRAINT fk_attendance_employee FOREIGN KEY (employee_id) REFERENCES employees (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

async function migrate() {
  try {
    console.log('Running attendance migration...');
    await db.query('SET FOREIGN_KEY_CHECKS=0;');
    await db.query(sql);
    await db.query('SET FOREIGN_KEY_CHECKS=1;');
    console.log('Migration successful.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
