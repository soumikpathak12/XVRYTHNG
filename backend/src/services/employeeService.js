// src/services/employeeService.js
import db from '../config/db.js';

// ---------------------- CREATE ----------------------
export async function createEmployee(companyId, payload) {
  if (!companyId) {
    const e = new Error('Missing company context');
    e.statusCode = 400;
    throw e;
  }

  const {
    employee_code = null,
    personal = {},
    contact = {},
    employment = {},
    qualifications = [],
    emergency_contacts = [],
  } = payload ?? {};

  const {
    first_name, last_name, date_of_birth = null, gender = null, avatar_url = null,
  } = personal ?? {};
  const {
    email, phone = null, address_line1 = null, address_line2 = null, city = null, state = null,
    postal_code = null, country = null,
  } = contact ?? {};
  const {
    department_id = null, job_role_id = null, employment_type_id = null,
    start_date = null, end_date = null, rate_type = 'monthly', rate_amount = 0,
  } = employment ?? {};

  if (!first_name || !last_name) {
    const err = new Error('first_name and last_name are required');
    err.statusCode = 422; throw err;
  }
  if (!email) {
    const err = new Error('email is required');
    err.statusCode = 422; throw err;
  }

  // Ensure FK belongs to company
  const checkSql = `
    SELECT
      (SELECT COUNT(*) FROM departments d WHERE d.id <=> ? AND d.company_id = ?) AS ok_dept,
      (SELECT COUNT(*) FROM job_roles jr WHERE jr.id <=> ? AND jr.company_id = ?) AS ok_role
  `;
  const [ck] = await db.execute(checkSql, [
    department_id ?? null, Number(companyId),
    job_role_id ?? null, Number(companyId),
  ]);
  if ((department_id && !ck?.[0]?.ok_dept) || (job_role_id && !ck?.[0]?.ok_role)) {
    const e = new Error('department_id or job_role_id invalid for this company');
    e.statusCode = 422; throw e;
  }

  const sql = `
    INSERT INTO employees (
      company_id, user_id, employee_code, first_name, last_name, date_of_birth, gender,
      email, phone, address_line1, address_line2, city, state, postal_code, country,
      department_id, job_role_id, employment_type_id, start_date, end_date,
      rate_type, rate_amount, status, avatar_url, created_at, updated_at
    ) VALUES (
      ?, NULL, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, 'active', ?, NOW(), NOW()
    )
  `;
  const params = [
    Number(companyId),
    employee_code ?? null,
    first_name, last_name, date_of_birth ?? null, gender ?? null,
    email, phone ?? null, address_line1 ?? null, address_line2 ?? null,
    city ?? null, state ?? null, postal_code ?? null, country ?? null,
    department_id ?? null, job_role_id ?? null, employment_type_id ?? null,
    start_date ?? null, end_date ?? null,
    rate_type ?? 'monthly', rate_amount == null ? 0 : Number(rate_amount),
    avatar_url ?? null,
  ];

  const [ins] = await db.execute(sql, params);
  if (!ins?.affectedRows) {
    const err = new Error('Insert employee returned 0 affected rows');
    err.statusCode = 500; throw err;
  }
  const empId = ins.insertId;

  // qualifications
  if (Array.isArray(qualifications) && qualifications.length > 0) {
    const qsql = `
      INSERT INTO employee_qualifications (employee_id, qualification_id, obtained_date, expires_date)
      VALUES (?, ?, ?, ?)
    `;
    for (const q of qualifications) {
      if (!q?.qualification_id) continue;
      await db.execute(qsql, [
        empId,
        Number(q.qualification_id),
        q.obtained_date ?? null,
        q.expires_date ?? null,
      ]);
    }
  }

  // emergency contacts
  if (Array.isArray(emergency_contacts) && emergency_contacts.length > 0) {
    const esql = `
      INSERT INTO emergency_contacts (employee_id, contact_name, relationship, phone, email, address)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    for (const e of emergency_contacts) {
      if (!e?.contact_name || !e?.phone) continue;
      await db.execute(esql, [
        empId,
        String(e.contact_name),
        e.relationship ?? null,
        String(e.phone),
        e.email ?? null,
        e.address ?? null,
      ]);
    }
  }

  const [row] = await db.execute(`
    SELECT e.*, d.name AS department_name, jr.name AS job_role_name, et.name AS employment_type_name
    FROM employees e
    LEFT JOIN departments d ON d.id = e.department_id
    LEFT JOIN job_roles jr ON jr.id = e.job_role_id
    LEFT JOIN employment_types et ON et.id = e.employment_type_id
    WHERE e.id = ? LIMIT 1
  `, [empId]);

  return row?.[0];
}

// ---------------------- LIST ----------------------
export async function listEmployees(
  companyId,
  { department_id, job_role_id, status, q, limit, offset } = {}
) {
  if (!companyId) return [];

  const where = ['e.company_id = ?'];
  const params = [Number(companyId)];

  if (department_id) { where.push('e.department_id = ?'); params.push(Number(department_id)); }
  if (job_role_id)   { where.push('e.job_role_id   = ?'); params.push(Number(job_role_id)); }
  if (status)        { where.push('e.status        = ?'); params.push(String(status)); }
  if (q) {
    where.push('(e.first_name LIKE ? OR e.last_name LIKE ? OR e.email LIKE ?)');
    const like = `%${q}%`;
    params.push(like, like, like);
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
      e.department_id, e.job_role_id,
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

// ---------------------- GET DETAIL ----------------------
export async function getEmployee(companyId, id) {
  if (!companyId) {
    const e = new Error('Missing company context'); e.statusCode = 400; throw e;
  }
  const [emp] = await db.execute(`
    SELECT e.*, d.name AS department, jr.name AS role, et.name AS employment_type
    FROM employees e
    LEFT JOIN departments d ON d.id = e.department_id
    LEFT JOIN job_roles jr ON jr.id = e.job_role_id
    LEFT JOIN employment_types et ON et.id = e.employment_type_id
    WHERE e.company_id = ? AND e.id = ? LIMIT 1
  `, [Number(companyId), Number(id)]);
  const employee = emp?.[0];
  if (!employee) {
    const err = new Error('Employee not found'); err.statusCode = 404; throw err;
  }

  const [quals] = await db.execute(`
    SELECT q.id, q.name, q.authority, eq.obtained_date, eq.expires_date
    FROM employee_qualifications eq
    JOIN qualifications q ON q.id = eq.qualification_id
    WHERE eq.employee_id = ?
  `, [Number(id)]);

  const [emg] = await db.execute(`
    SELECT id, contact_name, relationship, phone, email, address
    FROM emergency_contacts
    WHERE employee_id = ?
    ORDER BY id ASC
  `, [Number(id)]);

  return { employee, qualifications: quals, emergency_contacts: emg };
}

// ---------------------- UPDATE ----------------------
export async function updateEmployee(companyId, id, payload) {
  if (!companyId) {
    const e = new Error('Missing company context'); e.statusCode = 400; throw e;
  }

  const [own] = await db.execute(
    'SELECT id FROM employees WHERE id = ? AND company_id = ? LIMIT 1',
    [Number(id), Number(companyId)],
  );
  if (!own?.[0]) {
    const err = new Error('Employee not found'); err.statusCode = 404; throw err;
  }

  const { personal = {}, contact = {}, employment = {}, qualifications = null, emergency_contacts = null } = payload ?? {};
  const cols = []; const params = [];
  const set = (col, val) => { cols.push(`${col} = ?`); params.push(val); };

  // personal
  if (personal.first_name !== undefined) set('first_name', personal.first_name);
  if (personal.last_name !== undefined) set('last_name', personal.last_name);
  if (personal.date_of_birth !== undefined) set('date_of_birth', personal.date_of_birth ?? null);
  if (personal.gender !== undefined) set('gender', personal.gender ?? null);
  if (personal.avatar_url !== undefined) set('avatar_url', personal.avatar_url ?? null);

  // contact
  if (contact.email !== undefined) set('email', contact.email);
  if (contact.phone !== undefined) set('phone', contact.phone ?? null);
  if (contact.address_line1 !== undefined) set('address_line1', contact.address_line1 ?? null);
  if (contact.address_line2 !== undefined) set('address_line2', contact.address_line2 ?? null);
  if (contact.city !== undefined) set('city', contact.city ?? null);
  if (contact.state !== undefined) set('state', contact.state ?? null);
  if (contact.postal_code !== undefined) set('postal_code', contact.postal_code ?? null);
  if (contact.country !== undefined) set('country', contact.country ?? null);

  // employment
  if (employment.department_id !== undefined) set('department_id', employment.department_id ?? null);
  if (employment.job_role_id !== undefined) set('job_role_id', employment.job_role_id ?? null);
  if (employment.employment_type_id !== undefined) set('employment_type_id', employment.employment_type_id ?? null);
  if (employment.start_date !== undefined) set('start_date', employment.start_date ?? null);
  if (employment.end_date !== undefined) set('end_date', employment.end_date ?? null);
  if (employment.rate_type !== undefined) set('rate_type', employment.rate_type ?? 'monthly');
  if (employment.rate_amount !== undefined) set('rate_amount', employment.rate_amount ?? 0);

  if (cols.length) {
    params.push(Number(id));
    const sql = `UPDATE employees SET ${cols.join(', ')}, updated_at = NOW() WHERE id = ?`;
    await db.execute(sql, params);
  }

  // replace qualifications if provided
  if (Array.isArray(qualifications)) {
    await db.execute('DELETE FROM employee_qualifications WHERE employee_id = ?', [Number(id)]);
    if (qualifications.length) {
      const sql = `
        INSERT INTO employee_qualifications (employee_id, qualification_id, obtained_date, expires_date)
        VALUES (?, ?, ?, ?)
      `;
      for (const q of qualifications) {
        if (!q?.qualification_id) continue;
        await db.execute(sql, [
          Number(id),
          Number(q.qualification_id),
          q.obtained_date ?? null,
          q.expires_date ?? null,
        ]);
      }
    }
  }

  // replace emergency contacts if provided
  if (Array.isArray(emergency_contacts)) {
    await db.execute('DELETE FROM emergency_contacts WHERE employee_id = ?', [Number(id)]);
    if (emergency_contacts.length) {
      const sql = `
        INSERT INTO emergency_contacts (employee_id, contact_name, relationship, phone, email, address)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      for (const e of emergency_contacts) {
        if (!e?.contact_name || !e?.phone) continue;
        await db.execute(sql, [
          Number(id),
          String(e.contact_name),
          e.relationship ?? null,
          String(e.phone),
          e.email ?? null,
          e.address ?? null,
        ]);
      }
    }
  }

  return getEmployee(Number(companyId), Number(id));
}

