// server/utils/merkleAudit.js - Append-Only Merkle Hash Chain Audit Trail & Multi-Layer Anti-Tamper Engine
import crypto from 'crypto';
import { query } from '../db.js';

export const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

/**
 * Computes deterministic SHA-256 block hash for an activity log record
 */
export const computeLogHash = (prevHash, userId, activityType, details, timestamp) => {
  const normPrev = String(prevHash || GENESIS_HASH);
  const normUser = String(userId || 'ANON');
  const normType = String(activityType || '');
  const normDetails = String(details || '');

  let isoTs = '';
  if (timestamp instanceof Date) {
    isoTs = timestamp.toISOString();
  } else if (typeof timestamp === 'string') {
    isoTs = new Date(timestamp).toISOString();
  } else if (typeof timestamp === 'number') {
    isoTs = new Date(timestamp).toISOString();
  } else {
    isoTs = new Date().toISOString();
  }

  const payload = `${normPrev}|#|${normUser}|#|${normType}|#|${normDetails}|#|${isoTs}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
};

/**
 * Inserts a cryptographically chained activity log entry
 */
export const insertChainedLog = async (userId, activityType, details, ipAddress = '127.0.0.1', deviceFingerprint = null) => {
  try {
    const latestRes = await query(
      `SELECT current_hash FROM activity_logs ORDER BY log_id DESC LIMIT 1`
    );
    const prevHash = latestRes.rows.length > 0 && latestRes.rows[0].current_hash 
      ? latestRes.rows[0].current_hash 
      : GENESIS_HASH;

    const timestamp = new Date();
    const currentHash = computeLogHash(prevHash, userId, activityType, details, timestamp);

    const result = await query(
      `INSERT INTO activity_logs (
        user_id, activity_type, details, ip_address, device_fingerprint,
        prev_hash, current_hash, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [userId || null, activityType, details, ipAddress, deviceFingerprint, prevHash, currentHash, timestamp.toISOString()]
    );

    return result.rows[0];
  } catch (err) {
    console.error('Failed to insert chained activity log:', err.message);
    return null;
  }
};

/**
 * Verifies the mathematical integrity of the Merkle Hash Chain and Database State
 * Returns { isValid: boolean, checkedCount: number, tamperedAt: number | null, tamperType: string, message: string }
 */
