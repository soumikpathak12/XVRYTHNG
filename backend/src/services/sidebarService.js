// src/services/sidebarService.js
import db from '../config/db.js';

const ALL_KNOWN_MODULES = [
  'leads', 'projects', 'on_field', 'operations', 'attendance', 'referrals', 'messages'
];

export async function getSidebarForUser(userId) {
  const [rows] = await db.execute(
    `
    SELECT r.name AS role_name, c.company_type_id
    FROM users u
    JOIN roles r ON r.id = u.role_id
    LEFT JOIN companies c ON c.id = u.company_id
    WHERE u.id = ?
    `,
    [userId]
  );

  if (!rows.length) throw new Error('User not found');
  const { role_name, company_type_id } = rows[0];

  // super_admin: show all modules
  if (role_name === 'super_admin') {
    return { role: role_name, companyTypeId: company_type_id ?? null, modules: ALL_KNOWN_MODULES };
  }

  if (!company_type_id) {
    return { role: role_name, companyTypeId: null, modules: [] };
  }

  const [mods] = await db.execute(
    `
    SELECT module_key
    FROM company_type_modules
    WHERE company_type_id = ?
    ORDER BY module_key
    `,
    [company_type_id]
  );

  return {
    role: role_name,
    companyTypeId: company_type_id,
    modules: mods.map(m => m.module_key),
  };
}