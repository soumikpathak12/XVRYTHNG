/**
 * Auth service: credential validation, JWT generation, refresh token rotation.
 * Passwords hashed with bcrypt; no secrets in code.
 */
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import db from '../config/db.js';
import * as permissionService from './permissionService.js';
import { sendMobilePinRecoveryEmail } from './emailService.js';

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

export async function getMobilePinStatus(userId) {
  const [rows] = await db.execute(
    `SELECT mobile_pin_hash, mobile_pin_question
       FROM users
      WHERE id = ?
      LIMIT 1`,
    [Number(userId)],
  );
  const user = rows?.[0];
  if (!user) throw new Error('User not found');
  return {
    configured: !!(user.mobile_pin_hash && String(user.mobile_pin_hash).trim()),
    securityQuestion: user.mobile_pin_question || null,
  };
}

export async function setupMobilePin(userId, pin, securityQuestion, securityAnswer) {
  const normalizedPin = String(pin ?? '').trim();
  if (!/^\d{6}$/.test(normalizedPin)) {
    throw new Error('PIN must be exactly 6 digits');
  }
  const question = String(securityQuestion ?? '').trim();
  const answer = String(securityAnswer ?? '').trim();
  if (!question) throw new Error('Security question is required');
  if (['other', 'others'].includes(question.toLowerCase())) {
    throw new Error('Please provide a custom security question');
  }
  if (answer.length < 2) throw new Error('Security answer is required');

  const pinHash = await bcrypt.hash(normalizedPin, 10);
  const answerHash = await bcrypt.hash(answer.toLowerCase(), 10);

  const [res] = await db.execute(
    `UPDATE users
        SET mobile_pin_hash = ?,
            mobile_pin_question = ?,
            mobile_pin_answer_hash = ?,
            mobile_pin_set_at = NOW(),
            updated_at = NOW()
      WHERE id = ?`,
    [pinHash, question, answerHash, Number(userId)],
  );
  if (!res?.affectedRows) throw new Error('User not found');
  return { success: true };
}

export async function verifyMobilePin(userId, pin) {
  const normalizedPin = String(pin ?? '').trim();
  if (!/^\d{6}$/.test(normalizedPin)) {
    throw new Error('PIN must be exactly 6 digits');
  }
  const [rows] = await db.execute(
    `SELECT mobile_pin_hash
       FROM users
      WHERE id = ?
      LIMIT 1`,
    [Number(userId)],
  );
  const user = rows?.[0];
  if (!user || !user.mobile_pin_hash) {
    return { configured: false, valid: false };
  }
  const valid = await bcrypt.compare(normalizedPin, user.mobile_pin_hash);
  return { configured: true, valid };
}

export async function verifyMobilePinSecurityAnswer(userId, securityAnswer) {
  const answer = String(securityAnswer ?? '').trim().toLowerCase();
  if (!answer) {
    throw new Error('Security answer is required');
  }
  const [rows] = await db.execute(
    `SELECT mobile_pin_answer_hash
       FROM users
      WHERE id = ?
      LIMIT 1`,
    [Number(userId)],
  );
  const user = rows?.[0];
  if (!user || !user.mobile_pin_answer_hash) {
    return { valid: false };
  }
  const valid = await bcrypt.compare(answer, user.mobile_pin_answer_hash);
  return { valid };
}

export async function resetMobilePinWithSecurityAnswer(userId, securityAnswer, newPin) {
  const answer = String(securityAnswer ?? '').trim().toLowerCase();
  const pin = String(newPin ?? '').trim();
  if (!/^\d{6}$/.test(pin)) {
    throw new Error('PIN must be exactly 6 digits');
  }
  if (!answer) throw new Error('Security answer is required');

  const [rows] = await db.execute(
    `SELECT mobile_pin_answer_hash, mobile_pin_question
       FROM users
      WHERE id = ?
      LIMIT 1`,
    [Number(userId)],
  );
  const user = rows?.[0];
  if (!user || !user.mobile_pin_answer_hash) {
    throw new Error('PIN is not configured');
  }
  const answerValid = await bcrypt.compare(answer, user.mobile_pin_answer_hash);
  if (!answerValid) return { success: false };

  const pinHash = await bcrypt.hash(pin, 10);
  await db.execute(
    `UPDATE users
        SET mobile_pin_hash = ?,
            mobile_pin_set_at = NOW(),
            updated_at = NOW()
      WHERE id = ?`,
    [pinHash, Number(userId)],
  );
  return { success: true, securityQuestion: user.mobile_pin_question || null };
}

const PIN_RECOVERY_COOLDOWN_SEC = Number(process.env.MOBILE_PIN_RECOVERY_COOLDOWN_SEC || 60);
const PIN_RECOVERY_TTL_MIN = Number(process.env.MOBILE_PIN_RECOVERY_TTL_MIN || 15);
const PIN_RECOVERY_MAX_ATTEMPTS = Number(process.env.MOBILE_PIN_RECOVERY_MAX_ATTEMPTS || 5);

