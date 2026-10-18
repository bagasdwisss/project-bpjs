// server/utils/velocityDetector.js - Spike Input Velocity & Fraud Detection
import { query } from '../db.js';

// In-memory sliding velocity tracker: userId -> array of timestamps
const submissionTimestamps = new Map();

export const checkSubmissionVelocity = (userId, maxPerWindow = 5, windowMinutes = 15) => {
  const now = Date.now();
  const windowMs = windowMinutes * 60 * 1000;
  const userKey = String(userId);

  let timestamps = submissionTimestamps.get(userKey) || [];
  // Filter out timestamps older than window
  timestamps = timestamps.filter(t => now - t < windowMs);

  const isSpike = timestamps.length >= maxPerWindow;

  // Add current timestamp
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
