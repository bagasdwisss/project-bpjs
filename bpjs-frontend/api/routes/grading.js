// api/routes/grading.js
import { Router } from 'express';
import { query } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// Grading formula calculation helper
const calculateGrade = (p) => {
  const k_bpu = Math.min(100, ((p.kunjungan_bpu || 0) / 30) * 100);
  const a_bpu = Math.min(100, ((p.hasil_akuisisi_bpu || 0) / 20) * 100);
  const k_pu = Math.min(100, ((p.kunjungan_pu || 0) / 7) * 100);
  const video = Math.min(100, ((p.video_viralisasi || 0) / 1) * 100);
  const seminar = Math.min(100, ((p.kehadiran_seminar || 0) / 2) * 100);
  const sosialisasi = Math.min(100, ((p.kehadiran_sosialisasi || 0) / 1) * 100);

  const finalScore = Math.round(
    (a_bpu * 0.30) +
    (k_bpu * 0.20) +
    (k_pu * 0.15) +
    (video * 0.15) +
    (seminar * 0.10) +
    (sosialisasi * 0.10)
  );

  let grade = 'E';
  if (finalScore >= 85) grade = 'A';
  else if (finalScore >= 75) grade = 'B';
  else if (finalScore >= 65) grade = 'C';
  else if (finalScore >= 50) grade = 'D';

  return { finalScore, grade };
};

/**
 * GET /api/grading/configuration
 */
router.get('/configuration', authenticateToken, (req, res) => {
  return res.json({
    success: true,
    data: {
      targets: {
        max_kunjungan_bpu: 30,
        max_akuisisi_bpu: 20,
        max_kunjungan_pu: 7,
        target_video: 1,
        target_seminar: 2,
        target_sosialisasi: 1
      },
      weights: {
        akuisisi_bpu: 0.30,
        kunjungan_bpu: 0.20,
        kunjungan_pu: 0.15,
        video: 0.15,
        seminar: 0.10,
        sosialisasi: 0.10
      }
    }
  });
});

/**
 * GET /api/grading/coordinators
 */
router.get('/coordinators', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT user_id, unique_id, full_name 
       FROM users 
       WHERE role_id = 2 AND status = 'Aktif'
       ORDER BY full_name ASC`
    );

    return res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/grading/participants/without-progress
 */
router.get('/participants/without-progress', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT u.user_id, u.unique_id, u.full_name, u.coordinator_id, c.full_name AS coordinator_name
       FROM users u
       LEFT JOIN progress p ON u.user_id = p.user_id
       LEFT JOIN users c ON u.coordinator_id = c.user_id
       WHERE u.role_id = 1 AND p.id IS NULL
       ORDER BY u.full_name ASC`
    );

    return res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/grading/participants/create-progress
 */
