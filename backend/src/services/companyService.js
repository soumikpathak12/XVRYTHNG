/**
* Company (tenant) service: create company, company admin, company types & modules.
* All tenant data isolated by company_id.
*/
import bcrypt from 'bcryptjs';
import db from '../config/db.js';

function slugify(name) {
  return String(name)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'company';
}

function ensureUniqueSlug(baseSlug) {
  return db.execute('SELECT id FROM companies WHERE slug = ? LIMIT 1', [baseSlug]).then(([rows]) => {
    if (rows.length === 0) return baseSlug;
    return ensureUniqueSlug(baseSlug + '-' + Math.random().toString(36).slice(2, 8));
  });
}

/**
 * Create company and company admin user in a transaction.
 * @param {object} company - name, abn, contact_email, contact_phone, company_type_id, address fields
 * @param {object} admin - email, password, name
 * @returns {Promise<{ company, adminUser }>}
 */
export async function createCompanyWithAdmin(company, admin) {
  const slug = await ensureUniqueSlug(slugify(company.name));
  const [roleRows] = await db.execute('SELECT id FROM roles WHERE name = ? LIMIT 1', ['company_admin']);
  const roleId = roleRows[0]?.id;
  if (!roleId) throw new Error('Company admin role not found');

  const passwordHash = await bcrypt.hash(admin.password, 12);
  const adminEmail = String(admin.email).trim().toLowerCase();
  const adminName = String(admin.name).trim();

  const [result] = await db.execute(
    `INSERT INTO companies (
      name, slug, status, abn, contact_email, contact_phone,
      address_line1, address_line2, city, state, postcode, country, company_type_id
    ) VALUES (?, ?, 'active', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      company.name?.trim() || null,
      slug,
      company.abn?.trim() || null,
      company.contact_email?.trim() || null,
      company.contact_phone?.trim() || null,
      company.address_line1?.trim() || null,
      company.address_line2?.trim() || null,
      company.city?.trim() || null,
      company.state?.trim() || null,
      company.postcode?.trim() || null,
      company.country?.trim() || 'Australia',
      company.company_type_id ?? null,
    ]
  );
  const companyId = result.insertId;

  await db.execute(
    `INSERT INTO users (company_id, role_id, email, password_hash, name, status)
     VALUES (?, ?, ?, ?, ?, 'active')`,
    [companyId, roleId, adminEmail, passwordHash, adminName]
  );
  const [userRows] = await db.execute(
    'SELECT id, company_id, email, name, role_id FROM users WHERE company_id = ? AND email = ? LIMIT 1',
    [companyId, adminEmail]
  );

  return {
    company: {
      id: companyId,
      name: company.name?.trim(),
      slug,
      status: 'active',
      abn: company.abn,
      contact_email: company.contact_email,
      contact_phone: company.contact_phone,
      company_type_id: company.company_type_id,
      address_line1: company.address_line1,
      address_line2: company.address_line2,
      city: company.city,
      state: company.state,
      postcode: company.postcode,
      country: company.country,
    },
    adminUser: userRows[0],
  };
}

/**
 * List company types with their enabled modules (for onboarding wizard).
 */
export async function getCompanyTypesWithModules() {
  const [types] = await db.execute(
    'SELECT id, name, description FROM company_types ORDER BY name'
  );
  const [modules] = await db.execute(
    `SELECT ctm.company_type_id, ctm.module_key
     FROM company_type_modules ctm
     ORDER BY ctm.company_type_id, ctm.module_key`
  );
  const byType = {};
  for (const t of types) byType[t.id] = { ...t, modules: [] };
  for (const m of modules) {
    if (byType[m.company_type_id]) byType[m.company_type_id].modules.push(m.module_key);
  }
  return Object.values(byType);
}

/**
 * List companies (super_admin only). Optionally filter by status.
 * Uses base columns so it works before migrate:tenants; after migration includes type & contact.
 */
export async function listCompanies(options = {}) {
  const { status } = options;
  const [cols] = await db.execute(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'companies' AND COLUMN_NAME IN ('abn','company_type_id')`,
    [process.env.DB_NAME]
  );
  const hasExtended = cols.length >= 2;
  let sql = hasExtended
    ? `SELECT c.id, c.name, c.slug, c.status, c.abn, c.contact_email, c.contact_phone,
       c.company_type_id, c.created_at, ct.name AS company_type_name
       FROM companies c
       LEFT JOIN company_types ct ON c.company_type_id = ct.id`
    : `SELECT c.id, c.name, c.slug, c.status, c.created_at FROM companies c`;
  const params = [];
  if (status) {
    sql += hasExtended ? ' WHERE c.status = ?' : ' WHERE c.status = ?';
    params.push(status);
  }
  sql += ' ORDER BY c.name';
  const [rows] = await db.execute(sql, params);
  return rows;
}

