/**
 * Flyway-style auto-migration runner for XVRYTHNG.
 *
 * How it works:
 * ─────────────
 *  1. A `schema_migrations` table tracks which migrations have already run.
 *  2. Migrations are defined in the MIGRATIONS array below, each with a unique
 *     version string and an idempotent `up()` function.
 *  3. On startup, the runner executes only those migrations whose version
 *     hasn't been recorded yet — in order.
 *  4. Each migration uses `CREATE TABLE IF NOT EXISTS` / column-exist checks
 *     so they are safe to re-run even if the tracking table is reset.
 *
 * Adding a new migration:
 * ───────────────────────
 *  1. Add a new entry to the MIGRATIONS array at the bottom.
 *     - version: Use a monotonically increasing format, e.g. 'V009__description'.
 *     - description: Human-readable label (stored in tracking table).
 *     - up: async function(db) — receives the DB pool.
 *  2. That's it. The next time the server starts, it will run automatically.
 */
import db from '../src/config/db.js';

/* ═══════ helpers ═══════ */
async function tableExists(schema, table) {
  const [rows] = await db.execute(
    `SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? LIMIT 1`,
    [schema, table]
  );
  return rows.length > 0;
}

async function columnExists(schema, table, column) {
  const [rows] = await db.execute(
    `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1`,
    [schema, table, column]
  );
  return rows.length > 0;
}

