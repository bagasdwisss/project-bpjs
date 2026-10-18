// server/middleware/deviceGuard.js - Device Fingerprinting & Session Hijacking Guard
import { query } from '../db.js';
import crypto from 'crypto';

// In-memory session fingerprint cache: userId -> { fingerprint, userAgent, ip }
const activeSessionFingerprints = new Map();

export const registerSessionFingerprint = (userId, fingerprint, userAgent, ip) => {
  if (!userId || !fingerprint) return;
  activeSessionFingerprints.set(String(userId), {
    fingerprint,
    userAgent: userAgent || 'Unknown',
    ip: ip || '127.0.0.1',
    recordedAt: Date.now()
  });
};

export const deviceGuardMiddleware = async (req, res, next) => {
  // Only evaluate authenticated requests where req.user is populated by authenticateToken
  if (!req.user || !req.user.user_id) {
    return next();
  }

  const clientFingerprint = req.headers['x-device-fingerprint'];
  const userAgent = req.headers['user-agent'] || 'Unknown';
  const clientIp = (req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || '127.0.0.1').trim();
  const userId = String(req.user.user_id);

  if (!clientFingerprint) {
    // Legacy client or missing header: pass through
    return next();
  }

  const existing = activeSessionFingerprints.get(userId);

  if (!existing) {
    // First time seeing this user's active session, register
    registerSessionFingerprint(userId, clientFingerprint, userAgent, clientIp);
    return next();
  }

  // Cross-check: If fingerprint drastically changes during active session
  if (existing.fingerprint !== clientFingerprint) {
    console.warn(`🚨 [Session Guard] Potensi Session Hijacking terdeteksi pada User ID ${userId}!`);
    console.warn(`Original FP: ${existing.fingerprint} vs Incoming FP: ${clientFingerprint}`);

    // Log suspicious activity asynchronously
    try {
      await query(
        `INSERT INTO activity_logs (user_id, activity_type, details, ip_address, device_fingerprint, created_at)
         VALUES ($1, 'SECURITY_ALERT_SESSION_HIJACK', $2, $3, $4, CURRENT_TIMESTAMP)`,
        [
          req.user.user_id,
          `Ketidakcocokan sidik jari perangkat (Device Fingerprint Mismatch). Kemungkinan pembajakan token atau session fixation. IP: ${clientIp}, UserAgent: ${userAgent}`,
          clientIp,
          clientFingerprint
        ]
      );
    } catch (e) {
      // Ignore logging failure to avoid blocking
    }

    // Reject suspicious request
    return res.status(401).json({
      success: false,
      code: 'SESSION_HIJACK_DETECTED',
      message: 'Sesi Anda ditangguhkan demi keamanan. Terdeteksi perubahan sidik jari perangkat secara mendadak. Silakan masuk kembali.'
    });
  }

  next();
};

export default deviceGuardMiddleware;
