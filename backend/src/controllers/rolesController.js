/**
 * Roles & Permissions + Job Roles Modules
 */
import db from '../config/db.js';
import * as permissionService from '../services/permissionService.js';


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
    } catch (_) { /* table may not exist */ }
    return res.json({ success: true, data: { system: systemRoles, custom: customRoles } });
  } catch (err) {
    console.error('listRoles error', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function listPermissions(req, res) {
  try {
    const permissions = await permissionService.getAllPermissions();
    return res.json({ success: true, data: permissions });
  } catch (err) {
    console.error('listPermissions error', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

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
      return res.json({ success: true, data: rows.map(r => r.permission_id) });
    }
    const [rows] = await db.execute(
      'SELECT permission_id FROM role_permissions WHERE role_id = ?',
      [numId]
    );
    return res.json({ success: true, data: rows.map(r => r.permission_id) });
  } catch (err) {
    console.error('getRolePermissions error', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function createCustomRole(req, res) {
  try {
    const isSuperAdmin = req.user.role?.toLowerCase() === 'super_admin';
    let companyId = req.user.companyId;
    const { name, description, permissionIds, companyId: bodyCompanyId } = req.body ?? {};
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

export async function setCustomRolePermissions(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid id' });

    const { permissionIds } = req.body ?? {};
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

/** =========================
 *  Job Roles (Modules)
 * ========================= */

// Helper: resolve companyId (tenant) with super_admin fallbacks
async function resolveCompanyId(req) {
  const isSuper = req.user.role?.toLowerCase() === 'super_admin';
  // prefer tenantContext
  let companyId =
    req.tenantId ??
    req.user?.companyId ??
    (isSuper && req.query.companyId ? parseInt(req.query.companyId, 10) : null) ??
    (isSuper && req.headers['x-tenant-id'] ? parseInt(req.headers['x-tenant-id'], 10) : null);

  if (!companyId && isSuper) {
    // Dev-friendly: nếu chỉ có 1 company thì auto chọn
    const [rows] = await db.execute('SELECT id FROM companies LIMIT 2');
    if (rows.length === 1) companyId = rows[0].id;
  }
  return companyId;
}

export async function listJobRoles(req, res) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return res.status(422).json({ success: false, message: 'companyId is required (super_admin: pass ?companyId= or X-Tenant-Id, or ensure a single company exists)' });
    }

    const [roles] = await db.execute(
      'SELECT id, code, name, description FROM job_roles WHERE company_id = ? ORDER BY name',
      [companyId]
    );

    const [rows] = await db.execute(`
      SELECT jr.id AS job_role_id, m.key_name AS module_key, m.display_name
      FROM job_roles jr
      JOIN job_role_modules jrm ON jrm.job_role_id = jr.id
      JOIN modules m ON m.key_name = jrm.module_key
      JOIN companies c ON c.id = jr.company_id
      JOIN company_type_modules ctm 
        ON ctm.company_type_id = c.company_type_id AND ctm.module_key = m.key_name
      WHERE jr.company_id = ?
    `, [companyId]);

    const data = roles.map(r => ({
      ...r,
      modules: rows.filter(x => x.job_role_id === r.id).map(x => ({ key: x.module_key, name: x.display_name }))
    }));
    return res.json({ success: true, data });
  } catch (err) {
    console.error('listJobRoles error', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function getJobRoleModules(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid id' });

    const [mods] = await db.execute(`
      SELECT jrm.module_key
      FROM job_role_modules jrm
      JOIN job_roles jr ON jr.id = jrm.job_role_id
      JOIN companies c ON c.id = jr.company_id
      JOIN company_type_modules ctm 
        ON ctm.company_type_id = c.company_type_id AND ctm.module_key = jrm.module_key
      WHERE jrm.job_role_id = ?
    `, [id]);

    return res.json({ success: true, data: mods.map(x => x.module_key) });
  } catch (err) {
    console.error('getJobRoleModules error', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function setJobRoleModules(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid id' });

    const isSuper = req.user.role?.toLowerCase() === 'super_admin';
    const companyId = await resolveCompanyId(req);

    if (!isSuper) {
      const [own] = await db.execute('SELECT id FROM job_roles WHERE id = ? AND company_id = ?', [id, companyId]);
      if (!own.length) return res.status(404).json({ success: false, message: 'Job role not found' });
    } else {
      const [rows] = await db.execute('SELECT id FROM job_roles WHERE id = ?', [id]);
      if (!rows.length) return res.status(404).json({ success: false, message: 'Job role not found' });
    }

    const { moduleKeys } = req.body ?? {};
    await db.execute('DELETE FROM job_role_modules WHERE job_role_id = ?', [id]);

    if (Array.isArray(moduleKeys) && moduleKeys.length) {
      // Only allow modules valid for company_type
      const [eligible] = await db.execute(`
        SELECT m.key_name
        FROM job_roles jr
        JOIN companies c ON c.id = jr.company_id
        JOIN company_type_modules ctm ON ctm.company_type_id = c.company_type_id
        JOIN modules m ON m.key_name = ctm.module_key
        WHERE jr.id = ?
      `, [id]);
      const allowedSet = new Set(eligible.map(x => x.key_name));

      for (const k of moduleKeys) {
        if (!allowedSet.has(k)) continue;
        await db.execute(
          'INSERT IGNORE INTO job_role_modules (job_role_id, module_key) VALUES (?, ?)',
          [id, k]
        );
      }
    }
    return res.json({ success: true, message: 'Updated' });
  } catch (err) {
    console.error('setJobRoleModules error', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function listModulesForCompany(req, res) {
  try {
    const isSuper = req.user.role?.toLowerCase() === 'super_admin';
    let companyId = await resolveCompanyId(req);

    // super_admin + multi-tenant: nếu không có companyId => trả full modules
    if (!companyId && isSuper) {
      const [all] = await db.execute('SELECT key_name, display_name FROM modules ORDER BY display_name');
      return res.json({ success: true, data: all });
    }
    if (!companyId) {
      return res.status(422).json({ success: false, message: 'companyId is required' });
    }

    const [rows] = await db.execute(`
      SELECT m.key_name, m.display_name
      FROM companies c
      JOIN company_type_modules ctm ON ctm.company_type_id = c.company_type_id
      JOIN modules m ON m.key_name = ctm.module_key
      WHERE c.id = ?
      ORDER BY m.display_name
    `, [companyId]);

    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('listModulesForCompany error', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
``