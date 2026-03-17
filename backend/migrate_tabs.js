import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

async function migrate() {
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'xvrythng',
    multipleStatements: true
  };

  try {
    const connection = await mysql.createConnection(dbConfig);
    console.log('Connected to DB');

    const sqlPath = path.join(__dirname, '../database/migrations/010_project_tabs_tables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Running SQL...');
    await connection.query(sql);
    console.log('Migration successful!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
