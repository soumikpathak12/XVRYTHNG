/**
 * RBAC: resolve user permissions (system role or custom role), check permission.
 */
import db from '../config/db.js';

const FALLBACK_BY_ROLE = {
  super_admin: ['*:*'],
  company_admin: ['overview:view', 'profile:view', 'profile:edit', 'leads:view', 'leads:create', 'leads:edit', 'projects:view', 'projects:create', 'projects:edit', 'on_field:view', 'on_field:edit', 'operations:view', 'operations:edit', 'attendance:view', 'attendance:edit', 'referrals:view', 'referrals:edit', 'messages:view', 'messages:edit', 'settings:view', 'settings:manage', 'roles:view', 'roles:manage'],
  manager: ['overview:view', 'profile:view', 'profile:edit', 'leads:view', 'leads:create', 'leads:edit', 'projects:view', 'projects:create', 'projects:edit', 'on_field:view', 'on_field:edit', 'operations:view', 'attendance:view', 'attendance:edit', 'referrals:view', 'messages:view', 'messages:edit', 'settings:view'],
  field_agent: ['overview:view', 'profile:view', 'profile:edit', 'projects:view', 'on_field:view', 'on_field:edit', 'attendance:view', 'attendance:edit', 'messages:view', 'messages:edit'],
};

/**
 * Get permission slugs (resource:action) for a user. Uses role_id; if user has custom_role_id, use custom_role_permissions.
 * Falls back to FALLBACK_BY_ROLE if RBAC tables are not yet migrated.
 */
export async function getPermissionsForUser(userId) {
  const [users] = await db.execute(
    'SELECT u.role_id, u.custom_role_id, r.name AS role_name FROM users u INNER JOIN roles r ON u.role_id = r.id WHERE u.id = ? LIMIT 1',
    [userId]
  );
  const u = users[0];
  if (!u) return [];
  try {
    if (u.custom_role_id) {
      const [rows] = await db.execute(
        `SELECT p.resource, p.action FROM custom_role_permissions crp
         INNER JOIN permissions p ON crp.permission_id = p.id
         WHERE crp.custom_role_id = ?`,
        [u.custom_role_id]
      );
      return rows.map((r) => `${r.resource}:${r.action}`);
    }
    const [rows] = await db.execute(
      `SELECT p.resource, p.action FROM role_permissions rp
       INNER JOIN permissions p ON rp.permission_id = p.id
       WHERE rp.role_id = ?`,
      [u.role_id]
    );
    if (rows.length) return rows.map((r) => `${r.resource}:${r.action}`);
  } catch (_) {
    // Tables may not exist yet; use fallback by role name
  }
  const roleName = (u.role_name || '').toLowerCase();
  return FALLBACK_BY_ROLE[roleName] || [];
}

/**
 * Check if user has permission (resource, action). Loads permissions by userId.
 */
export async function userHasPermission(userId, resource, action) {
  const perms = await getPermissionsForUser(userId);
  const slug = `${resource}:${action}`;
  if (perms.includes('*:*') || perms.includes(slug)) return true;
  return false;
}

/**
 * Get all permissions (for role management UI). Returns [] if RBAC not migrated.
 */
export async function getAllPermissions() {
  try {
    const [rows] = await db.execute(
      'SELECT id, resource, action, description FROM permissions ORDER BY resource, action'
    );
    return rows;
  } catch (_) {
    return [];
  }
}
