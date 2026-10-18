// scripts/run_22_features_migration.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../server/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  const client = await pool.connect();
  try {
    const sqlPath = path.resolve(__dirname, 'migrate_22_features.sql');
    console.log(`Executing migration from ${sqlPath}...`);
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await client.query(sql);
    console.log('✅ Migration migrate_22_features.sql successfully applied to Neon DB!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
  }
}

run();
