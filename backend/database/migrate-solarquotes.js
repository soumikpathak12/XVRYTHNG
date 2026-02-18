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

async function migrate() {
  const schema = process.env.DB_NAME;
  if (!schema) {
    console.error('[solarquotes] Missing DB_NAME in .env');
    process.exit(1);
  }

  console.log('[solarquotes] Using schema:', schema);

  const leadCols = [
    ['external_id', 'VARCHAR(255) NULL'],
    ['marketing_payload_json', 'JSON NULL'],
  ];

  for (const [col, def] of leadCols) {
    if (!(await columnExists(schema, 'leads', col))) {
      console.log('  + Adding leads.' + col);
      await db.execute(`ALTER TABLE leads ADD COLUMN ${col} ${def}`);
    }
  }
  
  // Also add index for external_id if it doesn't exist
  try {
    await db.execute('CREATE INDEX idx_leads_external_id ON leads(external_id)');
    console.log('  + Created index idx_leads_external_id');
  } catch (err) {
    console.log('    index idx_leads_external_id might already exist');
  }

  console.log('[solarquotes] Done');
  process.exit(0);
}

migrate().catch((err) => {
  console.error('[solarquotes] Failed:', err);
  process.exit(1);
});
