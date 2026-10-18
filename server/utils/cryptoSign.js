// server/utils/cryptoSign.js - Cryptographic Digital Signatures for BPJSTK Certificates
import crypto from 'crypto';

const CERT_SECRET = process.env.CERTIFICATE_SECRET_KEY || 'bpjstk-ed25519-hmac-sha256-master-secret-key-2026';

/**
 * Normalizes certificate payload to canonical string
 */
export const canonicalizeCertData = (data) => {
  return [
    String(data.certNumber || data.certificate_number || '').trim().toUpperCase(),
    String(data.recipientName || data.recipient_name || '').trim(),
    String(data.userId || data.user_id || ''),
    String(data.grade || '').trim().toUpperCase(),
    String(data.finalScore || data.final_score || ''),
    String(data.issueDate || data.issue_date || '').trim()
  ].join(':::');
};

/**
 * Signs certificate canonical payload using HMAC-SHA256
 */
export const signCertificate = (data) => {
  const canonical = canonicalizeCertData(data);
  const signature = crypto.createHmac('sha256', CERT_SECRET).update(canonical).digest('hex');
  return {
    signature,
    algorithm: 'HMAC-SHA256',
    thumbprint: signature.substring(0, 16).toUpperCase()
  };
};

/**
 * Verifies certificate digital signature
 */
export const verifyCertificateSignature = (data, signature) => {
  if (!signature || typeof signature !== 'string') return false;
  const canonical = canonicalizeCertData(data);
  const expected = crypto.createHmac('sha256', CERT_SECRET).update(canonical).digest('hex');
  
  // Timing-safe comparison to prevent timing side-channel attacks
  try {
    const bufExpected = Buffer.from(expected, 'hex');
    const bufActual = Buffer.from(signature, 'hex');
    if (bufExpected.length !== bufActual.length) return false;
    return crypto.timingSafeEqual(bufExpected, bufActual);
  } catch (e) {
    return false;
  }
};
