// api/routes/attendance.js
import { Router } from 'express';
import { query } from '../db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { logActivity } from '../utils/logger.js';
import { validateNetworkProximity } from '../utils/networkProximityValidator.js';
import { runAutoAbsenceCheck } from '../utils/autoAbsenceManager.js';
import { getJakartaNow } from '../utils/jakartaTime.js';
import { buildFieldChanges, formatAuditValue, logEntityChange } from '../utils/auditFormatter.js';
import { broadcastPresenceEvent } from './features.js';

const parseWorkDaysSet = (workDaysStr) => {
  const arr = String(workDaysStr || '1,2,3,4,5')
    .split(',')
    .map(v => parseInt(v.trim(), 10))
    .filter(n => !isNaN(n));
  const set = new Set(arr);
  if (set.has(7)) set.add(0);
  return set;
};

const router = Router();

// Automatic background interval: evaluate absence cutoff every 2 minutes
if (!process.env.VERCEL && process.env.NODE_ENV !== 'test') {
  const autoAbsenceTimer = setInterval(() => {
    runAutoAbsenceCheck().catch(err => console.error('Interval auto-absence check failed:', err.message));
  }, 2 * 60 * 1000);
  if (typeof autoAbsenceTimer.unref === 'function') autoAbsenceTimer.unref();
}

/**
 * GET /api/participant/attendance
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Proactively evaluate any missing attendance past cutoff
    await runAutoAbsenceCheck().catch(() => {});

    const userId = req.user.user_id;
    const { month, year } = req.query;

    let sql = `
      SELECT a.attendance_id, a.user_id, a.attendance_date, a.check_in_time, a.status, a.notes,
             a.location_coordinates, a.location_address, a.created_at,
             a.selfie_image_url, a.geofence_id, a.distance_meters, a.is_mock_location,
             g.name as geofence_name
      FROM attendance_records a
      LEFT JOIN geofence_locations g ON a.geofence_id = g.id
      WHERE a.user_id = $1
    `;
    const params = [userId];

    if (month && year) {
      params.push(month, year);
      sql += ` AND EXTRACT(MONTH FROM a.attendance_date) = $2 AND EXTRACT(YEAR FROM a.attendance_date) = $3`;
    }

    sql += ` ORDER BY a.attendance_date DESC, a.check_in_time DESC`;

    const result = await query(sql, params);

    return res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/participant/attendance/office
 * Returns active office geofence location dynamically from database
 */
