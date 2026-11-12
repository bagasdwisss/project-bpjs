// api/routes/admin.js
import { Router } from 'express';
import os from 'os';
import { query } from '../db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { logActivity } from '../utils/logger.js';
import { decompressPayload } from '../utils/payloadCompressor.js';
import cache from '../utils/cache.js';

const router = Router();

const escapeCsvCell = (val) => {
  let str = String(val ?? '');
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  return `"${str.replace(/"/g, '""')}"`;
};

/**
 * GET /api/admin/monitoring/activity-logs
 */
router.get('/monitoring/activity-logs', authenticateToken, requireRole('Administrator'), async (req, res) => {
  try {
    const result = await query(
      `SELECT a.log_id, a.activity_type, a.details, a.ip_address, a.created_at,
              u.full_name, u.unique_id, r.role_name
       FROM activity_logs a
       LEFT JOIN users u ON a.user_id = u.user_id
       LEFT JOIN roles r ON u.role_id = r.role_id
       ORDER BY a.created_at DESC
       LIMIT 50`
    );

    return res.json({
      success: true,
      data: result.rows.map(r => ({
        ...r,
        details: typeof r.details === 'string' && r.details.startsWith('zst:v1:')
          ? (typeof decompressPayload(r.details) === 'object' ? JSON.stringify(decompressPayload(r.details)) : decompressPayload(r.details))
          : r.details
      }))
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/admin/monitoring/system-stats
 */
router.get('/monitoring/system-stats', authenticateToken, requireRole('Administrator'), async (req, res) => {
  try {
    const [usersCount, logsCount, anomalyCount, dbSizeRes] = await Promise.all([
      query(`SELECT COUNT(*)::int as count FROM users WHERE status = 'Aktif'`),
      query(`SELECT COUNT(*)::int as count FROM activity_logs`),
      query(`SELECT COUNT(*)::int as count FROM activity_logs WHERE is_anomaly = TRUE AND created_at >= NOW() - INTERVAL '24 hours'`),
      query(`SELECT pg_database_size(current_database())::bigint as size_bytes, pg_size_pretty(pg_database_size(current_database())) as size_pretty`).catch(() => ({ rows: [{ size_bytes: 0, size_pretty: '0 B' }] }))
    ]);

    const totalMem = os.totalmem() || 1;
    const freeMem = os.freemem();
    const processMemPct = Number((((totalMem - freeMem) / totalMem) * 100).toFixed(1));
    const cpus = os.cpus() || [];
    const load1m = os.loadavg ? os.loadavg()[0] : 0;
    const cpuPct = cpus.length > 0 && load1m > 0
      ? Number(Math.min(100, (load1m / cpus.length) * 100).toFixed(1))
      : Number(Math.min(100, (process.memoryUsage().heapUsed / Math.max(1, process.memoryUsage().heapTotal)) * 50).toFixed(1));

    const dbBytes = Number(dbSizeRes.rows[0]?.size_bytes || 0);
    // Neon free tier baseline 512 MB quota indicator
    const neonQuotaBytes = 512 * 1024 * 1024;
    const storagePct = Number(Math.min(100, (dbBytes / neonQuotaBytes) * 100).toFixed(2));
    const totalLogsNum = logsCount.rows[0]?.count || 0;
    const recentAnomalies = anomalyCount.rows[0]?.count || 0;

    return res.json({
      success: true,
      data: {
        cpu: cpuPct,
        memory: processMemPct,
        heapUsedMb: Number((process.memoryUsage().heapUsed / (1024 * 1024)).toFixed(1)),
        storage: storagePct,
        storagePretty: dbSizeRes.rows[0]?.size_pretty || '0 B',
        uptimeSeconds: Math.floor(process.uptime()),
        uptime: `${Math.floor(process.uptime() / 3600)}j ${Math.floor((process.uptime() % 3600) / 60)}m`,
        activeUsers: usersCount.rows[0]?.count || 0,
        recentAnomalies,
        totalLogs: totalLogsNum,
        environment: process.env.VERCEL ? 'Vercel Serverless' : 'Node.js Local'
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/admin/monitoring/active-users
 */
router.get('/monitoring/active-users', authenticateToken, requireRole('Administrator'), async (req, res) => {
  try {
    const result = await query(
      `SELECT u.user_id, u.unique_id, u.full_name, r.role_name, u.updated_at as last_activity
       FROM users u
       JOIN roles r ON u.role_id = r.role_id
       WHERE u.status = 'Aktif'
       ORDER BY u.updated_at DESC`
    );
    return res.json({ success: true, data: result.rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/admin/reports/generate
 */
router.post('/reports/generate', authenticateToken, requireRole('Administrator'), async (req, res) => {
  try {
    const { report_type, start_date, end_date, format } = req.body;
    const fmt = String(format || 'CSV').toUpperCase() === 'PDF' ? 'PDF' : 'CSV';
    const reportName = `Laporan_${report_type || 'Monthly'}_${start_date || 'ALL'}_${end_date || new Date().toISOString().split('T')[0]}`;

    // Compute live date-bounded summary stats
    const dateFilter = start_date && end_date ? `AND attendance_date BETWEEN $1::date AND $2::date` : '';
    const dateParams = start_date && end_date ? [start_date, end_date] : [];

    const [coreStats, attStats] = await Promise.all([
      query(`
        SELECT 
          (SELECT COUNT(*)::int FROM users WHERE role_id = 1) as total_participants,
          (SELECT COALESCE(AVG(nilai), 0) FROM progress) as avg_score,
          (SELECT COALESCE(COUNT(CASE WHEN nilai >= 75 THEN 1 END)::float / NULLIF(COUNT(*), 0) * 100, 0) FROM progress) as completion_rate,
          (SELECT COUNT(*)::int FROM peserta) as total_bpu_acquired
      `),
      query(`
        SELECT
          COUNT(*)::int as total_records,
          COUNT(CASE WHEN status = 'Hadir' THEN 1 END)::int as hadir_count,
          COUNT(CASE WHEN status = 'Terlambat' THEN 1 END)::int as terlambat_count,
          COUNT(CASE WHEN status IN ('Izin', 'Sakit') THEN 1 END)::int as leave_count,
          COUNT(CASE WHEN status IN ('Alfa', 'Alpa') THEN 1 END)::int as alfa_count
        FROM attendance_records
        WHERE 1=1 ${dateFilter}
      `, dateParams)
    ]);

    const summary = {
      ...coreStats.rows[0],
      ...attStats.rows[0],
      total_hours: (attStats.rows[0]?.hadir_count || 0) * 8,
      start_date: start_date || null,
      end_date: end_date || null
    };

    const result = await query(
      `INSERT INTO report_logs (report_name, generated_by, generated_at, file_format, file_path)
       VALUES ($1, $2, CURRENT_TIMESTAMP, $3, $4)
       RETURNING *`,
      [reportName, req.user.user_id, fmt, '']
    );
    const created = result.rows[0];
    const apiPath = `/api/admin/reports/${created.log_id}/download`;
    await query(`UPDATE report_logs SET file_path = $1 WHERE log_id = $2`, [apiPath, created.log_id]);
    created.file_path = apiPath;

    await logActivity({
      req,
      userId: req.user.user_id,
      action: 'REPORT_GENERATED',
      description: `Admin membuat laporan ${reportName} (${fmt})`
    });

    return res.json({
      success: true,
      message: 'Laporan berhasil dibuat dan siap diunduh.',
      data: {
        report: created,
        summary,
        downloadUrl: apiPath
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/admin/reports/history
 */
router.get('/reports/history', authenticateToken, requireRole('Administrator'), async (req, res) => {
  try {
    const result = await query(
      `SELECT r.*, u.full_name as generated_by_name
       FROM report_logs r
       LEFT JOIN users u ON r.generated_by = u.user_id
       ORDER BY r.generated_at DESC`
    );
    return res.json({ success: true, data: result.rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/admin/backup/export-data
 * Exports real live database snapshot JSON (excluding credential hashes & secrets)
 */
router.get('/backup/export-data', authenticateToken, requireRole('Administrator'), async (req, res) => {
  try {
    const [
      usersRes, batchesRes, modulesRes, progressRes, attendanceRes,
      scoresRes, pesertaRes, holidaysRes, settingsRes, gradingRes,
      bpuRatesRes, geofencesRes
    ] = await Promise.all([
      query(`SELECT user_id, unique_id, full_name, email, role_id, coordinator_id, status, penempatan, created_at FROM users ORDER BY user_id ASC`),
      query(`SELECT * FROM batches ORDER BY batch_id ASC`),
      query(`SELECT * FROM modules ORDER BY module_id ASC`),
      query(`SELECT * FROM progress ORDER BY id ASC`),
      query(`SELECT attendance_id, user_id, attendance_date, check_in_time, status, notes, location_coordinates, location_address, geofence_id, distance_meters, is_mock_location, created_at FROM attendance_records ORDER BY attendance_date DESC LIMIT 5000`),
      query(`SELECT * FROM scores ORDER BY score_id ASC`),
      query(`SELECT peserta_id, user_id, nama_peserta, pekerjaan, status_pendaftaran, biaya, program_terdaftar, tanggal_pendaftaran, created_at FROM peserta ORDER BY peserta_id ASC`),
      query(`SELECT * FROM holidays ORDER BY holiday_date ASC`),
      query(`SELECT * FROM attendance_settings ORDER BY id ASC`),
      query(`SELECT * FROM grading_settings ORDER BY id ASC`),
      query(`SELECT * FROM bpu_rates ORDER BY id ASC`),
      query(`SELECT * FROM geofence_locations ORDER BY id ASC`)
    ]);

    const snapshot = {
      exportedAt: new Date().toISOString(),
      exportedBy: req.user.full_name || req.user.unique_id,
      engine: 'Neon PostgreSQL Logical Snapshot',
      tables: {
        users: usersRes.rows,
        batches: batchesRes.rows,
        modules: modulesRes.rows,
        progress: progressRes.rows,
        attendance_records: attendanceRes.rows,
        scores: scoresRes.rows,
        peserta: pesertaRes.rows,
        holidays: holidaysRes.rows,
        attendance_settings: settingsRes.rows,
        grading_settings: gradingRes.rows,
        bpu_rates: bpuRatesRes.rows,
        geofence_locations: geofencesRes.rows
      }
    };

    return res.json({ success: true, data: snapshot });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/admin/backup/create
 */
router.post('/backup/create', authenticateToken, requireRole('Administrator'), async (req, res) => {
  try {
    const countsRes = await query(`
      SELECT
        (SELECT COUNT(*)::int FROM users) as users_count,
        (SELECT COUNT(*)::int FROM attendance_records) as attendance_count,
        (SELECT COUNT(*)::int FROM progress) as progress_count,
        (SELECT COUNT(*)::int FROM scores) as scores_count,
        (SELECT COUNT(*)::int FROM peserta) as peserta_count,
        (SELECT GREATEST(1, pg_database_size(current_database()) / 1024)::int) as size_kb
    `);
    const c = countsRes.rows[0] || {};
    const backupName = `backup_bpjstk_${new Date().toISOString().slice(0, 10)}_${Date.now()}.json`;

    const result = await query(
      `INSERT INTO backup_logs (backup_name, file_path, file_size_kb, created_by, created_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
       RETURNING *`,
      [backupName, '/api/admin/backup/export-data', c.size_kb || 64, req.user.user_id]
    );

    await logActivity({
      req,
      userId: req.user.user_id,
      action: 'BACKUP_CREATED',
      description: `Snapshot backup ${backupName} dibuat (${c.users_count || 0} users, ${c.attendance_count || 0} presensi, ${c.size_kb || 64} KB)`
    });

    return res.json({
      success: true,
      message: `Backup database tercatat (${c.size_kb || 64} KB, ${c.attendance_count || 0} presensi).`,
      data: result.rows[0],
      snapshotSummary: c
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/admin/backup/list
 */
router.get('/backup/list', authenticateToken, requireRole('Administrator'), async (req, res) => {
  try {
    const result = await query(
      `SELECT b.*, u.full_name as created_by_name
       FROM backup_logs b
       LEFT JOIN users u ON b.created_by = u.user_id
       ORDER BY b.created_at DESC`
    );
    return res.json({ success: true, data: result.rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/admin/backup/:id/restore
 */
router.post('/backup/:id/restore', authenticateToken, requireRole('Administrator'), async (req, res) => {
  try {
    const backupId = parseInt(req.params.id, 10);
    if (!Number.isInteger(backupId) || backupId <= 0) {
      return res.status(400).json({ success: false, message: 'ID backup tidak valid.' });
    }

    const exists = await query(`SELECT * FROM backup_logs WHERE backup_id = $1`, [backupId]);
    if (exists.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Rekam jejak backup tidak ditemukan di basis data.' });
    }

    const healthCheck = await query(`
      SELECT
        (SELECT COUNT(*)::int FROM users) as users,
        (SELECT COUNT(*)::int FROM attendance_records) as attendance_records,
        (SELECT COUNT(*)::int FROM progress) as progress
    `);

    await logActivity({
      req,
      userId: req.user.user_id,
      action: 'BACKUP_RESTORE_VERIFIED',
      description: `Admin memverifikasi integritas restore snapshot #${backupId} (${exists.rows[0].backup_name})`
    });

    return res.json({
      success: true,
      message: `Verifikasi snapshot ${exists.rows[0].backup_name} berhasil.`,
      data: {
        backup: exists.rows[0],
        currentCounts: healthCheck.rows[0]
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/admin/reports/:id/download
 */
router.get(['/reports/:id/download', '/:id/download'], authenticateToken, requireRole('Administrator'), async (req, res) => {
  try {
    const reportId = parseInt(req.params.id, 10);
    if (!Number.isInteger(reportId) || reportId <= 0) {
      return res.status(400).json({ success: false, message: 'ID laporan tidak valid.' });
    }

    const result = await query(`SELECT * FROM report_logs WHERE log_id = $1`, [reportId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Laporan tidak ditemukan.' });
    }
    const report = result.rows[0];

    const rowsRes = await query(`
      SELECT u.unique_id, u.full_name, u.penempatan, u.status,
             COALESCE(p.kunjungan_bpu, 0) as kunjungan_bpu,
             COALESCE(p.hasil_akuisisi_bpu, 0) as hasil_akuisisi_bpu,
             COALESCE(p.kunjungan_pu, 0) as kunjungan_pu,
             COALESCE(p.nilai, 0) as nilai,
             COALESCE(p.grade, '-') as grade,
             COUNT(CASE WHEN a.status = 'Hadir' THEN 1 END)::int as total_hadir,
             COUNT(CASE WHEN a.status = 'Terlambat' THEN 1 END)::int as total_terlambat,
             COUNT(CASE WHEN a.status IN ('Alfa', 'Alpa') THEN 1 END)::int as total_alfa
      FROM users u
      LEFT JOIN progress p ON u.user_id = p.user_id
      LEFT JOIN attendance_records a ON u.user_id = a.user_id
      WHERE u.role_id = 1
      GROUP BY u.user_id, u.unique_id, u.full_name, u.penempatan, u.status,
               p.kunjungan_bpu, p.hasil_akuisisi_bpu, p.kunjungan_pu, p.nilai, p.grade
      ORDER BY u.full_name ASC
    `);

    const header = [
      'NIM/NIP', 'Nama Lengkap', 'Penempatan', 'Status',
      'Kunjungan BPU', 'Akuisisi BPU', 'Kunjungan PU',
      'Hadir', 'Terlambat', 'Alfa', 'Nilai Akhir', 'Grade'
    ];
    const csvLines = [
      header.map(escapeCsvCell).join(','),
      ...rowsRes.rows.map(r => [
        r.unique_id, r.full_name, r.penempatan || '-', r.status,
        r.kunjungan_bpu, r.hasil_akuisisi_bpu, r.kunjungan_pu,
        r.total_hadir, r.total_terlambat, r.total_alfa, r.nilai, r.grade
      ].map(escapeCsvCell).join(','))
    ];
    const csvContent = `\uFEFF${csvLines.join('\r\n')}`;

    if (req.query.download === '1' || req.query.format === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${report.report_name}.csv"`);
      return res.send(csvContent);
    }

    return res.json({
      success: true,
      message: 'Laporan siap diunduh.',
      data: report,
      rows: rowsRes.rows,
      csvContent,
      downloadUrl: `/api/admin/reports/${report.log_id}/download?format=csv`
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// =========================================================================
// PENGATURAN JAM KERJA & HARI LIBUR NASIONAL (DINAMIS)
// =========================================================================

/**
 * GET /api/admin/attendance-settings
 */
router.get('/attendance-settings', authenticateToken, requireRole('Administrator'), async (req, res) => {
  try {
    const result = await query(`SELECT * FROM attendance_settings WHERE id = 1 LIMIT 1`);
    if (result.rows.length === 0) {
      const defaultInsert = await query(`
        INSERT INTO attendance_settings (id, work_start_time, work_ontime_limit, work_end_time, work_days, allow_weekend, late_tolerance_minutes, weekend_message, before_start_message, after_end_message)
        VALUES (1, '07:00:00', '08:00:00', '17:00:00', '1,2,3,4,5', FALSE, 0,
                'Hari ini adalah hari libur akhir pekan (Sabtu/Minggu). Presensi dinonaktifkan.',
                'Presensi belum dibuka. Jam masuk dimulai pukul {start_time}.',
                'Presensi hari ini telah ditutup pada pukul {end_time}.')
        RETURNING *
      `);
      return res.json({ success: true, data: defaultInsert.rows[0] });
    }
    return res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PUT /api/admin/attendance-settings
 */
router.put('/attendance-settings', authenticateToken, requireRole('Administrator'), async (req, res) => {
  try {
    const {
      work_start_time,
      work_ontime_limit,
      work_end_time,
      work_days,
      allow_weekend,
      late_tolerance_minutes,
      weekend_message,
      before_start_message,
      after_end_message,
      inactivity_timeout_minutes
    } = req.body;

    const result = await query(
      `INSERT INTO attendance_settings (
         id, work_start_time, work_ontime_limit, work_end_time, work_days, allow_weekend,
         late_tolerance_minutes, weekend_message, before_start_message, after_end_message,
         inactivity_timeout_minutes, updated_at, updated_by
       )
       VALUES (
         1,
         COALESCE($1, '07:00:00'),
         COALESCE($2, '08:00:00'),
         COALESCE($3, '17:00:00'),
         COALESCE($4, '1,2,3,4,5'),
         COALESCE($5, FALSE),
         COALESCE($6, 0),
         COALESCE($7, 'Hari ini adalah hari libur akhir pekan (Sabtu/Minggu). Presensi dinonaktifkan.'),
         COALESCE($8, 'Presensi belum dibuka. Jam masuk dimulai pukul {start_time}.'),
         COALESCE($9, 'Presensi hari ini telah ditutup pada pukul {end_time}.'),
         COALESCE($10, 5),
         CURRENT_TIMESTAMP,
         $11
       )
       ON CONFLICT (id) DO UPDATE SET
         work_start_time = COALESCE($1, attendance_settings.work_start_time),
         work_ontime_limit = COALESCE($2, attendance_settings.work_ontime_limit),
         work_end_time = COALESCE($3, attendance_settings.work_end_time),
         work_days = COALESCE($4, attendance_settings.work_days),
         allow_weekend = COALESCE($5, attendance_settings.allow_weekend),
         late_tolerance_minutes = COALESCE($6, attendance_settings.late_tolerance_minutes),
         weekend_message = COALESCE($7, attendance_settings.weekend_message),
         before_start_message = COALESCE($8, attendance_settings.before_start_message),
         after_end_message = COALESCE($9, attendance_settings.after_end_message),
         inactivity_timeout_minutes = COALESCE($10, attendance_settings.inactivity_timeout_minutes),
         updated_at = CURRENT_TIMESTAMP,
         updated_by = $11
       RETURNING *`,
      [
        work_start_time ?? null,
        work_ontime_limit ?? null,
        work_end_time ?? null,
        work_days ?? null,
        allow_weekend ?? null,
        late_tolerance_minutes ?? null,
        weekend_message ?? null,
        before_start_message ?? null,
        after_end_message ?? null,
        inactivity_timeout_minutes ?? null,
        req.user.user_id
      ]
    );

    await logActivity({
      userId: req.user.user_id,
      type: 'ATTENDANCE_SETTINGS_UPDATED',
      details: `Admin memperbarui jam kerja dan aturan presensi: Masuk ${work_start_time || '07:00'}, Tepat Waktu s.d. ${work_ontime_limit || '08:00'}, Pulang ${work_end_time || '17:00'}, Timeout Inaktivitas ${inactivity_timeout_minutes || 5}m`,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    return res.json({
      success: true,
      message: 'Pengaturan jam kerja dan presensi berhasil diperbarui.',
      data: result.rows[0]
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/admin/geofence/office
 * Retrieve active official office geofence
 */
router.get('/geofence/office', authenticateToken, requireRole('Administrator'), async (req, res) => {
  try {
    const result = await query(
      `SELECT id, name, address, latitude, longitude, radius_meters, category, is_active
       FROM geofence_locations
       WHERE category = 'kantor' AND id = 1
       LIMIT 1`
    );
    return res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PUT /api/admin/geofence/office
 * Administrator updates office name, address, coordinates, and geofence radius
 */
router.put('/geofence/office', authenticateToken, requireRole('Administrator'), async (req, res) => {
  try {
    const { name, address, latitude, longitude, radius_meters } = req.body;
    const result = await query(
      `INSERT INTO geofence_locations (id, name, category, address, latitude, longitude, radius_meters, is_active, updated_at)
       VALUES (
         1,
         COALESCE($1, 'Kantor Cabang BPJS Ketenagakerjaan'),
         'kantor',
         COALESCE($2, ''),
         COALESCE($3, 3.5758),
         COALESCE($4, 98.6475),
         COALESCE($5, 100),
         TRUE,
         CURRENT_TIMESTAMP
       )
       ON CONFLICT (id) DO UPDATE SET
         name = COALESCE($1, geofence_locations.name),
         address = COALESCE($2, geofence_locations.address),
         latitude = COALESCE($3, geofence_locations.latitude),
         longitude = COALESCE($4, geofence_locations.longitude),
         radius_meters = COALESCE($5, geofence_locations.radius_meters),
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [name ?? null, address ?? null, latitude ?? null, longitude ?? null, radius_meters ?? null]
    );

    cache.del('sys_geofence_locations');

    await logActivity({
      userId: req.user.user_id,
      type: 'UPDATE_GEOFENCE_OFFICE',
      details: `Memperbarui lokasi kantor & radius geofence: ${name || 'Kantor Cabang'} (${radius_meters} meter)`,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    return res.json({
      success: true,
      message: 'Lokasi dan radius geofence kantor berhasil diperbarui!',
      data: result.rows[0]
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/admin/holidays
 */
router.get('/holidays', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT h.*, u.full_name as created_by_name
       FROM holidays h
       LEFT JOIN users u ON h.created_by = u.user_id
       ORDER BY h.holiday_date ASC`
    );
    return res.json({ success: true, data: result.rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/admin/holidays
 */
router.post('/holidays', authenticateToken, requireRole('Administrator'), async (req, res) => {
  try {
    const { holiday_date, holiday_name, description, custom_message } = req.body;

    if (!holiday_date || !holiday_name?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Tanggal libur dan nama hari libur wajib diisi.'
      });
    }

    const defaultMsg = custom_message?.trim() || `Hari ini kantor libur memperingati ${holiday_name.trim()}. Presensi tidak dapat dilakukan.`;

    const result = await query(
      `INSERT INTO holidays (holiday_date, holiday_name, description, custom_message, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT (holiday_date) DO UPDATE SET
         holiday_name = EXCLUDED.holiday_name,
         description = EXCLUDED.description,
         custom_message = EXCLUDED.custom_message,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [holiday_date, holiday_name.trim(), description?.trim() || null, defaultMsg, req.user.user_id]
    );

    await logActivity({
      userId: req.user.user_id,
      type: 'HOLIDAY_ADDED',
      details: `Admin menambahkan hari libur nasional: ${holiday_name} (${holiday_date})`,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    return res.status(201).json({
      success: true,
      message: 'Hari libur berhasil disimpan.',
      data: result.rows[0]
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PUT /api/admin/holidays/:id
 */
router.put('/holidays/:id', authenticateToken, requireRole('Administrator'), async (req, res) => {
  try {
    const { id } = req.params;
    const { holiday_date, holiday_name, description, custom_message } = req.body;

    const result = await query(
      `UPDATE holidays
       SET holiday_date = COALESCE($1, holiday_date),
           holiday_name = COALESCE($2, holiday_name),
           description = COALESCE($3, description),
           custom_message = COALESCE($4, custom_message),
           updated_at = CURRENT_TIMESTAMP
       WHERE holiday_id = $5
       RETURNING *`,
      [holiday_date, holiday_name?.trim(), description?.trim() || null, custom_message?.trim() || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Hari libur tidak ditemukan.' });
    }

    await logActivity({
      userId: req.user.user_id,
      type: 'HOLIDAY_UPDATED',
      details: `Admin memperbarui hari libur ID ${id}: ${holiday_name || ''}`,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    return res.json({
      success: true,
      message: 'Hari libur berhasil diperbarui.',
      data: result.rows[0]
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * DELETE /api/admin/holidays/:id
 */
router.delete('/holidays/:id', authenticateToken, requireRole('Administrator'), async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await query(`SELECT holiday_name, holiday_date FROM holidays WHERE holiday_id = $1`, [id]);
    const hName = existing.rows[0]?.holiday_name || id;

    await query(`DELETE FROM holidays WHERE holiday_id = $1`, [id]);

    await logActivity({
      userId: req.user.user_id,
      type: 'HOLIDAY_DELETED',
      details: `Admin menghapus hari libur: ${hName}`,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    return res.json({
      success: true,
      message: 'Hari libur berhasil dihapus.'
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
