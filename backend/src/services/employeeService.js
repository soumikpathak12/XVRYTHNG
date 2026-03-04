// src/services/employeeService.js
import db from '../config/db.js';
import bcrypt from 'bcryptjs';
import { sendEmployeeCredentialEmail } from './emailService.js';

function asNumberOrNull(v) {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}


export async function createEmployee(companyId, payload) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const {
      employee_code,
      personal = {},
      contact = {},
      employment = {},
      account = {}, // { enable_login, password }
      qualifications = [],
      emergency_contacts = [],
    } = payload ?? {};

    let _newLoginEmail = null;
    let _tempPassword = null;

    let finalCode = employee_code ?? null;
    if (!finalCode) {
      finalCode = await genEmployeeCode(conn, companyId, employment?.job_role_id);
    }

    // 1) Insert employee
    const [empRes] = await conn.execute(
      `
      INSERT INTO employees (
        company_id, user_id, employee_code,
        first_name, last_name, date_of_birth, gender,
        email, phone, address_line1, address_line2, city, state, postal_code, country,
        department_id, job_role_id, employment_type_id,
        start_date, end_date, rate_type, rate_amount,
        status, avatar_url, created_at, updated_at
      )
      VALUES (
        ?, NULL, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?,
        'active', ?, NOW(), NOW()
      )
      `,
      [
        Number(companyId), finalCode ?? null,
        personal.first_name ?? '', personal.last_name ?? '', personal.date_of_birth ?? null, personal.gender ?? null,
        contact.email ?? '', contact.phone ?? null, contact.address_line1 ?? null, contact.address_line2 ?? null,
        contact.city ?? null, contact.state ?? null, contact.postal_code ?? null, contact.country ?? null,
        asNumberOrNull(employment.department_id), asNumberOrNull(employment.job_role_id), asNumberOrNull(employment.employment_type_id),
        employment.start_date || null, employment.end_date || null,
        employment.rate_type || 'monthly', Number(employment.rate_amount ?? 0),
        personal.avatar_url ?? null,
      ]
    );
    const employeeId = empRes.insertId;

    if (Array.isArray(emergency_contacts) && emergency_contacts.length > 0) {
      const rows = emergency_contacts
        .filter(c => c && (c.contact_name || c.phone || c.email))
        .map(c => [
          Number(employeeId),
          c.contact_name ?? '',
          c.relationship ?? null,
          c.phone ?? '',
          c.email ?? null,
          c.address ?? null,
        ]);
      if (rows.length > 0) {
        const placeholders = rows.map(() => '(?,?,?,?,?,?)').join(',');
        await conn.query(
          `INSERT INTO emergency_contacts
             (employee_id, contact_name, relationship, phone, email, address)
           VALUES ${placeholders}`,
          rows.flat()
        );
      }
    }

    if (account?.enable_login) {
      const email = (contact.email ?? '').trim().toLowerCase();
      if (!email) throw new Error('Email is required to create login');
      if (!account.password || account.password.length < 8) {
        throw new Error('Password must be at least 8 characters');
      }
      const platformRoleId = 4; // field_agent
      const fullName = `${personal.first_name ?? ''} ${personal.last_name ?? ''}`.trim() || email;
      const passwordHash = await bcrypt.hash(account.password, 10);

      const [userRes] = await conn.execute(
        `
        INSERT INTO users (company_id, role_id, email, password_hash, name, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 'active', NOW(), NOW())
        `,
        [Number(companyId), platformRoleId, email, passwordHash, fullName]
      );
      const userId = userRes.insertId;

      await conn.execute(
        `UPDATE employees SET user_id = ? WHERE id = ?`,
        [userId, employeeId]
      );
      
      await conn.execute(
        `UPDATE users SET must_change_password = 1 WHERE id = ?`,
        [userId]
      );

      _newLoginEmail = email;
      _tempPassword = account.password;

    }

    await conn.commit();

    
    try {
      if (_newLoginEmail) {
        await sendEmployeeCredentialEmail({
          to: _newLoginEmail,
          employeeName: `${personal.first_name ?? ''} ${personal.last_name ?? ''}`.trim(),
          email: _newLoginEmail,
          tempPassword: _tempPassword,
          companyName: 'XVRYTHNG',
          appUrl: process.env.APP_BASE_URL || 'http://localhost:5173',
        });
     }
    } catch (mailErr) {
      console.error('[ONBOARD] Send credential email failed:', mailErr?.message || mailErr);
    }

    return { id: employeeId };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

