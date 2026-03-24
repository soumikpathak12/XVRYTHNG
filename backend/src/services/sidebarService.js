// src/services/sidebarService.js
import db from '../config/db.js';

const ALL_KNOWN_MODULES = [
  'leads',
  'site_inspection',
  'projects',
  'on_field',
  'installation', // Installation Day (field jobs)
  'operations',
  'payroll',
  'attendance',
  'referrals',
  'messages',
  'support',
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
  if (!rows.length) {
    console.log('[getSidebarForUserRoleOnly] No user found for userId:', userId);
    return { role: null, modules: [] };
  }

  const { company_id, platform_role, job_role_id } = rows[0];
  console.log('[getSidebarForUserRoleOnly] userId:', userId, 'company_id:', company_id, 'job_role_id:', job_role_id, 'platform_role:', platform_role);
  const role = (platform_role || '').toLowerCase();

  const allowSet = new Set();
  if (job_role_id) {
    const [mods] = await db.execute(
      `SELECT module_key FROM job_role_modules WHERE job_role_id = ? ORDER BY module_key`,
      [job_role_id]
    );
    console.log('[getSidebarForUserRoleOnly] job_role_id:', job_role_id, 'modules from DB:', mods);
    (mods ?? []).forEach(m => allowSet.add(m.module_key));
    allowSet.add('messages'); // Add messages for all employees
    allowSet.add('leave');     // Add leave for all employees
    allowSet.add('expenses'); // Add expenses for all employees
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

  console.log('[getSidebarForUserRoleOnly] final modules:', modules);
  return { role: platform_role, modules };
}

export async function getSidebarForUser(userId, companyId = null) {
  return getSidebarForUserRoleOnly(userId, companyId);
}