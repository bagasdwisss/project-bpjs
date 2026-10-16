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

    const today = new Date().toISOString().split('T')[0];
    const nowTime = new Date().toTimeString().split(' ')[0];

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

    const result = await query(
      `INSERT INTO attendance_records (
        user_id, attendance_date, check_in_time, status, notes, 
        location_coordinates, location_address, ip_address, device_info,
        selfie_image_url, geofence_id, distance_meters, is_mock_location,
        created_at
      )
      VALUES ($1, $2, $3, COALESCE($4, 'Hadir'), $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP)
      RETURNING *`,
      [
        userId,
        today,
        nowTime,
        status || 'Hadir',
        notes || null,
        coordinates || null,
        address || null,
        req.ip || '127.0.0.1',
        device_info || req.headers['user-agent'] || null,
        selfie_image_url || null,
        geofence_id || null,
        distance_meters || null,
        Boolean(is_mock_location)
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Absensi berhasil dicatat.',
      data: result.rows[0]
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
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
