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

// Periodic self-healing monitor (every 10s)
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

export default pool;
