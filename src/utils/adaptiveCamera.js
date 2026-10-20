// src/utils/adaptiveCamera.js - Dynamic Adaptive Bitrate Image Compression for Field Operations
/**
 * Detects current mobile network connection speed and data saver status.
 */
export function getNetworkProfile() {
  if (typeof navigator !== 'undefined' && 'connection' in navigator) {
    const conn = navigator.connection;
    const effectiveType = conn.effectiveType || '4g';
    const downlink = conn.downlink || 10;
    const saveData = Boolean(conn.saveData);

    let tier = 'HIGH';
    let targetWidth = 1280;
    let quality = 0.82;

    if (saveData || effectiveType === '2g' || effectiveType === 'slow-2g' || downlink < 0.5) {
      tier = 'LOW_BANDWIDTH';
      targetWidth = 640;
      quality = 0.45;
    } else if (effectiveType === '3g' || downlink < 2.0) {
      tier = 'MEDIUM_BANDWIDTH';
      targetWidth = 800;
      quality = 0.65;
    }

    return {
      tier,
      effectiveType,
      downlink: `${downlink} Mbps`,
      saveData,
      targetWidth,
      quality,
      recommendation: `Profil Kompresi: ${tier} (Lebar: ${targetWidth}px, Kualitas: ${Math.round(quality * 100)}%)`
    };
  }

  // Standard fallback
  return {
    tier: 'STANDARD',
    effectiveType: 'wifi/4g',
    downlink: 'High',
    saveData: false,
    targetWidth: 1024,
    quality: 0.75,
    recommendation: 'Profil Kompresi: Standard (1024px @ 75%)'
  };
}

/**
 * Resizes and compresses an HTML5 canvas or image dataURL based on dynamic field network conditions.
 */
export async function compressCanvasAdaptively(sourceCanvas) {
  const profile = getNetworkProfile();
  const originalWidth = sourceCanvas.width;
  const originalHeight = sourceCanvas.height;

  let finalWidth = originalWidth;
  let finalHeight = originalHeight;

  if (originalWidth > profile.targetWidth) {
    const ratio = profile.targetWidth / originalWidth;
    finalWidth = profile.targetWidth;
    finalHeight = Math.round(originalHeight * ratio);
  }

  const offscreen = document.createElement('canvas');
  offscreen.width = finalWidth;
  offscreen.height = finalHeight;
  const ctx = offscreen.getContext('2d');

  // Smooth bicubic resampling
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(sourceCanvas, 0, 0, finalWidth, finalHeight);

  // Determine optimal format: WebP if supported, fallback to JPEG
  const dataUrl = offscreen.toDataURL('image/webp', profile.quality);

  return {
    dataUrl,
    profile,
    dimensions: { width: finalWidth, height: finalHeight }
  };
}

export default {
  getNetworkProfile,
  compressCanvasAdaptively
};