// --------------------- DEACTIVATE ----------------------
export async function deactivateEmployee(companyId, id) {
  if (!companyId) {
    const e = new Error('Missing company context'); e.statusCode = 400; throw e;
  }
  const [own] = await db.execute('SELECT id FROM employees WHERE id = ? AND company_id = ? LIMIT 1', [Number(id), Number(companyId)]);
  if (!own?.[0]) {
    const err = new Error('Employee not found'); err.statusCode = 404; throw err;
  }
  await db.execute("UPDATE employees SET status = 'inactive', updated_at = NOW() WHERE id = ?", [Number(id)]);
  const [row] = await db.execute('SELECT id, status FROM employees WHERE id = ? LIMIT 1', [Number(id)]);
  return row?.[0];
}

export async function getRoleModulesPreview(companyId, jobRoleId) {
  if (!companyId) {
    const e = new Error('Missing company context'); e.statusCode = 400; throw e;
  }
  const [rows] = await db.execute(`
    SELECT module_key, display_name
    FROM v_role_access_preview
    WHERE company_id = ? AND job_role_id = ?
    ORDER BY display_name
  `, [Number(companyId), Number(jobRoleId)]);
  return rows;
}

export async function getJobRolesForCompany(companyId) {
  console.log('[EMP SRV] getJobRoles companyId =', companyId);
  const [rows] = await db.execute(
    `SELECT id, code, name
     FROM job_roles
     WHERE company_id = ?
     ORDER BY name ASC`,
    [Number(companyId)]
  );
  console.log('[EMP SRV] getJobRoles returned =', rows?.length);
  return rows;
}
``

export async function getEmploymentTypes() {
  const [rows] = await db.execute(
    `SELECT id, name
     FROM employment_types
     ORDER BY id ASC`
  );
  return rows;
}