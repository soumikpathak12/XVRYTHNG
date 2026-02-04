/**
 * Seed script: creates Super Admin user with hashed password.
 * Run: node database/seed.js (from backend folder)
 * Set SEED_ADMIN_PASSWORD in env or use default for dev only.
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import db from '../src/config/db.js';

const DEFAULT_DEV_PASSWORD = 'ChangeMe123!';
const password = process.env.SEED_ADMIN_PASSWORD || DEFAULT_DEV_PASSWORD;

async function seed() {
  const hash = await bcrypt.hash(password, 12);
  const [roles] = await db.execute('SELECT id FROM roles WHERE name = ?', ['super_admin']);
  const roleId = roles[0]?.id;
  if (!roleId) {
    console.error('Run schema.sql first to create roles.');
    process.exit(1);
  }
  await db.execute(
    `INSERT INTO users (company_id, role_id, email, password_hash, name, status)
     VALUES (NULL, ?, 'admin@xvrythng.com', ?, 'Super Admin', 'active')
     ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), updated_at = CURRENT_TIMESTAMP`,
    [roleId, hash]
  );
  console.log('Super Admin seeded. Email: admin@xvrythng.com');
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
