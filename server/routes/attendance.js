// api/routes/attendance.js
import { Router } from 'express';
import { query } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

/**
 * GET /api/participant/attendance
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
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
      is_mock_location 
    } = req.body;

    // Use Asia/Jakarta timezone for date and time
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
    const nowTime = new Intl.DateTimeFormat('en-GB', { 
      timeZone: 'Asia/Jakarta', 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    }).format(new Date());

    // Normalize status to strictly match check constraint: 'Hadir', 'Terlambat', 'Izin', 'Sakit', 'Alfa'
    let normalizedStatus = 'Hadir';
    if (status) {
      const s = String(status).trim().toLowerCase();
      if (s === 'terlambat') normalizedStatus = 'Terlambat';
      else if (s === 'izin') normalizedStatus = 'Izin';
      else if (s === 'sakit') normalizedStatus = 'Sakit';
      else if (s === 'alfa') normalizedStatus = 'Alfa';
      else normalizedStatus = 'Hadir';
    }

    // Check if already checked in today
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

    // Validate geofence_id against foreign key
    let validGeofenceId = null;
    if (geofence_id) {
      const parsedId = parseInt(geofence_id, 10);
      if (!isNaN(parsedId)) {
        const checkG = await query(`SELECT id FROM geofence_locations WHERE id = $1`, [parsedId]);
        if (checkG.rows.length > 0) {
          validGeofenceId = parsedId;
        }
      }
    }
    if (!validGeofenceId) {
      const defaultG = await query(`SELECT id FROM geofence_locations WHERE category = 'kantor' LIMIT 1`);
      if (defaultG.rows.length > 0) {
        validGeofenceId = defaultG.rows[0].id;
      }
    }

    // Validate distance_meters
    let validDistance = null;
    if (distance_meters !== undefined && distance_meters !== null && !isNaN(Number(distance_meters))) {
      validDistance = Math.round(Number(distance_meters) * 100) / 100;
    }

    const defaultOfficeAddress = 'BPJS Ketenagakerjaan Medan Kota, Jl. Kapten Patimura No.334 Lantai 1, Darat, Kec. Medan Baru, Kota Medan, Sumatera Utara 20153';

    const result = await query(
      `INSERT INTO attendance_records (
        user_id, attendance_date, check_in_time, status, notes, 
        location_coordinates, location_address, ip_address, device_info,
        selfie_image_url, geofence_id, distance_meters, is_mock_location,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP)
      RETURNING *`,
      [
        userId,
        today,
        nowTime,
        normalizedStatus,
        notes || null,
        coordinates || null,
        address || defaultOfficeAddress,
        req.ip || '127.0.0.1',
        device_info || req.headers['user-agent'] || null,
        selfie_image_url || null,
        validGeofenceId,
        validDistance,
        Boolean(is_mock_location)
      ]
    );

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
    const result = await query(
      `SELECT * FROM attendance_records WHERE user_id = $1 ORDER BY attendance_date DESC`,
      [id]
    );
    return res.json({ success: true, data: result.rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
