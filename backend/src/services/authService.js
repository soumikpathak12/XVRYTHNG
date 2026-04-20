/**
 * Auth service: credential validation, JWT generation, refresh token rotation.
 * Passwords hashed with bcrypt; no secrets in code.
 */
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import db from '../config/db.js';
import * as permissionService from './permissionService.js';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

const LOCK_THRESHOLD = Number(process.env.AUTH_LOCK_THRESHOLD || 5); // attempts
const LOCK_MINUTES = Number(process.env.AUTH_LOCK_MINUTES || 15);

const DUMMY_BCRYPT_HASH =
  '$2a$10$0qR0Kq6r8Yb1G7TnO4oNauT5x3kAQlH1gLk3u6xU4E8S7pZ7sY3z2';

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.warn('Warning: JWT_SECRET should be at least 32 characters for production.');
}

/**
 * Find user by email and optional company_id.
 * For login we match email; company_id is used for multi-tenant isolation.
 */
export async function findUserByEmail(email, companyId = null) {
  const [rows] = await db.execute(
    `SELECT
       u.id, u.company_id, u.role_id, u.email, u.password_hash, u.name, u.status,
       u.must_change_password, u.failed_attempts, u.lock_until, u.image_url,
       r.name AS role_name
     FROM users u
     INNER JOIN roles r ON u.role_id = r.id
     WHERE u.email = ? AND (u.company_id <=> ?)
     LIMIT 1`,
    [email, companyId]
  );
  return rows[0] || null;
}

/**
 * Find all users with this email (any company). Used when login has no companyId and
 * no user found for company_id IS NULL.
 */
async function findUsersByEmailOnly(email) {
  const [rows] = await db.execute(
    `SELECT
       u.id, u.company_id, u.role_id, u.email, u.password_hash, u.name, u.status,
       u.must_change_password, u.failed_attempts, u.lock_until, u.image_url,
       r.name AS role_name
     FROM users u
     INNER JOIN roles r ON u.role_id = r.id
     WHERE u.email = ?
     ORDER BY u.company_id IS NULL DESC`,
    [email]
  );
  return rows;
}

/**
 * Find user by id (for refresh flow). Returns same shape as findUserByEmail for token creation.
 */
export async function findUserById(userId) {
  const [rows] = await db.execute(
    `SELECT
       u.id, u.company_id, u.role_id, u.email, u.password_hash, u.name, u.status,
       u.must_change_password, u.failed_attempts, u.lock_until, u.image_url,
       r.name AS role_name
     FROM users u
     INNER JOIN roles r ON u.role_id = r.id
     WHERE u.id = ?
     LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

/**
 * Internal: mark a failed attempt and set lock if threshold reached.
 */
async function recordFailedAttempt(user) {
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
 * When companyId is null and no user found for company_id IS NULL, tries by email only.
 */
export async function validateCredentials(email, password, companyId = null) {
  let user = await findUserByEmail(email, companyId);

  if (!user && companyId === null) {
    const byEmail = await findUsersByEmailOnly(email);
    if (byEmail.length === 1) {
      user = byEmail[0];
    } else if (byEmail.length > 1) {
      await bcrypt.compare(password || '', DUMMY_BCRYPT_HASH); // timing equalization
      throw new Error(
        'Multiple accounts found for this email. Please contact support or use your company portal.'
      );
    }
  }

  if (!user) {
    await bcrypt.compare(password || '', DUMMY_BCRYPT_HASH); // timing equalization
    throw new Error('Invalid email or password');
  }

  if (user.status !== 'active') {
    throw new Error('Account is inactive');
  }

  if (user.lock_until && new Date(user.lock_until) > new Date()) {
    throw new Error('Account is temporarily locked. Please try again later.');
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    const { locked } = await recordFailedAttempt(user);
    if (locked) {
      throw new Error('Account is temporarily locked. Please try again later.');
    }
    throw new Error('Invalid email or password');
  }

  await resetAttempts(user.id);
  return user;
}

/**
 * Generate access JWT: userId, role, companyId (for RBAC and tenant context).
 * Returns { accessToken, expiresIn }.
 */
export function createAccessToken(user) {
  const payload = {
    userId: user.id,
    role: user.role_name,
    companyId: user.company_id ?? null,
  };
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  return { accessToken, expiresIn: JWT_EXPIRES_IN };
}

/** @deprecated Use createAccessToken. Kept for backward compatibility. */
export function createToken(user) {
  return createAccessToken(user).accessToken;
}

/**
 * Hash a refresh token for storage (SHA-256 hex).
 */
function hashRefreshToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Create a refresh token: store hash in DB, return raw token string.
 * One-time use; consumed by refresh() which issues a new pair.
 */
export async function createRefreshToken(userId) {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashRefreshToken(rawToken);
  const expiresInSeconds = parseExpiryToSeconds(JWT_REFRESH_EXPIRES_IN);
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

  await db.execute(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)`,
    [userId, tokenHash, expiresAt]
  );
  return { refreshToken: rawToken, refreshExpiresIn: JWT_REFRESH_EXPIRES_IN };
}