router.get('/office', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT id, name, address, latitude, longitude, radius_meters, category, is_active
       FROM geofence_locations
       WHERE category = 'kantor' AND is_active = TRUE
       ORDER BY id ASC
       LIMIT 1`
    );

    if (result.rows.length === 0) {
      return res.json({
        success: true,
        data: {
          id: 1,
          name: 'Kantor Cabang BPJSTK Medan Kota',
          address: 'BPJSTK, Jl. Kapten Patimura No.334 Lantai 1, Darat, Kec. Medan Baru, Kota Medan, Sumatera Utara 20153',
          latitude: 3.575556,
          longitude: 98.665278,
          radius_meters: 150
        }
      });
    }

    const row = result.rows[0];
    return res.json({
      success: true,
      data: {
        id: row.id,
        name: row.name,
        address: row.address,
        latitude: parseFloat(row.latitude),
        longitude: parseFloat(row.longitude),
        radius_meters: parseInt(row.radius_meters, 10) || 150
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/participant/attendance/settings
 * Returns dynamic work hours, lateness threshold, weekend status, and today's holiday
 */
router.get('/settings', authenticateToken, async (req, res) => {
  try {
    await runAutoAbsenceCheck().catch(() => {});
    const jkt = getJakartaNow();
    const today = jkt.dateStr;
    const nowTime = jkt.timeStr;
    const dayOfWeek = jkt.dayOfWeek; // 0 = Minggu, 6 = Sabtu

    const settingsRes = await query(`SELECT * FROM attendance_settings WHERE id = 1 LIMIT 1`);
    const settings = settingsRes.rows[0] || {
      work_start_time: '07:00:00',
      work_ontime_limit: '08:00:00',
      work_end_time: '17:00:00',
      work_days: '1,2,3,4,5',
      allow_weekend: false,
      late_tolerance_minutes: 0,
      weekend_message: 'Hari ini adalah hari libur akhir pekan (Sabtu/Minggu). Presensi dinonaktifkan.',
      before_start_message: 'Presensi belum dibuka. Jam masuk dimulai pukul {start_time}.',
      after_end_message: 'Presensi hari ini telah ditutup pada pukul {end_time}.'
    };

    const holidayRes = await query(`SELECT * FROM holidays WHERE holiday_date = $1 LIMIT 1`, [today]);
    const todayHoliday = holidayRes.rows[0] || null;

    let isAllowedToday = true;
    let blockReason = null;
    let blockMessage = null;

    const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
    const workDaysSet = parseWorkDaysSet(settings.work_days);
    const isScheduledWorkDay = isWeekend ? Boolean(settings.allow_weekend) : workDaysSet.has(dayOfWeek);

    if (isWeekend && !settings.allow_weekend) {
      isAllowedToday = false;
      blockReason = 'weekend';
      blockMessage = settings.weekend_message || 'Hari ini adalah hari libur akhir pekan (Sabtu/Minggu). Presensi dinonaktifkan.';
    } else if (!isScheduledWorkDay) {
      isAllowedToday = false;
      blockReason = 'non_work_day';
      blockMessage = 'Hari ini tidak termasuk dalam jadwal hari kerja aktif yang ditetapkan Administrator.';
    } else if (todayHoliday) {
      isAllowedToday = false;
      blockReason = 'holiday';
      blockMessage = todayHoliday.custom_message || `Hari ini adalah hari libur nasional (${todayHoliday.holiday_name}). Presensi tidak dapat dilakukan.`;
    } else if (nowTime < String(settings.work_start_time).substring(0, 8)) {
      isAllowedToday = false;
      blockReason = 'before_start';
      blockMessage = (settings.before_start_message || 'Presensi belum dibuka. Jam masuk dimulai pukul {start_time}.')
        .replace('{start_time}', String(settings.work_start_time).substring(0, 5) + ' WIB');
    } else if (nowTime > String(settings.work_end_time).substring(0, 8)) {
      isAllowedToday = false;
      blockReason = 'after_end';
      blockMessage = (settings.after_end_message || 'Presensi hari ini telah ditutup pada pukul {end_time}.')
        .replace('{end_time}', String(settings.work_end_time).substring(0, 5) + ' WIB');
    }

    return res.json({
      success: true,
      data: {
        settings,
        todayDate: today,
        currentTime: nowTime,
        dayOfWeek,
        isWeekend,
        holiday: todayHoliday,
        isAllowedToday,
        blockReason,
        blockMessage
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/participant/attendance/holidays
 */
router.get('/holidays', authenticateToken, async (req, res) => {
  try {
    const result = await query(`SELECT * FROM holidays ORDER BY holiday_date ASC`);
    return res.json({ success: true, data: result.rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/participant/attendance/cursor
 * Keyset Cursor Pagination (Zero-Offset Streaming)
 * Uses indexed attendance_id DESC for O(log N) zero-offset query performance.
 */
router.get('/cursor', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 15, 1), 100);
    const rawCursor = req.query.cursor;

    let cursorId = null;
    if (rawCursor) {
      if (!isNaN(Number(rawCursor))) {
        cursorId = parseInt(rawCursor, 10);
      } else {
        try {
          const decoded = Buffer.from(rawCursor, 'base64').toString('ascii');
          cursorId = parseInt(decoded, 10);
        } catch {
          cursorId = null;
        }
      }
    }

    let sql = `
      SELECT a.attendance_id, a.user_id, a.attendance_date, a.check_in_time, a.status, a.notes,
             a.location_coordinates, a.location_address, a.created_at,
             a.selfie_image_url, a.distance_meters, a.is_mock_location,
             g.name as geofence_name
      FROM attendance_records a
      LEFT JOIN geofence_locations g ON a.geofence_id = g.id
      WHERE a.user_id = $1
    `;
    const params = [userId];

    if (cursorId) {
      params.push(cursorId);
      sql += ` AND a.attendance_id < $${params.length}`;
    }

    params.push(limit + 1);
    sql += ` ORDER BY a.attendance_id DESC LIMIT $${params.length}`;

    const result = await query(sql, params);
    const hasMore = result.rows.length > limit;
    const records = hasMore ? result.rows.slice(0, limit) : result.rows;
    const nextCursor = records.length > 0 && hasMore ? records[records.length - 1].attendance_id : null;

    return res.json({
      success: true,
      data: records,
      pagination: {
        keysetCursor: nextCursor ? Buffer.from(String(nextCursor)).toString('base64') : null,
        nextCursorId: nextCursor,
        hasMore,
        limit,
        strategy: 'KEYSET_INDEX_SCAN_ZERO_OFFSET'
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/participant/attendance/check-in
 */
router.post('/check-in', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { 
      status, 
      notes, 
      coordinates, 
      address, 
      device_info, 
      selfie_image_url, 
      geofence_id, 
      distance_meters, 
      is_mock_location,
      watermark_signature,
      sensor_telemetry,
      network_telemetry,
      is_offline_sync,
      client_timestamp
    } = req.body;

    // Use Asia/Jakarta timezone for date and time
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
    const nowTime = new Intl.DateTimeFormat('en-GB', { 
      timeZone: 'Asia/Jakarta', 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    }).format(new Date());

    // Anti-Mock Cross-Check: Sensor Telemetry & Clock Drift Verification (Feature 1)
    let mockDetected = Boolean(is_mock_location);
    let mockReason = null;

    if (sensor_telemetry) {
      if (sensor_telemetry.mock_detected) {
        mockDetected = true;
        mockReason = 'Fake GPS Provider / Mock Location Flag terdeteksi aktif pada perangkat pengguna.';
      } else if (sensor_telemetry.accuracy !== undefined && (sensor_telemetry.accuracy <= 0 || sensor_telemetry.accuracy > 150)) {
        mockDetected = true;
        mockReason = `Akurasi GPS tidak wajar (${sensor_telemetry.accuracy}m). Kemungkinan emulator atau injeksi koordinat statis.`;
      }
    }

    // Network BSSID & Wi-Fi Proximity Triangulation Validator (Feature 14)
    if (network_telemetry) {
      const netValidation = validateNetworkProximity({
        coordinates,
        distanceMeters: distance_meters ? Number(distance_meters) : null,
        networkTelemetry: network_telemetry,
        clientIp: req.ip || '127.0.0.1'
      });
      if (netValidation.isSpoofed) {
        mockDetected = true;
        mockReason = (mockReason ? mockReason + '; ' : '') + netValidation.reason;
      }
    }

    // Verify Timestamp Drift (Anti Clock Manipulation)
    if (client_timestamp) {
      const clientEpoch = new Date(client_timestamp).getTime();
      const driftMinutes = Math.abs(Date.now() - clientEpoch) / 60000;
      if (driftMinutes > 5 && !is_offline_sync) {
        mockDetected = true;
        mockReason = `Manipulasi waktu sistem terdeteksi (Selisih waktu perangkat dengan server NTP: ${driftMinutes.toFixed(1)} menit).`;
      }
    }

    // 1. Fetch Dynamic Attendance Settings
    const settingsRes = await query(`SELECT * FROM attendance_settings WHERE id = 1 LIMIT 1`);
    const settings = settingsRes.rows[0] || {
      work_start_time: '07:00:00',
      work_ontime_limit: '08:00:00',
      work_end_time: '17:00:00',
      work_days: '1,2,3,4,5',
      allow_weekend: false,
      late_tolerance_minutes: 0,
      weekend_message: 'Hari ini adalah hari libur akhir pekan (Sabtu/Minggu). Presensi dinonaktifkan.',
      before_start_message: 'Presensi belum dibuka. Jam masuk dimulai pukul {start_time}.',
      after_end_message: 'Presensi hari ini telah ditutup pada pukul {end_time}.'
    };

    // 2. Check Weekend & Work Days Rule consistently in Asia/Jakarta
    const jktNow = getJakartaNow();
    const dayOfWeek = jktNow.dayOfWeek;
    const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
    const workDaysSet = parseWorkDaysSet(settings.work_days);
    const isScheduledWorkDay = isWeekend ? Boolean(settings.allow_weekend) : workDaysSet.has(dayOfWeek);

    if (isWeekend && !settings.allow_weekend) {
      return res.status(400).json({
        success: false,
        message: settings.weekend_message || 'Hari ini adalah hari libur akhir pekan (Sabtu/Minggu). Presensi dinonaktifkan.'
      });
    }

    if (!isScheduledWorkDay) {
      return res.status(400).json({
        success: false,
        message: 'Hari ini bukan hari kerja aktif sesuai konfigurasi jadwal kantor.'
      });
    }

    // 3. Check National Holiday Rule
    const holidayRes = await query(`SELECT * FROM holidays WHERE holiday_date = $1 LIMIT 1`, [today]);
    if (holidayRes.rows.length > 0) {
      const hol = holidayRes.rows[0];
      return res.status(400).json({
        success: false,
        message: hol.custom_message || `Hari ini adalah hari libur nasional (${hol.holiday_name}). Presensi tidak dapat dilakukan.`
      });
    }

    // 4. Check Work Hour Boundaries
    const startTimeStr = String(settings.work_start_time).substring(0, 8);
    const endTimeStr = String(settings.work_end_time).substring(0, 8);
    const ontimeLimitStr = String(settings.work_ontime_limit).substring(0, 8);

    if (nowTime < startTimeStr && !is_offline_sync) {
      const startMsg = (settings.before_start_message || 'Presensi belum dibuka. Jam masuk dimulai pukul {start_time}.')
        .replace('{start_time}', startTimeStr.substring(0, 5) + ' WIB');
      return res.status(400).json({
        success: false,
        message: startMsg
      });
    }

    if (nowTime > endTimeStr && !is_offline_sync) {
      const endMsg = (settings.after_end_message || 'Presensi hari ini telah ditutup pada pukul {end_time}.')
        .replace('{end_time}', endTimeStr.substring(0, 5) + ' WIB');
      return res.status(400).json({
        success: false,
        message: endMsg
      });
    }

    // 5. Check if already checked in today (allow replacing prior auto-Alfa on legitimate offline sync or extended hours)
    const existing = await query(
      `SELECT attendance_id, status FROM attendance_records WHERE user_id = $1 AND attendance_date = $2 LIMIT 1`,
      [userId, today]
    );

    if (existing.rows.length > 0 && !['Alfa', 'Alpa'].includes(existing.rows[0].status)) {
      return res.status(400).json({
        success: false,
        message: 'Anda sudah melakukan absensi untuk hari ini.'
      });
    }

    // 6. Dynamic Lateness Calculation (honor client_timestamp for offline queue sync if valid same day)
    let evalTime = nowTime;
    if (is_offline_sync && client_timestamp) {
      const cDate = new Date(client_timestamp);
      if (!isNaN(cDate.getTime())) {
        const cJkt = getJakartaNow(cDate);
        if (cJkt.dateStr === today) {
          evalTime = cJkt.timeStr;
        }
      }
    }

    let normalizedStatus = 'Hadir';
    const s = String(status || '').trim().toLowerCase();
    if (s === 'izin') {
      normalizedStatus = 'Izin';
    } else if (s === 'sakit') {
      normalizedStatus = 'Sakit';
    } else {
      const [oH, oM] = ontimeLimitStr.split(':').map(Number);
      const limitMinutes = oH * 60 + oM + (parseInt(settings.late_tolerance_minutes, 10) || 0);

      const [nH, nM] = evalTime.split(':').map(Number);
      const nowMinutes = nH * 60 + nM;

      if (nowMinutes > limitMinutes) {
        normalizedStatus = 'Terlambat';
      } else {
        normalizedStatus = 'Hadir';
      }
    }

    // Dynamically retrieve selected active geofence (supports multi-point field geofences) or fallback to active office
    let activeGeofence = null;
    if (geofence_id) {
      const selRes = await query(
        `SELECT id, name, address, latitude, longitude, radius_meters, category
         FROM geofence_locations
         WHERE id = $1 AND is_active = TRUE
         LIMIT 1`,
        [geofence_id]
      );
      activeGeofence = selRes.rows[0] || null;
    }

    if (!activeGeofence) {
      const officeRes = await query(
        `SELECT id, name, address, latitude, longitude, radius_meters, category
         FROM geofence_locations
         WHERE category = 'kantor' AND is_active = TRUE
         ORDER BY id ASC
         LIMIT 1`
      );
      activeGeofence = officeRes.rows[0] || null;
    }

    const validGeofenceId = activeGeofence ? activeGeofence.id : (geofence_id || null);
    const officeAddress = address || (activeGeofence ? activeGeofence.address : 'Kantor Cabang BPJS Ketenagakerjaan');

    // Dynamic distance calculation on server side against resolved geofence
    let calculatedDistance = null;
    if (coordinates && activeGeofence) {
      const parts = coordinates.split(',');
      if (parts.length === 2) {
        const cLat = parseFloat(parts[0]);
        const cLon = parseFloat(parts[1]);
        if (!isNaN(cLat) && !isNaN(cLon)) {
          const R = 6371e3;
          const rLat1 = (cLat * Math.PI) / 180;
          const rLat2 = (parseFloat(activeGeofence.latitude) * Math.PI) / 180;
          const dLat = ((parseFloat(activeGeofence.latitude) - cLat) * Math.PI) / 180;
          const dLon = ((parseFloat(activeGeofence.longitude) - cLon) * Math.PI) / 180;
          const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(rLat1) * Math.cos(rLat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          calculatedDistance = Math.round(R * c);
        }
      }
    }

    // Fallback to client submitted distance if server calculation could not parse
    let finalDistance = calculatedDistance;
    if (finalDistance === null && distance_meters !== undefined && distance_meters !== null && !isNaN(Number(distance_meters))) {
      finalDistance = Math.round(Number(distance_meters) * 100) / 100;
    }

    const result = await query(
      `INSERT INTO attendance_records (
        user_id, attendance_date, check_in_time, status, notes, 
        location_coordinates, location_address, ip_address, device_info,
        selfie_image_url, geofence_id, distance_meters, is_mock_location,
        watermark_signature, sensor_telemetry, is_offline_sync,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id, attendance_date) DO UPDATE SET
        check_in_time = EXCLUDED.check_in_time,
        status = EXCLUDED.status,
        notes = EXCLUDED.notes,
        location_coordinates = EXCLUDED.location_coordinates,
        location_address = EXCLUDED.location_address,
        ip_address = EXCLUDED.ip_address,
        device_info = EXCLUDED.device_info,
        selfie_image_url = EXCLUDED.selfie_image_url,
        geofence_id = EXCLUDED.geofence_id,
        distance_meters = EXCLUDED.distance_meters,
        is_mock_location = EXCLUDED.is_mock_location,
        watermark_signature = EXCLUDED.watermark_signature,
        sensor_telemetry = EXCLUDED.sensor_telemetry,
        is_offline_sync = EXCLUDED.is_offline_sync
      RETURNING *`,
      [
        userId,
        today,
        evalTime || nowTime,
        normalizedStatus,
        notes || null,
        coordinates || null,
        officeAddress,
        req.ip || '127.0.0.1',
        device_info || req.headers['user-agent'] || null,
        selfie_image_url || null,
        validGeofenceId,
        finalDistance,
        mockDetected,
        watermark_signature || null,
        sensor_telemetry ? JSON.stringify(sensor_telemetry) : null,
        Boolean(is_offline_sync)
      ]
    );

    // Broadcast real-time presence update via SSE
    broadcastPresenceEvent({
      userId,
      fullName: req.user.full_name,
      uniqueId: req.user.unique_id,
      coordinatorId: req.user.coordinator_id,
      status: normalizedStatus,
      geofenceId: validGeofenceId,
      distanceMeters: finalDistance,
      isMockLocation: mockDetected,
      attendanceDate: today,
      checkInTime: evalTime || nowTime,
      timestamp: new Date().toISOString()
    });

    // Audit Trail: Log attendance activity for admin monitoring
    await logActivity({
      userId,
      action: 'PRESENSI_CHECKIN',
      details: `Presensi ${normalizedStatus} berhasil dicatat (Jarak: ${finalDistance || 0}m, OfflineSync: ${Boolean(is_offline_sync)}, Watermark: ${watermark_signature ? 'Valid' : 'None'}, Mock: ${mockDetected ? 'YA (' + mockReason + ')' : 'Tidak'})`,
      req,
      isAnomaly: mockDetected,
      anomalyReason: mockReason
    });

    return res.status(201).json({
      success: true,
      message: 'Absensi berhasil dicatat.',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error during participant check-in:', error);
    return res.status(500).json({ success: false, message: error.message || 'Gagal mencatat absensi' });
  }
});

/**
 * GET /api/participant/attendance/statistics
 */
router.get('/statistics', authenticateToken, async (req, res) => {
  try {
    await runAutoAbsenceCheck().catch(() => {});
    const userId = req.user.user_id;

    const result = await query(
      `SELECT 
         COUNT(*) as total,
         COUNT(CASE WHEN status = 'Hadir' THEN 1 END) as present,
         COUNT(CASE WHEN status = 'Izin' THEN 1 END) as permission,
         COUNT(CASE WHEN status = 'Sakit' THEN 1 END) as sick,
         COUNT(CASE WHEN status = 'Alfa' THEN 1 END) as absent,
         COUNT(CASE WHEN status = 'Terlambat' THEN 1 END) as late
       FROM attendance_records
       WHERE user_id = $1`,
      [userId]
    );

    const row = result.rows[0];
    const total = parseInt(row.total, 10) || 0;
    const present = parseInt(row.present, 10) || 0;
    const rate = total > 0 ? Math.round((present / total) * 100) : 100;

    return res.json({
      success: true,
      data: {
        total,
        present,
        permission: parseInt(row.permission, 10) || 0,
        sick: parseInt(row.sick, 10) || 0,
        absent: parseInt(row.absent, 10) || 0,
        late: parseInt(row.late, 10) || 0,
        rate
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/coordinator/participants/:id/attendance
 */
router.get('/participant/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const targetUserId = parseInt(id, 10);

    // IDOR Protection: Peserta can only view their own attendance
    if ((req.user.role === 'Peserta' || req.user.role_id === 1) && req.user.user_id !== targetUserId) {
      return res.status(403).json({
        success: false,
        message: 'Akses dilarang. Anda tidak berhak melihat riwayat presensi pengguna lain.'
      });
    }

    // Coordinator isolation: Coordinator can only view attendance of their assigned participants
    if (req.user.role === 'Koordinator' || req.user.role_id === 2) {
      if (req.user.user_id !== targetUserId) {
        const check = await query(`SELECT coordinator_id FROM users WHERE user_id = $1`, [targetUserId]);
        if (check.rows.length === 0 || check.rows[0].coordinator_id !== req.user.user_id) {
          return res.status(403).json({
            success: false,
            message: 'Akses dilarang. Peserta ini tidak berada di bawah bimbingan Anda.'
          });
        }
      }
    }

    const result = await query(
      `SELECT * FROM attendance_records WHERE user_id = $1 ORDER BY attendance_date DESC`,
      [targetUserId]
    );
    return res.json({ success: true, data: result.rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/attendance/coordinator/mentees
 * Riwayat lengkap presensi anak didik di bawah koordinator yang sedang login
 * Mendukung filter: month, year, user_id, status
 */
router.get(['/coordinator/mentees', '/mentees'], authenticateToken, async (req, res) => {
  try {
    await runAutoAbsenceCheck().catch(() => {});
    const isCoordinator = req.user.role === 'Koordinator' || req.user.role_id === 2;
    const isAdmin = req.user.role === 'Administrator' || req.user.role_id === 3;

    if (!isCoordinator && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Akses dilarang. Hanya Koordinator dan Administrator yang berhak mengakses data presensi anak didik.'
      });
    }

    const { month, year, user_id, status } = req.query;

    let sql = `
      SELECT a.attendance_id, a.user_id, a.attendance_date, a.check_in_time, a.status, a.notes,
             a.location_coordinates, a.location_address, a.created_at,
             a.selfie_image_url, a.distance_meters, a.is_mock_location,
             u.full_name, u.unique_id, u.penempatan,
             COALESCE(u.email, u.unique_id || '@bpjsketenagakerjaan.go.id') as email,
             g.name as geofence_name
      FROM attendance_records a
      JOIN users u ON a.user_id = u.user_id
      LEFT JOIN geofence_locations g ON a.geofence_id = g.id
      WHERE 1=1
    `;
    const params = [];

    // Filter by coordinator if not admin
    if (isCoordinator) {
      params.push(req.user.user_id);
      sql += ` AND u.coordinator_id = $${params.length}`;
    }

    if (user_id && user_id !== 'all') {
      params.push(parseInt(user_id, 10));
      sql += ` AND a.user_id = $${params.length}`;
    }

    if (month && year) {
      params.push(parseInt(month, 10));
      sql += ` AND EXTRACT(MONTH FROM a.attendance_date) = $${params.length}`;
      params.push(parseInt(year, 10));
      sql += ` AND EXTRACT(YEAR FROM a.attendance_date) = $${params.length}`;
    }

    if (status && status !== 'all') {
      params.push(status);
      sql += ` AND a.status = $${params.length}`;
    }

    sql += ` ORDER BY a.attendance_date DESC, a.check_in_time DESC`;

    const result = await query(sql, params);

    return res.json({
      success: true,
      data: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching coordinator mentee attendance:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PUT /api/attendance/coordinator/verify/:id
 * Koordinator memverifikasi atau menyesuaikan status presensi anak didik
 */
router.put(['/coordinator/verify/:id', '/verify/:id'], authenticateToken, async (req, res) => {
  try {
    const isCoordinator = req.user.role === 'Koordinator' || req.user.role_id === 2;
    const isAdmin = req.user.role === 'Administrator' || req.user.role_id === 3;

    if (!isCoordinator && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Akses dilarang.' });
    }

    const { id } = req.params;
    const { status, notes } = req.body;

    const existingRes = await query(`
      SELECT a.attendance_id, a.user_id, a.attendance_date, a.status, a.notes,
             u.coordinator_id, u.full_name, u.unique_id
      FROM attendance_records a
      JOIN users u ON a.user_id = u.user_id
      WHERE a.attendance_id = $1
    `, [id]);

    if (existingRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Data presensi tidak ditemukan.' });
    }

    const existingRow = existingRes.rows[0];
    if (isCoordinator && existingRow.coordinator_id !== req.user.user_id) {
      return res.status(403).json({ success: false, message: 'Akses ditolak. Catatan ini bukan milik anak didik Anda.' });
    }

    let updateSql = `UPDATE attendance_records SET `;
    const updates = [];
    const params = [id];

    if (status) {
      params.push(status);
      updates.push(`status = $${params.length}`);
    }
    if (notes !== undefined) {
      params.push(notes);
      updates.push(`notes = $${params.length}`);
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'Tidak ada perubahan yang dikirim.' });
    }

    updateSql += updates.join(', ') + ` WHERE attendance_id = $1 RETURNING *`;
    const result = await query(updateSql, params);
    const updatedRow = result.rows[0];

    const changes = buildFieldChanges(existingRow, updatedRow, [
      { key: 'status', label: 'Status Presensi' },
      { key: 'notes', label: 'Catatan Presensi' }
    ]);

    await logEntityChange({
      req,
      targetUser: {
        user_id: existingRow.user_id,
        full_name: existingRow.full_name,
        unique_id: existingRow.unique_id
      },
      action: 'ATTENDANCE_VERIFIED',
      verb: 'memverifikasi/mengubah',
      entityLabel: 'Status Presensi',
      recordContext: `Tanggal Presensi: ${formatAuditValue(existingRow.attendance_date, 'date')}`,
      changes,
      notes: notes !== undefined ? notes : null
    });

    return res.json({ success: true, message: 'Status kehadiran berhasil diperbarui.', data: updatedRow });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/attendance/trigger-auto-absence
 * Admin / Coordinator manual trigger for auto-absence cutoff evaluation
 */
router.post('/trigger-auto-absence', authenticateToken, requireRole('Koordinator', 'Administrator'), async (req, res) => {
  try {
    const result = await runAutoAbsenceCheck({ force: true });
    return res.json({ success: true, ...result });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
