// api/routes/users.js
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { logActivity } from '../utils/logger.js';
import { globalBloomFilter } from '../utils/bloomFilter.js';
import { buildFieldChanges, logEntityChange } from '../utils/auditFormatter.js';

const router = Router();

/**
 * GET /api/users
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { role_id, search } = req.query;

    let sql = `
      SELECT u.user_id, u.unique_id, u.full_name, u.role_id, u.coordinator_id, u.status, u.penempatan,
             u.created_at, u.updated_at, r.role_name, c.full_name AS coordinator_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.role_id
      LEFT JOIN users c ON u.coordinator_id = c.user_id
      WHERE 1=1
    `;

    const params = [];

    // Role-based data scoping
    if (req.user.role === 'Peserta' || req.user.role_id === 1) {
      // Participant cannot browse other users
      return res.status(403).json({
        success: false,
        message: 'Akses dilarang. Peserta tidak memiliki izin untuk melihat direktori pengguna lain.'
      });
    } else if (req.user.role === 'Koordinator' || req.user.role_id === 2) {
      // Coordinator may ONLY view participants under their own guidance
      params.push(req.user.user_id);
      sql += ` AND u.coordinator_id = $${params.length} AND u.role_id = 1`;
    } else if (role_id) {
      params.push(role_id);
      sql += ` AND u.role_id = $${params.length}`;
    }

    if (search) {
      params.push(`%${search.toLowerCase()}%`);
      sql += ` AND (LOWER(u.full_name) LIKE $${params.length} OR LOWER(u.unique_id) LIKE $${params.length})`;
    }

    sql += ` ORDER BY u.user_id ASC`;

    const result = await query(sql, params);

    return res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/** Normalize user penempatan/status values to match Neon PostgreSQL CHECK constraints. */
function normalizePenempatan(raw) {
  if (raw === undefined || raw === null || String(raw).trim() === '') return null;
  const lower = String(raw).trim().toLowerCase();
  if (lower === 'kantor') return 'Kantor';
  if (lower === 'lapangan') return 'Lapangan';
  return String(raw).trim();
}

function normalizeUserStatus(raw, fallback = 'Aktif') {
  if (raw === undefined || raw === null || String(raw).trim() === '') return fallback;
  const lower = String(raw).trim().toLowerCase();
  if (lower === 'aktif' || lower === 'active') return 'Aktif';
  if (lower === 'nonaktif' || lower === 'inactive') return 'Nonaktif';
  return String(raw).trim();
}

/**
 * POST /api/users
 */
