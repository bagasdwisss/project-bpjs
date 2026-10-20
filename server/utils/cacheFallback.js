// server/utils/cacheFallback.js - Stateless Cache-First Fallback for Graceful Offline Degradation
const fallbackStore = new Map();

// Seed initial resilient fallbacks
fallbackStore.set('geofences', [
  { id: 1, name: 'Kantor Cabang BPJS Ketenagakerjaan Rawamangun', category: 'Kantor Cabang', latitude: -6.1944, longitude: 106.8833, radius_meters: 100, is_active: true },
  { id: 2, name: 'Kantor Cabang BPJS Ketenagakerjaan Sudirman', category: 'Kantor Cabang', latitude: -6.2155, longitude: 106.8211, radius_meters: 120, is_active: true }
]);

fallbackStore.set('system_status', {
  mode: 'DEGRADED_CACHE_FALLBACK',
  notice: 'Sistem sedang berjalan dalam mode darurat cache lokal karena koneksi basis data terputus sementara. Data yang ditampilkan adalah snapshot terakhir yang aman.',
  cachedAt: new Date().toISOString()
});

/**
 * Saves or updates a cached snapshot for an entity key
 */
export function setCachedFallback(key, data) {
  fallbackStore.set(key, {
    data,
    updatedAt: new Date().toISOString()
  });
}

/**
 * Gets cached fallback with graceful degradation flag
 */
export function getCachedFallback(key) {
  const item = fallbackStore.get(key);
  if (!item) return null;

  return {
    isFallback: true,
    data: item.data || item,
    degradedAt: item.updatedAt || new Date().toISOString()
  };
}

export default {
  setCachedFallback,
  getCachedFallback
};
