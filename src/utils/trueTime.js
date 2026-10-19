// src/utils/trueTime.js - True Server NTP Clock Synchronization & Anti-Clock Tampering
import axios from 'axios';

let clockDriftMs = 0; // serverTime - localTime
let isSynchronized = false;
let isClockTampered = false;

/**
 * Synchronize local time with server authoritative clock
 */
export const syncServerTime = async () => {
  const t0 = Date.now();
  try {
    const res = await axios.get('/api/time/sync', { timeout: 5000 });
    const t1 = Date.now();
    const roundTripTime = t1 - t0;
    
    if (res.data?.success && res.data.serverTime) {
      // Estimated server time at t1 = serverTime + (RTT / 2)
      const estimatedServerTime = res.data.serverTime + (roundTripTime / 2);
      clockDriftMs = estimatedServerTime - t1;
      isSynchronized = true;

      // If client clock differs by more than 2 minutes (120,000 ms), flag tampering
      if (Math.abs(clockDriftMs) > 120000) {
        isClockTampered = true;
        console.warn(`⚠️ [TrueTime] Client clock manipulation detected! Drift: ${Math.round(clockDriftMs / 1000)}s`);
      } else {
        isClockTampered = false;
      }
    }
  } catch (err) {
    // If sync fails (e.g. offline), retain current drift or fallback to local
    console.warn('TrueTime sync warning:', err.message);
  }
};

/**
 * Get accurate authoritative timestamp
 */
export const getAuthoritativeTime = () => {
  return new Date(Date.now() + clockDriftMs);
};

/**
 * Get formatted current authoritative date ISO
 */
export const getAuthoritativeIso = () => {
  return getAuthoritativeTime().toISOString();
};

/**
 * Dynamic Indonesian greeting based on authoritative current time
 * - 04:00 - 10:59: Selamat Pagi
 * - 11:00 - 14:59: Selamat Siang
 * - 15:00 - 18:59: Selamat Sore
 * - 19:00 - 03:59: Selamat Malam
 */
export const getTimeGreeting = (date = getAuthoritativeTime()) => {
  const current = date || new Date();
  const hour = current.getHours();
  if (hour >= 4 && hour < 11) return 'Selamat Pagi';
  if (hour >= 11 && hour < 15) return 'Selamat Siang';
  if (hour >= 15 && hour < 19) return 'Selamat Sore';
  return 'Selamat Malam';
};

export const getClockStatus = () => ({
  isSynchronized,
  isClockTampered,
  driftSeconds: Math.round(clockDriftMs / 1000)
});

// Auto-sync on import and refresh every 10 minutes
syncServerTime();
if (typeof window !== 'undefined') {
  setInterval(syncServerTime, 10 * 60 * 1000);
}

export default {
  syncServerTime,
  getAuthoritativeTime,
  getAuthoritativeIso,
  getClockStatus,
  getTimeGreeting
};
