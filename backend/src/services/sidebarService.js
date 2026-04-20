// src/services/sidebarService.js
import db from '../config/db.js';
import { filterModulesByCompanyPolicy } from './companyModuleService.js';
import {
  applyAttendanceHistoryCoactivation,
  getEnabledModulesForUser,
} from './permissionService.js';

const ALL_KNOWN_MODULES = [
  'leads',
  'site_inspection',
  'projects',
  'on_field',
  'installation', // Installation Day (field jobs)
  'operations',
  'payroll',
  'attendance',
  'attendance_history',
  'leave',
  'expenses',
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
  // Platform owner: full module surface (same idea as company_admin), not limited by job_role_modules.
  if (role === 'super_admin') {
    ALL_KNOWN_MODULES.forEach((k) => allowSet.add(k));
    COMPANY_PSEUDO.forEach((k) => allowSet.add(k));
    allowSet.add('support');
  } else if (job_role_id) {
    // Same source as permissions: job_role_modules ∩ company_type_modules (not raw JRM only).
    const enabled = await getEnabledModulesForUser(userId);
    if (enabled.size > 0) {
      enabled.forEach((k) => allowSet.add(k));
    } else {
      const [mods] = await db.execute(
        `SELECT module_key FROM job_role_modules WHERE job_role_id = ? ORDER BY module_key`,
        [job_role_id],
      );
      console.log('[getSidebarForUserRoleOnly] job_role_id:', job_role_id, 'fallback JRM:', mods);
      (mods ?? []).forEach((m) => allowSet.add(m.module_key));
      await applyAttendanceHistoryCoactivation(allowSet, company_id);
    }
    allowSet.add('messages'); // Add messages for all employees
    allowSet.add('leave'); // Add leave for all employees
  }

  if (role === 'company_admin' || role === 'manager') {
    COMPANY_PSEUDO.forEach(k => allowSet.add(k));
    allowSet.add('support');
    // Full product surface; company `enabled_modules` trims navigation per US-085.
    ALL_KNOWN_MODULES.forEach((k) => allowSet.add(k));
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
  let cid = companyId;
  if (cid == null) {
    const [uRows] = await db.execute('SELECT company_id FROM users WHERE id = ? LIMIT 1', [userId]);
    cid = uRows[0]?.company_id ?? null;
  }
  const base = await getSidebarForUserRoleOnly(userId, cid);
  const modules = await filterModulesByCompanyPolicy(base.modules, cid);
  return { ...base, modules };
}