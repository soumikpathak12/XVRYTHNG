// src/services/userService.js
import bcrypt from 'bcryptjs';
import db from '../config/db.js';

const STATIC_ORG_ROLES = new Set(['ELE-LEAD','APP','SAL-MGR','SAL-EXE','OPS-MGR','PM-MGR','DIR']);

async function roleExists(code) {
  if (!code) return false;
  try {
    const [[row]] = await db.execute('SELECT code FROM org_roles WHERE code=? LIMIT 1', [code]);
    if (row?.code) return true;
  } catch {
    // fallback nếu bảng org_roles chưa có
  }
  return STATIC_ORG_ROLES.has(code);
}

async function generateEmployeeCode(conn, code) {
  const prefix = `XTR-${code}-`;
  const [rows] = await conn.execute(
    `SELECT employee_code 
       FROM users 
      WHERE employee_code LIKE ? 
      ORDER BY employee_code DESC 
      LIMIT 1`,
    [`${prefix}%`]
  );
  let n = 1;
  if (rows.length) {
    const m = String(rows[0].employee_code || '').match(/-(\d{3})$/);
    if (m) n = parseInt(m[1], 10) + 1;
  }
  return `${prefix}${String(n).padStart(3, '0')}`;
}

export async function createUser(payload, ctx = {}) {
  const {
    org_role_code = null,
    email, password, name,
    phone = null,
    department = null,
    status = 'active',
    notify_email = 1,
    notify_sms = 0,
  } = payload || {};

  // Lấy từ JWT
  const company_id = ctx.companyId ?? null;
  const role_id = 2; // default; cân nhắc map theo policy của bạn

  // Validate
  const errors = {};
  if (!name?.trim()) errors.name = 'Name is required';
  if (!email?.trim()) errors.email = 'Email is required';
  if (!password || String(password).length < 8) errors.password = 'Password must be at least 8 chars';
  if (Object.keys(errors).length) {
    const err = new Error('VALIDATION_ERROR');
    err.status = 422; err.details = errors; throw err;
  }
  if (org_role_code && !(await roleExists(org_role_code))) {
    const err = new Error(`org_role_code '${org_role_code}' is invalid`);
    err.status = 400; throw err;
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // Uniqueness: (email, company_id)
    const [dups] = await conn.execute(
      `SELECT id FROM users WHERE email=? AND (company_id <=> ?) LIMIT 1`,
      [email.trim().toLowerCase(), company_id]
    );
    if (dups.length) {
      const err = new Error('Email already exists for this company');
      err.status = 409; throw err;
    }

    const password_hash = await bcrypt.hash(String(password), 12);

    // Hàm insert + return user
    async function insertAndReturn({ org_code = null, emp_code = null }) {
      const [ok] = await conn.execute(
        `INSERT INTO users
           (company_id, role_id, org_role_code, employee_code, email,
            password_hash, name, phone, department, status, notify_email, notify_sms)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          company_id, role_id, org_code, emp_code,
          email.trim().toLowerCase(), password_hash, name.trim(),
          phone, department, status, notify_email ? 1 : 0, notify_sms ? 1 : 0
        ]
      );
      console.log('[SERVICE createUser] insertId=', ok?.insertId);
      await conn.commit();

      const [[created]] = await db.execute(
        `SELECT u.*, r.name AS org_role_name
           FROM users u
           LEFT JOIN org_roles r ON r.code = u.org_role_code
          WHERE u.id = ? LIMIT 1`,
        [ok.insertId]
      );
      return created;
    }

    // Nhánh có org_role_code → generate employee_code (+ retry nếu đụng UNIQUE)
    if (org_role_code) {
      for (let i = 0; i < 5; i++) {
        const employee_code = await generateEmployeeCode(conn, org_role_code);
        try {
          const user = await insertAndReturn({ org_code: org_role_code, emp_code: employee_code });
          return user; // ✅ luôn return
        } catch (e) {
          if (e.code === 'ER_DUP_ENTRY') {
            // retry next number
            await conn.rollback();
            await conn.beginTransaction();
            continue;
          }
          throw e;
        }
      }
      const err = new Error('Failed to allocate employee_code');
      err.status = 500; throw err;
    }

    // Nhánh không có org_role_code
    const user = await insertAndReturn({ org_code: null, emp_code: null });
    return user; // ✅ luôn return

  } catch (e) {
    try { await conn.rollback(); } catch {}
    throw e;
  } finally {
    conn.release();
  }
}