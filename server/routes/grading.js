import { Router } from 'express';
import { query } from '../db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { logActivity } from '../utils/logger.js';

const router = Router();

// Helper to retrieve active grading settings from database
const getGradingSettings = async () => {
  try {
    const res = await query(`SELECT * FROM grading_settings ORDER BY id ASC LIMIT 1`);
    if (res.rows.length > 0) return res.rows[0];
  } catch (e) {
    console.warn('Could not fetch grading_settings, using defaults:', e);
  }
  return {
    target_kunjungan_bpu: 30,
    target_akuisisi_bpu: 20,
    target_kunjungan_pu: 7,
    target_video: 1,
    target_seminar: 2,
    target_sosialisasi: 1,
    weight_akuisisi_bpu: 0.30,
    weight_kunjungan_bpu: 0.20,
    weight_kunjungan_pu: 0.15,
    weight_video: 0.15,
    weight_seminar: 0.10,
    weight_sosialisasi: 0.10,
    grade_a_cutoff: 85,
    grade_b_cutoff: 75,
    grade_c_cutoff: 65,
    grade_d_cutoff: 50
  };
};

// Dynamic grading formula calculation helper
const calculateGrade = (p, s = {}) => {
  const t_kbpu = parseInt(s.target_kunjungan_bpu, 10) || 30;
  const t_abpu = parseInt(s.target_akuisisi_bpu, 10) || 20;
  const t_kpu = parseInt(s.target_kunjungan_pu, 10) || 7;
  const t_vid = parseInt(s.target_video, 10) || 1;
  const t_sem = parseInt(s.target_seminar, 10) || 2;
  const t_sos = parseInt(s.target_sosialisasi, 10) || 1;

  const k_bpu = Math.min(100, ((p.kunjungan_bpu || 0) / t_kbpu) * 100);
  const a_bpu = Math.min(100, ((p.hasil_akuisisi_bpu || 0) / t_abpu) * 100);
  const k_pu = Math.min(100, ((p.kunjungan_pu || 0) / t_kpu) * 100);
  const video = Math.min(100, ((p.video_viralisasi || 0) / t_vid) * 100);
  const seminar = Math.min(100, ((p.kehadiran_seminar || 0) / t_sem) * 100);
  const sosialisasi = Math.min(100, ((p.kehadiran_sosialisasi || 0) / t_sos) * 100);

  const w_abpu = parseFloat(s.weight_akuisisi_bpu) || 0.30;
  const w_kbpu = parseFloat(s.weight_kunjungan_bpu) || 0.20;
  const w_kpu = parseFloat(s.weight_kunjungan_pu) || 0.15;
  const w_vid = parseFloat(s.weight_video) || 0.15;
  const w_sem = parseFloat(s.weight_seminar) || 0.10;
  const w_sos = parseFloat(s.weight_sosialisasi) || 0.10;

  const finalScore = Math.round(
    (a_bpu * w_abpu) +
    (k_bpu * w_kbpu) +
    (k_pu * w_kpu) +
    (video * w_vid) +
    (seminar * w_sem) +
    (sosialisasi * w_sos)
  );

  const c_a = parseInt(s.grade_a_cutoff, 10) || 85;
  const c_b = parseInt(s.grade_b_cutoff, 10) || 75;
  const c_c = parseInt(s.grade_c_cutoff, 10) || 65;
  const c_d = parseInt(s.grade_d_cutoff, 10) || 50;

  let grade = 'E';
  if (finalScore >= c_a) grade = 'A';
  else if (finalScore >= c_b) grade = 'B';
  else if (finalScore >= c_c) grade = 'C';
  else if (finalScore >= c_d) grade = 'D';

  return { finalScore, grade };
};

/**
 * GET /api/grading/configuration
 */
