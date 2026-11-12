// server/utils/migrationLockGuard.js - Zero-Downtime Database Migration Lock Guard via PostgreSQL Advisory Locks
import pool from '../db.js';

export const MIGRATION_ADVISORY_LOCK_ID = 84729104;

/**
 * Acquires a session-scoped PostgreSQL advisory lock on a single dedicated pool client
 * so lock acquisition, migration callback, and unlock execute on the exact same connection.
 */
export async function withAdvisoryLock(migrationFn, lockId = MIGRATION_ADVISORY_LOCK_ID) {
  const client = await pool.connect();
  let lockAcquired = false;

  try {
    const lockCheck = await client.query('SELECT pg_try_advisory_lock($1) AS acquired', [lockId]);
    lockAcquired = lockCheck.rows[0]?.acquired === true;

    if (!lockAcquired) {
      console.warn(`🔒 [Advisory Lock] Migration lock (${lockId}) is currently held by another worker.`);
      return {
        success: false,
        locked: false,
        message: 'Lock tidak dapat diambil: Proses migrasi lain sedang berjalan. Operasi diskip secara aman.'
      };
    }

    const result = await migrationFn(client);

    return {
      success: true,
      locked: true,
      result,
      message: 'Migrasi berhasil diselesaikan di bawah perlindungan PostgreSQL Advisory Lock.'
    };
  } catch (err) {
    console.error('❌ [Advisory Lock] Error during advisory locked execution:', err.message);
    throw err;
  } finally {
    if (lockAcquired) {
      await client.query('SELECT pg_advisory_unlock($1)', [lockId]).catch((unlockErr) => {
        console.error(`⚠️ [Advisory Lock] Failed to release lock (${lockId}):`, unlockErr.message);
      });
    }
    client.release();
  }
}
