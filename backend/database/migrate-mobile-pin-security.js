/**
 * Idempotent migration: mobile PIN security columns on users.
 * Adds: mobile_pin_hash, mobile_pin_question, mobile_pin_answer_hash, mobile_pin_set_at.
 * Run: node database/migrate-mobile-pin-security.js (from backend folder)
 */
import 'dotenv/config';
import db from '../src/config/db.js';

async function columnExists(schema, table, column) {
  const [rows] = await db.execute(
    `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1`,
    [schema, table, column],
  );
  return rows.length > 0;
}

async function migrate() {
  const schema = process.env.DB_NAME;
  if (!schema) {
    console.error('[mobile-pin-security] Missing DB_NAME in .env');
    process.exit(1);
  }
  console.log('[mobile-pin-security] Using schema:', schema);

  const cols = [
    ['mobile_pin_hash', 'VARCHAR(255) NULL'],
    ['mobile_pin_question', 'VARCHAR(255) NULL'],
    ['mobile_pin_answer_hash', 'VARCHAR(255) NULL'],
    ['mobile_pin_set_at', 'DATETIME NULL'],
    ['mobile_pin_recovery_code_hash', 'VARCHAR(255) NULL'],
    ['mobile_pin_recovery_expires_at', 'DATETIME NULL'],
    ['mobile_pin_recovery_sent_at', 'DATETIME NULL'],
    ['mobile_pin_recovery_attempts', 'TINYINT UNSIGNED NOT NULL DEFAULT 0'],
  ];

  for (const [col, def] of cols) {
    if (!(await columnExists(schema, 'users', col))) {
      console.log('  + Adding users.' + col);
      await db.execute(`ALTER TABLE users ADD COLUMN ${col} ${def}`);
    }
  }

  console.log('[mobile-pin-security] Done');
  process.exit(0);
}

migrate().catch((err) => {
  console.error('[mobile-pin-security] Failed:', err);
  process.exit(1);
});
