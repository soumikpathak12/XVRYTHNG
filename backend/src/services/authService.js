/**
 * Auth service: credential validation, JWT generation.
 * Passwords hashed with bcrypt; no secrets in code.
 */
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../config/db.js';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.warn('Warning: JWT_SECRET should be at least 32 characters for production.');
}

/**
 * Find user by email and optional company_id.
 * For login we match email; company_id is used for multi-tenant isolation.
 */
export async function findUserByEmail(email, companyId = null) {
  const [rows] = await db.execute(
    `SELECT u.id, u.company_id, u.role_id, u.email, u.password_hash, u.name, u.status, r.name AS role_name
     FROM users u
     INNER JOIN roles r ON u.role_id = r.id
     WHERE u.email = ? AND (u.company_id <=> ?)
     LIMIT 1`,
    [email, companyId]
  );
  return rows[0] || null;
}

/**
 * Validate credentials and return user (without password) or null.
 */
export async function validateCredentials(email, password, companyId = null) {
  const user = await findUserByEmail(email, companyId);
  if (!user || user.status !== 'active') return null;
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return null;
  return user;
}

/**
 * Generate JWT payload: userId, role, companyId (for RBAC and tenant context).
 */
export function createToken(user) {
  const payload = {
    userId: user.id,
    role: user.role_name,
    companyId: user.company_id ?? null,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Login: validate credentials, update last_login_at, return token + safe user object.
 */
export async function login(email, password, companyId = null) {
  const user = await validateCredentials(email, password, companyId);
  if (!user) return null;

  await db.execute(
    'UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?',
    [user.id]
  );

  const token = createToken(user);
  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role_name,
      companyId: user.company_id,
    },
  };
}
