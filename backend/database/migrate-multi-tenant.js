/**
 * Idempotent migration: multi-tenant company schema.
 * Creates company_types, company_type_modules; extends companies with ABN, contact, company_type_id.
 * Run: node database/migrate-multi-tenant.js (from backend folder)
 */
import 'dotenv/config';
import db from '../src/config/db.js';

async function columnExists(schema, table, column) {
  const [rows] = await db.execute(
    `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1`,
    [schema, table, column]
  );
  return rows.length > 0;
}

async function tableExists(schema, table) {
  const [rows] = await db.execute(
    `SELECT 1 FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? LIMIT 1`,
    [schema, table]
  );
  return rows.length > 0;
}

async function migrate() {
  const schema = process.env.DB_NAME;
  if (!schema) {
    console.error('[multi-tenant] Missing DB_NAME in .env');
    process.exit(1);
  }

  console.log('[multi-tenant] Using schema:', schema);

  if (!(await tableExists(schema, 'company_types'))) {
    console.log('  + Creating company_types');
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
  } else {
    console.log('    company_types exists');
  }

  if (!(await tableExists(schema, 'company_type_modules'))) {
    console.log('  + Creating company_type_modules');
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
      const t = types.find((r) => r.name === name);
      if (t) for (const mod of modules) await db.execute('INSERT IGNORE INTO company_type_modules (company_type_id, module_key) VALUES (?, ?)', [t.id, mod]);
    }
  } else {
    console.log('    company_type_modules exists');
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
      console.log('  + Adding companies.' + col);
      await db.execute(`ALTER TABLE companies ADD COLUMN ${col} ${def}`);
    }
  }

  const [fkRows] = await db.execute(
    `SELECT 1 FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'companies' AND CONSTRAINT_NAME = 'fk_companies_type' LIMIT 1`,
    [schema]
  );
  if (fkRows.length === 0) {
    console.log('  + Adding FK fk_companies_type');
    await db.execute(
      'ALTER TABLE companies ADD CONSTRAINT fk_companies_type FOREIGN KEY (company_type_id) REFERENCES company_types(id) ON DELETE SET NULL'
    );
  }

  console.log('[multi-tenant] Done');
  process.exit(0);
}

migrate().catch((err) => {
  console.error('[multi-tenant] Failed:', err);
  process.exit(1);
});
