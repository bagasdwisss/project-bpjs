// src/utils/payloadObfuscator.js - Client-Side Polymorphic Request Obfuscation & Dynamic Ephemeral Encryption

/**
 * Computes simple SHA-256 hash in browser using subtle crypto
 */
async function computeSha256(text) {
  const enc = new TextEncoder();
  const data = enc.encode(text);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  return new Uint8Array(hashBuffer);
}

/**
 * Obfuscates a JS payload object using rolling XOR against dynamic ephemeral salt and timestamp
 */
export async function obfuscatePayload(payloadObject) {
  const salt = Array.from(window.crypto.getRandomValues(new Uint8Array(8)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  const ts = Date.now().toString();

  const jsonString = JSON.stringify(payloadObject);
  const enc = new TextEncoder();
  const inputBuffer = enc.encode(jsonString);

  const keyBytes = await computeSha256(`${salt}_${ts}_bpjs_poly_secret`);
  const outputBuffer = new Uint8Array(inputBuffer.length);

  for (let i = 0; i < inputBuffer.length; i++) {
    outputBuffer[i] = inputBuffer[i] ^ keyBytes[i % keyBytes.length];
  }

  // Convert to Base64 safely
  let binary = '';
  for (let i = 0; i < outputBuffer.byteLength; i++) {
    binary += String.fromCharCode(outputBuffer[i]);
  }
  const base64Data = btoa(binary);

  return {
    headers: {
      'x-payload-obfuscated': 'v1',
      'x-ephemeral-salt': salt,
      'x-payload-timestamp': ts
    },
    body: {
      $poly_obfuscated: true,
      salt,
      ts,
      data: base64Data
    }
  };
}
