// server/middleware/hmacVerifyMiddleware.js - Time-Stamped HMAC Request Signing (Anti-Replay Attack)
import crypto from 'crypto';

// Shared HMAC secret salt for critical client-server requests
const HMAC_SHARED_SECRET = process.env.HMAC_SHARED_SECRET || 'bpjstk-enterprise-hmac-salt-2026';

// Nonce cache to prevent Replay Attacks (nonce -> expiryTimestamp)
const seenNonces = new Map();

// Periodic cleanup of expired nonces every 60 seconds
setInterval(() => {
  const now = Date.now();
  for (const [nonce, expiresAt] of seenNonces.entries()) {
    if (now > expiresAt) {
      seenNonces.delete(nonce);
    }
  }
}, 60000);

/**
 * Middleware: Verify HMAC Signature and Anti-Replay Nonce
 */
export const verifyHmacSignature = (options = { strict: false }) => {
  return (req, res, next) => {
    const signature = req.headers['x-signature'];
    const timestamp = parseInt(req.headers['x-timestamp'], 10);
    const nonce = req.headers['x-nonce'];

    // In non-strict mode (e.g. testing), if headers aren't supplied, pass through with warning
    if (!signature || !timestamp || !nonce) {
      if (options.strict) {
        return res.status(403).json({
          success: false,
          code: 'HMAC_SIGNATURE_REQUIRED',
          message: 'Aksi kritis ini memerlukan tanda tangan kriptografi (HMAC-SHA256) dan timestamp valid.'
        });
      }
      return next();
    }

    // 1. Time-Drift Check (Anti-Stale / Time-Delay Attack) - Allow max 2 minutes skew
    const now = Date.now();
    const timeDiff = Math.abs(now - timestamp);
    if (isNaN(timestamp) || timeDiff > 120000) {
      return res.status(403).json({
        success: false,
        code: 'REQUEST_TIMESTAMP_EXPIRED',
        message: 'Request kedaluwarsa. Selisih waktu klien dan server melebihi toleransi keamanan (maksimal 2 menit).'
      });
    }

    // 2. Anti-Replay Check (Nonce uniqueness)
    if (seenNonces.has(nonce)) {
      console.warn(`🚨 [REPLAY ATTACK BLOCKED] Reused nonce detected: ${nonce} from IP: ${req.ip}`);
      return res.status(403).json({
        success: false,
        code: 'REPLAY_ATTACK_DETECTED',
        message: 'Pencegahan Peretasan: Terdeteksi upaya pengiriman ulang paket data yang sama (Replay Attack).'
      });
    }

    // Store nonce for 2 minutes
    seenNonces.set(nonce, now + 120000);

    // 3. Compute Expected HMAC
    const bodyStr = req.body ? JSON.stringify(req.body) : '';
    const canonicalString = `${req.method.toUpperCase()}:${req.originalUrl || req.url}:${timestamp}:${nonce}:${bodyStr}`;
    const expectedSignature = crypto
      .createHmac('sha256', HMAC_SHARED_SECRET)
      .update(canonicalString)
      .digest('hex');

    // 4. Timing-safe comparison to prevent timing side-channel attacks
    try {
      const sigBuffer = Buffer.from(signature, 'hex');
      const expectedBuffer = Buffer.from(expectedSignature, 'hex');

      if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
        return res.status(403).json({
          success: false,
          code: 'INVALID_HMAC_SIGNATURE',
          message: 'Tanda tangan data tidak sah atau payload telah dimodifikasi dalam perjalanan (Data Tampering).'
        });
      }
    } catch (err) {
      return res.status(403).json({
        success: false,
        code: 'MALFORMED_HMAC_SIGNATURE',
        message: 'Format tanda tangan kriptografi tidak valid.'
      });
    }

    req.isHmacVerified = true;
    next();
  };
};

export default verifyHmacSignature;
