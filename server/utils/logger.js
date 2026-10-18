import { query } from '../db.js';
import crypto from 'crypto';

const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

/**
 * Centralized Audit Trail Logger with Merkle Hash Chain (Feature 17)
 * Logs system activities for forensics and administration monitoring.
 * NOTE: Live chat bimbingan messages are strictly NEVER logged to maintain confidentiality.
 */
export const logActivity = async (options = {}) => {
  try {
    const req = options.req;
    const userId = options.userId || req?.user?.user_id || null;
    const type = options.action || options.type || 'SYSTEM_EVENT';
    const details = options.description || options.details || '';
    const rawIp = req?.headers?.['x-forwarded-for'] || req?.ip || options.ip || '127.0.0.1';
    const ip = typeof rawIp === 'string' ? rawIp.split(',')[0].trim() : '127.0.0.1';
    const userAgent = req?.headers?.['user-agent'] || options.userAgent || null;
    const deviceFingerprint = req?.headers?.['x-device-fingerprint'] || options.deviceFingerprint || null;
    const isAnomaly = Boolean(options.isAnomaly);
    const anomalyReason = options.anomalyReason || null;

    // Fetch previous current_hash for Merkle chaining
    const lastRes = await query(
      `SELECT current_hash FROM activity_logs ORDER BY log_id DESC LIMIT 1`
    );
    const prevHash = lastRes.rows.length > 0 && lastRes.rows[0].current_hash 
      ? lastRes.rows[0].current_hash 
      : GENESIS_HASH;

    const timestamp = new Date().toISOString();
    const payload = `${prevHash}|#|${userId || 'ANON'}|#|${type}|#|${details}|#|${timestamp}`;
    const currentHash = crypto.createHash('sha256').update(payload).digest('hex');

    await query(
      `INSERT INTO activity_logs (
        user_id, activity_type, details, ip_address, is_anomaly, anomaly_reason,
        user_agent, device_fingerprint, prev_hash, current_hash, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [userId, type, details, ip, isAnomaly, anomalyReason, userAgent, deviceFingerprint, prevHash, currentHash, timestamp]
    );
  } catch (err) {
    console.error('Audit Trail Logging Error:', err.message);
  }
};

export default logActivity;
