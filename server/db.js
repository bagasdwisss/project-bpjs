// server/db.js - Neon PostgreSQL Connection Pool with Circuit Breaker Pattern
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const connectionString = 
  process.env.DATABASE_URL || 
  process.env.POSTGRES_URL || 
  process.env.POSTGRES_PRISMA_URL || 
  process.env.POSTGRES_URL_NON_POOLING ||
  (process.env.POSTGRES_HOST 
    ? `postgresql://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@${process.env.POSTGRES_HOST}/${process.env.POSTGRES_DATABASE}?sslmode=require`
    : 'postgresql://postgres:postgres@localhost:5432/db_absen_nilai');

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
  console.error('Unexpected error on idle PostgreSQL client:', err.message);
});

// =========================================================================
// FEATURE 16: SELF-HEALING POSTGRESQL CONNECTION POOLER (LEAK DETECTOR & AUTO-DRAIN)
// =========================================================================
const activeLeasedClients = new Map();
let totalLeakedRecovered = 0;
const LEAK_THRESHOLD_MS = 20000; // 20 seconds lease limit before auto-drain

pool.on('acquire', (client) => {
  activeLeasedClients.set(client, { acquiredAt: Date.now() });
});

pool.on('release', (err, client) => {
  if (client) {
    activeLeasedClients.delete(client);
  }
});

pool.on('remove', (client) => {
  if (client) {
    activeLeasedClients.delete(client);
  }
});

// Periodic self-healing monitor (every 10s, standalone Node only)
if (!process.env.VERCEL) {
  const leakDetectorInterval = setInterval(() => {
    const now = Date.now();
    for (const [client, entry] of activeLeasedClients.entries()) {
      const elapsed = now - entry.acquiredAt;
      if (elapsed > LEAK_THRESHOLD_MS) {
        console.warn(`🚨 [Self-Healing Pooler] Leaked client detected (leased ${elapsed}ms > ${LEAK_THRESHOLD_MS}ms). Auto-draining connection.`);
        try {
          if (typeof client.release === 'function') {
            client.release(true); // Destroy socket to recover slot
          }
          totalLeakedRecovered++;
        } catch (e) {
          console.error('Error during auto-drain release:', e.message);
        }
        activeLeasedClients.delete(client);
      }
    }
  }, 10000);

  if (leakDetectorInterval.unref) {
    leakDetectorInterval.unref(); // Don't block process exit
  }
}

export const getPoolHealthMetrics = () => {
  const total = pool.totalCount || 10;
  const active = activeLeasedClients.size;
  return {
    totalConnections: pool.totalCount || 0,
    idleConnections: pool.idleCount || 0,
    waitingRequests: pool.waitingCount || 0,
    activeLeased: active,
    totalLeakedRecovered,
    leakThresholdMs: LEAK_THRESHOLD_MS,
    status: active >= Math.max(1, total * 0.9) ? 'CONGESTED' : 'HEALTHY'
  };
};


// =========================================================================
// FEATURE 21: CIRCUIT BREAKER PATTERN FOR CLOUD DATABASE
// =========================================================================
class DatabaseCircuitBreaker {
  constructor(failureThreshold = 5, recoveryTimeoutMs = 15000) {
    this.state = 'CLOSED'; // 'CLOSED' | 'OPEN' | 'HALF_OPEN'
    this.failureCount = 0;
    this.failureThreshold = failureThreshold;
    this.recoveryTimeoutMs = recoveryTimeoutMs;
    this.lastFailureTime = null;
    this.totalSuccess = 0;
    this.totalTripped = 0;
  }

  isOpen() {
    if (this.state === 'OPEN') {
      const now = Date.now();
      if (now - this.lastFailureTime > this.recoveryTimeoutMs) {
        console.warn('⚡ [Circuit Breaker] Entering HALF_OPEN state. Testing single database query probe...');
        this.state = 'HALF_OPEN';
        return false;
      }
      return true;
    }
    return false;
  }

  recordSuccess() {
    this.failureCount = 0;
    this.totalSuccess++;
    if (this.state === 'HALF_OPEN') {
      console.log('✅ [Circuit Breaker] Probe successful. Resetting state to CLOSED.');
      this.state = 'CLOSED';
    }
  }

  recordFailure(err) {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    console.error(`⚠️ [Circuit Breaker] DB query failed (${this.failureCount}/${this.failureThreshold}):`, err.message);

    if (this.failureCount >= this.failureThreshold || this.state === 'HALF_OPEN') {
      this.state = 'OPEN';
      this.totalTripped++;
      console.error(`🚨 [Circuit Breaker] Database connection tripped to OPEN! Fast-failing for ${this.recoveryTimeoutMs / 1000}s`);
    }
  }

