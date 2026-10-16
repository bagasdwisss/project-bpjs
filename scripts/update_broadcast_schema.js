// scripts/update_broadcast_schema.js
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function updateSchema() {
  const client = await pool.connect();
  try {
    console.log('Updating broadcast_messages schema...');
    
    await client.query(`
      ALTER TABLE broadcast_messages 
      ADD COLUMN IF NOT EXISTS start_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS end_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS show_on_login BOOLEAN DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
    `);

    // Also create table to track dismissed broadcasts per user
    await client.query(`
      CREATE TABLE IF NOT EXISTS broadcast_dismissals (
        id SERIAL PRIMARY KEY,
        broadcast_id INT NOT NULL REFERENCES broadcast_messages(broadcast_id) ON DELETE CASCADE,
        user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        dismissed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(broadcast_id, user_id)
      );
    `);

    console.log('✅ broadcast_messages & broadcast_dismissals schema updated successfully!');
  } catch (err) {
    console.error('❌ Failed to update broadcast schema:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

updateSchema();
