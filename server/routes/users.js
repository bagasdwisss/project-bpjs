// api/routes/users.js
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { logActivity } from '../utils/logger.js';

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

    // Coordinator Isolation: A coordinator may ONLY view participants under their own guidance
    if (req.user.role === 'Koordinator' || req.user.role_id === 2) {
      if (!role_id || parseInt(role_id, 10) === 1) {
        params.push(req.user.user_id);
        sql += ` AND u.coordinator_id = $${params.length} AND u.role_id = 1`;
      }
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

    const result = await query(
      `INSERT INTO users (unique_id, full_name, password_hash, role_id, coordinator_id, status, penempatan, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, COALESCE($6, 'Aktif'), $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING user_id, unique_id, full_name, role_id, coordinator_id, status, penempatan, created_at`,
      [unique_id.trim(), full_name.trim(), passwordHash, role_id, coordinator_id || null, status, penempatan || null]
    );

    // If role is Peserta, initialize empty progress entry
    if (parseInt(role_id, 10) === 1) {
      await query(
        `INSERT INTO progress (user_id, created_at, updated_at) VALUES ($1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT DO NOTHING`,
        [result.rows[0].user_id]
      );
    }

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
      const uId = u.unique_id || u.UniqueID || u.NIK;
      const fName = u.full_name || u.FullName || u.Nama;
      const roleId = u.role_id || (u.Role === 'Koordinator' ? 2 : u.Role === 'Administrator' ? 3 : 1);
      const coordId = u.coordinator_id || null;
      const status = u.status || 'Aktif';
      const penempatan = u.penempatan || null;

      if (uId && fName) {
        await query(
          `INSERT INTO users (unique_id, full_name, password_hash, role_id, coordinator_id, status, penempatan, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
           ON CONFLICT (unique_id) DO UPDATE SET 
             full_name = EXCLUDED.full_name,
             role_id = EXCLUDED.role_id,
             coordinator_id = EXCLUDED.coordinator_id,
             status = EXCLUDED.status,
             penempatan = EXCLUDED.penempatan,
             updated_at = CURRENT_TIMESTAMP`,
          [uId.trim(), fName.trim(), defaultHash, roleId, coordId, status, penempatan]
        );
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
 * GET /api/users/by-coordinator/:coordinatorId
 */
router.get('/by-coordinator/:coordinatorId', authenticateToken, async (req, res) => {
  try {
    const { coordinatorId } = req.params;
    const result = await query(
      `SELECT u.user_id, u.unique_id, u.full_name, u.role_id, u.coordinator_id, u.status, u.penempatan,
              p.hasil_akuisisi_bpu, p.kunjungan_bpu, p.kunjungan_pu, p.total_poin, p.nilai, p.grade
       FROM users u
       LEFT JOIN progress p ON u.user_id = p.user_id
       WHERE u.coordinator_id = $1 AND u.role_id = 1
       ORDER BY u.full_name ASC`,
      [coordinatorId]
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
    const result = await query(`
      SELECT user_id, hasil_akuisisi_bpu, kunjungan_bpu, kunjungan_pu, 
             video_viralisasi, kehadiran_seminar, kehadiran_sosialisasi, 
             total_poin, nilai, grade, updated_at
      FROM progress
    `);
    
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
 * GET /api/users/:id/progress
 */
router.get('/:id/progress', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(`SELECT * FROM progress WHERE user_id = $1 OR id = $1 LIMIT 1`, [id]);
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
router.put('/:id/progress', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
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

    const result = await query(
      `INSERT INTO progress (user_id, kunjungan_bpu, hasil_akuisisi_bpu, kunjungan_pu, video_viralisasi, kehadiran_seminar, kehadiran_sosialisasi, total_poin, nilai, grade, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT (id) DO UPDATE SET
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
      [id, kunjungan_bpu || 0, hasil_akuisisi_bpu || 0, kunjungan_pu || 0, video_viralisasi || 0, kehadiran_seminar || 0, kehadiran_sosialisasi || 0, total_poin || 0, nilai || 0, grade || 'E']
    );

    await logActivity({
      userId: req.user.user_id,
      type: 'PROGRESS_UPDATED',
      details: `Memperbarui progres & nilai tugas peserta ID #${id} (Nilai: ${nilai || 0}, Grade: ${grade || '-'})`,
      ip: req.ip,
      userAgent: req.headers['user-agent']
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
    const result = await query(
      `SELECT u.user_id, u.unique_id, u.full_name, u.role_id, u.coordinator_id, u.status, u.penempatan,
              u.created_at, u.updated_at, r.role_name, c.full_name AS coordinator_name
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.role_id
       LEFT JOIN users c ON u.coordinator_id = c.user_id
       WHERE u.user_id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PUT /api/users/:id
 */
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { unique_id, full_name, password, role_id, coordinator_id, status, penempatan } = req.body;

    let updateFields = [
      'full_name = COALESCE($1, full_name)',
      'status = COALESCE($2, status)',
      'penempatan = COALESCE($3, penempatan)',
      'role_id = COALESCE($4, role_id)',
      'coordinator_id = $5',
      'updated_at = CURRENT_TIMESTAMP'
    ];
    let params = [full_name, status, penempatan, role_id, coordinator_id ? parseInt(coordinator_id, 10) : null];

    if (unique_id) {
      params.push(unique_id);
      updateFields.push(`unique_id = $${params.length}`);
    }

    if (password && password.trim().length > 0) {
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

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await logActivity({
      userId: req.user.user_id,
      type: 'USER_UPDATED',
      details: `Memperbarui data akun pengguna: ${result.rows[0].full_name} (${result.rows[0].unique_id})`,
      ip: req.ip,
      userAgent: req.headers['user-agent']
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

    const userToDelete = await query(`SELECT full_name, unique_id FROM users WHERE user_id = $1`, [id]);
    const deletedName = userToDelete.rows[0]?.full_name || id;
    const deletedUniqueId = userToDelete.rows[0]?.unique_id || '';

    await query(`DELETE FROM users WHERE user_id = $1`, [id]);

    await logActivity({
      userId: req.user.user_id,
      type: 'USER_DELETED',
      details: `Menghapus akun pengguna: ${deletedName} (${deletedUniqueId})`,
      ip: req.ip,
      userAgent: req.headers['user-agent']
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
