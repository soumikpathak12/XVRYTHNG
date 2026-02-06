/**
 * Auth service: credential validation, JWT generation.
 * Passwords hashed with bcrypt; no secrets in code.
 */
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../config/db.js';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';


const LOCK_THRESHOLD = Number(process.env.AUTH_LOCK_THRESHOLD || 5);      // attempts
const LOCK_MINUTES   = Number(process.env.AUTH_LOCK_MINUTES || 15); 


const DUMMY_BCRYPT_HASH =
  '$2a$10$0qR0Kq6r8Yb1G7TnO4oNauT5x3kAQlH1gLk3u6xU4E8S7pZ7sY3z2'

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
 * Internal: mark a failed attempt and set lock if threshold reached.
 */
async function recordFailedAttempt(user) {
  // Atomically increment and (if needed) set lock_until in a single UPDATE
  await db.execute(
    `UPDATE users
       SET failed_attempts = failed_attempts + 1,
           lock_until = CASE
             WHEN failed_attempts + 1 >= ? THEN DATE_ADD(NOW(), INTERVAL ? MINUTE)
             ELSE lock_until
           END
     WHERE id = ?`,
    [LOCK_THRESHOLD, LOCK_MINUTES, user.id]
  );

  // Fetch the fresh values after the update
  const [rows] = await db.execute(
    'SELECT failed_attempts, lock_until FROM users WHERE id = ?',
    [user.id]
  );

  const u = rows[0];
  const locked = !!(u.lock_until && new Date(u.lock_until) > new Date());
  return { locked, attempts: u.failed_attempts };
}

/**
 * Internal: reset counters on successful login.
 */
async function resetAttempts(userId) {
  await db.execute(
    'UPDATE users SET failed_attempts = 0, lock_until = NULL, last_login_at = CURRENT_TIMESTAMP WHERE id = ?',
    [userId]
  );
}


/**
 * Validate credentials and return user (without password) or null.
 */

export async function validateCredentials(email, password, companyId = null) {
  const user = await findUserByEmail(email, companyId);

  // If user doesn't exist, normalize timing via dummy compare, then generic error
  if (!user) {
    await bcrypt.compare(password || '', DUMMY_BCRYPT_HASH); // timing equalization
    throw new Error('Invalid email or password');
  }

  // Status checks
  if (user.status !== 'active') {
    throw new Error('Account is inactive');
  }

  // If currently locked, block until lock_until passes
  if (user.lock_until && new Date(user.lock_until) > new Date()) {
    throw new Error('Account is temporarily locked. Please try again later.');
  }

  // Check password
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    const { locked } = await recordFailedAttempt(user);
    if (locked) {
      throw new Error('Account is temporarily locked. Please try again later.');
    }
    throw new Error('Invalid email or password');
  }

  // Success: reset counters, keep last_login_at as part of reset
  await resetAttempts(user.id);
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
