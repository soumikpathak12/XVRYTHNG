/**
 * RBAC migration: permissions, role_permissions, custom_roles, custom_role_permissions.
 * Seeds default permissions and assigns to system roles. Run: node database/migrate-rbac.js
 */
import 'dotenv/config';
import db from '../src/config/db.js';

async function tableExists(schema, table) {
  const [rows] = await db.execute(
    `SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? LIMIT 1`,
    [schema, table]
  );
  return rows.length > 0;
}

const PERMISSIONS = [
  { resource: '*', action: '*', description: 'All permissions (super admin)' },
  { resource: 'overview', action: 'view', description: 'View dashboard overview' },
  { resource: 'profile', action: 'view', description: 'View own profile' },
  { resource: 'profile', action: 'edit', description: 'Edit own profile' },
  { resource: 'companies', action: 'view', description: 'List companies' },
  { resource: 'companies', action: 'create', description: 'Create company (tenant)' },
  { resource: 'leads', action: 'view', description: 'View leads' },
  { resource: 'leads', action: 'create', description: 'Create leads' },
  { resource: 'leads', action: 'edit', description: 'Edit leads' },
  { resource: 'projects', action: 'view', description: 'View projects' },
  { resource: 'projects', action: 'create', description: 'Create projects' },
  { resource: 'projects', action: 'edit', description: 'Edit projects' },
  { resource: 'on_field', action: 'view', description: 'View on-field' },
  { resource: 'on_field', action: 'edit', description: 'Edit on-field' },
  { resource: 'operations', action: 'view', description: 'View operations' },
  { resource: 'operations', action: 'edit', description: 'Edit operations' },
  { resource: 'attendance', action: 'view', description: 'View attendance' },
  { resource: 'attendance', action: 'edit', description: 'Edit attendance' },
  { resource: 'referrals', action: 'view', description: 'View referrals' },
  { resource: 'referrals', action: 'edit', description: 'Edit referrals' },
  { resource: 'messages', action: 'view', description: 'View messages' },
  { resource: 'messages', action: 'edit', description: 'Edit messages' },
  { resource: 'settings', action: 'view', description: 'View settings' },
  { resource: 'settings', action: 'manage', description: 'Manage settings' },
  { resource: 'roles', action: 'view', description: 'View roles' },
  { resource: 'roles', action: 'manage', description: 'Create/edit roles and assign permissions' },
];

const ROLE_PERMISSIONS_MATRIX = {
  super_admin: '*', // all
  company_admin: ['overview:view', 'profile:view', 'profile:edit', 'leads:view', 'leads:create', 'leads:edit', 'projects:view', 'projects:create', 'projects:edit', 'on_field:view', 'on_field:edit', 'operations:view', 'operations:edit', 'attendance:view', 'attendance:edit', 'referrals:view', 'referrals:edit', 'messages:view', 'messages:edit', 'settings:view', 'settings:manage', 'roles:view', 'roles:manage'],
  manager: ['overview:view', 'profile:view', 'profile:edit', 'leads:view', 'leads:create', 'leads:edit', 'projects:view', 'projects:create', 'projects:edit', 'on_field:view', 'on_field:edit', 'operations:view', 'attendance:view', 'attendance:edit', 'referrals:view', 'messages:view', 'messages:edit', 'settings:view'],
  field_agent: ['overview:view', 'profile:view', 'profile:edit', 'projects:view', 'on_field:view', 'on_field:edit', 'attendance:view', 'attendance:edit', 'messages:view', 'messages:edit'],
};

async function migrate() {
  const schema = process.env.DB_NAME;
  if (!schema) {
    console.error('[rbac] Missing DB_NAME');
    process.exit(1);
  }
  console.log('[rbac] Using schema:', schema);

  if (!(await tableExists(schema, 'permissions'))) {
    console.log('  + Creating permissions');
    await db.execute(`
      CREATE TABLE permissions (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        resource VARCHAR(80) NOT NULL,
        action VARCHAR(50) NOT NULL,
        description VARCHAR(255) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_permission (resource, action),
        INDEX idx_perm_resource (resource)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    for (const p of PERMISSIONS) {
      await db.execute(
        'INSERT IGNORE INTO permissions (resource, action, description) VALUES (?, ?, ?)',
        [p.resource, p.action, p.description]
      );
    }
  }

  if (!(await tableExists(schema, 'role_permissions'))) {
    console.log('  + Creating role_permissions');
    await db.execute(`
      CREATE TABLE role_permissions (
        role_id TINYINT UNSIGNED NOT NULL,
        permission_id INT UNSIGNED NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (role_id, permission_id),
        FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
        FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    const [roles] = await db.execute('SELECT id, name FROM roles');
    const [perms] = await db.execute('SELECT id, resource, action FROM permissions');
    const permMap = perms.reduce((acc, p) => { acc[`${p.resource}:${p.action}`] = p.id; return acc; }, {});
    const wildcardPerm = perms.find((p) => p.resource === '*' && p.action === '*');
    for (const role of roles) {
      const key = role.name.toLowerCase();
      const spec = ROLE_PERMISSIONS_MATRIX[key];
      if (spec === '*') {
        if (wildcardPerm) {
          await db.execute('INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [role.id, wildcardPerm.id]);
        } else {
          for (const pid of perms.map((p) => p.id)) {
            await db.execute('INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [role.id, pid]);
          }
        }
      } else if (Array.isArray(spec)) {
        for (const slug of spec) {
          const pid = permMap[slug];
          if (pid) await db.execute('INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [role.id, pid]);
        }
      }
    }
  }

  if (!(await tableExists(schema, 'custom_roles'))) {
    console.log('  + Creating custom_roles');
    await db.execute(`
      CREATE TABLE custom_roles (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        company_id INT UNSIGNED NOT NULL,
        name VARCHAR(80) NOT NULL,
        description VARCHAR(255) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_custom_role_company_name (company_id, name),
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
        INDEX idx_custom_roles_company (company_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  if (!(await tableExists(schema, 'custom_role_permissions'))) {
    console.log('  + Creating custom_role_permissions');
    await db.execute(`
      CREATE TABLE custom_role_permissions (
        custom_role_id INT UNSIGNED NOT NULL,
        permission_id INT UNSIGNED NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (custom_role_id, permission_id),
        FOREIGN KEY (custom_role_id) REFERENCES custom_roles(id) ON DELETE CASCADE,
        FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  const [col] = await db.execute(
    `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'custom_role_id' LIMIT 1`,
    [schema]
  );
  if (col.length === 0) {
    console.log('  + Adding users.custom_role_id');
    await db.execute('ALTER TABLE users ADD COLUMN custom_role_id INT UNSIGNED NULL AFTER role_id');
    await db.execute(
      'ALTER TABLE users ADD CONSTRAINT fk_users_custom_role FOREIGN KEY (custom_role_id) REFERENCES custom_roles(id) ON DELETE SET NULL'
    );
  }

  console.log('[rbac] Done');
  process.exit(0);
}

migrate().catch((err) => {
  console.error('[rbac] Failed:', err);
  process.exit(1);
});