router.get('/configuration', authenticateToken, async (req, res) => {
  try {
    const s = await getGradingSettings();
    return res.json({
      success: true,
      data: {
        targets: {
          max_kunjungan_bpu: parseInt(s.target_kunjungan_bpu, 10) || 30,
          max_akuisisi_bpu: parseInt(s.target_akuisisi_bpu, 10) || 20,
          max_kunjungan_pu: parseInt(s.target_kunjungan_pu, 10) || 7,
          target_video: parseInt(s.target_video, 10) || 1,
          target_seminar: parseInt(s.target_seminar, 10) || 2,
          target_sosialisasi: parseInt(s.target_sosialisasi, 10) || 1
        },
        weights: {
          akuisisi_bpu: parseFloat(s.weight_akuisisi_bpu) || 0.30,
          kunjungan_bpu: parseFloat(s.weight_kunjungan_bpu) || 0.20,
          kunjungan_pu: parseFloat(s.weight_kunjungan_pu) || 0.15,
          video: parseFloat(s.weight_video) || 0.15,
          seminar: parseFloat(s.weight_seminar) || 0.10,
          sosialisasi: parseFloat(s.weight_sosialisasi) || 0.10
        },
        cutoffs: {
          grade_a: parseInt(s.grade_a_cutoff, 10) || 85,
          grade_b: parseInt(s.grade_b_cutoff, 10) || 75,
          grade_c: parseInt(s.grade_c_cutoff, 10) || 65,
          grade_d: parseInt(s.grade_d_cutoff, 10) || 50
        },
        raw: s
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PUT /api/grading/configuration
 * Update grading targets and percentage weights dynamically
 */
router.put('/configuration', authenticateToken, requireRole('Koordinator', 'Administrator'), async (req, res) => {
  try {
    const {
      target_kunjungan_bpu,
      target_akuisisi_bpu,
      target_kunjungan_pu,
      target_video,
      target_seminar,
      target_sosialisasi,
      weight_akuisisi_bpu,
      weight_kunjungan_bpu,
      weight_kunjungan_pu,
      weight_video,
      weight_seminar,
      weight_sosialisasi,
      grade_a_cutoff,
      grade_b_cutoff,
      grade_c_cutoff,
      grade_d_cutoff
    } = req.body;

    const result = await query(
      `UPDATE grading_settings
       SET target_kunjungan_bpu = COALESCE($1, target_kunjungan_bpu),
           target_akuisisi_bpu = COALESCE($2, target_akuisisi_bpu),
           target_kunjungan_pu = COALESCE($3, target_kunjungan_pu),
           target_video = COALESCE($4, target_video),
           target_seminar = COALESCE($5, target_seminar),
           target_sosialisasi = COALESCE($6, target_sosialisasi),
           weight_akuisisi_bpu = COALESCE($7, weight_akuisisi_bpu),
           weight_kunjungan_bpu = COALESCE($8, weight_kunjungan_bpu),
           weight_kunjungan_pu = COALESCE($9, weight_kunjungan_pu),
           weight_video = COALESCE($10, weight_video),
           weight_seminar = COALESCE($11, weight_seminar),
           weight_sosialisasi = COALESCE($12, weight_sosialisasi),
           grade_a_cutoff = COALESCE($13, grade_a_cutoff),
           grade_b_cutoff = COALESCE($14, grade_b_cutoff),
           grade_c_cutoff = COALESCE($15, grade_c_cutoff),
           grade_d_cutoff = COALESCE($16, grade_d_cutoff),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = 1
       RETURNING *`,
      [
        target_kunjungan_bpu,
        target_akuisisi_bpu,
        target_kunjungan_pu,
        target_video,
        target_seminar,
        target_sosialisasi,
        weight_akuisisi_bpu,
        weight_kunjungan_bpu,
        weight_kunjungan_pu,
        weight_video,
        weight_seminar,
        weight_sosialisasi,
        grade_a_cutoff,
        grade_b_cutoff,
        grade_c_cutoff,
        grade_d_cutoff
      ]
    );

    await logActivity(
      req.user.user_id,
      'UPDATE_GRADING_SETTINGS',
      `Memperbarui bobot & target penilaian: target BPU ${target_akuisisi_bpu || 'tetap'}`,
      req.ip || '127.0.0.1',
      false,
      req.headers['user-agent'] || null
    );

    return res.json({
      success: true,
      message: 'Konfigurasi target dan bobot penilaian berhasil diperbarui!',
      data: result.rows[0]
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
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
      data: { coordinators: result.rows },
      coordinators: result.rows
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
    let sql = `
      SELECT u.user_id, u.unique_id, u.full_name, u.coordinator_id, c.full_name AS coordinator_name
      FROM users u
      LEFT JOIN progress p ON u.user_id = p.user_id
      LEFT JOIN users c ON u.coordinator_id = c.user_id
      WHERE u.role_id = 1 AND p.id IS NULL
    `;
    const params = [];
    if (req.user.role === 'Koordinator' || req.user.role_id === 2) {
      params.push(req.user.user_id);
      sql += ` AND u.coordinator_id = $${params.length}`;
    }
    sql += ` ORDER BY u.full_name ASC`;

    const result = await query(sql, params);

    return res.json({
      success: true,
      data: { participants: result.rows },
      participants: result.rows
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/grading/participants/create-progress
 */
router.post('/participants/create-progress', authenticateToken, requireRole('Koordinator', 'Administrator'), async (req, res) => {
  try {
    const { user_id, kunjungan_bpu, hasil_akuisisi_bpu, kunjungan_pu, video_viralisasi, kehadiran_seminar, kehadiran_sosialisasi } = req.body;

    if (!user_id) {
      return res.status(400).json({ success: false, message: 'user_id is required' });
    }

    // Coordinator isolation: verify student belongs to this coordinator
    if (req.user.role === 'Koordinator' || req.user.role_id === 2) {
      const check = await query(`SELECT coordinator_id FROM users WHERE user_id = $1`, [user_id]);
      if (check.rows.length === 0 || check.rows[0].coordinator_id !== req.user.user_id) {
        return res.status(403).json({ success: false, message: 'Akses dilarang. Anda hanya dapat menilai anak didik Anda sendiri.' });
      }
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

    await logActivity({
      userId: req.user.user_id,
      type: 'GRADING_SAVED',
      details: `Menyimpan penilaian peserta ID #${user_id} (Nilai: ${finalScore}, Grade: ${grade})`,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

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
    if (req.user.role === 'Koordinator' || req.user.role_id === 2) {
      params.push(req.user.user_id);
      sql += ` AND u.coordinator_id = $${params.length}`;
    } else if (coordinator_id) {
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
      data: { participants: result.rows },
      participants: result.rows
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
router.put('/participants/:progressId/progress', authenticateToken, requireRole('Koordinator', 'Administrator'), async (req, res) => {
  try {
    const { progressId } = req.params;

    // Coordinator isolation: verify student belongs to this coordinator
    if (req.user.role === 'Koordinator' || req.user.role_id === 2) {
      const check = await query(
        `SELECT u.coordinator_id 
         FROM progress p 
         JOIN users u ON p.user_id = u.user_id 
         WHERE p.id = $1 OR p.user_id = $1`, 
        [progressId]
      );
      if (check.rows.length === 0 || check.rows[0].coordinator_id !== req.user.user_id) {
        return res.status(403).json({ success: false, message: 'Akses dilarang. Anda hanya dapat menilai anak didik Anda sendiri.' });
      }
    }

    const {
      kunjungan_bpu,
      hasil_akuisisi_bpu,
      kunjungan_pu,
      video_viralisasi,
      kehadiran_seminar,
      kehadiran_sosialisasi
    } = req.body;

    const settings = await getGradingSettings();
    const { finalScore, grade } = calculateGrade(req.body, settings);

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
router.put('/participants/:progressId/scores', authenticateToken, requireRole('Koordinator', 'Administrator'), async (req, res) => {
  try {
    const { progressId } = req.params;

    // Coordinator isolation: verify student belongs to this coordinator
    if (req.user.role === 'Koordinator' || req.user.role_id === 2) {
      const check = await query(
        `SELECT u.coordinator_id 
         FROM progress p 
         JOIN users u ON p.user_id = u.user_id 
         WHERE p.id = $1 OR p.user_id = $1`, 
        [progressId]
      );
      if (check.rows.length === 0 || check.rows[0].coordinator_id !== req.user.user_id) {
        return res.status(403).json({ success: false, message: 'Akses dilarang. Anda hanya dapat menilai anak didik Anda sendiri.' });
      }
    }

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
