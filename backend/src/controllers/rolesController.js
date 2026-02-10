/**
 * Roles and permissions API: list roles, list permissions, create custom role, set role permissions.
 */
import db from '../config/db.js';
import * as permissionService from '../services/permissionService.js';

/** GET /api/admin/roles - system roles + custom roles (for super_admin: all; for company: that company's custom roles) */
export async function listRoles(req, res) {
  try {
    const [systemRoles] = await db.execute(
      'SELECT id, name, description FROM roles ORDER BY name'
    );
    let customRoles = [];
    try {
      if (req.user.companyId) {
        const [rows] = await db.execute(
          'SELECT id, company_id, name, description FROM custom_roles WHERE company_id = ? ORDER BY name',
          [req.user.companyId]
        );
        customRoles = rows;
      } else if (req.user.role?.toLowerCase() === 'super_admin') {
        const [rows] = await db.execute(
          'SELECT id, company_id, name, description FROM custom_roles ORDER BY company_id, name'
        );
        customRoles = rows;
      }
    } catch (_) {
      // custom_roles table may not exist yet
    }
    return res.json({ success: true, data: { system: systemRoles, custom: customRoles } });
  } catch (err) {
    console.error('listRoles error', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

/** GET /api/admin/permissions */
export async function listPermissions(req, res) {
  try {
    const permissions = await permissionService.getAllPermissions();
    return res.json({ success: true, data: permissions });
  } catch (err) {
    console.error('listPermissions error', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

/** GET /api/admin/roles/:id/permissions - role_id (system) or custom_role_id */
export async function getRolePermissions(req, res) {
  try {
    const { id } = req.params;
    const isCustom = req.query.type === 'custom';
    const numId = parseInt(id, 10);
    if (isNaN(numId)) return res.status(400).json({ success: false, message: 'Invalid id' });
    if (isCustom) {
      const [rows] = await db.execute(
        'SELECT permission_id FROM custom_role_permissions WHERE custom_role_id = ?',
        [numId]
      );
      return res.json({ success: true, data: rows.map((r) => r.permission_id) });
    }
    const [rows] = await db.execute(
      'SELECT permission_id FROM role_permissions WHERE role_id = ?',
      [numId]
    );
    return res.json({ success: true, data: rows.map((r) => r.permission_id) });
  } catch (err) {
    console.error('getRolePermissions error', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

/** POST /api/admin/roles (custom role) - body: { name, description?, permissionIds?: number[], companyId? } (companyId for super_admin only) */
export async function createCustomRole(req, res) {
  try {
    const isSuperAdmin = req.user.role?.toLowerCase() === 'super_admin';
    let companyId = req.user.companyId;
    const { name, description, permissionIds, companyId: bodyCompanyId } = req.body || {};
    if (isSuperAdmin && bodyCompanyId != null) companyId = parseInt(bodyCompanyId, 10);
    if (!companyId && !isSuperAdmin) {
      return res.status(403).json({ success: false, message: 'Custom roles require a company context' });
    }
    if (!companyId) {
      return res.status(422).json({ success: false, message: 'companyId is required to create a custom role' });
    }
    if (!name?.trim()) {
      return res.status(422).json({ success: false, errors: { name: 'Name is required' } });
    }
    const [result] = await db.execute(
      'INSERT INTO custom_roles (company_id, name, description) VALUES (?, ?, ?)',
      [companyId, name.trim(), (description || '').trim() || null]
    );
    const customRoleId = result.insertId;
    if (Array.isArray(permissionIds) && permissionIds.length) {
      for (const pid of permissionIds) {
        await db.execute(
          'INSERT IGNORE INTO custom_role_permissions (custom_role_id, permission_id) VALUES (?, ?)',
          [customRoleId, parseInt(pid, 10)]
        );
      }
    }
    const [rows] = await db.execute(
      'SELECT id, company_id, name, description FROM custom_roles WHERE id = ?',
      [customRoleId]
    );
    return res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    if (err?.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'A role with this name already exists' });
    }
    console.error('createCustomRole error', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

/** PUT /api/admin/roles/custom/:id/permissions - body: { permissionIds: number[] } */
export async function setCustomRolePermissions(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid id' });
    const { permissionIds } = req.body || {};
    const companyId = req.user.companyId;
    const isSuperAdmin = req.user.role?.toLowerCase() === 'super_admin';
    if (!isSuperAdmin) {
      const [rows] = await db.execute('SELECT id FROM custom_roles WHERE id = ? AND company_id = ?', [id, companyId]);
      if (!rows.length) return res.status(404).json({ success: false, message: 'Role not found' });
    } else {
      const [rows] = await db.execute('SELECT id FROM custom_roles WHERE id = ?', [id]);
      if (!rows.length) return res.status(404).json({ success: false, message: 'Role not found' });
    }
    await db.execute('DELETE FROM custom_role_permissions WHERE custom_role_id = ?', [id]);
    if (Array.isArray(permissionIds)) {
      for (const pid of permissionIds) {
        await db.execute(
          'INSERT IGNORE INTO custom_role_permissions (custom_role_id, permission_id) VALUES (?, ?)',
          [id, parseInt(pid, 10)]
        );
      }
    }
    return res.json({ success: true, message: 'Updated' });
  } catch (err) {
    console.error('setCustomRolePermissions error', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