export async function createEmployeeAccount(companyId, employeeId, password) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [[emp]] = await conn.execute(
      `
      SELECT e.id, e.company_id, e.email, e.first_name, e.last_name, e.user_id
      FROM employees e
      WHERE e.company_id = ? AND e.id = ?
      LIMIT 1
      `,
      [Number(companyId), Number(employeeId)]
    );
    if (!emp) throw new Error('Employee not found');
    if (emp.user_id) throw new Error('Employee already has a user account');

    const email = (emp.email ?? '').trim().toLowerCase();
    if (!email) throw new Error('Employee has no email');
    if (!password || password.length < 8) throw new Error('Password must be at least 8 characters');

    const passwordHash = await bcrypt.hash(password, 10);
    const platformRoleId = 4; // field_agent
    const fullName = `${emp.first_name ?? ''} ${emp.last_name ?? ''}`.trim() || email;

    const [userRes] = await conn.execute(
      `
      INSERT INTO users (company_id, role_id, email, password_hash, name, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'active', NOW(), NOW())
      `,
      [Number(companyId), platformRoleId, email, passwordHash, fullName]
    );
    const userId = userRes.insertId;

    await conn.execute(`UPDATE employees SET user_id = ? WHERE id = ?`, [userId, employeeId]);
    
    await conn.execute(
      `UPDATE users SET must_change_password = 1 WHERE id = ?`,
      [userId]
    );

    
  await conn.commit();

   try {
     await sendEmployeeCredentialEmail({
       to: email,
       employeeName: fullName,
       email,
       tempPassword: password, 
       appUrl: process.env.APP_BASE_URL || 'http://localhost:5173',
     });
   } catch (mailErr) {
     console.error('[ONBOARD] Send credential email (createAccount) failed:', mailErr?.message || mailErr);
   }

   return { user_id: userId };

  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}


export async function listEmployees(companyId, {
  department_id, job_role_id, status, q, limit, offset,
} = {}) {
  if (!companyId) return [];

  const where = ['e.company_id = ?'];
  const params = [Number(companyId)];

  if (department_id) { where.push('e.department_id = ?'); params.push(Number(department_id)); }
  if (job_role_id)   { where.push('e.job_role_id   = ?'); params.push(Number(job_role_id)); }
  if (status)        { where.push('e.status        = ?'); params.push(String(status)); }
  if (q) {
    where.push('(e.first_name LIKE ? OR e.last_name LIKE ? OR e.email LIKE ?)');
    const like = `%${q}%`; params.push(like, like, like);
  }

  let lim = '';
  if (Number.isFinite(limit) && limit > 0) {
    lim = 'LIMIT ?';
    params.push(Number(limit));
    if (Number.isFinite(offset) && offset >= 0) {
      lim = 'LIMIT ? OFFSET ?';
      params.push(Number(limit), Number(offset));
    }
  }

  const sql = `
    SELECT
      e.id, e.employee_code,
      e.first_name, e.last_name, e.email, e.phone, e.status, e.avatar_url,
      e.department_id, e.job_role_id, e.user_id, -- <== quan trọng cho Create Login
      d.name  AS department,
      jr.name AS role
    FROM employees e
    LEFT JOIN departments d
      ON d.id = CAST(e.department_id AS UNSIGNED) AND d.company_id = e.company_id
    LEFT JOIN job_roles jr
      ON jr.id = CAST(e.job_role_id  AS UNSIGNED) AND jr.company_id = e.company_id
    WHERE ${where.join(' AND ')}
    ORDER BY e.created_at DESC
    ${lim}
  `;
  const [rows] = await db.execute(sql, params);
  return rows;
}

