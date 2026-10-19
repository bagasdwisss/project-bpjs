// server/utils/velocityDetector.js - Spike Input Velocity & Impossible Travel Anomaly Detection
import { query } from '../db.js';
import { dispatchIncidentAlert } from './incidentNotifier.js';

// In-memory sliding velocity tracker: userId -> array of timestamps
const submissionTimestamps = new Map();

export const checkSubmissionVelocity = (userId, maxPerWindow = 5, windowMinutes = 15) => {
  const now = Date.now();
  const windowMs = windowMinutes * 60 * 1000;
  const userKey = String(userId);

  let timestamps = submissionTimestamps.get(userKey) || [];
  timestamps = timestamps.filter(t => now - t < windowMs);

  const isSpike = timestamps.length >= maxPerWindow;

  timestamps.push(now);
  submissionTimestamps.set(userKey, timestamps);

  return {
    isSpike,
    recentCount: timestamps.length,
    maxAllowed: maxPerWindow,
    windowMinutes,
    reason: isSpike 
      ? `Terdeteksi lonjakan input tidak wajar (${timestamps.length} input data BPU dalam ${windowMinutes} menit). Indikasi bot/skrip otomatis.`
      : null
  };
};

/**
 * Checks database for duplicate NIK attempts within short timeframe
 */
export const checkDuplicateNikRecent = async (nik, excludePesertaId = null) => {
  if (!nik) return false;
  try {
    let sql = `SELECT peserta_id, nama_peserta, user_id FROM peserta WHERE nik = $1`;
    const params = [nik];
    if (excludePesertaId) {
      params.push(excludePesertaId);
      sql += ` AND peserta_id != $2`;
    }
    const res = await query(sql, params);
    return res.rows.length > 0;
  } catch (err) {
    console.error('Error checking duplicate NIK:', err.message);
    return false;
  }
};

/**
 * Haversine formula to compute distance in km between two lat/lon points
 */
export function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's mean radius in km
  const toRad = (angle) => (angle * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * IMPOSSIBLE TRAVEL & GEOGRAPHICAL ANOMALY VELOCITY GUARD
 * Compares current geo-coordinates with previous login location and timestamp.
 * Flags impossible velocities (e.g. > 850 km/h) as account compromise or proxy hop.
 */
export async function checkImpossibleTravel(userId, currentLat, currentLon, ipAddress = '127.0.0.1') {
  if (!userId || currentLat === undefined || currentLon === undefined || currentLat === null || currentLon === null) {
    return { isImpossible: false, message: 'Koordinat lokasi tidak lengkap untuk verifikasi velocity.' };
  }

  const cLat = parseFloat(currentLat);
  const cLon = parseFloat(currentLon);
  if (isNaN(cLat) || isNaN(cLon)) {
    return { isImpossible: false, message: 'Koordinat tidak valid.' };
  }

  try {
    const userRes = await query(
      `SELECT user_id, full_name, last_login_latitude, last_login_longitude, last_login_at 
       FROM users WHERE user_id = $1`,
      [userId]
    );

    if (userRes.rows.length === 0) {
      return { isImpossible: false };
    }

    const user = userRes.rows[0];
    const prevLat = parseFloat(user.last_login_latitude);
    const prevLon = parseFloat(user.last_login_longitude);
    const prevTime = user.last_login_at ? new Date(user.last_login_at).getTime() : null;
    const nowTime = Date.now();

    let isImpossible = false;
    let distanceKm = 0;
    let timeElapsedHours = 0;
    let velocityKmh = 0;

    if (!isNaN(prevLat) && !isNaN(prevLon) && prevTime) {
      distanceKm = calculateHaversineDistance(prevLat, prevLon, cLat, cLon);
      timeElapsedHours = Math.max((nowTime - prevTime) / (1000 * 60 * 60), 0.001); // avoid div by 0
      velocityKmh = distanceKm / timeElapsedHours;

      // Threshold: Distance > 50km and velocity > 850 km/h (speed of commercial aircraft)
      if (distanceKm > 50 && velocityKmh > 850) {
        isImpossible = true;

        console.warn(`🚨 [IMPOSSIBLE TRAVEL DETECTED] User #${userId} (${user.full_name}): Moved ${distanceKm.toFixed(1)} km in ${(timeElapsedHours * 60).toFixed(1)} minutes (Speed: ${velocityKmh.toFixed(0)} km/h)!`);

        // Dispatch alert and log to activity_logs
        dispatchIncidentAlert({
          alertType: 'IMPOSSIBLE_TRAVEL_VELOCITY_BREACH',
          severity: 'HIGH',
          sourceIp: ipAddress,
          userId,
          details: {
            userName: user.full_name,
            previousLocation: { lat: prevLat, lon: prevLon, at: user.last_login_at },
            currentLocation: { lat: cLat, lon: cLon, at: new Date(nowTime).toISOString() },
            distanceKm: Number(distanceKm.toFixed(2)),
            timeElapsedMinutes: Number((timeElapsedHours * 60).toFixed(1)),
            calculatedVelocityKmh: Number(velocityKmh.toFixed(1))
          }
        }).catch(() => {});

        await query(
          `INSERT INTO activity_logs (user_id, activity_type, details, ip_address)
           VALUES ($1, 'ANOMALY_IMPOSSIBLE_TRAVEL', $2, $3)`,
          [
            userId,
            `Anomali perpindahan lokasi mustahil: Jarak ${distanceKm.toFixed(1)} km ditempuh dalam ${(timeElapsedHours * 60).toFixed(1)} menit (${velocityKmh.toFixed(0)} km/h).`,
            ipAddress
          ]
        );
      }
    }

    // Update last known location and timestamp
    await query(
      `UPDATE users 
       SET last_login_latitude = $1, last_login_longitude = $2, last_login_at = CURRENT_TIMESTAMP
       WHERE user_id = $3`,
      [cLat, cLon, userId]
    );

    return {
      isImpossible,
      distanceKm: Number(distanceKm.toFixed(2)),
      velocityKmh: Number(velocityKmh.toFixed(1)),
      previousLocation: !isNaN(prevLat) ? { lat: prevLat, lon: prevLon } : null,
      currentLocation: { lat: cLat, lon: cLon },
      status: isImpossible ? 'ANOMALOUS_VELOCITY' : 'NORMAL'
    };
  } catch (err) {
    console.error('Error in checkImpossibleTravel:', err.message);
    return { isImpossible: false, error: err.message };
  }
}