  getStatus() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      totalSuccess: this.totalSuccess,
      totalTripped: this.totalTripped,
      isDegraded: this.state !== 'CLOSED'
    };
  }
}

export const circuitBreaker = new DatabaseCircuitBreaker(5, 15000);

/**
 * Resilient Query Function protected by Circuit Breaker
 */
export const query = async (text, params) => {
  if (circuitBreaker.isOpen()) {
    const error = new Error('Database Circuit Breaker is OPEN: Basis data cloud sedang mengalami degradasi koneksi sementara.');
    error.status = 503;
    error.circuitBreaker = true;
    throw error;
  }

  try {
    const res = await pool.query(text, params);
    circuitBreaker.recordSuccess();
    return res;
  } catch (err) {
    circuitBreaker.recordFailure(err);
    throw err;
  }
};

let coreSchemaPromise = null;
export async function ensureCoreSchema() {
  if (coreSchemaPromise) return coreSchemaPromise;
  coreSchemaPromise = (async () => {
    try {
      await pool.query(`
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
        );
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

        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS email VARCHAR(150),
        ADD COLUMN IF NOT EXISTS current_session_token VARCHAR(128),
        ADD COLUMN IF NOT EXISTS last_login_ip VARCHAR(45);

        ALTER TABLE attendance_settings
        ADD COLUMN IF NOT EXISTS inactivity_timeout_minutes INT DEFAULT 15;

        CREATE TABLE IF NOT EXISTS geofence_locations (
          id SERIAL PRIMARY KEY,
          name VARCHAR(150) NOT NULL,
          category VARCHAR(50) DEFAULT 'kantor',
          address TEXT,
          latitude NUMERIC(10, 7) NOT NULL,
          longitude NUMERIC(10, 7) NOT NULL,
          radius_meters INT DEFAULT 150,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        ALTER TABLE geofence_locations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

        ALTER TABLE documents
        ADD COLUMN IF NOT EXISTS description TEXT,
        ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'Terverifikasi',
        ADD COLUMN IF NOT EXISTS download_count INT DEFAULT 0,
        ADD COLUMN IF NOT EXISTS file_data TEXT;

        CREATE TABLE IF NOT EXISTS upload_tickets (
          ticket_id VARCHAR(64) PRIMARY KEY,
          user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
          filename VARCHAR(255) NOT NULL,
          file_type VARCHAR(100) NOT NULL,
          signature VARCHAR(128) NOT NULL,
          used BOOLEAN DEFAULT FALSE,
          expires_at TIMESTAMPTZ NOT NULL,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS pow_challenges (
          challenge_id VARCHAR(64) PRIMARY KEY,
          prefix VARCHAR(64) NOT NULL,
          difficulty INT NOT NULL DEFAULT 4,
          expires_at TIMESTAMPTZ NOT NULL,
          used BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );

        DELETE FROM tiered_storage_registry a USING tiered_storage_registry b
        WHERE a.file_id < b.file_id AND a.entity_type = b.entity_type AND a.entity_id = b.entity_id;

        DELETE FROM broadcast_dismissals a USING broadcast_dismissals b
        WHERE a.id < b.id AND a.broadcast_id = b.broadcast_id AND a.user_id = b.user_id;

        CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_user_date_uniq ON attendance_records(user_id, attendance_date);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_progress_user_id_uniq ON progress(user_id);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_user_batches_user_batch_uniq ON user_batches(user_id, batch_id);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_tiered_storage_entity_uniq ON tiered_storage_registry(entity_type, entity_id);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_broadcast_dismissal_uniq ON broadcast_dismissals(broadcast_id, user_id);

        ALTER TABLE peserta DROP CONSTRAINT IF EXISTS peserta_status_pendaftaran_check;
        ALTER TABLE peserta ADD CONSTRAINT peserta_status_pendaftaran_check
          CHECK (status_pendaftaran IN ('BARU DAFTAR', 'MENUNGGU PEMBAYARAN', 'MENUNGGU VERIFIKASI', 'PEMBAYARAN BERHASIL', 'PEMBAYARAN', 'LENGKAP'));
      `);
    } catch (err) {
      console.warn('[DB Init] Core schema ensure notice:', err.message);
      coreSchemaPromise = null;
    }
  })();
  return coreSchemaPromise;
}

export async function ensureCertificateSchema() {
  return ensureCoreSchema();
}

// Ensure core tables, columns, and unique constraints on boot (only skip warning noise)
ensureCoreSchema().catch((err) => {
  console.warn('[DB Boot] Schema ensure error:', err.message);
});

export { pool };
export default pool;
