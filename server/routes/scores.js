// api/routes/scores.js
import { Router } from 'express';
import { query } from '../db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { recordScoreCdcDiff } from '../utils/cdcDiff.js';
import { buildFieldChanges, logEntityChange } from '../utils/auditFormatter.js';

const router = Router();

/**
 * GET /api/participant/scores
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.user_id;

    const result = await query(
      `SELECT s.score_id, s.user_id, s.module_id, s.coordinator_id, s.score_value, s.comments, s.graded_at, s.created_at,
              m.module_name, m.max_score, u.full_name AS coordinator_name
       FROM scores s
       LEFT JOIN modules m ON s.module_id = m.module_id
       LEFT JOIN users u ON s.coordinator_id = u.user_id
       WHERE s.user_id = $1
       ORDER BY s.graded_at DESC, s.created_at DESC`,
      [userId]
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
 * GET /api/participant/scores/statistics
 */
router.get('/statistics', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.user_id;

    const result = await query(
      `SELECT 
         COALESCE(AVG(score_value), 0) as average,
         COALESCE(MAX(score_value), 0) as max,
         COALESCE(MIN(score_value), 0) as min,
         COUNT(*) as total
       FROM scores
       WHERE user_id = $1`,
      [userId]
    );

    const row = result.rows[0];

    return res.json({
      success: true,
      data: {
        average: parseFloat(parseFloat(row.average).toFixed(1)),
        max: parseFloat(row.max),
        min: parseFloat(row.min),
        total: parseInt(row.total, 10)
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/coordinator/participants/:id/scores
 */
router.get('/participant/:id', authenticateToken, async (req, res) => {
  try {
    const targetUserId = parseInt(req.params.id, 10);
    if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
      return res.status(400).json({ success: false, message: 'ID peserta tidak valid.' });
    }

    if ((req.user.role === 'Peserta' || req.user.role_id === 1) && req.user.user_id !== targetUserId) {
      return res.status(403).json({ success: false, message: 'Akses dilarang. Anda hanya dapat melihat nilai Anda sendiri.' });
    }
    if (req.user.role === 'Koordinator' || req.user.role_id === 2) {
      const check = await query(`SELECT coordinator_id FROM users WHERE user_id = $1`, [targetUserId]);
      if (check.rows.length === 0 || check.rows[0].coordinator_id !== req.user.user_id) {
        return res.status(403).json({ success: false, message: 'Akses dilarang. Peserta ini tidak berada di bawah bimbingan Anda.' });
      }
    }

    const result = await query(
      `SELECT s.*, m.module_name, m.max_score, u.full_name as coordinator_name
       FROM scores s
       LEFT JOIN modules m ON s.module_id = m.module_id
       LEFT JOIN users u ON s.coordinator_id = u.user_id
       WHERE s.user_id = $1
       ORDER BY s.graded_at DESC`,
      [targetUserId]
    );

    return res.json({ success: true, data: result.rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/coordinator/scores
 */
router.post('/', authenticateToken, requireRole('Koordinator', 'Administrator'), async (req, res) => {
  try {
    const { user_id, module_id, score_value, comments, graded_at } = req.body;
    const targetUserId = parseInt(user_id, 10);
    const numScore = parseFloat(score_value);

    if (!Number.isInteger(targetUserId) || isNaN(numScore) || numScore < 0 || numScore > 100) {
      return res.status(400).json({ success: false, message: 'user_id wajib valid dan score_value harus bernilai 0-100.' });
    }

    if (req.user.role === 'Koordinator' || req.user.role_id === 2) {
      const check = await query(`SELECT coordinator_id FROM users WHERE user_id = $1`, [targetUserId]);
      if (check.rows.length === 0 || check.rows[0].coordinator_id !== req.user.user_id) {
        return res.status(403).json({ success: false, message: 'Akses dilarang. Anda hanya dapat menilai anak didik Anda sendiri.' });
      }
    }

    const result = await query(
      `INSERT INTO scores (user_id, module_id, coordinator_id, score_value, comments, graded_at, created_at)
       VALUES ($1, $2, $3, $4, $5, COALESCE($6, CURRENT_DATE), CURRENT_TIMESTAMP)
       RETURNING *`,
      [targetUserId, module_id, req.user.user_id, numScore, comments || null, graded_at || null]
    );

    const modRes = await query(`SELECT module_name FROM modules WHERE module_id = $1`, [module_id]).catch(() => ({ rows: [] }));
    const modName = modRes.rows[0]?.module_name || `Modul #${module_id}`;
    await logEntityChange({
      req,
      targetUserId,
      action: 'SCORE_CREATED',
      verb: 'menambahkan',
      entityLabel: 'Nilai Modul',
      recordContext: `Modul: ${modName}`,
      changes: [{ label: 'Nilai Modul', from: 'Belum ada', to: String(numScore) }],
      notes: comments || null
    });

    return res.status(201).json({
      success: true,
      message: 'Nilai berhasil disimpan.',
      data: result.rows[0]
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PUT /api/coordinator/scores/:id
 */
router.put('/:id', authenticateToken, requireRole('Koordinator', 'Administrator'), async (req, res) => {
  try {
    const scoreId = parseInt(req.params.id, 10);
    if (!Number.isInteger(scoreId) || scoreId <= 0) {
      return res.status(400).json({ success: false, message: 'ID nilai tidak valid.' });
    }
    const { score_value, comments } = req.body;
    const numScore = score_value !== undefined && score_value !== null ? parseFloat(score_value) : null;
    if (numScore !== null && (isNaN(numScore) || numScore < 0 || numScore > 100)) {
      return res.status(400).json({ success: false, message: 'Nilai harus berada pada rentang 0-100.' });
    }

    // Fetch previous score & check coordinator ownership
    const prevRes = await query(
      `SELECT s.*, u.coordinator_id as student_coordinator_id, u.full_name, u.unique_id, m.module_name
       FROM scores s
       JOIN users u ON s.user_id = u.user_id
       LEFT JOIN modules m ON s.module_id = m.module_id
       WHERE s.score_id = $1`,
      [scoreId]
    );
    if (prevRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Data nilai tidak ditemukan.' });
    }
    const oldScore = prevRes.rows[0];
    if ((req.user.role === 'Koordinator' || req.user.role_id === 2) && oldScore.student_coordinator_id !== req.user.user_id) {
      return res.status(403).json({ success: false, message: 'Akses dilarang. Catatan nilai ini bukan milik anak didik Anda.' });
    }

    const result = await query(
      `UPDATE scores 
       SET score_value = COALESCE($1, score_value),
           comments = COALESCE($2, comments)
       WHERE score_id = $3
       RETURNING *`,
      [numScore, comments ?? null, scoreId]
    );

    if (result.rows.length > 0 && oldScore) {
      await recordScoreCdcDiff({
        scoreId,
        userId: result.rows[0].user_id,
        moduleId: result.rows[0].module_id,
        coordinatorId: req.user.user_id,
        oldScore,
        newScore: numScore !== null ? numScore : oldScore.score_value,
        comments: comments !== undefined ? comments : oldScore.comments
      });

      const changes = buildFieldChanges(oldScore, result.rows[0], [
        { key: 'score_value', label: 'Nilai Modul', type: 'number' },
        { key: 'comments', label: 'Komentar' }
      ]);

      await logEntityChange({
        req,
        targetUser: {
          user_id: oldScore.user_id,
          full_name: oldScore.full_name,
          unique_id: oldScore.unique_id
        },
        action: 'SCORE_UPDATED',
        verb: 'mengubah',
        entityLabel: 'Nilai Modul',
        recordContext: `Modul: ${oldScore.module_name || `#${oldScore.module_id}`} (Score ID #${scoreId})`,
        changes,
        notes: comments !== undefined ? comments : null
      });
    }

    return res.json({
      success: true,
      message: 'Nilai berhasil diperbarui.',
      data: result.rows[0]
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/coordinator/scores/:id/cdc-history
 */
router.get('/:id/cdc-history', authenticateToken, async (req, res) => {
  try {
    const scoreId = parseInt(req.params.id, 10);
    if (!Number.isInteger(scoreId) || scoreId <= 0) {
      return res.status(400).json({ success: false, message: 'ID nilai tidak valid.' });
    }

    const ownerRes = await query(
      `SELECT s.user_id, u.coordinator_id
       FROM scores s JOIN users u ON s.user_id = u.user_id
       WHERE s.score_id = $1`,
      [scoreId]
    );
    if (ownerRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Catatan nilai tidak ditemukan.' });
    }
    const owner = ownerRes.rows[0];
    if ((req.user.role === 'Peserta' || req.user.role_id === 1) && owner.user_id !== req.user.user_id) {
      return res.status(403).json({ success: false, message: 'Akses dilarang.' });
    }
    if ((req.user.role === 'Koordinator' || req.user.role_id === 2) && owner.coordinator_id !== req.user.user_id) {
      return res.status(403).json({ success: false, message: 'Akses dilarang. Catatan nilai bukan milik anak didik Anda.' });
    }

    const result = await query(
      `SELECT d.*, u.full_name as coordinator_name
       FROM cdc_score_diffs d
       LEFT JOIN users u ON d.coordinator_id = u.user_id
       WHERE d.score_id = $1
       ORDER BY d.created_at DESC`,
      [scoreId]
    );

    return res.json({ success: true, data: result.rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * DELETE /api/coordinator/scores/:id
 */
router.delete('/:id', authenticateToken, requireRole('Koordinator', 'Administrator'), async (req, res) => {
  try {
    const scoreId = parseInt(req.params.id, 10);
    if (!Number.isInteger(scoreId) || scoreId <= 0) {
      return res.status(400).json({ success: false, message: 'ID nilai tidak valid.' });
    }

    const ownerRes = await query(
      `SELECT s.*, u.coordinator_id, u.full_name, u.unique_id, m.module_name
       FROM scores s
       JOIN users u ON s.user_id = u.user_id
       LEFT JOIN modules m ON s.module_id = m.module_id
       WHERE s.score_id = $1`,
      [scoreId]
    );
    if (ownerRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Nilai tidak ditemukan.' });
    }
    const oldScore = ownerRes.rows[0];
    if ((req.user.role === 'Koordinator' || req.user.role_id === 2) && oldScore.coordinator_id !== req.user.user_id) {
      return res.status(403).json({ success: false, message: 'Akses dilarang. Catatan nilai bukan milik anak didik Anda.' });
    }

    await query(`DELETE FROM scores WHERE score_id = $1`, [scoreId]);

    await logEntityChange({
      req,
      targetUser: {
        user_id: oldScore.user_id,
        full_name: oldScore.full_name,
        unique_id: oldScore.unique_id
      },
      action: 'SCORE_DELETED',
      verb: 'menghapus',
      entityLabel: 'Nilai Modul',
      recordContext: `Modul: ${oldScore.module_name || `#${oldScore.module_id}`} (Score ID #${scoreId})`,
      changes: [{ label: 'Nilai Modul', from: String(oldScore.score_value ?? '-'), to: 'DIHAPUS' }],
      notes: oldScore.comments || null
    });

    return res.json({ success: true, message: 'Nilai berhasil dihapus.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/coordinator/analysis/performance or /api/coordinator/scores/performance
 */
router.get(['/analysis/performance', '/performance'], authenticateToken, requireRole('Koordinator', 'Administrator'), async (req, res) => {
  try {
    const isCoordinator = req.user.role === 'Koordinator' || req.user.role_id === 2;
    const coordParams = isCoordinator ? [req.user.user_id] : [];

    const statsResult = await query(`
      SELECT 
        m.module_name,
        COALESCE(AVG(s.score_value), 0) as avg_score,
        COUNT(s.score_id) as total_submissions
      FROM modules m
      LEFT JOIN scores s ON m.module_id = s.module_id
      ${isCoordinator ? 'LEFT JOIN users u ON s.user_id = u.user_id AND u.coordinator_id = $1' : ''}
      GROUP BY m.module_id, m.module_name
      ORDER BY m.module_id ASC
    `, coordParams);

    const summaryResult = await query(`
      SELECT
        COALESCE(AVG(s.score_value), 0) as overall_average,
        COUNT(DISTINCT s.user_id) as total_graded_participants,
        COUNT(s.score_id) as total_scores_recorded
      FROM scores s
      ${isCoordinator ? 'JOIN users u ON s.user_id = u.user_id WHERE u.coordinator_id = $1' : ''}
    `, coordParams);

    return res.json({
      success: true,
      data: {
        modules: statsResult.rows.map(r => ({
          module_name: r.module_name,
          avg_score: parseFloat(parseFloat(r.avg_score).toFixed(1)),
          total_submissions: parseInt(r.total_submissions, 10)
        })),
        summary: {
          overallAverage: parseFloat(parseFloat(summaryResult.rows[0]?.overall_average || 0).toFixed(1)),
          totalGradedParticipants: parseInt(summaryResult.rows[0]?.total_graded_participants || 0, 10),
          totalScoresRecorded: parseInt(summaryResult.rows[0]?.total_scores_recorded || 0, 10)
        }
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
