/**
 * Idempotent migration: user profile and notification preferences.
 * Adds: phone, department, image_url, notify_email, notify_sms to users.
 * Run: node database/migrate-user-profile.js (from backend folder)
 */
import 'dotenv/config';
import db from '../src/config/db.js';

async function columnExists(schema, table, column) {
  const [rows] = await db.execute(
    `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1`,
    [schema, table, column]
  );
  return rows.length > 0;
}

async function migrate() {
  const schema = process.env.DB_NAME;
  if (!schema) {
    console.error('[user-profile] Missing DB_NAME in .env');
    process.exit(1);
  }
  console.log('[user-profile] Using schema:', schema);

  const cols = [
    ['phone', 'VARCHAR(50) NULL'],
    ['department', 'VARCHAR(100) NULL'],
    ['image_url', 'VARCHAR(500) NULL'],
    ['notify_email', 'TINYINT(1) NOT NULL DEFAULT 1'],
    ['notify_sms', 'TINYINT(1) NOT NULL DEFAULT 0'],
  ];
  for (const [col, def] of cols) {
    if (!(await columnExists(schema, 'users', col))) {
      console.log('  + Adding users.' + col);
      await db.execute(`ALTER TABLE users ADD COLUMN ${col} ${def}`);
    }
  }
  console.log('[user-profile] Done');
  process.exit(0);
}

migrate().catch((err) => {
  console.error('[user-profile] Failed:', err);
  process.exit(1);
});