export async function requestMobilePinRecoveryEmail(userId) {
  const [rows] = await db.execute(
    `SELECT id, email, name, mobile_pin_hash, mobile_pin_recovery_sent_at
       FROM users
      WHERE id = ?
      LIMIT 1`,
    [Number(userId)],
  );
  const user = rows?.[0];
  if (!user) throw new Error('User not found');
  if (!user.mobile_pin_hash || !String(user.mobile_pin_hash).trim()) {
    throw new Error('PIN is not configured');
  }
  const email = String(user.email || '').trim().toLowerCase();
  if (!email) throw new Error('No email on file for this account');

  if (user.mobile_pin_recovery_sent_at) {
    const sentMs = new Date(user.mobile_pin_recovery_sent_at).getTime();
    if (Number.isFinite(sentMs) && Date.now() - sentMs < PIN_RECOVERY_COOLDOWN_SEC * 1000) {
      throw new Error(`Please wait ${PIN_RECOVERY_COOLDOWN_SEC} seconds before requesting another code.`);
    }
  }

  const code = String(crypto.randomInt(100000, 1000000));
  const codeHash = await bcrypt.hash(code, 10);

  await db.execute(
    `UPDATE users
        SET mobile_pin_recovery_code_hash = ?,
            mobile_pin_recovery_expires_at = DATE_ADD(NOW(), INTERVAL ? MINUTE),
            mobile_pin_recovery_sent_at = NOW(),
            mobile_pin_recovery_attempts = 0,
            updated_at = NOW()
      WHERE id = ?`,
    [codeHash, PIN_RECOVERY_TTL_MIN, Number(userId)],
  );

  await sendMobilePinRecoveryEmail({
    to: email,
    name: user.name,
    code,
  });

  return { success: true };
}

async function loadPinRecoveryState(userId) {
  const [rows] = await db.execute(
    `SELECT mobile_pin_recovery_code_hash,
            mobile_pin_recovery_expires_at,
            mobile_pin_recovery_attempts
       FROM users
      WHERE id = ?
      LIMIT 1`,
    [Number(userId)],
  );
  return rows?.[0] || null;
}

export async function verifyMobilePinEmailRecoveryCode(userId, rawCode) {
  const code = String(rawCode ?? '').trim();
  if (!/^\d{6}$/.test(code)) {
    throw new Error('Code must be exactly 6 digits');
  }
  const row = await loadPinRecoveryState(userId);
  if (!row?.mobile_pin_recovery_code_hash) {
    return { valid: false, reason: 'none' };
  }
  const expiresAt = row.mobile_pin_recovery_expires_at
    ? new Date(row.mobile_pin_recovery_expires_at)
    : null;
  if (!expiresAt || expiresAt <= new Date()) {
    return { valid: false, reason: 'expired' };
  }
  const attempts = Number(row.mobile_pin_recovery_attempts || 0);
  if (attempts >= PIN_RECOVERY_MAX_ATTEMPTS) {
    return { valid: false, reason: 'locked' };
  }
  const ok = await bcrypt.compare(code, row.mobile_pin_recovery_code_hash);
  if (!ok) {
    await db.execute(
      `UPDATE users
          SET mobile_pin_recovery_attempts = IFNULL(mobile_pin_recovery_attempts, 0) + 1,
              updated_at = NOW()
        WHERE id = ?`,
      [Number(userId)],
    );
    return { valid: false, reason: 'wrong' };
  }
  return { valid: true };
}

export async function resetMobilePinWithEmailRecovery(userId, rawCode, newPin) {
  const code = String(rawCode ?? '').trim();
  const pin = String(newPin ?? '').trim();
  if (!/^\d{6}$/.test(code)) {
    throw new Error('Code must be exactly 6 digits');
  }
  if (!/^\d{6}$/.test(pin)) {
    throw new Error('PIN must be exactly 6 digits');
  }

  const row = await loadPinRecoveryState(userId);
  if (!row?.mobile_pin_recovery_code_hash) {
    return { success: false, reason: 'none' };
  }
  const expiresAt = row.mobile_pin_recovery_expires_at
    ? new Date(row.mobile_pin_recovery_expires_at)
    : null;
  if (!expiresAt || expiresAt <= new Date()) {
    return { success: false, reason: 'expired' };
  }
  const attempts = Number(row.mobile_pin_recovery_attempts || 0);
  if (attempts >= PIN_RECOVERY_MAX_ATTEMPTS) {
    return { success: false, reason: 'locked' };
  }

  const ok = await bcrypt.compare(code, row.mobile_pin_recovery_code_hash);
  if (!ok) {
    await db.execute(
      `UPDATE users
          SET mobile_pin_recovery_attempts = IFNULL(mobile_pin_recovery_attempts, 0) + 1,
              updated_at = NOW()
        WHERE id = ?`,
      [Number(userId)],
    );
    return { success: false, reason: 'wrong' };
  }

  const pinHash = await bcrypt.hash(pin, 10);
  await db.execute(
    `UPDATE users
        SET mobile_pin_hash = ?,
            mobile_pin_set_at = NOW(),
            mobile_pin_recovery_code_hash = NULL,
            mobile_pin_recovery_expires_at = NULL,
            mobile_pin_recovery_sent_at = NULL,
            mobile_pin_recovery_attempts = 0,
            updated_at = NOW()
      WHERE id = ?`,
    [pinHash, Number(userId)],
  );
  return { success: true };
}