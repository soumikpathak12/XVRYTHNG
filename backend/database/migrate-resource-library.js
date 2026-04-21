/**
 * Idempotent migration: shared resource library table.
 * Run: node database/migrate-resource-library.js (from backend folder)
 */
import 'dotenv/config';
import db from '../src/config/db.js';

async function tableExists(schema, table) {
  const [rows] = await db.execute(
    `SELECT 1 FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? LIMIT 1`,
    [schema, table],
  );
  return rows.length > 0;
}

async function columnExists(schema, table, column) {
  const [rows] = await db.execute(
    `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1`,
    [schema, table, column],
  );
  return rows.length > 0;
}

async function migrate() {
  const schema = process.env.DB_NAME;
  if (!schema) {
    console.error('[resource-library] Missing DB_NAME in .env');
    process.exit(1);
  }
  console.log('[resource-library] Using schema:', schema);

  if (!(await tableExists(schema, 'resource_library_items'))) {
    await db.execute(`
      CREATE TABLE resource_library_items (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        company_id INT UNSIGNED NULL,
        created_by INT UNSIGNED NOT NULL,
        title VARCHAR(255) NOT NULL,
        category VARCHAR(50) NOT NULL DEFAULT 'sticker',
        section_name VARCHAR(120) NOT NULL DEFAULT 'General',
        resource_type VARCHAR(20) NOT NULL DEFAULT 'photo',
        image_url VARCHAR(1000) NULL,
        link_url VARCHAR(1000) NULL,
        notes TEXT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_resource_company (company_id),
        INDEX idx_resource_category (category),
        INDEX idx_resource_created_by (created_by)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('  + Created resource_library_items');
  } else {
    console.log('  = resource_library_items already exists');
    if (!(await columnExists(schema, 'resource_library_items', 'section_name'))) {
      await db.execute(`
        ALTER TABLE resource_library_items
        ADD COLUMN section_name VARCHAR(120) NOT NULL DEFAULT 'General' AFTER category
      `);
      console.log('  + Added resource_library_items.section_name');
    }
  }

  console.log('[resource-library] Done');
  process.exit(0);
}

migrate().catch((err) => {
  console.error('[resource-library] Failed:', err);
  process.exit(1);
});