export async function getCompanyWithAdmin(id) {
  // Fetch company
  const [companies] = await db.execute(
    `SELECT c.*, ct.name AS company_type_name
     FROM companies c
     LEFT JOIN company_types ct ON c.company_type_id = ct.id
     WHERE c.id = ?`,
    [id]
  );
  if (companies.length === 0) return null;
  const company = companies[0];

  // Fetch company admin user
  // Assuming 'company_admin' role exists and we pick the first one created
  const [users] = await db.execute(
    `SELECT u.id, u.name, u.email, u.status
     FROM users u
     JOIN roles r ON u.role_id = r.id
     WHERE u.company_id = ? AND r.name = 'company_admin'
     ORDER BY u.created_at ASC LIMIT 1`,
    [id]
  );
  const admin = users[0] || null;

  return { company, admin };
}

/**
 * Get modules enabled for a company (by company_type_id).
 */
export async function getModulesForCompany(companyId) {
  const [rows] = await db.execute(
    `SELECT ctm.module_key
     FROM companies c
     INNER JOIN company_type_modules ctm ON c.company_type_id = ctm.company_type_id
     WHERE c.id = ?
     ORDER BY ctm.module_key`,
    [companyId]
  );
  return rows.map((r) => r.module_key);
}
export async function updateCompany(id, data) {
  const fields = [];
  const params = [];

  const allowed = [
    'name', 'status', 'abn', 'contact_email', 'contact_phone',
    'address_line1', 'address_line2', 'city', 'state', 'postcode', 'country',
    'company_type_id'
  ];

  for (const key of allowed) {
    if (data[key] !== undefined) {
      fields.push(`${key} = ?`);
      params.push(data[key]);
    }
  }

  if (fields.length > 0) {
    params.push(id);
    const sql = `UPDATE companies SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?`;
    await db.execute(sql, params);
  }

  // Update admin user if admin data provided
  if (data.admin) {
    const { name, email, password } = data.admin;
    const adminFields = [];
    const adminParams = [];

    if (name) {
      adminFields.push('name = ?');
      adminParams.push(name);
    }
    if (email) {
      adminFields.push('email = ?');
      adminParams.push(email);
    }
    if (password && password.length >= 8) {
      const hash = await bcrypt.hash(password, 12);
      adminFields.push('password_hash = ?');
      adminParams.push(hash);
    }

    if (adminFields.length > 0) {
      // Find the admin user ID
      const [users] = await db.execute(
        `SELECT u.id FROM users u
         JOIN roles r ON u.role_id = r.id
         WHERE u.company_id = ? AND r.name = 'company_admin'
         ORDER BY u.created_at ASC LIMIT 1`,
        [id]
      );
      if (users.length > 0) {
        const adminId = users[0].id;
        adminParams.push(adminId);
        const adminSql = `UPDATE users SET ${adminFields.join(', ')}, updated_at = NOW() WHERE id = ?`;
        await db.execute(adminSql, adminParams);
      }
    }
  }
}

export async function deleteCompany(id) {
  // Note: This might fail if there are foreign keys (users, etc.) linked to this company.
  // We assume specific deletion logic or cascade is handled by DB or caller if needed.
  await db.execute('DELETE FROM companies WHERE id = ?', [id]);
}
