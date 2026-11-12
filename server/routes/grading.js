import { Router } from 'express';
import { query } from '../db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { logActivity } from '../utils/logger.js';
import { buildFieldChanges, logEntityChange } from '../utils/auditFormatter.js';

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

    const normWeight = (v) => {
      if (v === undefined || v === null || v === '') return null;
      const n = Number(v);
      if (!Number.isFinite(n)) return null;
      return n > 1 ? Number((n / 100).toFixed(4)) : n;
    };
    const normInt = (v) => {
      if (v === undefined || v === null || v === '') return null;
      const n = parseInt(v, 10);
      return Number.isFinite(n) ? n : null;
    };

    const result = await query(
      `INSERT INTO grading_settings (
         id, target_kunjungan_bpu, target_akuisisi_bpu, target_kunjungan_pu,
         target_video, target_seminar, target_sosialisasi,
         weight_akuisisi_bpu, weight_kunjungan_bpu, weight_kunjungan_pu,
         weight_video, weight_seminar, weight_sosialisasi,
         grade_a_cutoff, grade_b_cutoff, grade_c_cutoff, grade_d_cutoff, updated_at
       )
       VALUES (
         1,
         COALESCE($1::int, 30), COALESCE($2::int, 20), COALESCE($3::int, 7),
         COALESCE($4::int, 1), COALESCE($5::int, 2), COALESCE($6::int, 1),
         COALESCE($7::numeric, 0.30), COALESCE($8::numeric, 0.20), COALESCE($9::numeric, 0.15),
         COALESCE($10::numeric, 0.15), COALESCE($11::numeric, 0.10), COALESCE($12::numeric, 0.10),
         COALESCE($13::int, 85), COALESCE($14::int, 75), COALESCE($15::int, 65), COALESCE($16::int, 50),
         CURRENT_TIMESTAMP
       )
       ON CONFLICT (id) DO UPDATE SET
         target_kunjungan_bpu = COALESCE($1::int, grading_settings.target_kunjungan_bpu),
         target_akuisisi_bpu = COALESCE($2::int, grading_settings.target_akuisisi_bpu),
         target_kunjungan_pu = COALESCE($3::int, grading_settings.target_kunjungan_pu),
         target_video = COALESCE($4::int, grading_settings.target_video),
         target_seminar = COALESCE($5::int, grading_settings.target_seminar),
         target_sosialisasi = COALESCE($6::int, grading_settings.target_sosialisasi),
         weight_akuisisi_bpu = COALESCE($7::numeric, grading_settings.weight_akuisisi_bpu),
         weight_kunjungan_bpu = COALESCE($8::numeric, grading_settings.weight_kunjungan_bpu),
         weight_kunjungan_pu = COALESCE($9::numeric, grading_settings.weight_kunjungan_pu),
         weight_video = COALESCE($10::numeric, grading_settings.weight_video),
         weight_seminar = COALESCE($11::numeric, grading_settings.weight_seminar),
         weight_sosialisasi = COALESCE($12::numeric, grading_settings.weight_sosialisasi),
         grade_a_cutoff = COALESCE($13::int, grading_settings.grade_a_cutoff),
         grade_b_cutoff = COALESCE($14::int, grading_settings.grade_b_cutoff),
         grade_c_cutoff = COALESCE($15::int, grading_settings.grade_c_cutoff),
         grade_d_cutoff = COALESCE($16::int, grading_settings.grade_d_cutoff),
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [
        normInt(target_kunjungan_bpu),
        normInt(target_akuisisi_bpu),
        normInt(target_kunjungan_pu),
        normInt(target_video),
        normInt(target_seminar),
        normInt(target_sosialisasi),
        normWeight(weight_akuisisi_bpu),
        normWeight(weight_kunjungan_bpu),
        normWeight(weight_kunjungan_pu),
        normWeight(weight_video),
        normWeight(weight_seminar),
        normWeight(weight_sosialisasi),
        normInt(grade_a_cutoff),
        normInt(grade_b_cutoff),
        normInt(grade_c_cutoff),
        normInt(grade_d_cutoff)
      ]
    );

    await logActivity({
      req,
      userId: req.user.user_id,
      action: 'UPDATE_GRADING_SETTINGS',
      description: `Memperbarui bobot & target penilaian: target BPU ${target_akuisisi_bpu || 'tetap'}`
    });

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
    const targetUserId = parseInt(user_id, 10);

    if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
      return res.status(400).json({ success: false, message: 'user_id is required and must be numeric' });
    }

    // Coordinator isolation: verify student belongs to this coordinator
    if (req.user.role === 'Koordinator' || req.user.role_id === 2) {
      const check = await query(`SELECT coordinator_id FROM users WHERE user_id = $1`, [targetUserId]);
      if (check.rows.length === 0 || check.rows[0].coordinator_id !== req.user.user_id) {
        return res.status(403).json({ success: false, message: 'Akses dilarang. Anda hanya dapat menilai anak didik Anda sendiri.' });
      }
    }

    const settings = await getGradingSettings();
    const { finalScore, grade } = calculateGrade(req.body, settings);
    const existingRes = await query(`SELECT * FROM progress WHERE user_id = $1 LIMIT 1`, [targetUserId]);
    const existing = existingRes.rows[0] || {};

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
      [
        targetUserId,
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

    const savedChanges = buildFieldChanges(existing, result.rows[0], [
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
      action: 'GRADING_SAVED',
      verb: existingRes.rows.length > 0 ? 'mengubah' : 'menyimpan',
      entityLabel: 'Penilaian & Progres Magang',
      changes: savedChanges
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
    if (req.user.role === 'Peserta' || req.user.role_id === 1) {
      params.push(req.user.user_id);
      sql += ` AND u.user_id = $${params.length}`;
    } else if (req.user.role === 'Koordinator' || req.user.role_id === 2) {
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
    const rawId = parseInt(req.params.progressId, 10);
    if (!Number.isInteger(rawId) || rawId <= 0) {
      return res.status(400).json({ success: false, message: 'ID progress tidak valid.' });
    }

    const selectCols = `
      SELECT 
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
    `;

    // Match unambiguously by progress.id first, then fall back to user_id
    let result = await query(`${selectCols} WHERE p.id = $1 LIMIT 1`, [rawId]);
    if (result.rows.length === 0) {
      result = await query(`${selectCols} WHERE u.user_id = $1 LIMIT 1`, [rawId]);
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Participant progress not found' });
    }

    const row = result.rows[0];
    if ((req.user.role === 'Peserta' || req.user.role_id === 1) && row.user_id !== req.user.user_id) {
      return res.status(403).json({ success: false, message: 'Akses dilarang. Anda hanya dapat melihat nilai Anda sendiri.' });
    }
    if ((req.user.role === 'Koordinator' || req.user.role_id === 2) && row.coordinator_id !== req.user.user_id) {
      return res.status(403).json({ success: false, message: 'Akses dilarang. Peserta ini tidak berada di bawah bimbingan Anda.' });
    }

    return res.json({
      success: true,
      data: row
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
    const rawId = parseInt(req.params.progressId, 10);
    if (!Number.isInteger(rawId) || rawId <= 0) {
      return res.status(400).json({ success: false, message: 'ID progress tidak valid.' });
    }

    // Resolve unambiguous target participant
    let target = await query(
      `SELECT p.id AS progress_id, u.user_id, u.coordinator_id
       FROM progress p
       JOIN users u ON p.user_id = u.user_id
       WHERE p.id = $1 LIMIT 1`,
      [rawId]
    );
    if (target.rows.length === 0) {
      target = await query(
        `SELECT NULL::int AS progress_id, user_id, coordinator_id
         FROM users
         WHERE user_id = $1 AND role_id = 1 LIMIT 1`,
        [rawId]
      );
    }
    if (target.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Peserta tidak ditemukan.' });
    }

    const { user_id: targetUserId, coordinator_id: targetCoordId } = target.rows[0];

    // Coordinator isolation: verify student belongs to this coordinator
    if ((req.user.role === 'Koordinator' || req.user.role_id === 2) && targetCoordId !== req.user.user_id) {
      return res.status(403).json({ success: false, message: 'Akses dilarang. Anda hanya dapat menilai anak didik Anda sendiri.' });
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
    const existingRes = await query(`SELECT * FROM progress WHERE user_id = $1 LIMIT 1`, [targetUserId]);
    const existing = existingRes.rows[0] || {};
    const mergedPayload = {
      kunjungan_bpu: kunjungan_bpu ?? existing.kunjungan_bpu ?? 0,
      hasil_akuisisi_bpu: hasil_akuisisi_bpu ?? existing.hasil_akuisisi_bpu ?? 0,
      kunjungan_pu: kunjungan_pu ?? existing.kunjungan_pu ?? 0,
      video_viralisasi: video_viralisasi ?? existing.video_viralisasi ?? 0,
      kehadiran_seminar: kehadiran_seminar ?? existing.kehadiran_seminar ?? 0,
      kehadiran_sosialisasi: kehadiran_sosialisasi ?? existing.kehadiran_sosialisasi ?? 0
    };
    const { finalScore, grade } = calculateGrade(mergedPayload, settings);

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
      [
        targetUserId,
        mergedPayload.kunjungan_bpu,
        mergedPayload.hasil_akuisisi_bpu,
        mergedPayload.kunjungan_pu,
        mergedPayload.video_viralisasi,
        mergedPayload.kehadiran_seminar,
        mergedPayload.kehadiran_sosialisasi,
        finalScore,
        finalScore,
        grade
      ]
    );

    const progressChanges = buildFieldChanges(existing, result.rows[0], [
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
      action: 'GRADING_PROGRESS_UPDATED',
      verb: 'memperbarui',
      entityLabel: 'Progres & Penilaian Magang',
      changes: progressChanges
    });

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
    const rawId = parseInt(req.params.progressId, 10);
    if (!Number.isInteger(rawId) || rawId <= 0) {
      return res.status(400).json({ success: false, message: 'ID progress tidak valid.' });
    }

    let target = await query(
      `SELECT p.id AS progress_id, u.user_id, u.coordinator_id
       FROM progress p
       JOIN users u ON p.user_id = u.user_id
       WHERE p.id = $1 LIMIT 1`,
      [rawId]
    );
    if (target.rows.length === 0) {
      target = await query(
        `SELECT NULL::int AS progress_id, user_id, coordinator_id
         FROM users
         WHERE user_id = $1 AND role_id = 1 LIMIT 1`,
        [rawId]
      );
    }
    if (target.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Peserta tidak ditemukan.' });
    }

    const { user_id: targetUserId, coordinator_id: targetCoordId } = target.rows[0];

    // Coordinator isolation: verify student belongs to this coordinator
    if ((req.user.role === 'Koordinator' || req.user.role_id === 2) && targetCoordId !== req.user.user_id) {
      return res.status(403).json({ success: false, message: 'Akses dilarang. Anda hanya dapat menilai anak didik Anda sendiri.' });
    }

    const { nilai, grade } = req.body;
    const numericNilai = nilai !== undefined && nilai !== null ? parseFloat(nilai) : null;
    if (numericNilai !== null && (isNaN(numericNilai) || numericNilai < 0 || numericNilai > 100)) {
      return res.status(400).json({ success: false, message: 'Nilai harus berada pada rentang 0 sampai 100.' });
    }

    const prevRes = await query(`SELECT nilai, grade FROM progress WHERE user_id = $1 LIMIT 1`, [targetUserId]);
    const prevProgress = prevRes.rows[0] || {};

    const result = await query(
      `INSERT INTO progress (user_id, nilai, grade, created_at, updated_at)
       VALUES ($1, COALESCE($2, 0), COALESCE($3, 'E'), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id) DO UPDATE SET
         nilai = COALESCE($2, progress.nilai),
         grade = COALESCE($3, progress.grade),
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [targetUserId, numericNilai, grade ?? null]
    );

    const scoreChanges = buildFieldChanges(prevProgress, result.rows[0], [
      { key: 'nilai', label: 'Nilai Akhir', type: 'number' },
      { key: 'grade', label: 'Grade' }
    ]);

    await logEntityChange({
      req,
      targetUserId,
      action: 'GRADING_SCORES_UPDATED',
      verb: 'mengubah',
      entityLabel: 'Skor Akhir & Grade Magang',
      changes: scoreChanges
    });

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
