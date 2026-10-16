// api/db.js - Neon PostgreSQL Connection Pool
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Neon PostgreSQL requires SSL in production.
// Neon connection strings look like: postgresql://[user]:[password]@[host]/[dbname]?sslmode=require
const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || 'postgresql://postgres:postgres@localhost:5432/db_absen_nilai';

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes('localhost') || connectionString.includes('127.0.0.1')
    ? false
    : { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client:', err);
});

export const query = (text, params) => pool.query(text, params);
export default pool;
