// scripts/init_neon_db.js - Automate Neon PostgreSQL schema initialization
import fs from 'fs';
import path from 'path';
import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!connectionString) {
  console.error('\n❌ ERROR: DATABASE_URL tidak ditemukan di file .env!');
  console.log('Silakan buat akun gratis di https://neon.tech, lalu salin connection string ke .env:');
  console.log('DATABASE_URL=postgresql://[user]:[password]@[neon-host]/[dbname]?sslmode=require\n');
  process.exit(1);
}

console.log('🔄 Menghubungkan ke Neon PostgreSQL...');

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function initDatabase() {
  const client = await pool.connect();
  try {
    console.log('✅ Berhasil terhubung ke Neon PostgreSQL!');

    // Read neon_schema.sql
    let sqlPath = path.resolve(__dirname, '../../neon_schema.sql');
    if (!fs.existsSync(sqlPath)) {
      sqlPath = path.resolve(__dirname, '../neon_schema.sql');
    }

    if (!fs.existsSync(sqlPath)) {
      throw new Error(`File neon_schema.sql tidak ditemukan di ${sqlPath}`);
    }

    console.log('📄 Membaca neon_schema.sql...');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    console.log('⚙️ Menjalankan migrasi dan seeding database ke Neon...');
    await client.query(sqlContent);

    console.log('\n🎉 Inisialisasi Database Neon PostgreSQL Berhasil!');
    console.log('Semua tabel, view, dan data awal (roles, users, batches, progress, dll) telah terpasang.');
    console.log('\nAkun default untuk login (Password: password123):');
    console.log('- Administrator : ADM001');
    console.log('- Koordinator   : KO001 (Fedro), KO002 (Afiyah), KO003 (Fizka), KO004 (Paramitha)');
    console.log('- Peserta       : PES001 (Arthur), PES002 (Widi), PES003 (Adinda), PES004 (Novita)\n');

  } catch (err) {
    console.error('❌ Terjadi kesalahan saat inisialisasi database:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

initDatabase();