router.post('/participants/create-progress', authenticateToken, async (req, res) => {
  try {
    const { user_id, kunjungan_bpu, hasil_akuisisi_bpu, kunjungan_pu, video_viralisasi, kehadiran_seminar, kehadiran_sosialisasi } = req.body;

    if (!user_id) {
      return res.status(400).json({ success: false, message: 'user_id is required' });
    }

    const { finalScore, grade } = calculateGrade(req.body);

    const result = await query(
      `INSERT INTO progress (user_id, kunjungan_bpu, hasil_akuisisi_bpu, kunjungan_pu, video_viralisasi, kehadiran_seminar, kehadiran_sosialisasi, total_poin, nilai, grade, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [
        user_id,
        kunjungan_bpu || 0,
        hasil_akuisisi_bpu || 0,
        kunjungan_pu || 0,
        video_viralisasi || 0,
        kehadiran_seminar || 0,
        kehadiran_sosialisasi || 0,
        finalScore,
        finalScore,
        grade
      ]
    );

    return res.json({
      success: true,
      message: 'Progress record created successfully',
      data: result.rows[0]
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/grading/participants
 */
router.get('/participants', authenticateToken, async (req, res) => {
  try {
    const { coordinator_id, search } = req.query;

    let sql = `
      SELECT 
        p.id AS progress_id,
        u.user_id,
        u.unique_id,
        u.full_name,
        u.coordinator_id,
        c.full_name AS coordinator_name,
        u.status,
        u.penempatan,
        COALESCE(p.kunjungan_bpu, 0) AS kunjungan_bpu,
        COALESCE(p.hasil_akuisisi_bpu, 0) AS hasil_akuisisi_bpu,
        COALESCE(p.kunjungan_pu, 0) AS kunjungan_pu,
        COALESCE(p.video_viralisasi, 0) AS video_viralisasi,
        COALESCE(p.kehadiran_seminar, 0) AS kehadiran_seminar,
        COALESCE(p.kehadiran_sosialisasi, 0) AS kehadiran_sosialisasi,
        COALESCE(p.total_poin, 0) AS total_poin,
        COALESCE(p.nilai, 0) AS nilai,
        COALESCE(p.grade, 'E') AS grade,
        p.updated_at
      FROM users u
      LEFT JOIN progress p ON u.user_id = p.user_id
      LEFT JOIN users c ON u.coordinator_id = c.user_id
      WHERE u.role_id = 1
    `;

    const params = [];
    if (coordinator_id) {
      params.push(coordinator_id);
      sql += ` AND u.coordinator_id = $${params.length}`;
    }

    if (search) {
      params.push(`%${search.toLowerCase()}%`);
      sql += ` AND (LOWER(u.full_name) LIKE $${params.length} OR LOWER(u.unique_id) LIKE $${params.length})`;
    }

    sql += ` ORDER BY u.full_name ASC`;

    const result = await query(sql, params);

    return res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Grading participants error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/grading/participants/:progressId
 */
router.get('/participants/:progressId', authenticateToken, async (req, res) => {
  try {
    const { progressId } = req.params;

    const result = await query(
      `SELECT 
        p.id AS progress_id,
        u.user_id,
        u.unique_id,
        u.full_name,
        u.coordinator_id,
        c.full_name AS coordinator_name,
        u.status,
        u.penempatan,
        p.*
       FROM progress p
       JOIN users u ON p.user_id = u.user_id
       LEFT JOIN users c ON u.coordinator_id = c.user_id
       WHERE p.id = $1 OR u.user_id = $1`,
      [progressId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Participant progress not found' });
    }

    return res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PUT /api/grading/participants/:progressId/progress
 */
router.put('/participants/:progressId/progress', authenticateToken, async (req, res) => {
  try {
    const { progressId } = req.params;
    const {
      kunjungan_bpu,
      hasil_akuisisi_bpu,
      kunjungan_pu,
      video_viralisasi,
      kehadiran_seminar,
      kehadiran_sosialisasi
    } = req.body;

    const { finalScore, grade } = calculateGrade(req.body);

    const result = await query(
      `UPDATE progress
       SET kunjungan_bpu = COALESCE($1, kunjungan_bpu),
           hasil_akuisisi_bpu = COALESCE($2, hasil_akuisisi_bpu),
           kunjungan_pu = COALESCE($3, kunjungan_pu),
           video_viralisasi = COALESCE($4, video_viralisasi),
           kehadiran_seminar = COALESCE($5, kehadiran_seminar),
           kehadiran_sosialisasi = COALESCE($6, kehadiran_sosialisasi),
           total_poin = $7,
           nilai = $8,
           grade = $9,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $10 OR user_id = $10
       RETURNING *`,
      [
        kunjungan_bpu,
        hasil_akuisisi_bpu,
        kunjungan_pu,
        video_viralisasi,
        kehadiran_seminar,
        kehadiran_sosialisasi,
        finalScore,
        finalScore,
        grade,
        progressId
      ]
    );

    return res.json({
      success: true,
      message: 'Progress updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PUT /api/grading/participants/:progressId/scores
 */
router.put('/participants/:progressId/scores', authenticateToken, async (req, res) => {
  try {
    const { progressId } = req.params;
    const { nilai, grade } = req.body;

    const result = await query(
      `UPDATE progress
       SET nilai = COALESCE($1, nilai),
           grade = COALESCE($2, grade),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 OR user_id = $3
       RETURNING *`,
      [nilai, grade, progressId]
    );

    return res.json({
      success: true,
      message: 'Scores updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
