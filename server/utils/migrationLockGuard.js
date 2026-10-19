// server/utils/migrationLockGuard.js - Zero-Downtime Database Migration Lock Guard via PostgreSQL Advisory Locks
import { query } from '../db.js';

export const MIGRATION_ADVISORY_LOCK_ID = 84729104; // Distinct application lock integer for BPJS migrations

/**
 * Executes a database migration or critical DDL routine with an exclusive advisory lock.
 * Prevents multiple serverless instances or concurrent deployments from running DDL simultaneously.
 *
 * @param {Function} migrationFn - Async callback executing the migration
 * @param {number} lockId - 32-bit integer advisory lock key
 * @returns {Promise<{ success: boolean, locked: boolean, result?: any, message: string }>}
 */
export async function withAdvisoryLock(migrationFn, lockId = MIGRATION_ADVISORY_LOCK_ID) {
  let lockAcquired = false;
  try {
    // Attempt non-blocking lock acquisition
    const lockCheck = await query('SELECT pg_try_advisory_lock($1) AS acquired', [lockId]);
    lockAcquired = lockCheck.rows[0]?.acquired === true;

    if (!lockAcquired) {
      console.warn(`🔒 [Advisory Lock] Migration lock (${lockId}) is currently held by another worker. Execution skipped safely.`);
      return {
        success: false,
        locked: false,
        message: 'Lock tidak dapat diambil: Proses migrasi lain sedang berjalan. Operasi diskip secara aman.'
      };
    }

    console.log(`🔓 [Advisory Lock] Migration lock (${lockId}) successfully acquired. Executing migration block...`);
    const result = await migrationFn();

    return {
      success: true,
      locked: true,
      result,
      message: 'Migrasi berhasil diselesaikan di bawah perlindungan PostgreSQL Advisory Lock.'
    };
  } catch (err) {
    console.error(`❌ [Advisory Lock] Error during advisory locked execution:`, err.message);
    throw err;
  } finally {
    if (lockAcquired) {
      try {
        await query('SELECT pg_advisory_unlock($1)', [lockId]);
        console.log(`🔓 [Advisory Lock] Advisory lock (${lockId}) safely released.`);
      } catch (unlockErr) {
        console.error(`⚠️ [Advisory Lock] Failed to release lock (${lockId}):`, unlockErr.message);
      }
    }
  }
}
