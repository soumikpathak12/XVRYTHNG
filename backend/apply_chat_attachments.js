import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './src/config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  try {
    const sqlPath = path.join(__dirname, '..', 'database', 'migrations', '011_chat_attachments.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // We split by ; to run multiple statements if needed, but here it's just one
    const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);
    
    for (const stmt of statements) {
      if (stmt.startsWith('--')) continue; // skip pure comment blocks
      console.log('Executing:', stmt.slice(0, 100) + '...');
      await db.execute(stmt);
    }
    console.log('Migration applied successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    process.exit(0);
  }
}

run();
