// src/controllers/adminController.js
import jwt from 'jsonwebtoken';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import db from '../config/db.js';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOAD_DIR = path.resolve(__dirname, '../uploads/logos');

/** Middleware: requireAuth / requireSuperAdmin giữ nguyên như bạn đang dùng */
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

async function resolveCompanyId(req) {
  const isSuper = req.user?.role?.toLowerCase() === 'super_admin';
  let companyId =
    req.tenantId ??
    req.user?.companyId ??
    (isSuper && req.query.companyId ? parseInt(req.query.companyId, 10) : null) ??
    (isSuper && req.headers['x-tenant-id'] ? parseInt(req.headers['x-tenant-id'], 10) : null);
  if (!companyId && isSuper) {
    const [rows] = await db.execute('SELECT id FROM companies LIMIT 2');
    if (rows.length === 1) companyId = rows[0].id; // dev-friendly
  }
  return companyId ?? null;
}

/** GET /api/admin/me */
export async function getAdminProfile(req, res) {
  try {
    const [rows] = await db.execute(
      `SELECT id, name, slug, status, abn, contact_email, contact_phone,
               address_line1, address_line2, city, state, postcode, country,
             company_type_id, created_at, updated_at
         FROM companies WHERE id = ? LIMIT 1`,

      [req.user.id]
    );
    const row = rows[0];
    if (!row) return res.status(404).json({ success: false, message: 'User not found' });

    let company = null;
    const companyId = await resolveCompanyId(req);
    if (companyId) {
      const [cRows] = await db.execute(
         `SELECT id, name, slug, status, abn, contact_email, contact_phone,
               address_line1, address_line2, city, state, postcode, country,
             company_type_id, created_at, updated_at
         FROM companies WHERE id = ? LIMIT 1`,
        [companyId]
      );
      company = cRows[0] ?? null;
    }

    const data = {
      ...row,
      abn: row.abn ?? null,
      last_login_at: row.last_login_at ?? null,
      company,
      tenant_company_id: company?.id ?? null,
    };
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

    const companyId = await resolveCompanyId(req);
    if (!companyId && String(req.user.role).toLowerCase() !== 'super_admin') {
      return res.status(422).json({ success: false, message: 'companyId is required' });
    }

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
      imageUrl = `/uploads/logos/${filename}`; // public URL
    }

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

    const abnVal = abn?.trim() || null;
    try {
      await db.execute('UPDATE users SET abn = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [abnVal, req.user.id]);
    } catch (_) { /* ignore if column missing */ }

    if (companyId) {
      await db.execute(
        `UPDATE companies
         SET name = ?, contact_email = ?, contact_phone = ?, abn = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [companyName.trim(), email.trim().toLowerCase(), phone.trim(), abnVal, companyId]
      );
    }

    const [rows] = await db.execute(
      `SELECT id, company_id, role_id, email, name, phone, image_url,
              status, created_at, updated_at, abn, last_login_at
       FROM users WHERE id = ? LIMIT 1`,
      [req.user.id]
    );
    const row = rows[0];
    return res.json({ success: true, data: row });
  } catch (err) {
    console.error('updateAdminProfile error', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }

  
}

/**
 * POST /api/admin/users
 * Body: { name, email, password, role, companyId, phone?, status? }
 * - super_admin only (enforced in routes)
 */
export async function createUser(req, res) {
  try {
    const { name, email, password, role, companyId, phone, status } = req.body || {};

    // Basic validation
    const errors = {};
    if (!name?.trim()) errors.name = 'Name is required';
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) errors.email = 'Valid email is required';
    if (!password || String(password).length < 8) errors.password = 'Password must be at least 8 characters';
    if (!role?.trim()) errors.role = 'Role is required';
    // super_admin can create:
    // - super_admin (optional), company_admin, manager, field_agent
    // If role is not super_admin, require a companyId
    const roleLc = String(role).toLowerCase();
    const rolesAllowed = ['super_admin', 'company_admin', 'manager', 'field_agent'];
    if (!rolesAllowed.includes(roleLc)) errors.role = 'Unsupported role';
    if (roleLc !== 'super_admin' && (companyId == null || Number.isNaN(Number(companyId)))) {
      errors.companyId = 'companyId is required for non-super_admin users';
    }

    if (Object.keys(errors).length) {
      return res.status(422).json({ success: false, errors });
    }

    // Check email uniqueness
    const [existing] = await db.execute(
      `SELECT id FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1`,
      [email.trim()]
    );
    if (existing?.length) {
      return res.status(422).json({ success: false, errors: { email: 'Email already in use' } });
    }

    // Lookup role_id from roles table (assuming your schema uses role_id)
    const [roleRows] = await db.execute(
      `SELECT id FROM roles WHERE LOWER(name) = LOWER(?) LIMIT 1`,
      [roleLc]
    );
    const roleId = roleRows?.[0]?.id;
    if (!roleId) {
      return res.status(422).json({ success: false, errors: { role: 'Role not found in roles table' } });
    }

    // Hash password
    const hash = await bcrypt.hash(String(password), 10);

    // Insert user
    const insertSql = `
      INSERT INTO users (company_id, role_id, email, name, phone, status, password_hash, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `;
    const insertParams = [
      roleLc === 'super_admin' ? null : Number(companyId),
      roleId,
      email.trim().toLowerCase(),
      name.trim(),
      phone?.trim() ?? null,
      status?.trim() ?? 'active',
      hash,
    ];
    const [result] = await db.execute(insertSql, insertParams);

    // Return created user (safe subset)
    const [rows] = await db.execute(
      `SELECT id, company_id, role_id, email, name, phone, status, created_at
       FROM users WHERE id = ? LIMIT 1`,
      [result.insertId]
    );

    return res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('createUser error', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export function requireSuperAdmin(req, res, next) {
  if (String(req.user?.role).toLowerCase() !== 'super_admin') {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }
  next();
}

/** POST /api/admin/change-password */
export async function changeAdminPassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body ?? {};
    const errors = {};
    if (!currentPassword) errors.currentPassword = 'Current password is required';
    if (!newPassword || String(newPassword).length < 8) errors.newPassword = 'New password must be at least 8 characters';
    if (Object.keys(errors).length) return res.status(422).json({ success: false, errors });

    const [[user]] = await db.execute(
      `SELECT id, password_hash FROM users WHERE id = ? LIMIT 1`,
      [req.user.id]
    );
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const ok = await bcrypt.compare(String(currentPassword), user.password_hash || '');
    if (!ok) return res.status(422).json({ success: false, errors: { currentPassword: 'Current password is incorrect' } });

    const salt = await bcrypt.genSalt(12);
    const newHash = await bcrypt.hash(String(newPassword), salt);
    await db.execute(
      `UPDATE users
       SET password_hash = ?, password_changed_at = NOW(), updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [newHash, req.user.id]
    );
    await db.execute(`DELETE FROM refresh_tokens WHERE user_id = ?`, [req.user.id]);
    return res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    console.error('changeAdminPassword error', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}