// api/routes/attendance.js
import { Router } from 'express';
import { query } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';
import { logActivity } from '../utils/logger.js';
import { validateNetworkProximity } from '../utils/networkProximityValidator.js';
import { runAutoAbsenceCheck } from '../utils/autoAbsenceManager.js';

const router = Router();

// Automatic background interval: evaluate absence cutoff every 2 minutes
setInterval(() => {
  runAutoAbsenceCheck().catch(err => console.error('Interval auto-absence check failed:', err.message));
}, 2 * 60 * 1000);

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
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
    const nowTime = new Intl.DateTimeFormat('en-GB', { 
      timeZone: 'Asia/Jakarta', 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    }).format(new Date());

    const jakartaDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
    const dayOfWeek = jakartaDate.getDay(); // 0 = Minggu, 6 = Sabtu

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
    if (isWeekend && !settings.allow_weekend) {
      isAllowedToday = false;
      blockReason = 'weekend';
      blockMessage = settings.weekend_message || 'Hari ini adalah hari libur akhir pekan (Sabtu/Minggu). Presensi dinonaktifkan.';
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

    // 2. Check Weekend Rule (Senin - Jumat kerja, Sabtu & Minggu libur)
    const jakartaDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
    const dayOfWeek = jakartaDate.getDay(); // 0 = Minggu, 6 = Sabtu
    if ((dayOfWeek === 0 || dayOfWeek === 6) && !settings.allow_weekend) {
      return res.status(400).json({
        success: false,
        message: settings.weekend_message || 'Hari ini adalah hari libur akhir pekan (Sabtu/Minggu). Presensi dinonaktifkan.'
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

    // 5. Check if already checked in today
    const existing = await query(
      `SELECT * FROM attendance_records WHERE user_id = $1 AND attendance_date = $2`,
      [userId, today]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Anda sudah melakukan absensi untuk hari ini.'
      });
    }

    // 6. Dynamic Lateness Calculation based on Database Configuration
    let normalizedStatus = 'Hadir';
    const s = String(status || '').trim().toLowerCase();
    if (s === 'izin') {
      normalizedStatus = 'Izin';
    } else if (s === 'sakit') {
      normalizedStatus = 'Sakit';
    } else {
      const [oH, oM] = ontimeLimitStr.split(':').map(Number);
      const limitMinutes = oH * 60 + oM + (parseInt(settings.late_tolerance_minutes, 10) || 0);

      const [nH, nM] = nowTime.split(':').map(Number);
      const nowMinutes = nH * 60 + nM;

      if (nowMinutes > limitMinutes) {
        normalizedStatus = 'Terlambat';
      } else {
        normalizedStatus = 'Hadir';
      }
    }

    // Dynamically retrieve active office geofence from database
    const officeRes = await query(
      `SELECT id, name, address, latitude, longitude, radius_meters 
       FROM geofence_locations 
       WHERE category = 'kantor' AND is_active = TRUE 
       ORDER BY id ASC 
       LIMIT 1`
    );
    const activeOffice = officeRes.rows[0];

    const validGeofenceId = activeOffice ? activeOffice.id : (geofence_id || null);
    const officeAddress = address || (activeOffice ? activeOffice.address : 'BPJSTK, Jl. Kapten Patimura No.334 Lantai 1, Darat, Kec. Medan Baru, Kota Medan, Sumatera Utara 20153');

    // Dynamic distance calculation on server side if coordinates provided
    let calculatedDistance = null;
    if (coordinates && activeOffice) {
      const parts = coordinates.split(',');
      if (parts.length === 2) {
        const cLat = parseFloat(parts[0]);
        const cLon = parseFloat(parts[1]);
        if (!isNaN(cLat) && !isNaN(cLon)) {
          const R = 6371e3;
          const rLat1 = (cLat * Math.PI) / 180;
          const rLat2 = (parseFloat(activeOffice.latitude) * Math.PI) / 180;
          const dLat = ((parseFloat(activeOffice.latitude) - cLat) * Math.PI) / 180;
          const dLon = ((parseFloat(activeOffice.longitude) - cLon) * Math.PI) / 180;
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
      RETURNING *`,
      [
        userId,
        today,
        nowTime,
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
 * POST /api/attendance/trigger-auto-absence
 * Admin / Coordinator manual trigger for auto-absence cutoff evaluation
 */
router.post('/trigger-auto-absence', authenticateToken, async (req, res) => {
  try {
    const result = await runAutoAbsenceCheck();
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
