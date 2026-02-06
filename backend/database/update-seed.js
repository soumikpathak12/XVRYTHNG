/**
 * Seed script: ensures auth-related schema is in place.
 * - users.failed_attempts (INT NOT NULL DEFAULT 0)
 * - users.lock_until (DATETIME NULL)
 * - password_reset_tokens (table + FK to users.id)
 * - users.password_changed_at (DATETIME NULL)
 *
 * Run: node database/seed_auth_schema.js  (from backend folder)
 */
import 'dotenv/config';
import db from '../src/config/db.js';

/** Helpers */
async function columnExists(schema, table, column) {
  const [rows] = await db.execute(
    `SELECT 1
       FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME   = ?
        AND COLUMN_NAME  = ?
      LIMIT 1`,
    [schema, table, column]
  );
  return rows.length > 0;
}

async function tableExists(schema, table) {
  const [rows] = await db.execute(
    `SELECT 1
       FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME   = ?
      LIMIT 1`,
    [schema, table]
  );
  return rows.length > 0;
}

async function seed() {
  try {
    const schema = process.env.DB_NAME;
    if (!schema) {
      console.error('[auth-schema] Missing DB_NAME in .env');
      process.exit(1);
    }

    console.log(`[auth-schema] Using schema: ${schema}`);

    // 1) users.failed_attempts
    if (!(await columnExists(schema, 'users', 'failed_attempts'))) {
      console.log('  + Adding users.failed_attempts');
      await db.execute(
        `ALTER TABLE users
           ADD COLUMN failed_attempts INT NOT NULL DEFAULT 0`
      );
    } else {
      console.log('    users.failed_attempts already exists');
    }

    // 2) users.lock_until
    if (!(await columnExists(schema, 'users', 'lock_until'))) {
      console.log('  + Adding users.lock_until');
      await db.execute(
        `ALTER TABLE users
           ADD COLUMN lock_until DATETIME NULL`
      );
    } else {
      console.log('    users.lock_until already exists');
    }

    // 3) password_reset_tokens (create if missing)
    if (!(await tableExists(schema, 'password_reset_tokens'))) {
      console.log('  + Creating table password_reset_tokens');
      await db.execute(`
        CREATE TABLE password_reset_tokens (
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
        ) ENGINE=InnoDB
      `);
    } else {
      console.log('    password_reset_tokens already exists');
    }

    // 4) users.password_changed_at (for JWT revocation)
    if (!(await columnExists(schema, 'users', 'password_changed_at'))) {
      console.log('  + Adding users.password_changed_at');
      await db.execute(
        `ALTER TABLE users
           ADD COLUMN password_changed_at DATETIME NULL`
      );
    } else {
      console.log('    users.password_changed_at already exists');
    }

    console.log('[auth-schema] ✅ Done');
    process.exit(0);
  } catch (err) {
    console.error('[auth-schema] ❌ Failed:', err.message);
    process.exit(1);
  }
}

seed().catch((err) => {
  console.error('[auth-schema] ❌ Uncaught:', err);
  process.exit(1);
});