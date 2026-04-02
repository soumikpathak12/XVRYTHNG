/**
 * Apply pending DB migrations (see migrationRunner.js).
 * Usage: from backend/ →  npm run migrate
 */
import 'dotenv/config';
import { runMigrations } from './migrationRunner.js';

try {
  await runMigrations();
  process.exit(0);
} catch (e) {
  console.error(e);
  process.exit(1);
}
