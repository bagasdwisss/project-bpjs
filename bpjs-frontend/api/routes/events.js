// api/routes/events.js
import { Router } from 'express';
import { query } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

/**
 * GET /api/events/participant
 */
router.get('/participant', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT event_id, batch_id, event_title, event_description, start_datetime, end_datetime, created_by, created_at
       FROM events
       ORDER BY start_datetime ASC`
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
 * GET /api/events
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT e.*, u.full_name as creator_name, b.batch_name
       FROM events e
       LEFT JOIN users u ON e.created_by = u.user_id
       LEFT JOIN batches b ON e.batch_id = b.batch_id
       ORDER BY e.start_datetime ASC`
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
 * POST /api/events
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { batch_id, event_title, event_description, start_datetime, end_datetime } = req.body;

    if (!event_title || !start_datetime || !end_datetime) {
      return res.status(400).json({
        success: false,
        message: 'Judul event, waktu mulai, dan waktu selesai wajib diisi.'
      });
    }

    const result = await query(
      `INSERT INTO events (batch_id, event_title, event_description, start_datetime, end_datetime, created_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
       RETURNING *`,
      [batch_id || 1, event_title, event_description || null, start_datetime, end_datetime, req.user.user_id]
    );

    return res.status(201).json({
      success: true,
      message: 'Event berhasil dibuat.',
      data: result.rows[0]
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PUT /api/events/:id
 */
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { batch_id, event_title, event_description, start_datetime, end_datetime } = req.body;

    const result = await query(
      `UPDATE events
       SET batch_id = COALESCE($1, batch_id),
           event_title = COALESCE($2, event_title),
           event_description = COALESCE($3, event_description),
           start_datetime = COALESCE($4, start_datetime),
           end_datetime = COALESCE($5, end_datetime)
       WHERE event_id = $6
       RETURNING *`,
      [batch_id, event_title, event_description, start_datetime, end_datetime, id]
    );

    return res.json({
      success: true,
      message: 'Event berhasil diperbarui.',
      data: result.rows[0]
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * DELETE /api/events/:id
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await query(`DELETE FROM events WHERE event_id = $1`, [id]);
    return res.json({ success: true, message: 'Event berhasil dihapus.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
