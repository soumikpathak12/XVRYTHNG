import db from '../src/config/db.js';

async function migrate() {
  try {
    console.log('Running company enabled_modules migration...');
    await db.query(`
      ALTER TABLE companies
      ADD COLUMN enabled_modules JSON NULL DEFAULT NULL
      COMMENT 'Feature toggles: sales, on_field, project_management, operations, customer_portal, communications'
    `);
    console.log('Migration successful.');
    process.exit(0);
  } catch (err) {
    if (err?.code === 'ER_DUP_FIELDNAME') {
      console.log('Column enabled_modules already exists — skipped.');
      process.exit(0);
    }
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