/* ═══════ Migration definitions ═══════ */
const MIGRATIONS = [

  /* ── V001: Multi-tenant (company_types, company_type_modules, companies cols) ── */
  {
    version: 'V001__multi_tenant',
    description: 'Company types, modules, and tenant columns',
    up: async () => {
      const schema = process.env.DB_NAME;
      if (!(await tableExists(schema, 'company_types'))) {
        await db.execute(`
          CREATE TABLE company_types (
            id TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL UNIQUE,
            description VARCHAR(255) DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_company_types_name (name)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        await db.execute(`
          INSERT INTO company_types (name, description) VALUES
            ('solar_retailer', 'Solar retailer – full CRM, projects, field'),
            ('installer', 'Installer – projects and field only'),
            ('enterprise', 'Enterprise – all modules')
        `);
      }

      if (!(await tableExists(schema, 'company_type_modules'))) {
        await db.execute(`
          CREATE TABLE company_type_modules (
            company_type_id TINYINT UNSIGNED NOT NULL,
            module_key VARCHAR(80) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (company_type_id, module_key),
            FOREIGN KEY (company_type_id) REFERENCES company_types(id) ON DELETE CASCADE,
            INDEX idx_ctm_module (module_key)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        const [types] = await db.execute('SELECT id, name FROM company_types');
        const insertModules = [
          { name: 'solar_retailer', modules: ['leads', 'projects', 'on_field', 'operations', 'attendance', 'referrals', 'messages'] },
          { name: 'installer', modules: ['projects', 'on_field', 'operations'] },
          { name: 'enterprise', modules: ['leads', 'projects', 'on_field', 'operations', 'attendance', 'referrals', 'messages'] },
        ];
        for (const { name, modules } of insertModules) {
          const t = types.find(r => r.name === name);
          if (t) for (const mod of modules) await db.execute('INSERT IGNORE INTO company_type_modules (company_type_id, module_key) VALUES (?, ?)', [t.id, mod]);
        }
      }

      const companyCols = [
        ['abn', 'VARCHAR(20) NULL'],
        ['contact_email', 'VARCHAR(255) NULL'],
        ['contact_phone', 'VARCHAR(50) NULL'],
        ['address_line1', 'VARCHAR(255) NULL'],
        ['address_line2', 'VARCHAR(255) NULL'],
        ['city', 'VARCHAR(100) NULL'],
        ['state', 'VARCHAR(100) NULL'],
        ['postcode', 'VARCHAR(20) NULL'],
        ['country', 'VARCHAR(100) NULL DEFAULT "Australia"'],
        ['company_type_id', 'TINYINT UNSIGNED NULL'],
      ];
      for (const [col, def] of companyCols) {
        if (!(await columnExists(schema, 'companies', col))) {
          await db.execute(`ALTER TABLE companies ADD COLUMN ${col} ${def}`);
        }
      }

      const [fkRows] = await db.execute(
        `SELECT 1 FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'companies' AND CONSTRAINT_NAME = 'fk_companies_type' LIMIT 1`,
        [schema]
      );
      if (fkRows.length === 0) {
        try {
          await db.execute('ALTER TABLE companies ADD CONSTRAINT fk_companies_type FOREIGN KEY (company_type_id) REFERENCES company_types(id) ON DELETE SET NULL');
        } catch (_) {}
      }
    },
  },

  /* ── V002: RBAC ── */
  {
    version: 'V002__rbac',
    description: 'Permissions, role_permissions, custom_roles',
    up: async () => {
      const schema = process.env.DB_NAME;
      const PERMISSIONS = [
        { resource: '*', action: '*', description: 'All permissions (super admin)' },
        { resource: 'overview', action: 'view' }, { resource: 'profile', action: 'view' }, { resource: 'profile', action: 'edit' },
        { resource: 'companies', action: 'view' }, { resource: 'companies', action: 'create' },
        { resource: 'leads', action: 'view' }, { resource: 'leads', action: 'create' }, { resource: 'leads', action: 'edit' },
        { resource: 'projects', action: 'view' }, { resource: 'projects', action: 'create' }, { resource: 'projects', action: 'edit' },
        { resource: 'on_field', action: 'view' }, { resource: 'on_field', action: 'edit' },
        { resource: 'operations', action: 'view' }, { resource: 'operations', action: 'edit' },
        { resource: 'attendance', action: 'view' }, { resource: 'attendance', action: 'edit' },
        { resource: 'referrals', action: 'view' }, { resource: 'referrals', action: 'edit' },
        { resource: 'messages', action: 'view' }, { resource: 'messages', action: 'edit' },
        { resource: 'settings', action: 'view' }, { resource: 'settings', action: 'manage' },
        { resource: 'roles', action: 'view' }, { resource: 'roles', action: 'manage' },
        { resource: 'support', action: 'view' }, { resource: 'support', action: 'edit' },
      ];

      if (!(await tableExists(schema, 'permissions'))) {
        await db.execute(`
          CREATE TABLE permissions (
            id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            resource VARCHAR(80) NOT NULL, action VARCHAR(50) NOT NULL,
            description VARCHAR(255) DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uk_permission (resource, action),
            INDEX idx_perm_resource (resource)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        for (const p of PERMISSIONS) {
          await db.execute('INSERT IGNORE INTO permissions (resource, action, description) VALUES (?, ?, ?)',
            [p.resource, p.action, p.description || null]);
        }
      }

      if (!(await tableExists(schema, 'role_permissions'))) {
        await db.execute(`
          CREATE TABLE role_permissions (
            role_id TINYINT UNSIGNED NOT NULL, permission_id INT UNSIGNED NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (role_id, permission_id),
            FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
            FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        // Seed — simplified; super_admin gets wildcard, others get module perms
        const [roles] = await db.execute('SELECT id, name FROM roles');
        const [perms] = await db.execute('SELECT id, resource, action FROM permissions');
        const wildcardPerm = perms.find(p => p.resource === '*' && p.action === '*');
        for (const role of roles) {
          if (role.name.toLowerCase() === 'super_admin' && wildcardPerm) {
            await db.execute('INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [role.id, wildcardPerm.id]);
          } else {
            for (const p of perms) {
              if (p.resource !== '*') await db.execute('INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [role.id, p.id]);
            }
          }
        }
      }

      if (!(await tableExists(schema, 'custom_roles'))) {
        await db.execute(`
          CREATE TABLE custom_roles (
            id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            company_id INT UNSIGNED NOT NULL, name VARCHAR(80) NOT NULL, description VARCHAR(255) DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uk_custom_role_company_name (company_id, name),
            FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
      }

      if (!(await tableExists(schema, 'custom_role_permissions'))) {
        await db.execute(`
          CREATE TABLE custom_role_permissions (
            custom_role_id INT UNSIGNED NOT NULL, permission_id INT UNSIGNED NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (custom_role_id, permission_id),
            FOREIGN KEY (custom_role_id) REFERENCES custom_roles(id) ON DELETE CASCADE,
            FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
      }

      if (!(await columnExists(schema, 'users', 'custom_role_id'))) {
        await db.execute('ALTER TABLE users ADD COLUMN custom_role_id INT UNSIGNED NULL AFTER role_id');
        try {
          await db.execute('ALTER TABLE users ADD CONSTRAINT fk_users_custom_role FOREIGN KEY (custom_role_id) REFERENCES custom_roles(id) ON DELETE SET NULL');
        } catch (_) {}
      }
    },
  },

  /* ── V003: User profile columns ── */
  {
    version: 'V003__user_profile',
    description: 'User profile and notification columns',
    up: async () => {
      const schema = process.env.DB_NAME;
      const cols = [
        ['phone', 'VARCHAR(50) NULL'], ['department', 'VARCHAR(100) NULL'],
        ['image_url', 'VARCHAR(500) NULL'],
        ['notify_email', 'TINYINT(1) NOT NULL DEFAULT 1'],
        ['notify_sms', 'TINYINT(1) NOT NULL DEFAULT 0'],
      ];
      for (const [col, def] of cols) {
        if (!(await columnExists(schema, 'users', col))) {
          await db.execute(`ALTER TABLE users ADD COLUMN ${col} ${def}`);
        }
      }
    },
  },

  /* ── V004: SolarQuotes columns ── */
  {
    version: 'V004__solarquotes',
    description: 'External ID and marketing payload on leads',
    up: async () => {
      const schema = process.env.DB_NAME;
      const leadCols = [['external_id', 'VARCHAR(255) NULL'], ['marketing_payload_json', 'JSON NULL']];
      for (const [col, def] of leadCols) {
        if (!(await columnExists(schema, 'leads', col))) {
          await db.execute(`ALTER TABLE leads ADD COLUMN ${col} ${def}`);
        }
      }
      try { await db.execute('CREATE INDEX idx_leads_external_id ON leads(external_id)'); } catch (_) {}
    },
  },

  /* ── V005: Attendance ── */
  {
    version: 'V005__attendance',
    description: 'Employee attendance table',
    up: async () => {
      await db.query('SET FOREIGN_KEY_CHECKS=0');
      await db.query(`
        CREATE TABLE IF NOT EXISTS employee_attendance (
          id int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
          company_id int(10) UNSIGNED NOT NULL,
          employee_id int(10) UNSIGNED NOT NULL,
          check_in_time datetime NOT NULL,
          check_in_lat decimal(10,8) DEFAULT NULL,
          check_in_lng decimal(11,8) DEFAULT NULL,
          check_out_time datetime DEFAULT NULL,
          check_out_lat decimal(10,8) DEFAULT NULL,
          check_out_lng decimal(11,8) DEFAULT NULL,
          lunch_break_minutes smallint(5) UNSIGNED NOT NULL DEFAULT 0,
          hours_worked decimal(5,2) DEFAULT NULL,
          date date NOT NULL,
          created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          KEY idx_emp_attendance_company (company_id),
          KEY idx_emp_attendance_employee (employee_id),
          KEY idx_emp_attendance_date (date)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      await db.query('SET FOREIGN_KEY_CHECKS=1');
    },
  },

  /* ── V006: Attendance edit requests ── */
  {
    version: 'V006__attendance_edit_requests',
    description: 'Attendance edit request table',
    up: async () => {
      await db.query(`
        CREATE TABLE IF NOT EXISTS attendance_edit_requests (
          id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          company_id INT UNSIGNED NOT NULL,
          employee_id INT UNSIGNED NOT NULL,
          attendance_id INT UNSIGNED NOT NULL,
          orig_check_in DATETIME, orig_check_out DATETIME, orig_hours DECIMAL(5,2),
          req_check_in DATETIME NOT NULL, req_check_out DATETIME NOT NULL,
          reason TEXT NOT NULL,
          status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
          reviewed_by INT UNSIGNED, reviewed_at DATETIME, reviewer_note TEXT,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_company_status (company_id, status),
          INDEX idx_employee (employee_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    },
  },

  /* ── V007: Leave ── */
  {
    version: 'V007__leave',
    description: 'Leave balances and requests',
    up: async () => {
      await db.query(`
        CREATE TABLE IF NOT EXISTS leave_balances (
          id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          company_id INT UNSIGNED NOT NULL,
          employee_id INT UNSIGNED NOT NULL,
          leave_type ENUM('annual','sick','personal','unpaid') NOT NULL,
          total_days DECIMAL(5,1) NOT NULL DEFAULT 0,
          used_days DECIMAL(5,1) NOT NULL DEFAULT 0,
          year SMALLINT UNSIGNED NOT NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY uq_emp_type_year (employee_id, leave_type, year),
          INDEX idx_company (company_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      await db.query(`
        CREATE TABLE IF NOT EXISTS leave_requests (
          id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          company_id INT UNSIGNED NOT NULL,
          employee_id INT UNSIGNED NOT NULL,
          leave_type ENUM('annual','sick','personal','unpaid') NOT NULL,
          start_date DATE NOT NULL, end_date DATE NOT NULL,
          days_count DECIMAL(5,1) NOT NULL,
          reason TEXT NOT NULL,
          status ENUM('pending','approved','rejected','cancelled') NOT NULL DEFAULT 'pending',
          reviewed_by INT UNSIGNED, reviewed_at DATETIME, reviewer_note TEXT,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_company_status (company_id, status),
          INDEX idx_employee (employee_id),
          INDEX idx_dates (start_date, end_date)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    },
  },

  /* ── V008: Expenses ── */
  {
    version: 'V008__expenses',
    description: 'Expense claims table',
    up: async () => {
      await db.query(`
        CREATE TABLE IF NOT EXISTS expense_claims (
          id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          company_id INT UNSIGNED NOT NULL,
          employee_id INT UNSIGNED NOT NULL,
          project_name VARCHAR(255),
          category ENUM('travel','materials','equipment','other') NOT NULL,
          amount DECIMAL(12,2) NOT NULL,
          currency VARCHAR(3) NOT NULL DEFAULT 'INR',
          expense_date DATE NOT NULL,
          description TEXT NOT NULL,
          receipt_path VARCHAR(500),
          status ENUM('pending','approved','rejected','cancelled') NOT NULL DEFAULT 'pending',
          reviewed_by INT UNSIGNED, reviewed_at DATETIME, reviewer_note TEXT,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_company_status (company_id, status),
          INDEX idx_employee (employee_id),
          INDEX idx_project (project_name)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    },
  },

  /* ── V009: Expense currency AUD ── */
  {
    version: 'V009__expense_currency_aud',
    description: 'Expense claims default and storage currency AUD',
    up: async () => {
      await db.query(`
        ALTER TABLE expense_claims
        MODIFY COLUMN currency VARCHAR(3) NOT NULL DEFAULT 'AUD'
      `);
    },
  },

  {
    version: 'V010__lead_pv_detail_fields',
    description: 'Add panel/inverter detail columns to leads',
    up: async () => {
      const schema = process.env.DB_NAME;
      const cols = [
        ['pv_panel_model', 'VARCHAR(120) NULL'],
        ['pv_panel_quantity', 'INT NULL'],
        ['pv_inverter_model', 'VARCHAR(120) NULL'],
        ['pv_inverter_series', 'VARCHAR(120) NULL'],
        ['pv_inverter_power_kw', 'DECIMAL(10,2) NULL'],
        ['pv_inverter_quantity', 'INT NULL'],
      ];
      for (const [col, def] of cols) {
        if (!(await columnExists(schema, 'leads', col))) {
          await db.execute(`ALTER TABLE leads ADD COLUMN ${col} ${def}`);
        }
      }
    },
  },
  {
    version: 'V010__site_inspection_shading_text',
    description: 'Allow free-text shading notes in lead_site_inspections',
    up: async () => {
      const schema = process.env.DB_NAME;
      if (await columnExists(schema, 'lead_site_inspections', 'shading')) {
        await db.query(`
          ALTER TABLE lead_site_inspections
          MODIFY COLUMN shading VARCHAR(255) NULL DEFAULT NULL
        `);
      }
    },
  },

  /* ── V011: Sales segment (B2C residential vs B2B commercial) on leads ── */
  {
    version: 'V011__leads_sales_segment',
    description: 'Optional sales_segment b2c/b2b on leads for pipeline filtering',
    up: async () => {
      const schema = process.env.DB_NAME;
      if (!(await columnExists(schema, 'leads', 'sales_segment'))) {
        await db.query(`
          ALTER TABLE leads
          ADD COLUMN sales_segment VARCHAR(8) NULL DEFAULT NULL
            COMMENT 'b2c | b2b'
        `);
      }
    },
  },

  /* ── V012: Pylon (Observer) solar project link on leads ── */
  {
    version: 'V012__leads_pylon_solar_project',
    description: 'Store Pylon solar_projects id and last proposal URL for CRM leads',
    up: async () => {
      const schema = process.env.DB_NAME;
      const cols = [
        ['pylon_solar_project_id', 'VARCHAR(32) NULL'],
        ['pylon_proposal_url', 'VARCHAR(768) NULL'],
      ];
      for (const [col, def] of cols) {
        if (!(await columnExists(schema, 'leads', col))) {
          await db.execute(`ALTER TABLE leads ADD COLUMN ${col} ${def}`);
        }
      }
    },
  },

  /* ── V013: Attendance lunch break deduction ── */
  {
    version: 'V013__attendance_lunch_break',
    description: 'Store lunch break deduction minutes on attendance records',
    up: async () => {
      const schema = process.env.DB_NAME;
      if (!(await columnExists(schema, 'employee_attendance', 'lunch_break_minutes'))) {
        await db.execute(`
          ALTER TABLE employee_attendance
          ADD COLUMN lunch_break_minutes SMALLINT UNSIGNED NOT NULL DEFAULT 0 AFTER check_out_lng
        `);
      }
    },
  },

  /* ── V014: Team attendance-by-date module (per job role via job_role_modules) ── */
  {
    version: 'V014__attendance_history_module',
    description: 'Register attendance_history module for solar_retailer and enterprise company types',
    up: async () => {
      await db.execute(
        `INSERT IGNORE INTO modules (key_name, display_name) VALUES ('attendance_history', 'Team attendance roster')`,
      );
      for (const companyTypeId of [1, 3]) {
        await db.execute(
          `INSERT IGNORE INTO company_type_modules (company_type_id, module_key) VALUES (?, 'attendance_history')`,
          [companyTypeId],
        );
      }
    },
  },


];

/* ═══════ Runner ═══════ */

export async function runMigrations() {
  const started = Date.now();
  console.log('\n🔄 [migrations] Checking database migrations…');

  // 1. Create tracking table
  await db.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version     VARCHAR(100) PRIMARY KEY,
      description VARCHAR(255),
      executed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      duration_ms INT UNSIGNED NOT NULL DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // 2. Get already-applied versions
  const [applied] = await db.query('SELECT version FROM schema_migrations');
  const appliedSet = new Set(applied.map(r => r.version));

  // 3. Run pending migrations in order
  let ranCount = 0;
  for (const m of MIGRATIONS) {
    if (appliedSet.has(m.version)) continue;

    const t0 = Date.now();
    console.log(`  ▶ ${m.version} — ${m.description}`);
    try {
      await m.up();
      const durationMs = Date.now() - t0;
      await db.query(
        'INSERT INTO schema_migrations (version, description, duration_ms) VALUES (?, ?, ?)',
        [m.version, m.description, durationMs]
      );
      console.log(`    ✅ done (${durationMs}ms)`);
      ranCount++;
    } catch (err) {
      console.error(`    ❌ FAILED: ${err.message}`);
      throw err; // Stop on first failure (like Flyway)
    }
  }

  const elapsed = Date.now() - started;
  if (ranCount === 0) {
    console.log(`✅ [migrations] Schema is up to date (${MIGRATIONS.length} migrations, ${elapsed}ms)\n`);
  } else {
    console.log(`✅ [migrations] Applied ${ranCount} migration(s) in ${elapsed}ms\n`);
  }
}
