// src/services/sidebarService.js
import db from '../config/db.js';

const ALL_KNOWN_MODULES = [
  'leads', 'projects', 'on_field', 'operations', 'attendance', 'referrals', 'messages', 'support',
];

const COMPANY_PSEUDO = ['settings'];

const EMPLOYEE_PSEUDO = ['settings'];

export async function getSidebarForUserRoleOnly(userId, companyId = null) {
  const [rows] = await db.execute(
    `
    SELECT u.id, u.company_id, r.name AS platform_role,
           e.job_role_id
    FROM users u
    JOIN roles r ON r.id = u.role_id
    LEFT JOIN employees e ON e.user_id = u.id AND e.company_id = u.company_id
    WHERE u.id = ? AND (u.company_id = ? OR ? IS NULL)
    LIMIT 1
    `,
    [userId, companyId ?? null, companyId ?? null]
  );
  if (!rows.length) return { role: null, modules: [] };

  const { platform_role, job_role_id } = rows[0];
  const role = (platform_role || '').toLowerCase();

  const allowSet = new Set();
  if (job_role_id) {
    const [mods] = await db.execute(
      `SELECT module_key FROM job_role_modules WHERE job_role_id = ? ORDER BY module_key`,
      [job_role_id]
    );
    (mods ?? []).forEach(m => allowSet.add(m.module_key));
  }

  if (role === 'company_admin' || role === 'manager') {
    COMPANY_PSEUDO.forEach(k => allowSet.add(k));
    allowSet.add('support'); // Company admin/manager can access support by default
  }

  if (role === 'field_agent') {
    EMPLOYEE_PSEUDO.forEach(k => allowSet.add(k));
  }

  const KNOWN_FOR_EMPLOYEE = new Set([
    ...ALL_KNOWN_MODULES,
    ...COMPANY_PSEUDO,
    ...EMPLOYEE_PSEUDO,
  ]);
  const modules = [...allowSet].filter(k => KNOWN_FOR_EMPLOYEE.has(k)).sort();

  return { role: platform_role, modules };
}

export async function getSidebarForUser(userId, companyId = null) {
  return getSidebarForUserRoleOnly(userId, companyId);
}