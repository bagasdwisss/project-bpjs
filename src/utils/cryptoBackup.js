// src/utils/cryptoBackup.js - Encrypted Zero-Knowledge Backup Export (AES-256-GCM Client Passphrase)

/**
 * Derives a 256-bit AES-GCM key from user passphrase using PBKDF2
 */
async function deriveEncryptionKey(passphrase, saltBuffer) {
  const enc = new TextEncoder();
  const passphraseKey = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: 100000,
      hash: 'SHA-256'
    },
    passphraseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts backup JSON data into a Zero-Knowledge package with client passphrase
 */
export async function encryptZeroKnowledgeBackup(backupData, passphrase) {
  if (!passphrase || passphrase.length < 6) {
    throw new Error('Kata sandi enkripsi minimal 6 karakter.');
  }

  const saltBuffer = window.crypto.getRandomValues(new Uint8Array(16));
  const ivBuffer = window.crypto.getRandomValues(new Uint8Array(12));

  const key = await deriveEncryptionKey(passphrase, saltBuffer);

  const enc = new TextEncoder();
  const rawPayload = typeof backupData === 'string' ? backupData : JSON.stringify(backupData);
  const dataBuffer = enc.encode(rawPayload);

  // Compute checksum for integrity verification
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', dataBuffer);
  const checksum = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

  // Encrypt with AES-GCM
  const ciphertextBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: ivBuffer },
    key,
    dataBuffer
  );

  const toHex = (buf) => Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('');
  const toBase64 = (buf) => {
    let binary = '';
    const bytes = new Uint8Array(buf);
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  };

  return {
    format: 'BPJS_ZERO_KNOWLEDGE_BACKUP_V1',
    cipher: 'AES-256-GCM',
    kdf: 'PBKDF2-SHA256',
    iterations: 100000,
    salt: toHex(saltBuffer),
    iv: toHex(ivBuffer),
    ciphertext: toBase64(ciphertextBuffer),
    checksum,
    exportedAt: new Date().toISOString()
  };
}

/**
 * Decrypts a Zero-Knowledge backup package using client passphrase
 */
export async function decryptZeroKnowledgeBackup(zkContainer, passphrase) {
  if (!passphrase) {
    throw new Error('Kata sandi enkripsi wajib diisi untuk membuka berkas.');
  }

  if (zkContainer.format !== 'BPJS_ZERO_KNOWLEDGE_BACKUP_V1' || !zkContainer.ciphertext) {
    throw new Error('Format berkas backup terenkripsi tidak dikenali.');
  }

  const fromHex = (hex) => {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    return bytes;
  };

  const saltBuffer = fromHex(zkContainer.salt);
  const ivBuffer = fromHex(zkContainer.iv);

  const key = await deriveEncryptionKey(passphrase, saltBuffer);

  const binaryString = atob(zkContainer.ciphertext);
  const cipherBytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    cipherBytes[i] = binaryString.charCodeAt(i);
  }

  try {
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivBuffer },
      key,
      cipherBytes
    );

    const dec = new TextDecoder();
    const rawJson = dec.decode(decryptedBuffer);

    // Verify checksum
    const checkBuffer = await window.crypto.subtle.digest('SHA-256', decryptedBuffer);
    const calculatedChecksum = Array.from(new Uint8Array(checkBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

    if (zkContainer.checksum && calculatedChecksum !== zkContainer.checksum) {
      throw new Error('Pemeriksaan integritas gagal: Data backup rusak atau dimanipulasi.');
    }

    return JSON.parse(rawJson);
  } catch (err) {
    if (err.name === 'OperationError') {
      throw new Error('Kata sandi enkripsi salah. Gagal mendekripsi berkas backup.');
    }
    throw err;
  }
}
