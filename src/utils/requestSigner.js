// src/utils/requestSigner.js - Time-Stamped HMAC Request Signing (Anti-Replay Attack)
import { getAuthoritativeTime } from './trueTime.js';

const HMAC_SHARED_SECRET = 'bpjstk-enterprise-hmac-salt-2026';

/**
 * Generate random cryptographically secure nonce
 */
export const generateNonce = () => {
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    const bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
};

/**
 * Sign critical request payload using HMAC-SHA256
 */
export const signRequest = async (method, path, body = {}) => {
  const timestamp = getAuthoritativeTime().getTime();
  const nonce = generateNonce();
  const bodyStr = body ? JSON.stringify(body) : '';
  const canonicalString = `${method.toUpperCase()}:${path}:${timestamp}:${nonce}:${bodyStr}`;

  let signature = '';
  try {
    if (typeof window !== 'undefined' && window.crypto?.subtle) {
      const encoder = new TextEncoder();
      const keyData = encoder.encode(HMAC_SHARED_SECRET);
      const cryptoKey = await window.crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );

      const signatureBuffer = await window.crypto.subtle.sign(
        'HMAC',
        cryptoKey,
        encoder.encode(canonicalString)
      );

      const hashArray = Array.from(new Uint8Array(signatureBuffer));
      signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
  } catch (err) {
    console.warn('HMAC browser signing fallback:', err);
  }

  return {
    'X-Signature': signature,
    'X-Timestamp': String(timestamp),
    'X-Nonce': nonce
  };
};

export default {
  signRequest,
  generateNonce
};
