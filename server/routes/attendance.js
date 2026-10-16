// api/routes/attendance.js
import { Router } from 'express';
import { query } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';
import { logActivity } from '../utils/logger.js';

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
        officeAddress,
        req.ip || '127.0.0.1',
        device_info || req.headers['user-agent'] || null,
        selfie_image_url || null,
        validGeofenceId,
        finalDistance,
        Boolean(is_mock_location)
      ]
    );

    // Audit Trail: Log attendance activity for admin monitoring
    await logActivity({
      userId,
      type: 'PRESENSI_CHECKIN',
      details: `Presensi ${normalizedStatus} berhasil dicatat (Jarak: ${finalDistance || 0}m, Status: ${normalizedStatus})`,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      isAnomaly: Boolean(is_mock_location)
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
