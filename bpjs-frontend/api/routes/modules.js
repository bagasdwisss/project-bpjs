// api/routes/modules.js
import { Router } from 'express';
import { query } from '../db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();

/**
 * GET /api/admin/modules
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT m.*, b.batch_name
       FROM modules m
       LEFT JOIN batches b ON m.batch_id = b.batch_id
       ORDER BY m.module_id ASC`
    );
    return res.json({ success: true, data: result.rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/admin/modules
 */
router.post('/', authenticateToken, requireRole('Administrator'), async (req, res) => {
  try {
    const { batch_id, module_name, description, max_score } = req.body;

    if (!module_name) {
      return res.status(400).json({ success: false, message: 'Nama modul wajib diisi.' });
    }

    const result = await query(
      `INSERT INTO modules (batch_id, module_name, description, max_score)
       VALUES ($1, $2, $3, COALESCE($4, 100.00))
       RETURNING *`,
      [batch_id || 1, module_name, description || null, max_score || 100.00]
    );

    return res.status(201).json({
      success: true,
      message: 'Modul berhasil dibuat.',
      data: result.rows[0]
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PUT /api/admin/modules/:id
 */
router.put('/:id', authenticateToken, requireRole('Administrator'), async (req, res) => {
  try {
    const { id } = req.params;
    const { batch_id, module_name, description, max_score } = req.body;

    const result = await query(
      `UPDATE modules
       SET batch_id = COALESCE($1, batch_id),
           module_name = COALESCE($2, module_name),
           description = COALESCE($3, description),
           max_score = COALESCE($4, max_score)
       WHERE module_id = $5
       RETURNING *`,
      [batch_id, module_name, description, max_score, id]
    );

    return res.json({
      success: true,
      message: 'Modul berhasil diperbarui.',
      data: result.rows[0]
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * DELETE /api/admin/modules/:id
 */
router.delete('/:id', authenticateToken, requireRole('Administrator'), async (req, res) => {
  try {
    const { id } = req.params;
    await query(`DELETE FROM modules WHERE module_id = $1`, [id]);
    return res.json({ success: true, message: 'Modul berhasil dihapus.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
