// server/middleware/payloadDeobfuscator.js - Polymorphic Request Obfuscation & Dynamic Ephemeral Encryption
import crypto from 'crypto';

/**
 * Reverses polymorphic rolling XOR byte transformation with dynamic salt and timestamp
 */
export function deobfuscateBuffer(buffer, salt, timestamp) {
  const key = crypto.createHash('sha256').update(`${salt}_${timestamp}_bpjs_poly_secret`).digest();
  const result = Buffer.alloc(buffer.length);

  for (let i = 0; i < buffer.length; i++) {
    result[i] = buffer[i] ^ key[i % key.length];
  }

  return result;
}

/**
 * Express Middleware: Automatically intercepts and decodes obfuscated request bodies
 */
export function payloadDeobfuscatorMiddleware(req, res, next) {
  const isObfuscated = req.headers['x-payload-obfuscated'] === 'v1' || req.body?.$poly_obfuscated === true;

  if (!isObfuscated || !req.body) {
    return next();
  }

  try {
    const salt = req.headers['x-ephemeral-salt'] || req.body?.salt;
    const ts = req.headers['x-payload-timestamp'] || req.body?.ts;
    const cipherText = req.body?.data || (typeof req.body === 'string' ? req.body : null);

    if (!salt || !ts || !cipherText) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_OBFUSCATED_PAYLOAD',
        message: 'Payload terselubung tidak valid (salt, ts, atau data hilang).'
      });
    }

    // Anti-Replay: Verify timestamp freshness (within 5 minutes)
    const now = Date.now();
    const payloadTime = parseInt(ts, 10);
    if (isNaN(payloadTime) || Math.abs(now - payloadTime) > 5 * 60 * 1000) {
      return res.status(403).json({
        success: false,
        code: 'EXPIRED_OBFUSCATED_PAYLOAD',
        message: 'Akses ditolak: Stempel waktu payload kadaluarsa atau terindikasi serangan replay.'
      });
    }

    const rawBuffer = Buffer.from(cipherText, 'base64');
    const decryptedBuffer = deobfuscateBuffer(rawBuffer, salt, ts);
    const jsonString = decryptedBuffer.toString('utf8');

    // Parse back to JSON object
    req.body = JSON.parse(jsonString);
    req._wasObfuscated = true;

    next();
  } catch (err) {
    console.error('Error deobfuscating payload:', err.message);
    return res.status(400).json({
      success: false,
      code: 'DEOBFUSCATION_FAILED',
      message: 'Gagal mendeskripsi payload polimorfik: ' + err.message
    });
  }
}

export default payloadDeobfuscatorMiddleware;
