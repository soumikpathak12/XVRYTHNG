// src/services/employeeService.js
import db from '../config/db.js';
import bcrypt from 'bcryptjs';
import { sendEmployeeCredentialEmail } from './emailService.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_DIGITS_REGEX = /^\d{8,15}$/;
const AU_STATE_LOOKUP = new Map([
  ['NSW', 'NSW'],
  ['NEW SOUTH WALES', 'NSW'],
  ['VIC', 'VIC'],
  ['VICTORIA', 'VIC'],
  ['QLD', 'QLD'],
  ['QUEENSLAND', 'QLD'],
  ['WA', 'WA'],
  ['WESTERN AUSTRALIA', 'WA'],
  ['SA', 'SA'],
  ['SOUTH AUSTRALIA', 'SA'],
  ['TAS', 'TAS'],
  ['TASMANIA', 'TAS'],
  ['ACT', 'ACT'],
  ['AUSTRALIAN CAPITAL TERRITORY', 'ACT'],
  ['NT', 'NT'],
  ['NORTHERN TERRITORY', 'NT'],
]);

function asNumberOrNull(v) {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function asDateOrNull(v) {
  if (v == null || v === '') return null;
  // Extract only YYYY-MM-DD from ISO strings like "2004-05-07T00:00:00.000Z"
  const dateStr = String(v).split('T')[0];
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? dateStr : null;
}

function toSqlDateString(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function startOfMonthSqlDate(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
}

function parseSqlDate(value) {
  const dateStr = String(value ?? '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const [year, month, day] = dateStr.split('-').map(Number);
  const parsed = new Date(year, month - 1, day);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function businessDaysBetween(startDate, endDate) {
  const start = parseSqlDate(startDate);
  const end = parseSqlDate(endDate);
  if (!start || !end || end < start) return 0;

  let count = 0;
  const current = new Date(start);
  while (current <= end) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) count += 1;
    current.setDate(current.getDate() + 1);
  }
  return count;
}

function overlapBusinessDays(startDateA, endDateA, startDateB, endDateB) {
  const start = String(startDateA).slice(0, 10) > String(startDateB).slice(0, 10)
    ? String(startDateA).slice(0, 10)
    : String(startDateB).slice(0, 10);
  const end = String(endDateA).slice(0, 10) < String(endDateB).slice(0, 10)
    ? String(endDateA).slice(0, 10)
    : String(endDateB).slice(0, 10);
  if (end < start) return 0;
  return businessDaysBetween(start, end);
}

function validateEmployeeContact(rawContact = {}, { requireEmail = false, requirePhone = false, requireState = false } = {}) {
  const email = String(rawContact?.email ?? '').trim().toLowerCase();
  const phone = String(rawContact?.phone ?? '').trim();
  const stateRaw = String(rawContact?.state ?? '').trim().toUpperCase();
  const normalizedState = stateRaw ? (AU_STATE_LOOKUP.get(stateRaw) ?? null) : null;

  if (requireEmail && !email) throw new Error('Email is required');
  if (email && !EMAIL_REGEX.test(email)) throw new Error('Email format is invalid');

  if (requirePhone && !phone) throw new Error('Phone number is required');
  if (phone && !PHONE_DIGITS_REGEX.test(phone)) throw new Error('Phone number must be 8-15 digits');

  if (requireState && !stateRaw) throw new Error('State is required');
  if (stateRaw && !normalizedState) throw new Error('State must be a valid Australian state/territory');

  return {
    ...rawContact,
    email,
    phone: phone || null,
    state: normalizedState,
  };
}

async function getCompanyDisplayName(companyId) {
  if (companyId == null || companyId === '') return 'XVRYTHNG';
  try {
    const [[row]] = await db.execute(
      'SELECT name FROM companies WHERE id = ? LIMIT 1',
      [Number(companyId)]
    );
    return row?.name != null ? String(row.name) : 'XVRYTHNG';
  } catch {
    return 'XVRYTHNG';
  }
}


export async function createEmployee(companyId, payload) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const {
      employee_code,
      personal = {},
      contact: rawContact = {},
      employment = {},
      account = {}, // { enable_login, password }
      qualifications = [],
      emergency_contacts = [],
    } = payload ?? {};

    const contact = validateEmployeeContact(rawContact, {
      requireEmail: true,
      requirePhone: true,
      requireState: true,
    });

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
        personal.first_name ?? '', personal.last_name ?? '', asDateOrNull(personal.date_of_birth), personal.gender ?? null,
        contact.email ?? '', contact.phone ?? null, contact.address_line1 ?? null, contact.address_line2 ?? null,
        contact.city ?? null, contact.state ?? null, contact.postal_code ?? null, contact.country ?? null,
        asNumberOrNull(employment.department_id), asNumberOrNull(employment.job_role_id), asNumberOrNull(employment.employment_type_id),
        asDateOrNull(employment.start_date), asDateOrNull(employment.end_date),
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

    const tempPassword = (account?.password ?? '').trim();
    // Create login if a password is provided (wizard now always generates one).
    if (tempPassword) {
      const email = (contact.email ?? '').trim().toLowerCase();
      if (!email) throw new Error('Email is required to create login');
      if (tempPassword.length < 8) throw new Error('Password must be at least 8 characters');
      const platformRoleId = 4; // field_agent
      const fullName = `${personal.first_name ?? ''} ${personal.last_name ?? ''}`.trim() || email;
      const passwordHash = await bcrypt.hash(tempPassword, 10);

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
      _tempPassword = tempPassword;

    }

    await conn.commit();

    
    try {
      if (_newLoginEmail) {
        const companyName = await getCompanyDisplayName(companyId);
        await sendEmployeeCredentialEmail({
          to: _newLoginEmail,
          employeeName: `${personal.first_name ?? ''} ${personal.last_name ?? ''}`.trim(),
          email: _newLoginEmail,
          tempPassword: _tempPassword,
          companyName,
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
     const companyName = await getCompanyDisplayName(companyId);
     await sendEmployeeCredentialEmail({
       to: email,
       employeeName: fullName,
       email,
       tempPassword: password,
       companyName,
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
    SELECT
      e.*,
      d.name AS department,
      jr.name AS role
    FROM employees e
    LEFT JOIN departments d
      ON d.id = CAST(e.department_id AS UNSIGNED) AND d.company_id = e.company_id
    LEFT JOIN job_roles jr
      ON jr.id = CAST(e.job_role_id AS UNSIGNED) AND jr.company_id = e.company_id
    WHERE e.company_id = ? AND e.id = ?
    LIMIT 1
    `,
    [Number(companyId), Number(id)]
  );
  if (!row) return null;

  const today = toSqlDateString();
  const monthStart = startOfMonthSqlDate();
  const year = new Date().getFullYear();

  const [attendanceRows, leaveRows, balanceRows, performanceRows, expenseRows] = await Promise.all([
    db.execute(
      `
      SELECT id, date, check_in_time, check_out_time, hours_worked
      FROM employee_attendance
      WHERE company_id = ? AND employee_id = ?
        AND date >= ? AND date <= ?
      ORDER BY date DESC, check_in_time DESC
      `,
      [Number(companyId), Number(id), monthStart, today]
    ),
    db.execute(
      `
      SELECT id, leave_type, start_date, end_date, days_count, status, created_at
      FROM leave_requests
      WHERE company_id = ? AND employee_id = ?
        AND status = 'approved'
        AND start_date <= ? AND end_date >= ?
      ORDER BY start_date DESC, created_at DESC
      `,
      [Number(companyId), Number(id), today, monthStart]
    ),
    db.execute(
      `
      SELECT leave_type, total_days, used_days, year
      FROM leave_balances
      WHERE company_id = ? AND employee_id = ? AND year = ?
      ORDER BY leave_type
      `,
      [Number(companyId), Number(id), year]
    ),
    row.user_id
      ? db.execute(
          `
          SELECT
            COUNT(*) AS leads_converted,
            COALESCE(SUM(COALESCE(value_amount, 0)), 0) AS revenue_generated
          FROM leads
          WHERE company_id = ?
            AND assigned_user_id = ?
            AND stage = 'closed_won'
            AND DATE(COALESCE(won_lost_at, updated_at, created_at)) >= ?
            AND DATE(COALESCE(won_lost_at, updated_at, created_at)) <= ?
          `,
          [Number(companyId), Number(row.user_id), monthStart, today]
        )
      : Promise.resolve([[{ leads_converted: 0, revenue_generated: 0 }]]),
    db.execute(
      `
      SELECT id, project_name, category, amount, currency, expense_date, status, created_at
      FROM expense_claims
      WHERE company_id = ? AND employee_id = ?
      ORDER BY created_at DESC
      LIMIT 5
      `,
      [Number(companyId), Number(id)]
    ),
  ]);

  const attendanceList = Array.isArray(attendanceRows?.[0]) ? attendanceRows[0] : [];
  const approvedLeaveList = Array.isArray(leaveRows?.[0]) ? leaveRows[0] : [];
  const balanceList = Array.isArray(balanceRows?.[0]) ? balanceRows[0] : [];
  const performance = Array.isArray(performanceRows?.[0]) ? performanceRows[0]?.[0] ?? {} : {};
  const recentExpenseClaims = Array.isArray(expenseRows?.[0]) ? expenseRows[0] : [];

  const presentDates = new Set(
    attendanceList
      .map((entry) => String(entry.date ?? '').slice(0, 10))
      .filter(Boolean)
  );

  const approvedLeaveDays = approvedLeaveList.reduce(
    (total, entry) => total + overlapBusinessDays(entry.start_date, entry.end_date, monthStart, today),
    0
  );
  const workingDays = businessDaysBetween(monthStart, today);
  const daysPresent = presentDates.size;

  return {
    ...row,
    attendance_summary: {
      period_start: monthStart,
      period_end: today,
      working_days: workingDays,
      days_present: daysPresent,
      approved_leave_days: approvedLeaveDays,
      days_absent: Math.max(0, workingDays - daysPresent - approvedLeaveDays),
      recent_check_ins: attendanceList.slice(0, 5).map((entry) => ({
        id: entry.id,
        date: entry.date,
        check_in_time: entry.check_in_time,
        check_out_time: entry.check_out_time,
        hours_worked: entry.hours_worked,
      })),
    },
    leave_summary: {
      year,
      approved_days_this_month: approvedLeaveDays,
      balances: balanceList.map((entry) => ({
        leave_type: entry.leave_type,
        total_days: Number(entry.total_days ?? 0),
        used_days: Number(entry.used_days ?? 0),
        remaining: Math.max(0, Number(entry.total_days ?? 0) - Number(entry.used_days ?? 0)),
        year: entry.year,
      })),
    },
    performance_summary: {
      period_start: monthStart,
      period_end: today,
      leads_converted: Number(performance?.leads_converted ?? 0),
      revenue_generated: Number(performance?.revenue_generated ?? 0),
    },
    recent_expense_claims: recentExpenseClaims.map((entry) => ({
      id: entry.id,
      project_name: entry.project_name,
      category: entry.category,
      amount: Number(entry.amount ?? 0),
      currency: entry.currency || 'AUD',
      expense_date: entry.expense_date,
      status: entry.status,
      created_at: entry.created_at,
    })),
  };
}

export async function updateEmployee(companyId, id, body = {}) {
  const normalizedContact = validateEmployeeContact(body?.contact ?? {}, {
    requireEmail: false,
    requirePhone: false,
    requireState: false,
  });

  const fields = [];
  const params = [];

  const map = {
    first_name: body?.personal?.first_name,
    last_name: body?.personal?.last_name,
    date_of_birth: asDateOrNull(body?.personal?.date_of_birth),
    gender: body?.personal?.gender,
    avatar_url: body?.personal?.avatar_url,

    email: body?.contact?.email === undefined ? undefined : normalizedContact.email,
    phone: body?.contact?.phone === undefined ? undefined : normalizedContact.phone,
    address_line1: body?.contact?.address_line1,
    address_line2: body?.contact?.address_line2,
    city: body?.contact?.city,
    state: body?.contact?.state === undefined ? undefined : normalizedContact.state,
    postal_code: body?.contact?.postal_code,
    country: body?.contact?.country,

    department_id: asNumberOrNull(body?.employment?.department_id),
    job_role_id: asNumberOrNull(body?.employment?.job_role_id),
    employment_type_id: asNumberOrNull(body?.employment?.employment_type_id),
    start_date: asDateOrNull(body?.employment?.start_date),
    end_date: asDateOrNull(body?.employment?.end_date),
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


export async function getDepartmentsForCompany(companyId) {
  const [rows] = await db.execute(
    `
    SELECT id, code, name
    FROM departments
    WHERE company_id = ?
    ORDER BY name ASC
    `,
    [Number(companyId)]
  );
  return rows;
}