export async function getEmployee(companyId, id) {
  const [[row]] = await db.execute(
    `
    SELECT e.*
    FROM employees e
    WHERE e.company_id = ? AND e.id = ?
    LIMIT 1
    `,
    [Number(companyId), Number(id)]
  );
  return row ?? null;
}

export async function updateEmployee(companyId, id, body = {}) {
  const fields = [];
  const params = [];

  const map = {
    first_name: body?.personal?.first_name,
    last_name: body?.personal?.last_name,
    date_of_birth: body?.personal?.date_of_birth,
    gender: body?.personal?.gender,
    avatar_url: body?.personal?.avatar_url,

    email: body?.contact?.email,
    phone: body?.contact?.phone,
    address_line1: body?.contact?.address_line1,
    address_line2: body?.contact?.address_line2,
    city: body?.contact?.city,
    state: body?.contact?.state,
    postal_code: body?.contact?.postal_code,
    country: body?.contact?.country,

    department_id: asNumberOrNull(body?.employment?.department_id),
    job_role_id: asNumberOrNull(body?.employment?.job_role_id),
    employment_type_id: asNumberOrNull(body?.employment?.employment_type_id),
    start_date: body?.employment?.start_date,
    end_date: body?.employment?.end_date,
    rate_type: body?.employment?.rate_type,
    rate_amount: Number(body?.employment?.rate_amount ?? 0),
  };

  for (const [k, v] of Object.entries(map)) {
    if (v !== undefined) { fields.push(`${k} = ?`); params.push(v); }
  }
  if (fields.length === 0) return await getEmployee(companyId, id);

  const sql = `
    UPDATE employees
       SET ${fields.join(', ')}, updated_at = NOW()
     WHERE company_id = ? AND id = ?
  `;
  params.push(Number(companyId), Number(id));

  await db.execute(sql, params);
  return await getEmployee(companyId, id);
}

export async function deactivateEmployee(companyId, id) {
  await db.execute(
    `UPDATE employees SET status = 'inactive', updated_at = NOW() WHERE company_id = ? AND id = ?`,
    [Number(companyId), Number(id)]
  );
  return await getEmployee(companyId, id);
}


export async function getRoleModulesPreview(companyId, jobRoleId) {
  const [rows] = await db.execute(
    `
    SELECT m.key_name AS module_key, m.display_name
    FROM job_role_modules jrm
    JOIN job_roles jr ON jr.id = jrm.job_role_id AND jr.company_id = ?
    JOIN modules m   ON m.key_name = jrm.module_key
    WHERE jrm.job_role_id = ?
    ORDER BY m.display_name
    `,
    [Number(companyId), Number(jobRoleId)]
  );
  return rows;
}

export async function getJobRolesForCompany(companyId) {
  const [rows] = await db.execute(
    `
    SELECT id, code, name
    FROM job_roles
    WHERE company_id = ?
    ORDER BY name ASC
    `,
    [Number(companyId)]
  );
  return rows;
}

export async function getEmploymentTypes() {
  const [rows] = await db.execute(
    `SELECT id, name FROM employment_types ORDER BY id ASC`
  );
  return rows;
}

async function genEmployeeCode(conn, companyId, jobRoleId) {
  if (!jobRoleId) return null; 
  const [[jr]] = await conn.execute(
    'SELECT code FROM job_roles WHERE id = ? AND company_id = ? LIMIT 1',
    [Number(jobRoleId), Number(companyId)]
  );
  if (!jr) return null;
  const roleCode = String(jr.code || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const prefix = 'XTR';
  const base = `${prefix}-${roleCode}-`;
  const like = `${base}%`;

  const [[row]] = await conn.execute(
    `SELECT MAX(CAST(SUBSTRING(employee_code, LENGTH(?) + 1) AS UNSIGNED)) AS max_seq
     FROM employees
     WHERE company_id = ? AND employee_code LIKE ?`,
    [base, Number(companyId), like]
  );

  const next = (row?.max_seq || 0) + 1;
  const seq = String(next).padStart(3, '0');
  return `${base}${seq}`;
}