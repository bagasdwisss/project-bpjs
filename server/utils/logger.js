import { query } from '../db.js';

/**
 * Centralized Audit Trail Logger
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
    const isAnomaly = Boolean(options.isAnomaly);

    await query(
      `INSERT INTO activity_logs (user_id, activity_type, details, ip_address, is_anomaly, user_agent, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
      [userId, type, details, ip, isAnomaly, userAgent]
    );
  } catch (err) {
    console.error('Audit Trail Logging Error:', err.message);
  }
};

export default logActivity;