export const verifyAuditChainIntegrity = async (limit = 1000) => {
  try {
    const res = await query(
      `SELECT log_id, user_id, activity_type, details, prev_hash, current_hash, created_at
       FROM activity_logs
       ORDER BY log_id ASC
       LIMIT $1`,
      [limit]
    );

    const logs = res.rows;
    if (logs.length === 0) {
      return { isValid: true, checkedCount: 0, message: 'Belum ada log tersimpan di database.' };
    }

    // -------------------------------------------------------------------------
    // LAYER 1: STRICT CRYPTOGRAPHIC MERKLE HASH CHAIN VERIFICATION
    // -------------------------------------------------------------------------
    let expectedPrevHash = GENESIS_HASH;

    for (let i = 0; i < logs.length; i++) {
      const log = logs[i];

      // Check A: Unhashed log records (injected directly without hash or wiped)
      if (!log.current_hash || !log.prev_hash) {
        return {
          isValid: false,
          checkedCount: i + 1,
          tamperedAt: log.log_id,
          tamperType: 'UNHASHED_RECORD_DETECTED',
          message: `🚨 Manipulasi Terdeteksi pada Log ID #${log.log_id} (${log.activity_type})! Baris log tidak memiliki segel hash kriptografi resmi.`
        };
      }

      // Check B: Previous hash link broken (indicates log row deletion or out-of-order injection)
      if (log.prev_hash !== expectedPrevHash) {
        return {
          isValid: false,
          checkedCount: i + 1,
          tamperedAt: log.log_id,
          tamperType: 'LOG_CHAIN_BROKEN',
          message: `🚨 Rantai Audit Terputus pada Log ID #${log.log_id}! Nilai prev_hash (${log.prev_hash.substring(0, 12)}...) tidak cocok dengan hash blok sebelumnya (${expectedPrevHash.substring(0, 12)}...). Terdeteksi baris log audit yang dihapus paksa atau disisipkan secara ilegal di database!`
        };
      }

      // Check C: Recalculate block hash from row payload and compare strictly
      const recalculatedHash = computeLogHash(
        log.prev_hash,
        log.user_id,
        log.activity_type,
        log.details,
        log.created_at
      );

      if (log.current_hash !== recalculatedHash) {
        return {
          isValid: false,
          checkedCount: i + 1,
          tamperedAt: log.log_id,
          tamperType: 'LOG_CONTENT_TAMPERED',
          message: `🚨 Manipulasi Data Terdeteksi pada Log ID #${log.log_id} (${log.activity_type})! Isi log (user_id, aktivitas, atau rincian) telah diubah langsung di database tanpa melalui sistem. Hash tersimpan (${log.current_hash.substring(0, 12)}...) tidak cocok dengan rekalkulasi (${recalculatedHash.substring(0, 12)}...).`
        };
      }

      expectedPrevHash = log.current_hash;
    }

    // -------------------------------------------------------------------------
    // LAYER 2: DATABASE STATE INTEGRITY & ANOMALY CROSS-CHECK
    // -------------------------------------------------------------------------
    // 2.1 Check for direct unapproved score tampering
    const scoreAnomalyRes = await query(
      `SELECT score_id, user_id, score_value FROM scores WHERE score_value < 0 OR score_value > 100 LIMIT 1`
    );
    if (scoreAnomalyRes.rows.length > 0) {
      const an = scoreAnomalyRes.rows[0];
      return {
        isValid: false,
        checkedCount: logs.length,
        tamperedAt: an.score_id,
        tamperType: 'SCORE_INFLATION_DETECTED',
        message: `🚨 Anomali Integritas Nilai Terdeteksi! Ditemukan nilai di luar batas resmi (Score ID #${an.score_id}: ${an.score_value}) yang diubah langsung di database!`
      };
    }

    // 2.2 Check for direct progress tampering
    const progressAnomalyRes = await query(
      `SELECT id, user_id, nilai FROM progress WHERE nilai < 0 OR nilai > 100 LIMIT 1`
    );
    if (progressAnomalyRes.rows.length > 0) {
      const an = progressAnomalyRes.rows[0];
      return {
        isValid: false,
        checkedCount: logs.length,
        tamperedAt: an.id,
        tamperType: 'PROGRESS_INFLATION_DETECTED',
        message: `🚨 Anomali Integritas Progress Terdeteksi! Nilai progress ID #${an.id} (${an.nilai}) berada di luar batas wajar (0-100) hasil modifikasi database langsung!`
      };
    }

    // 2.3 Check for illegal role elevation
    const userRoleAnomalyRes = await query(
      `SELECT u.user_id, u.unique_id, u.full_name, u.role_id 
       FROM users u 
       LEFT JOIN roles r ON u.role_id = r.role_id 
       WHERE r.role_id IS NULL LIMIT 1`
    );
    if (userRoleAnomalyRes.rows.length > 0) {
      const an = userRoleAnomalyRes.rows[0];
      return {
        isValid: false,
        checkedCount: logs.length,
        tamperedAt: an.user_id,
        tamperType: 'UNAUTHORIZED_ROLE_DETECTED',
        message: `🚨 Eskalasi Akses Ilegal Terdeteksi! Pengguna ${an.full_name} (${an.unique_id}) memiliki role_id #${an.role_id} yang tidak sah dalam basis data!`
      };
    }

    return {
      isValid: true,
      checkedCount: logs.length,
      latestHash: expectedPrevHash,
      message: `Semua ${logs.length} catatan log terverifikasi utuh, rantai hash kriptografi SHA-256 valid, dan konsistensi relasional basis data bebas dari manipulasi oknum.`
    };
  } catch (err) {
    return {
      isValid: false,
      checkedCount: 0,
      tamperType: 'VERIFICATION_ERROR',
      message: `Gagal verifikasi audit chain: ${err.message}`
    };
  }
};

/**
 * Rebuilds the entire audit chain cryptographically (useful for initial migration or maintenance)
 */
export const rebuildAuditChain = async () => {
  const res = await query('SELECT log_id, user_id, activity_type, details, created_at FROM activity_logs ORDER BY log_id ASC');
  let prevHash = GENESIS_HASH;

  for (const row of res.rows) {
    const curHash = computeLogHash(prevHash, row.user_id, row.activity_type, row.details, row.created_at);
    await query(
      'UPDATE activity_logs SET prev_hash = $1, current_hash = $2 WHERE log_id = $3',
      [prevHash, curHash, row.log_id]
    );
    prevHash = curHash;
  }

  return { success: true, count: res.rows.length, latestHash: prevHash };
};
