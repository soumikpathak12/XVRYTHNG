/**
 * User profile service: get/update current user profile, change password.
 * Profile photo stored in uploads/profiles; optional server-side resize can be added later.
 */
import bcrypt from 'bcryptjs';
import db from '../config/db.js';

/**
 * Get profile for user id (with role name). Excludes password_hash.
 * Works even if profile columns (phone, department, image_url, notify_*) are not yet migrated.
 */
export async function getProfile(userId) {
  const baseSelect = `SELECT u.id, u.company_id, u.role_id, u.email, u.name, u.status, u.last_login_at,
       u.created_at, u.updated_at, r.name AS role_name
  FROM users u
  INNER JOIN roles r ON u.role_id = r.id
  WHERE u.id = ? LIMIT 1`;
  const extendedSelect = `SELECT u.id, u.company_id, u.role_id, u.email, u.name, u.phone, u.department,
       u.image_url, u.notify_email, u.notify_sms, u.status, u.last_login_at,
       u.created_at, u.updated_at, r.name AS role_name
  FROM users u
  INNER JOIN roles r ON u.role_id = r.id
  WHERE u.id = ? LIMIT 1`;

  let row;
  try {
    const [rows] = await db.execute(extendedSelect, [userId]);
    row = rows[0];
  } catch (err) {
    if (err.code === 'ER_BAD_FIELD_ERROR') {
      const [rows] = await db.execute(baseSelect, [userId]);
      row = rows[0];
      if (row) {
        row.phone = null;
        row.department = null;
        row.image_url = null;
        row.notify_email = 1;
        row.notify_sms = 0;
      }
    } else throw err;
  }
  if (!row) return null;
  return {
    ...row,
    role: row.role_name,
    notify_email: Boolean(row.notify_email),
    notify_sms: Boolean(row.notify_sms),
  };
}

/** Check which columns exist on users table (for optional profile fields). */
async function getUsersProfileColumns() {
  const [rows] = await db.execute(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users'
     AND COLUMN_NAME IN ('phone', 'department', 'image_url', 'notify_email', 'notify_sms')`,
    [process.env.DB_NAME]
  );
  return new Set(rows.map((r) => r.COLUMN_NAME));
}

/**
 * Update profile fields. Only updates provided fields that exist in DB; skips missing columns.
 */
export async function updateProfile(userId, data) {
  const allowed = ['name', 'email', 'phone', 'department', 'image_url', 'notify_email', 'notify_sms'];
  const existingCols = await getUsersProfileColumns();
  const updates = [];
  const values = [];
  for (const key of allowed) {
    if (data[key] === undefined) continue;
    if (key !== 'name' && key !== 'email' && !existingCols.has(key)) continue;
    if (key === 'email' && data[key] != null) {
      updates.push('email = ?');
      values.push(String(data[key]).trim().toLowerCase());
    } else if (key === 'notify_email' || key === 'notify_sms') {
      updates.push(`${key} = ?`);
      values.push(data[key] ? 1 : 0);
    } else if (key === 'image_url' || key === 'name' || key === 'phone' || key === 'department') {
      updates.push(`${key} = ?`);
      values.push(data[key] != null ? String(data[key]).trim() : null);
    }
  }
  if (updates.length === 0) return getProfile(userId);
  values.push(userId);
  await db.execute(
    `UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    values
  );
  return getProfile(userId);
}

/**
 * Change password. Verifies current password, then sets new hash.
 */
export async function changePassword(userId, currentPassword, newPassword) {
  const [rows] = await db.execute('SELECT password_hash FROM users WHERE id = ? LIMIT 1', [userId]);
  const user = rows[0];
  if (!user) throw new Error('User not found');
  const valid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!valid) throw new Error('Current password is incorrect');
  if (!newPassword || String(newPassword).length < 8) throw new Error('New password must be at least 8 characters');
  const hash = await bcrypt.hash(newPassword, 12);
  await db.execute(
    'UPDATE users SET password_hash = ?, password_changed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [hash, userId]
  );
  return true;
}
