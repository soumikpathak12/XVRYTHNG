/**
 */
import db from '../config/db.js';

const FALLBACK_BY_ROLE = {
  super_admin: ['*:*'],
  company_admin: [
    'overview:view', 'profile:view', 'profile:edit',
    'leads:view', 'leads:create', 'leads:edit',
    'projects:view', 'projects:create', 'projects:edit',
    'on_field:view', 'on_field:edit',
    'operations:view', 'operations:edit',
    'payroll:view', 'payroll:edit',
    'attendance:view', 'attendance:edit',
    'attendance_history:view', 'attendance_history:edit',
    'referrals:view', 'referrals:edit',
    'messages:view', 'messages:edit',
    'support:view', 'support:edit',
    'settings:view', 'settings:manage',
    'roles:view', 'roles:manage'
  ],
  manager: [
    'overview:view', 'profile:view', 'profile:edit',
    'leads:view', 'leads:create', 'leads:edit',
    'projects:view', 'projects:create', 'projects:edit',
    'on_field:view', 'on_field:edit',
    'operations:view',
    'payroll:view', 'payroll:edit',
    'attendance:view', 'attendance:edit',
    'attendance_history:view', 'attendance_history:edit',
    'referrals:view',
    'messages:view', 'messages:edit',
    'support:view', 'support:edit',
    'settings:view'
  ],
  field_agent: [
    'overview:view', 'profile:view', 'profile:edit',
    'projects:view',
    'on_field:view', 'on_field:edit',
    'attendance:view', 'attendance:edit',
    'messages:view', 'messages:edit',
    'support:view', 'support:edit'
  ],
};

export async function getPermissionsForUser(userId) {
  const [users] = await db.execute(
    'SELECT u.role_id, u.custom_role_id, r.name AS role_name FROM users u INNER JOIN roles r ON u.role_id = r.id WHERE u.id = ? LIMIT 1',
    [userId]
  );
  const u = users[0];
  if (!u) return [];

  let permissions = [];
  try {
    if (u.custom_role_id) {
      const [rows] = await db.execute(
        `SELECT p.resource, p.action
         FROM custom_role_permissions crp
         INNER JOIN permissions p ON crp.permission_id = p.id
         WHERE crp.custom_role_id = ?`,
        [u.custom_role_id]
      );
      permissions = rows.map(r => `${r.resource}:${r.action}`);
    } else {
      const [rows] = await db.execute(
        `SELECT p.resource, p.action
         FROM role_permissions rp
         INNER JOIN permissions p ON rp.permission_id = p.id
         WHERE rp.role_id = ?`,
        [u.role_id]
      );
      if (rows.length) {
        permissions = rows.map(r => `${r.resource}:${r.action}`);
      } else {
        throw new Error('No permissions found');
      }
    }
  } catch (_) {
    // bảng có thể chưa migrate; fallback theo role name
    const roleName = (u.role_name || '').toLowerCase();
    permissions = FALLBACK_BY_ROLE[roleName] || [];
  }

  // Add permissions for enabled modules (job role modules)
  const enabledModules = await getEnabledModulesForUser(userId);
  enabledModules.forEach(module => {
    const viewPerm = `${module}:view`;
    const editPerm = `${module}:edit`;
    if (!permissions.includes(viewPerm)) permissions.push(viewPerm);
    if (!permissions.includes(editPerm)) permissions.push(editPerm);
  });

  return permissions;
} 
let _modulesCache = null;
async function getAllModuleKeys() {
  if (_modulesCache) return _modulesCache;
  try {
    const [rows] = await db.execute('SELECT key_name FROM modules');
    _modulesCache = new Set(rows.map(r => r.key_name));
  } catch {
    _modulesCache = new Set();
  }
  return _modulesCache;
}

/**
 * When a job role has personal `attendance` and the company type offers `attendance_history`,
 * treat team roster as enabled (same product bundle). Keeps sidebar and JWT permissions aligned.
 */
export async function applyAttendanceHistoryCoactivation(enabledSet, companyId) {
  if (companyId == null || !enabledSet?.has('attendance') || enabledSet.has('attendance_history')) {
    return;
  }
  const cid = Number(companyId);
  if (!Number.isFinite(cid)) return;

  const [offer] = await db.execute(
    `SELECT 1 FROM companies c
     INNER JOIN company_type_modules ctm
       ON ctm.company_type_id = c.company_type_id AND ctm.module_key = 'attendance_history'
     WHERE c.id = ?
     LIMIT 1`,
    [cid],
  );
  if (offer.length) enabledSet.add('attendance_history');
}

/** Module keys enabled for the user (job role ∩ company type). Used by permissions and sidebar. */
export async function getEnabledModulesForUser(userId) {
  const [uRows] = await db.execute('SELECT id, company_id FROM users WHERE id = ? LIMIT 1', [userId]);
  const u = uRows[0];
  if (!u) return new Set();

  const [eRows] = await db.execute(
    'SELECT job_role_id FROM employees WHERE user_id = ? AND company_id <=> ? LIMIT 1',
    [userId, u.company_id]
  );
  const e = eRows[0];
  if (!e?.job_role_id) return new Set();

  const [rows] = await db.execute(`
    SELECT jrm.module_key
    FROM job_role_modules jrm
    JOIN companies c ON c.id = ?
    JOIN company_type_modules ctm
      ON ctm.company_type_id = c.company_type_id AND ctm.module_key = jrm.module_key
    WHERE jrm.job_role_id = ?
  `, [u.company_id, e.job_role_id]);

  const set = new Set(rows.map(r => r.module_key));
  // Backward compatibility: if attendance_history was explicitly assigned on job_role_modules
  // (e.g. manual SQL) but company_type_modules is missing the key, still honor the explicit assignment.
  if (!set.has('attendance_history')) {
    const [explicit] = await db.execute(
      `SELECT 1
         FROM job_role_modules
        WHERE job_role_id = ?
          AND module_key = 'attendance_history'
        LIMIT 1`,
      [e.job_role_id],
    );
    if (explicit.length) set.add('attendance_history');
  }
  await applyAttendanceHistoryCoactivation(set, u.company_id);
  return set;
}

export async function userHasPermission(userId, resource, action) {
  const perms = await getPermissionsForUser(userId);
  const slug = `${resource}:${action}`;

  if (perms.includes('*:*') || perms.includes(slug)) {
    const moduleKeys = await getAllModuleKeys();
    if (perms.includes('*:*') || !moduleKeys.has(resource)) return true;

    const enabled = await getEnabledModulesForUser(userId);
    if (enabled.has(resource)) return true;

    // Company admins / managers: roster visibility without a job_role_modules row.
    if (resource === 'attendance_history' && action === 'view') {
      const [adm] = await db.execute(
        `SELECT LOWER(r.name) AS role_name
           FROM users u
           JOIN roles r ON r.id = u.role_id
          WHERE u.id = ?
          LIMIT 1`,
        [userId],
      );
      const rn = String(adm[0]?.role_name || '');
      if (rn === 'company_admin' || rn === 'manager') return true;
    }

    return false;
  }
  return false;
}

export async function getAllPermissions() {
  try {
    const [rows] = await db.execute(
      'SELECT id, resource, action, description FROM permissions ORDER BY resource, action'
    );
    return rows;
  } catch {
    return [];
  }
}