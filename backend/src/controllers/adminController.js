// src/controllers/adminController.js
import jwt from 'jsonwebtoken';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import db from '../config/db.js';
import bcrypt from 'bcryptjs'

const JWT_SECRET = process.env.JWT_SECRET;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOAD_DIR = path.resolve(__dirname, '../uploads/logos');

/** JWT guard: sets req.user = { id, role, companyId } */

export async function changeAdminPassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body || {};

    // Basic validations
    const errors = {};
    if (!currentPassword) errors.currentPassword = 'Current password is required';
    if (!newPassword || String(newPassword).length < 8)
      errors.newPassword = 'New password must be at least 8 characters';
    if (Object.keys(errors).length) {
      return res.status(422).json({ success: false, errors });
    }

    const [[user]] = await db.execute(
      `SELECT id, password_hash FROM users WHERE id = ? LIMIT 1`,
      [req.user.id]
    );
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const ok = await bcrypt.compare(String(currentPassword), user.password_hash || '');
    if (!ok) {
      return res.status(422).json({
        success: false,
        errors: { currentPassword: 'Current password is incorrect' },
      });
    }

    // 3) Hash new password
    const salt = await bcrypt.genSalt(12);
    const newHash = await bcrypt.hash(String(newPassword), salt);

    await db.execute(
      `UPDATE users
         SET password_hash = ?, password_changed_at = NOW(), updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [newHash, req.user.id]
    );

    // 4) (Tuỳ chọn) Revoke refresh tokens của user này
    await db.execute(`DELETE FROM refresh_tokens WHERE user_id = ?`, [req.user.id]);

    return res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    console.error('changeAdminPassword error', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export function requireAuth(req, res, next) {
  const auth = req.headers.authorization || '';
  const [, token] = auth.split(' ');
  if (!token) return res.status(401).json({ success: false, message: 'Missing token' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = { id: payload.userId, role: payload.role, companyId: payload.companyId ?? null };
    next();
  } catch (err) {
    if (err?.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Session expired',
        code: 'SESSION_EXPIRED',
      });
    }
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

export function requireSuperAdmin(req, res, next) {
  if (String(req.user?.role).toLowerCase() !== 'super_admin') {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }
  next();
}

/** GET /api/admin/me */
export async function getAdminProfile(req, res) {
  try {
    const [rows] = await db.execute(
      `SELECT id, company_id, role_id, email, name, phone, image_url,
              status, created_at, updated_at
         FROM users
        WHERE id = ?
        LIMIT 1`,
      [req.user.id]
    );
    const row = rows[0];
    if (!row) return res.status(404).json({ success: false, message: 'User not found' });
    const data = { ...row, abn: row.abn ?? null, last_login_at: row.last_login_at ?? null };
    return res.json({ success: true, data });
  } catch (err) {
    console.error('getAdminProfile error', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

/** POST /api/admin/me (multipart/form-data) */
export async function updateAdminProfile(req, res) {
  try {
    const { companyName, email, phone, abn } = req.body;

    // Basic validation
    const errors = {};
    if (!companyName?.trim()) errors.companyName = 'Company name is required';
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) errors.email = 'Invalid email';
    if (!phone?.trim()) errors.phone = 'Phone is required';
    if (abn && !/^\d[\d\s]*$/.test(abn)) errors.abn = 'ABN must be digits/spaces';
    if (Object.keys(errors).length) return res.status(422).json({ success: false, errors });

    // Optional logo file
    let imageUrl;
    if (req.files?.logo) {
      const file = req.files.logo;
      if (!['image/png', 'image/jpeg'].includes(file.mimetype)) {
        return res.status(422).json({ success: false, errors: { logo: 'Only PNG or JPG allowed' } });
      }
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
      const ext = file.mimetype === 'image/png' ? 'png' : 'jpg';
      const filename = `logo_u${req.user.id}_${Date.now()}.${ext}`;
      const savePath = path.join(UPLOAD_DIR, filename);
      await file.mv(savePath);
      imageUrl = `/uploads/logos/${filename}`; // public URL (served in app.js)
    }

    // Update users table (name, email, phone, image_url). abn only if column exists (see migrate-admin-profile.js).
    const sql =
      `UPDATE users
          SET name = ?, email = ?, phone = ?` +
      (imageUrl ? `, image_url = ?` : ``) +
      `, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`;

    const params = imageUrl
      ? [companyName.trim(), email.trim().toLowerCase(), phone.trim(), imageUrl, req.user.id]
      : [companyName.trim(), email.trim().toLowerCase(), phone.trim(), req.user.id];

    await db.execute(sql, params);

    // Optionally update abn if column exists (no-op if column missing)
    const abnVal = abn?.trim() || null;
    try {
      await db.execute('UPDATE users SET abn = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [abnVal, req.user.id]);
    } catch (_) {
      // ignore if users.abn column does not exist
    }

    // Return fresh profile (same shape as GET)
    const [rows] = await db.execute(
      `SELECT id, company_id, role_id, email, name, phone, image_url,
              status, created_at, updated_at
         FROM users
        WHERE id = ?
        LIMIT 1`,
      [req.user.id]
    );
    const row = rows[0];
    const data = { ...row, abn: row?.abn ?? abnVal };
    return res.json({ success: true, data });
  } catch (err) {
    console.error('updateAdminProfile error', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }

  
}