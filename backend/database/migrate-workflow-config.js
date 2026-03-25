import db from '../src/config/db.js';

const statements = [
  `ALTER TABLE companies
     ADD COLUMN workflow_config JSON NULL DEFAULT NULL
     COMMENT 'Per-pipeline stage definitions: sales, project_management'`,
  `ALTER TABLE leads
     MODIFY COLUMN stage VARCHAR(80) NOT NULL DEFAULT 'new'`,
  `ALTER TABLE projects
     MODIFY COLUMN stage VARCHAR(80) NOT NULL DEFAULT 'new'`,
];

async function migrate() {
  for (const sql of statements) {
    try {
      console.log('Running:', sql.slice(0, 60).replace(/\s+/g, ' '), '...');
      await db.query(sql);
    } catch (err) {
      if (err?.code === 'ER_DUP_FIELDNAME') {
        console.log('  (skipped — column already exists)');
        continue;
      }
      if (err?.code === 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD' || err?.errno === 1265) {
        console.error('Migration failed — inspect existing ENUM/data:', err.message);
        process.exit(1);
      }
      console.error('Migration failed:', err);
      process.exit(1);
    }
  }
  console.log('Workflow migration completed.');
  process.exit(0);
}

migrate();