function parseExpiryToSeconds(exp) {
  const match = String(exp).trim().match(/^(\d+)(s|m|h|d)$/);
  if (!match) return 7 * 24 * 3600; // default 7d
  const n = parseInt(match[1], 10);
  const u = match[2];
  if (u === 's') return n;
  if (u === 'm') return n * 60;
  if (u === 'h') return n * 3600;
  if (u === 'd') return n * 24 * 3600;
  return 7 * 24 * 3600;
}

/**
 * Refresh rotation: validate refresh token, delete it (one-time use), issue new access + refresh.
 * Returns { accessToken, refreshToken, expiresIn, refreshExpiresIn, user, permissions, needsPasswordChange } or throws.
 */
export async function refresh(refreshTokenRaw) {
  if (!refreshTokenRaw || typeof refreshTokenRaw !== 'string') {
    throw new Error('Invalid refresh token');
  }
  const tokenHash = hashRefreshToken(refreshTokenRaw.trim());

  const [rows] = await db.execute(
    `SELECT id, user_id, expires_at FROM refresh_tokens WHERE token_hash = ? LIMIT 1`,
    [tokenHash]
  );
  const row = rows[0];
  if (!row) {
    throw new Error('Invalid or expired refresh token');
  }
  if (new Date(row.expires_at) <= new Date()) {
    await db.execute('DELETE FROM refresh_tokens WHERE id = ?', [row.id]);
    throw new Error('Invalid or expired refresh token');
  }

  const user = await findUserById(row.user_id);
  if (!user || user.status !== 'active') {
    await db.execute('DELETE FROM refresh_tokens WHERE id = ?', [row.id]);
    throw new Error('Invalid or expired refresh token');
  }

  await db.execute('DELETE FROM refresh_tokens WHERE id = ?', [row.id]);

  const { accessToken, expiresIn } = createAccessToken(user);
  const { refreshToken, refreshExpiresIn } = await createRefreshToken(user.id);
  const permissions = await permissionService.getPermissionsForUser(user.id);

  return {
    accessToken,
    refreshToken,
    expiresIn,
    refreshExpiresIn,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role_name,
      roleId: user.role_id,
      companyId: user.company_id,
      jobRoleId: user.job_role_id ?? null,
      image_url: user.image_url ?? null,
    },
    permissions,
    needsPasswordChange: !!user.must_change_password,
  };
}

/**
 * Login: validate credentials, update last_login_at, return access + refresh tokens and user.
 * Returns { accessToken, refreshToken, expiresIn, refreshExpiresIn, user, permissions, needsPasswordChange }.
 */
export async function login(email, password, companyId = null) {
  const user = await validateCredentials(email, password, companyId);
  if (!user) return null;

  await db.execute(
    'UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?',
    [user.id]
  );

  const { accessToken, expiresIn } = createAccessToken(user);
  const { refreshToken, refreshExpiresIn } = await createRefreshToken(user.id);
  const permissions = await permissionService.getPermissionsForUser(user.id);

  return {
    accessToken,
    refreshToken,
    expiresIn,
    refreshExpiresIn,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role_name,
      roleId: user.role_id,
      companyId: user.company_id,
      jobRoleId: user.job_role_id ?? null,
      image_url: user.image_url ?? null,
    },
    permissions,
    needsPasswordChange: !!user.must_change_password,
  };
}


export async function changePassword(userId, currentPassword, newPassword) {
  if (!newPassword || newPassword.length < 8) {
    throw new Error('New password must be at least 8 characters.');
  }

  const [rows] = await db.execute(
    `SELECT id, password_hash FROM users WHERE id = ? LIMIT 1`,
    [Number(userId)]
  );
  const user = rows?.[0];
  if (!user) throw new Error('User not found.');

  const ok = await bcrypt.compare(currentPassword ?? '', user.password_hash);
  if (!ok) throw new Error('Current password is incorrect.');

  const passwordHash = await bcrypt.hash(newPassword, 10);

  await db.execute(
    `UPDATE users
       SET password_hash = ?, must_change_password = 0, password_changed_at = NOW(),
           failed_attempts = 0, lock_until = NULL, updated_at = NOW()
     WHERE id = ?`,
    [passwordHash, Number(userId)]
  );

  // Invalidate all existing refresh tokens so old sessions are logged out.
  await db.execute(`DELETE FROM refresh_tokens WHERE user_id = ?`, [Number(userId)]);

  return { success: true };
}