router.post('/', authenticateToken, requireRole('Administrator'), async (req, res) => {
  try {
    const { unique_id, full_name, password, role_id, coordinator_id, status, penempatan } = req.body;

    if (!unique_id || !full_name || !role_id) {
      return res.status(400).json({
        success: false,
        message: 'Unique ID, Full Name, dan Role ID wajib diisi.'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password || 'password123', salt);
    const normalizedPenempatan = normalizePenempatan(penempatan);
    const normalizedStatus = normalizeUserStatus(status, 'Aktif');

    const result = await query(
      `INSERT INTO users (unique_id, full_name, password_hash, role_id, coordinator_id, status, penempatan, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, COALESCE($6, 'Aktif'), $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING user_id, unique_id, full_name, role_id, coordinator_id, status, penempatan, created_at`,
      [unique_id.trim(), full_name.trim(), passwordHash, role_id, coordinator_id || null, normalizedStatus, normalizedPenempatan]
    );

    // If role is Peserta, initialize empty progress entry
    if (parseInt(role_id, 10) === 1) {
      await query(
        `INSERT INTO progress (user_id, created_at, updated_at) VALUES ($1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT (user_id) DO NOTHING`,
        [result.rows[0].user_id]
      );
    }

    globalBloomFilter.add(unique_id.trim());

    await logActivity({
      userId: req.user.user_id,
      type: 'USER_CREATED',
      details: `Menambahkan pengguna baru: ${full_name} (${unique_id}, Role: ${role_id})`,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    return res.status(201).json({
      success: true,
      message: 'Pengguna berhasil ditambahkan.',
      data: result.rows[0]
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Gagal membuat pengguna: ' + error.message
    });
  }
});

/**
 * POST /api/users/import
 */
router.post('/import', authenticateToken, requireRole('Administrator'), async (req, res) => {
  try {
    const { users } = req.body;
    if (!Array.isArray(users) || users.length === 0) {
      return res.status(400).json({ success: false, message: 'Data pengguna tidak valid atau kosong.' });
    }

    const salt = await bcrypt.genSalt(10);
    const defaultHash = await bcrypt.hash('password123', salt);

    let insertedCount = 0;
    for (const u of users) {
      const uId = u.unique_id || u.UniqueID || u.NIK || u.nim;
      const fName = u.full_name || u.FullName || u.Nama || u.nama;
      const roleId = parseInt(
        u.role_id || (u.Role === 'Koordinator' ? 2 : u.Role === 'Administrator' ? 3 : 1),
        10
      ) || 1;
      const coordId = u.coordinator_id ? parseInt(u.coordinator_id, 10) : null;
      const status = normalizeUserStatus(u.status, 'Aktif');
      const penempatan = normalizePenempatan(u.penempatan);
      const rowHash = u.password && String(u.password).trim()
        ? await bcrypt.hash(String(u.password), salt)
        : defaultHash;

      if (uId && fName) {
        const upRes = await query(
          `INSERT INTO users (unique_id, full_name, password_hash, role_id, coordinator_id, status, penempatan, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
           ON CONFLICT (unique_id) DO UPDATE SET 
             full_name = EXCLUDED.full_name,
             role_id = EXCLUDED.role_id,
             coordinator_id = COALESCE(EXCLUDED.coordinator_id, users.coordinator_id),
             status = EXCLUDED.status,
             penempatan = COALESCE(EXCLUDED.penempatan, users.penempatan),
             updated_at = CURRENT_TIMESTAMP
           RETURNING user_id, role_id`,
          [String(uId).trim(), String(fName).trim(), rowHash, roleId, Number.isInteger(coordId) ? coordId : null, status, penempatan]
        );
        if (upRes.rows[0]?.role_id === 1) {
          await query(
            `INSERT INTO progress (user_id, created_at, updated_at)
             VALUES ($1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
             ON CONFLICT (user_id) DO NOTHING`,
            [upRes.rows[0].user_id]
          );
        }
        globalBloomFilter.add(String(uId).trim());
        insertedCount++;
      }
    }

    await logActivity({
      userId: req.user.user_id,
      type: 'USERS_IMPORTED',
      details: `Mengimpor ${insertedCount} baris data akun pengguna secara massal`,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    return res.json({
      success: true,
      message: `${insertedCount} pengguna berhasil diimpor.`,
      count: insertedCount
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Gagal mengimpor data: ' + error.message });
  }
});

/**
 * GET /api/users/coordinators or /api/coordinators
 * List coordinators for assignment dropdowns (Admin/Coordinator only)
 */
router.get('/coordinators', authenticateToken, requireRole('Administrator', 'Koordinator'), async (req, res) => {
  try {
    const result = await query(
      `SELECT u.user_id, u.unique_id, u.full_name, u.status, u.penempatan,
              COUNT(m.user_id)::int AS mentee_count
       FROM users u
       LEFT JOIN users m ON m.coordinator_id = u.user_id AND m.role_id = 1
       WHERE u.role_id = 2
       GROUP BY u.user_id
       ORDER BY u.full_name ASC`
    );
    return res.json({ success: true, data: result.rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/users/by-coordinator/:coordinatorId
 */
router.get('/by-coordinator/:coordinatorId', authenticateToken, async (req, res) => {
  try {
    const { coordinatorId } = req.params;
    const targetCoordinatorId = parseInt(coordinatorId, 10);
    if (!Number.isInteger(targetCoordinatorId) || targetCoordinatorId <= 0) {
      return res.status(400).json({ success: false, message: 'ID Koordinator tidak valid.' });
    }

    // Peserta cannot browse coordinator rosters
    if (req.user.role === 'Peserta' || req.user.role_id === 1) {
      return res.status(403).json({ success: false, message: 'Akses dilarang. Anda tidak memiliki izin untuk melihat daftar bimbingan.' });
    }

    // Koordinator can only view their own participants
    if ((req.user.role === 'Koordinator' || req.user.role_id === 2) && req.user.user_id !== targetCoordinatorId) {
      return res.status(403).json({ success: false, message: 'Akses dilarang. Anda hanya dapat melihat anak didik bimbingan Anda sendiri.' });
    }

    const result = await query(
      `SELECT u.user_id, u.unique_id, u.full_name, u.role_id, u.coordinator_id, u.status, u.penempatan,
              p.hasil_akuisisi_bpu, p.kunjungan_bpu, p.kunjungan_pu, p.total_poin, p.nilai, p.grade
       FROM users u
       LEFT JOIN progress p ON u.user_id = p.user_id
       WHERE u.coordinator_id = $1 AND u.role_id = 1
       ORDER BY u.full_name ASC`,
      [targetCoordinatorId]
    );

    return res.json({ success: true, data: result.rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/users/progress/summary
 * Batch endpoint to load all participants' progress in a single database query (eliminates N+1 loop)
 */
router.get('/progress/summary', authenticateToken, async (req, res) => {
  try {
    let result;
    if (req.user.role === 'Peserta' || req.user.role_id === 1) {
      result = await query(
        `SELECT user_id, hasil_akuisisi_bpu, kunjungan_bpu, kunjungan_pu,
                video_viralisasi, kehadiran_seminar, kehadiran_sosialisasi,
                total_poin, nilai, grade, updated_at
         FROM progress
         WHERE user_id = $1`,
        [req.user.user_id]
      );
    } else if (req.user.role === 'Koordinator' || req.user.role_id === 2) {
      result = await query(
        `SELECT p.user_id, p.hasil_akuisisi_bpu, p.kunjungan_bpu, p.kunjungan_pu,
                p.video_viralisasi, p.kehadiran_seminar, p.kehadiran_sosialisasi,
                p.total_poin, p.nilai, p.grade, p.updated_at
         FROM progress p
         JOIN users u ON p.user_id = u.user_id
         WHERE u.coordinator_id = $1`,
        [req.user.user_id]
      );
    } else {
      result = await query(`
        SELECT user_id, hasil_akuisisi_bpu, kunjungan_bpu, kunjungan_pu,
               video_viralisasi, kehadiran_seminar, kehadiran_sosialisasi,
               total_poin, nilai, grade, updated_at
        FROM progress
      `);
    }

    const summaryMap = {};
    for (const row of result.rows) {
      summaryMap[row.user_id] = row;
    }

    return res.json({
      success: true,
      data: summaryMap
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/users/progress or /api/coordinator/participants/progress
 */
router.get('/progress', authenticateToken, async (req, res) => {
  try {
    const isPeserta = req.user.role === 'Peserta' || req.user.role_id === 1;
    if (isPeserta && req.baseUrl.includes('/coordinator')) {
      return res.status(403).json({
        success: false,
        message: 'Akses dilarang. Endpoint ini hanya untuk Koordinator atau Administrator.'
      });
    }

    let result;
    if (isPeserta) {
      result = await query(`
        SELECT p.*, u.full_name, u.unique_id, u.penempatan
        FROM progress p
        JOIN users u ON p.user_id = u.user_id
        WHERE p.user_id = $1
      `, [req.user.user_id]);
    } else if (req.user.role === 'Koordinator' || req.user.role_id === 2) {
      result = await query(`
        SELECT p.*, u.full_name, u.unique_id, u.penempatan
        FROM progress p
        JOIN users u ON p.user_id = u.user_id
        WHERE u.coordinator_id = $1
      `, [req.user.user_id]);
    } else {
      result = await query(`
        SELECT p.*, u.full_name, u.unique_id, u.penempatan
        FROM progress p
        JOIN users u ON p.user_id = u.user_id
      `);
    }
    return res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/users/visits or /api/visits
 */
router.get(['/visits', '/user-visits'], authenticateToken, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const isParticipant = req.user.role === 'Peserta' || req.user.role_id === 1;

    let sql = `
      SELECT p.id, p.user_id, u.full_name, u.unique_id, p.kunjungan_bpu, p.kunjungan_pu,
             p.hasil_akuisisi_bpu, p.updated_at
      FROM progress p
      JOIN users u ON p.user_id = u.user_id
    `;
    const params = [];
    if (isParticipant) {
      params.push(userId);
      sql += ` WHERE p.user_id = $1`;
    } else if (req.user.role === 'Koordinator' || req.user.role_id === 2) {
      params.push(userId);
      sql += ` WHERE u.coordinator_id = $1`;
    }
    sql += ` ORDER BY p.updated_at DESC`;

    const result = await query(sql, params);
    return res.json({ success: true, data: result.rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PUT /api/users/visits/:id or /api/visits/:id
 */
router.put(['/visits/:id', '/user-visits/:id'], authenticateToken, async (req, res) => {
  try {
    const rawId = parseInt(req.params.id, 10);
    if (!Number.isInteger(rawId) || rawId <= 0) {
      return res.status(400).json({ success: false, message: 'ID kunjungan tidak valid.' });
    }
    const { kunjungan_bpu, kunjungan_pu } = req.body;

    // Resolve unambiguous target user_id (prefer explicit user_id if Peserta calls with own ID or progress.id lookup)
    let targetUserId = null;
    const byProgressId = await query(`SELECT user_id FROM progress WHERE id = $1 LIMIT 1`, [rawId]);
    if (byProgressId.rows.length > 0 && !(req.user.role_id === 1 && byProgressId.rows[0].user_id !== req.user.user_id)) {
      targetUserId = byProgressId.rows[0].user_id;
    } else {
      const byUser = await query(`SELECT user_id FROM users WHERE user_id = $1 LIMIT 1`, [rawId]);
      if (byUser.rows.length > 0) targetUserId = byUser.rows[0].user_id;
    }

    if (!targetUserId) {
      return res.status(404).json({ success: false, message: 'Data peserta atau kunjungan tidak ditemukan.' });
    }

    // RBAC & IDOR check
    if ((req.user.role === 'Peserta' || req.user.role_id === 1) && targetUserId !== req.user.user_id) {
      return res.status(403).json({ success: false, message: 'Akses dilarang. Anda hanya dapat memperbarui kunjungan Anda sendiri.' });
    }
    if (req.user.role === 'Koordinator' || req.user.role_id === 2) {
      const check = await query(`SELECT coordinator_id FROM users WHERE user_id = $1`, [targetUserId]);
      if (check.rows.length === 0 || check.rows[0].coordinator_id !== req.user.user_id) {
        return res.status(403).json({ success: false, message: 'Akses dilarang. Peserta ini tidak berada di bawah bimbingan Anda.' });
      }
    }

    const prevVisitRes = await query(`SELECT kunjungan_bpu, kunjungan_pu FROM progress WHERE user_id = $1 LIMIT 1`, [targetUserId]);
    const prevVisit = prevVisitRes.rows[0] || {};

    const result = await query(
      `INSERT INTO progress (user_id, kunjungan_bpu, kunjungan_pu, created_at, updated_at)
       VALUES ($1, COALESCE($2, 0), COALESCE($3, 0), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id) DO UPDATE SET
         kunjungan_bpu = COALESCE($2, progress.kunjungan_bpu),
         kunjungan_pu = COALESCE($3, progress.kunjungan_pu),
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [targetUserId, kunjungan_bpu ?? null, kunjungan_pu ?? null]
    );

    const visitChanges = buildFieldChanges(prevVisit, result.rows[0], [
      { key: 'kunjungan_bpu', label: 'Kunjungan BPU', type: 'number' },
      { key: 'kunjungan_pu', label: 'Kunjungan PU', type: 'number' }
    ]);

    await logEntityChange({
      req,
      targetUserId,
      action: 'VISITS_UPDATED',
      verb: 'mengubah',
      entityLabel: 'Data Kunjungan Lapangan',
      changes: visitChanges
    });

    return res.json({
      success: true,
      message: 'Data kunjungan berhasil diperbarui.',
      data: result.rows[0]
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/users/:id/progress
 */
router.get('/:id/progress', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const targetUserId = parseInt(id, 10);
    if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
      return res.status(400).json({ success: false, message: 'ID pengguna tidak valid.' });
    }

    // IDOR Protection: Peserta can only view their own progress
    if ((req.user.role === 'Peserta' || req.user.role_id === 1) && req.user.user_id !== targetUserId) {
      return res.status(403).json({ success: false, message: 'Akses dilarang. Anda hanya dapat melihat progres Anda sendiri.' });
    }

    // Coordinator isolation: Koordinator can only view their assigned participants
    if (req.user.role === 'Koordinator' || req.user.role_id === 2) {
      if (req.user.user_id !== targetUserId) {
        const check = await query(`SELECT coordinator_id FROM users WHERE user_id = $1`, [targetUserId]);
        if (check.rows.length === 0 || check.rows[0].coordinator_id !== req.user.user_id) {
          return res.status(403).json({ success: false, message: 'Akses dilarang. Peserta ini tidak berada di bawah bimbingan Anda.' });
        }
      }
    }

    const result = await query(`SELECT * FROM progress WHERE user_id = $1 LIMIT 1`, [targetUserId]);
    return res.json({
      success: true,
      data: result.rows[0] || null
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PUT /api/users/:id/progress
 */
router.put('/:id/progress', authenticateToken, requireRole('Koordinator', 'Administrator'), async (req, res) => {
  try {
    const { id } = req.params;
    const targetUserId = parseInt(id, 10);
    if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
      return res.status(400).json({ success: false, message: 'ID pengguna tidak valid.' });
    }

    // Coordinator isolation: Verify mentee belongs to this coordinator
    if (req.user.role === 'Koordinator' || req.user.role_id === 2) {
      const check = await query(`SELECT coordinator_id FROM users WHERE user_id = $1`, [targetUserId]);
      if (check.rows.length === 0 || check.rows[0].coordinator_id !== req.user.user_id) {
        return res.status(403).json({ success: false, message: 'Akses dilarang. Anda hanya dapat memperbarui progres anak didik Anda sendiri.' });
      }
    }

    const {
      kunjungan_bpu,
      hasil_akuisisi_bpu,
      kunjungan_pu,
      video_viralisasi,
      kehadiran_seminar,
      kehadiran_sosialisasi,
      total_poin,
      nilai,
      grade
    } = req.body;

    const prevProgressRes = await query(`SELECT * FROM progress WHERE user_id = $1 LIMIT 1`, [targetUserId]);
    const prevProgress = prevProgressRes.rows[0] || {};

    const result = await query(
      `INSERT INTO progress (user_id, kunjungan_bpu, hasil_akuisisi_bpu, kunjungan_pu, video_viralisasi, kehadiran_seminar, kehadiran_sosialisasi, total_poin, nilai, grade, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id) DO UPDATE SET
         kunjungan_bpu = EXCLUDED.kunjungan_bpu,
         hasil_akuisisi_bpu = EXCLUDED.hasil_akuisisi_bpu,
         kunjungan_pu = EXCLUDED.kunjungan_pu,
         video_viralisasi = EXCLUDED.video_viralisasi,
         kehadiran_seminar = EXCLUDED.kehadiran_seminar,
         kehadiran_sosialisasi = EXCLUDED.kehadiran_sosialisasi,
         total_poin = EXCLUDED.total_poin,
         nilai = EXCLUDED.nilai,
         grade = EXCLUDED.grade,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [targetUserId, kunjungan_bpu || 0, hasil_akuisisi_bpu || 0, kunjungan_pu || 0, video_viralisasi || 0, kehadiran_seminar || 0, kehadiran_sosialisasi || 0, total_poin || 0, nilai || 0, grade || 'E']
    );

    const progressChanges = buildFieldChanges(prevProgress, result.rows[0], [
      { key: 'nilai', label: 'Nilai Akhir', type: 'number' },
      { key: 'grade', label: 'Grade' },
      { key: 'kunjungan_bpu', label: 'Kunjungan BPU', type: 'number' },
      { key: 'hasil_akuisisi_bpu', label: 'Akuisisi BPU', type: 'number' },
      { key: 'kunjungan_pu', label: 'Kunjungan PU', type: 'number' },
      { key: 'video_viralisasi', label: 'Video Viralisasi', type: 'number' },
      { key: 'kehadiran_seminar', label: 'Seminar', type: 'number' },
      { key: 'kehadiran_sosialisasi', label: 'Sosialisasi', type: 'number' }
    ]);

    await logEntityChange({
      req,
      targetUserId,
      action: 'PROGRESS_UPDATED',
      verb: 'memperbarui',
      entityLabel: 'Progres & Penilaian Tugas',
      changes: progressChanges
    });

    return res.json({ success: true, message: 'Progress updated', data: result.rows[0] });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/users/:id
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const targetId = parseInt(id, 10);
    if (!Number.isInteger(targetId) || targetId <= 0) {
      return res.status(400).json({ success: false, message: 'ID pengguna tidak valid.' });
    }

    // IDOR Protection:
    // If Peserta, can ONLY view own user profile
    if ((req.user.role === 'Peserta' || req.user.role_id === 1) && targetId !== req.user.user_id) {
      return res.status(403).json({ success: false, message: 'Akses dilarang. Anda hanya dapat melihat profil Anda sendiri.' });
    }

    // If Koordinator, can only view own profile or their assigned participants
    if (req.user.role === 'Koordinator' || req.user.role_id === 2) {
      if (targetId !== req.user.user_id) {
        const check = await query(`SELECT coordinator_id FROM users WHERE user_id = $1`, [targetId]);
        if (check.rows.length === 0 || check.rows[0].coordinator_id !== req.user.user_id) {
          return res.status(403).json({ success: false, message: 'Akses dilarang. Anda hanya dapat melihat anak didik Anda sendiri.' });
        }
      }
    }

    const result = await query(
      `SELECT u.user_id, u.unique_id, u.full_name, u.role_id, u.coordinator_id, u.status, u.penempatan,
              u.created_at, u.updated_at, r.role_name, c.full_name AS coordinator_name
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.role_id
       LEFT JOIN users c ON u.coordinator_id = c.user_id
       WHERE u.user_id = $1`,
      [targetId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan.' });
    }

    return res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PUT /api/users/:id
 */
router.put('/:id', authenticateToken, requireRole('Administrator'), async (req, res) => {
  try {
    const { id } = req.params;
    const { unique_id, full_name, password, role_id, coordinator_id, status, penempatan } = req.body;

    const prevUserRes = await query(
      `SELECT u.user_id, u.unique_id, u.full_name, u.role_id, u.coordinator_id, u.status, u.penempatan, r.role_name
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.role_id
       WHERE u.user_id = $1`,
      [id]
    );
    if (prevUserRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const prevUser = prevUserRes.rows[0];

    let updateFields = [
      'full_name = COALESCE($1, full_name)',
      'status = COALESCE($2, status)',
      'penempatan = COALESCE($3, penempatan)',
      'role_id = COALESCE($4, role_id)',
      'coordinator_id = $5',
      'updated_at = CURRENT_TIMESTAMP'
    ];
    const normalizedPenempatan = normalizePenempatan(penempatan);
    const normalizedStatus = normalizeUserStatus(status, null);
    let params = [full_name, normalizedStatus, normalizedPenempatan, role_id, coordinator_id ? parseInt(coordinator_id, 10) : null];

    if (unique_id) {
      params.push(unique_id);
      updateFields.push(`unique_id = $${params.length}`);
    }

    const passwordChanged = Boolean(password && password.trim().length > 0);
    if (passwordChanged) {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(password, salt);
      params.push(hash);
      updateFields.push(`password_hash = $${params.length}`);
    }

    params.push(id);

    const result = await query(
      `UPDATE users 
       SET ${updateFields.join(', ')}
       WHERE user_id = $${params.length}
       RETURNING user_id, unique_id, full_name, role_id, coordinator_id, status, penempatan, updated_at`,
      params
    );

    const afterRoleRes = await query(`SELECT role_name FROM roles WHERE role_id = $1`, [result.rows[0].role_id]).catch(() => ({ rows: [] }));
    const afterUser = {
      ...result.rows[0],
      role_name: afterRoleRes.rows[0]?.role_name || String(result.rows[0].role_id)
    };

    const userChanges = buildFieldChanges(prevUser, afterUser, [
      { key: 'full_name', label: 'Nama Lengkap' },
      { key: 'unique_id', label: 'ID / NIP / NPP' },
      { key: 'role_name', label: 'Peran' },
      { key: 'status', label: 'Status Akun' },
      { key: 'penempatan', label: 'Penempatan' },
      { key: 'coordinator_id', label: 'ID Pembimbing', type: 'number' }
    ]);
    if (passwordChanged) {
      userChanges.push({ label: 'Kata Sandi', from: 'Lama', to: 'Diperbarui' });
    }

    await logEntityChange({
      req,
      targetUser: {
        user_id: afterUser.user_id,
        full_name: afterUser.full_name,
        unique_id: afterUser.unique_id
      },
      targetRoleWord: 'pengguna',
      action: 'USER_UPDATED',
      verb: 'mengubah',
      entityLabel: 'Data Akun Pengguna',
      changes: userChanges
    });

    return res.json({
      success: true,
      message: 'Data pengguna berhasil diperbarui.',
      data: result.rows[0]
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * DELETE /api/users/:id
 */
router.delete('/:id', authenticateToken, requireRole('Administrator'), async (req, res) => {
  try {
    const { id } = req.params;

    if (parseInt(id, 10) === req.user.user_id) {
      return res.status(400).json({ success: false, message: 'Anda tidak dapat menghapus akun Anda sendiri.' });
    }

    const userToDelete = await query(
      `SELECT u.user_id, u.full_name, u.unique_id, u.status, u.penempatan, r.role_name
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.role_id
       WHERE u.user_id = $1`,
      [id]
    );
    const targetDeleted = userToDelete.rows[0] || { user_id: id, full_name: String(id), unique_id: '' };

    await query(`DELETE FROM users WHERE user_id = $1`, [id]);

    await logEntityChange({
      req,
      targetUser: targetDeleted,
      targetRoleWord: 'pengguna',
      action: 'USER_DELETED',
      verb: 'menghapus',
      entityLabel: 'Akun Pengguna',
      changes: [{ label: 'Status Akun', from: targetDeleted.status || 'Aktif', to: 'DIHAPUS' }]
    });

    return res.json({
      success: true,
      message: 'Pengguna berhasil dihapus.'
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
