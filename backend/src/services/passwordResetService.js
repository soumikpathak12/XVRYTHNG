// services/passwordResetService.js
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { Resend } from 'resend';
import db from '../config/db.js';

const TOKEN_TTL_MIN = Number(process.env.RESET_TOKEN_TTL_MINUTES || 30);
const APP_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:5173';

// ---------- Resend setup ----------
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const RESEND_FROM = process.env.RESEND_FROM || 'XVRYTHNG <no-reply@example.com>';
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

function sha256Hex(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

// Dev-friendly sender: if no API key, just log the message
async function sendResetEmailViaResend({ to, subject, text, html }) {
  if (!resend) {
    console.log('---- Mock email (dev: RESEND_API_KEY not set) ----');
    console.log('From:', RESEND_FROM);
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log('Text:', text);
    console.log('HTML:', html);
    console.log('---------------------------------------------------');
    return { id: null };
  }

  const { data, error } = await resend.emails.send({
    from: RESEND_FROM,
    to: Array.isArray(to) ? to : [to],
    subject,
    text,
    html,
    headers: {
      'X-Product': 'XVRYTHNG',
      'X-Template': 'password-reset'
    }
  });

  if (error) {
    // Surface error in prod; in dev we can continue
    console.error('[request-reset] Resend send failed:', error);
    if (process.env.NODE_ENV !== 'production') return { id: null, devWarning: true };
    throw new Error(error?.message || 'Email send failed');
  }
  return { id: data?.id || null };
}

/**
 * POST /api/auth/request-reset
 * Always returns a generic success. In non-production, also returns {devToken}
 * so you can test without email.
 */
export async function requestPasswordReset({ email, companyId = null, ip, userAgent }) {
  const normalizedEmail = String(email || '').toLowerCase();

  const [rows] = await db.execute(
    `SELECT id, email, status FROM users
     WHERE email = ? AND (company_id <=> ?) LIMIT 1`,
    [normalizedEmail, companyId]
  );
  let user = rows?.[0] || null;

  // Match login behavior: when company is unknown, allow email-only lookup
  // if and only if there is exactly one account for this email.
  if (!user && companyId == null) {
    const [emailRows] = await db.execute(
      `SELECT id, email, status, company_id
         FROM users
        WHERE email = ?
        ORDER BY company_id IS NULL DESC`,
      [normalizedEmail]
    );

    if (emailRows.length === 1) {
      user = emailRows[0];
    } else if (emailRows.length > 1) {
      console.warn(
        '[request-reset] skipped: multiple accounts share this email and no companyId provided:',
        normalizedEmail
      );
    }
  }

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

    // Build reset email
    const encodedToken = encodeURIComponent(rawToken);
    const resetUrl = `${APP_BASE_URL}/reset-password?token=${encodedToken}`;
    const subject = 'Reset your XVRYTHNG password';
    const text = [
      'You requested a password reset.',
      '',
      'Click the link to reset your password:',
      resetUrl,
      '',
      `This link will expire in ${TOKEN_TTL_MIN} minutes.`,
      '',
      'If you did not request this, you can safely ignore this email.'
    ].join('\n');

    const html = `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width,initial-scale=1"/>
    <title>${subject}</title>
  </head>
  <body style="margin:0;padding:0;background:#f6f9fc;font-family:Arial,sans-serif;color:#0f172a;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f6f9fc;">
      <tr>
        <td align="center" style="padding:24px">
          <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
            <!-- Header -->
            <tr>
              <td style="background:#1A7B7B;color:#fff;padding:16px 20px;font-weight:700;font-size:16px;">
                XVRYTHNG — Password reset
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding:20px;">
                <p style="margin:0 0 12px;">You requested a password reset.</p>

                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:16px 0;">
                  <tr>
                    <td>
                      <a href="${resetUrl}"
                         style="display:inline-block;background:#1A7B7B;color:#ffffff;font-weight:700;text-decoration:none;padding:10px 16px;border-radius:8px;"
                         target="_blank" rel="noopener">
                         Reset your password
                      </a>
                    </td>
                  </tr>
                </table>

                <p style="margin:0 0 12px;">If the button doesn't work, copy and open this link:</p>
                <p style="margin:0 0 12px;word-break:break-all;">
                  <a href="${resetUrl}" target="_blank" rel="noopener">${resetUrl}</a>
                </p>

                <p style="margin:0 0 12px;">This link will expire in ${TOKEN_TTL_MIN} minutes.</p>
                <p style="margin:0;">If you did not request this, you can safely ignore this email.</p>

                <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0"/>
                <p style="font-size:12px;color:#6b7280;margin:0;">Automated security notification • XVRYTHNG</p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding:16px 20px;background:#f9fafb;border-top:1px solid #e5e7eb;color:#6b7280;font-size:12px;">
                © ${new Date().getFullYear()} XVRYTHNG
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`.trim();

    // Send via Resend (or log in dev)
    try {
      await sendResetEmailViaResend({ to: user.email, subject, text, html });
      console.log('[request-reset] email send OK');
    } catch (e) {
      console.warn('[request-reset] email send failed:', e.message);
      if (process.env.NODE_ENV === 'production') throw e;
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
  const rec = rows?.[0];
  const valid =
    !!rec &&
    !rec.used_at &&
    new Date(rec.expires_at) > new Date() &&
    rec.status === 'active';

  return { valid };
}

/**
 * POST /api/auth/reset-password  body: { rawToken, newPassword }
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
  const rec = rows?.[0];

  if (!rec || rec.used_at || new Date(rec.expires_at) <= new Date() || rec.status !== 'active') {
    throw new Error('Invalid or expired reset token');
  }

  // Strong rules (fixing prior bitwise operator bug)
  if (typeof newPassword !== 'string') {
    throw new Error('Password is required');
  }
  const hasMin = newPassword.length >= 8;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasDigit = /\d/.test(newPassword);
  const hasSymbol = /[^A-Za-z0-9]/.test(newPassword);

  if (!(hasMin && hasUpper && hasLower && hasDigit && hasSymbol)) {
    throw new Error('Password must be at least 8 chars and include upper, lower, number, and symbol');
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