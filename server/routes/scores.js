// api/routes/scores.js
import { Router } from 'express';
import { query } from '../db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

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
    const { id } = req.params;
    const result = await query(
      `SELECT s.*, m.module_name, m.max_score, u.full_name as coordinator_name
       FROM scores s
       LEFT JOIN modules m ON s.module_id = m.module_id
       LEFT JOIN users u ON s.coordinator_id = u.user_id
       WHERE s.user_id = $1
       ORDER BY s.graded_at DESC`,
      [id]
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

    const result = await query(
      `INSERT INTO scores (user_id, module_id, coordinator_id, score_value, comments, graded_at, created_at)
       VALUES ($1, $2, $3, $4, $5, COALESCE($6, CURRENT_DATE), CURRENT_TIMESTAMP)
       RETURNING *`,
      [user_id, module_id, req.user.user_id, score_value, comments || null, graded_at || null]
    );

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
    const { id } = req.params;
    const { score_value, comments } = req.body;

    const result = await query(
      `UPDATE scores 
       SET score_value = COALESCE($1, score_value),
           comments = COALESCE($2, comments)
       WHERE score_id = $3
       RETURNING *`,
      [score_value, comments, id]
    );

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
 * DELETE /api/coordinator/scores/:id
 */
router.delete('/:id', authenticateToken, requireRole('Koordinator', 'Administrator'), async (req, res) => {
  try {
    const { id } = req.params;
    await query(`DELETE FROM scores WHERE score_id = $1`, [id]);
    return res.json({ success: true, message: 'Nilai berhasil dihapus.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
