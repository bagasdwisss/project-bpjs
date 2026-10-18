// src/utils/deviceFingerprint.js - Client-Side Device Fingerprinting for Session Hijacking Guard

/**
 * Computes a deterministic client device fingerprint hash based on hardware,
 * screen parameters, timezone, and offscreen canvas pixel rendering variance.
 */
export const getDeviceFingerprint = () => {
  try {
    const existing = localStorage.getItem('bpjstk_device_fp');
    if (existing) return existing;

    const screenInfo = `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jakarta';
    const language = navigator.language || 'id-ID';
    const hardwareConcurrency = navigator.hardwareConcurrency || 4;
    const userAgent = navigator.userAgent || 'UnknownAgent';

    // Canvas Fingerprinting
    let canvasHash = 'cv_default';
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 160;
      canvas.height = 40;
      const ctx = canvas.getContext('2d');
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillStyle = '#f60';
      ctx.fillRect(10, 5, 60, 20);
      ctx.fillStyle = '#069';
      ctx.fillText('BPJSTK🔒2026', 15, 12);
      const dataUri = canvas.toDataURL();
      // Simple hash of dataUri
      let h = 0;
      for (let i = 0; i < dataUri.length; i++) {
        h = ((h << 5) - h) + dataUri.charCodeAt(i);
        h |= 0;
      }
      canvasHash = Math.abs(h).toString(16);
    } catch (e) {
      // fallback
    }

    const rawString = `${screenInfo}|${timezone}|${language}|${hardwareConcurrency}|${userAgent}|${canvasHash}`;
    
    // Simple 32-bit FNV-1a hash
    let hash = 2166136261;
    for (let i = 0; i < rawString.length; i++) {
      hash ^= rawString.charCodeAt(i);
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    const fp = 'fp_' + (hash >>> 0).toString(16) + '_' + canvasHash;
    localStorage.setItem('bpjstk_device_fp', fp);
    return fp;
  } catch (err) {
    return 'fp_fallback_' + Date.now();
  }
};

export default getDeviceFingerprint;
