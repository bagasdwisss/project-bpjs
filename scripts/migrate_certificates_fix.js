import pool from '../server/db.js';

async function migrateCertificates() {
  console.log('🔄 Running certificates schema migration on Neon Postgres...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Ensure certificates table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS certificates (
        certificate_id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        certificate_number VARCHAR(100) NOT NULL UNIQUE,
        issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
        predicate VARCHAR(100) DEFAULT 'Sangat Memuaskan (Grade A)',
        score_average NUMERIC(5, 2) DEFAULT 90.00,
        digital_signature_hash VARCHAR(255) NOT NULL,
        batch_name VARCHAR(100) DEFAULT 'Batch 1 - Gelombang Berjalan',
        status VARCHAR(50) DEFAULT 'Terbit',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Add missing columns safely
    await client.query(`
      ALTER TABLE certificates 
      ADD COLUMN IF NOT EXISTS certificate_type VARCHAR(50) DEFAULT 'Kelulusan',
      ADD COLUMN IF NOT EXISTS design_theme VARCHAR(50) DEFAULT 'emerald',
      ADD COLUMN IF NOT EXISTS issued_by INT REFERENCES users(user_id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS digital_signature VARCHAR(255),
      ADD COLUMN IF NOT EXISTS signature_algorithm VARCHAR(32) DEFAULT 'HMAC-SHA256',
      ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS reissue_requested BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS reissue_reason TEXT,
      ADD COLUMN IF NOT EXISTS reissue_requested_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS reissue_requested_by INT REFERENCES users(user_id) ON DELETE SET NULL;
    `);

    // 3. Ensure indices
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_certificates_user_id ON certificates(user_id);
      CREATE INDEX IF NOT EXISTS idx_certificates_number ON certificates(certificate_number);
      CREATE INDEX IF NOT EXISTS idx_certificates_type ON certificates(certificate_type);
      CREATE INDEX IF NOT EXISTS idx_certificates_reissue ON certificates(reissue_requested);
    `);

    await client.query('COMMIT');
    console.log('✅ Certificates table and all columns successfully migrated!');

    // 4. Verify columns
    const verifyRes = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'certificates'
      ORDER BY ordinal_position
    `);
    console.log('📋 Verified columns:', verifyRes.rows.map(r => r.column_name).join(', '));
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err);
    throw err;
  } finally {
    client.release();
  }
}

migrateCertificates()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
