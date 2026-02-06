// services/passwordResetService.js
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import db from '../config/db.js';

const TOKEN_TTL_MIN = Number(process.env.RESET_TOKEN_TTL_MINUTES || 30);
const APP_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:5173';

// Mock-aware transport: logs email when SMTP_* is not set
function createTransport() {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return {
    async sendMail({ to, subject, text, html }) {
      console.log('---- Mock email (dev) ----');
      console.log('To:', to);
      console.log('Subject:', subject);
      console.log('Text:', text);
      console.log('HTML:', html);
      console.log('--------------------------');
    },
  };
}

function sha256Hex(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

/**
 * POST /api/auth/request-reset
 * Always returns a generic success. In non-production, also returns {devToken}
 * so you can test without email.
 */
export async function requestPasswordReset({ email, companyId = null, ip, userAgent }) {
  const [rows] = await db.execute(
    `SELECT id, email, status FROM users
     WHERE email = ? AND (company_id <=> ?) LIMIT 1`,
    [String(email || '').toLowerCase(), companyId]
  );
  const user = rows[0];

  if (user && user.status === 'active') {
    // Clean up expired tokens for this user
    await db.execute(
      `DELETE FROM password_reset_tokens
       WHERE user_id = ? AND used_at IS NULL AND expires_at < NOW()`,
      [user.id]
    );

    // Generate token + hash
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = sha256Hex(rawToken);

    // Insert token (with diagnostics)
    let insertOk = false;
    try {
      console.log('[request-reset] inserting token for user_id =', user.id);
      await db.execute(
        `INSERT INTO password_reset_tokens
           (user_id, token_hash, expires_at, created_ip, user_agent)
         VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE), ?, ?)`,
        [user.id, tokenHash, TOKEN_TTL_MIN, ip || null, userAgent || null]
      );
      insertOk = true;
      console.log('[request-reset] token inserted OK');
    } catch (e) {
      console.error('[request-reset] DB insert error:', {
        code: e.code,
        errno: e.errno,
        sqlState: e.sqlState,
        msg: e.sqlMessage || e.message,
      });
      throw e;
    }

    // Send email (don’t fail dev on SMTP issues)
   
    const resetUrl = `${APP_BASE_URL}/reset-password?token=${rawToken}`;
    const transport = createTransport();

    try {
    await transport.sendMail({
        // also fix SMTP_FROM in .env to use real angle brackets:
        // SMTP_FROM="XVRYTHNG <no-reply@xvrythng.com>"
        from: process.env.SMTP_FROM || 'XVRYTHNG <no-reply@xvrythng.com>',
        to: user.email,
        subject: 'Reset your XVRYTHNG password',
        text: `You requested a password reset.

    Click the link to reset your password:
    ${resetUrl}

    If you did not request this, you can safely ignore this email.`,
        html: `
        <p>You requested a password reset.</p>
        <p><a href="${resetUrl}" target="_blank" rel="noopener">Reset your password</a></p>
        <p>If you did not request this, you can safely ignore this email.</p>
        `,
    });
    console.log('[request-reset] email send OK');
    } catch (e) {
    console.warn('[request-reset] email send failed (continuing in dev):', e.message);
    }


    // Dev convenience
    if (process.env.NODE_ENV !== 'production') {
      return { ok: true, devToken: rawToken, inserted: insertOk };
    }
  }

  // Always generic to avoid email enumeration
  return { ok: true };
}

/**
 * GET /api/auth/validate-reset-token?token=...
 * Returns { valid: boolean }
 */
export async function validateResetToken(rawToken) {
  if (!rawToken || typeof rawToken !== 'string' || rawToken.length < 32) {
    return { valid: false };
  }
  const tokenHash = sha256Hex(rawToken);
  const [rows] = await db.execute(
    `SELECT prt.id, prt.user_id, prt.expires_at, prt.used_at, u.status
       FROM password_reset_tokens prt
       INNER JOIN users u ON prt.user_id = u.id
      WHERE prt.token_hash = ?
      LIMIT 1`,
    [tokenHash]
  );
  const rec = rows[0];
  const valid =
    !!rec &&
    !rec.used_at &&
    new Date(rec.expires_at) > new Date() &&
    rec.status === 'active';

  return { valid };
}

/**
 * POST /api/auth/reset-password  body: { token, password }
 * Throws on invalid token; returns { ok: true } on success.
 */
export async function resetPasswordWithToken({ rawToken, newPassword }) {
  const tokenHash = sha256Hex(rawToken);
  const [rows] = await db.execute(
    `SELECT prt.id, prt.user_id, prt.expires_at, prt.used_at, u.status
       FROM password_reset_tokens prt
       INNER JOIN users u ON prt.user_id = u.id
      WHERE prt.token_hash = ?
      LIMIT 1`,
    [tokenHash]
  );
  const rec = rows[0];

  if (!rec || rec.used_at || new Date(rec.expires_at) <= new Date() || rec.status !== 'active') {
    throw new Error('Invalid or expired reset token');
  }

  if (typeof newPassword !== 'string' || newPassword.length < 8 ||!/[A-Z]/.test(newPassword) |!/[^A-Za-z0-9]/.test(newPassword)) {
    throw new Error('Password must be at least 8 characters long');
  }

  const password_hash = await bcrypt.hash(newPassword, 12);

  // Update password & bump password_changed_at
  await db.execute(
    `UPDATE users
        SET password_hash = ?, password_changed_at = NOW()
      WHERE id = ?`,
    [password_hash, rec.user_id]
  );

  // Mark this token as used and invalidate any other active tokens
  await db.execute('UPDATE password_reset_tokens SET used_at = NOW() WHERE id = ?', [rec.id]);
  await db.execute(
    'DELETE FROM password_reset_tokens WHERE user_id = ? AND used_at IS NULL',
    [rec.user_id]
  );

  return { ok: true };
}