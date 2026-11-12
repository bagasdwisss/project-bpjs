import { compressPayload } from './payloadCompressor.js';
import { insertChainedLog } from './merkleAudit.js';

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
    const rawDetails = options.description || options.details || '';
    const details = typeof rawDetails === 'object'
      ? compressPayload(rawDetails)
      : (typeof rawDetails === 'string' && rawDetails.length > 256 ? compressPayload(rawDetails) : rawDetails);
    const rawIp = req?.headers?.['x-forwarded-for'] || req?.ip || options.ip || '127.0.0.1';
    const ip = typeof rawIp === 'string' ? rawIp.split(',')[0].trim() : '127.0.0.1';
    const userAgent = req?.headers?.['user-agent'] || options.userAgent || null;
    const deviceFingerprint = req?.headers?.['x-device-fingerprint'] || options.deviceFingerprint || null;
    const isAnomaly = Boolean(options.isAnomaly);
    const anomalyReason = options.anomalyReason || null;

    await insertChainedLog(userId, type, details, ip, deviceFingerprint, {
      isAnomaly,
      anomalyReason,
      userAgent
    });
  } catch (err) {
    console.error('Audit Trail Logging Error:', err.message);
  }
};

export default logActivity;
