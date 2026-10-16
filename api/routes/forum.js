// api/routes/forum.js
import { Router } from 'express';
import { query } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

/**
 * GET /api/forum/topics
 */
router.get('/topics', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT t.topic_id, t.topic_name, t.description, t.is_sticky, t.created_at,
              u.full_name as author, r.role_name as author_role,
              (SELECT COUNT(*) FROM forum_messages m WHERE m.topic_id = t.topic_id) as replies,
              COALESCE((SELECT MAX(m.created_at) FROM forum_messages m WHERE m.topic_id = t.topic_id), t.created_at) as last_activity
       FROM forum_topics t
       LEFT JOIN users u ON t.created_by = u.user_id
       LEFT JOIN roles r ON u.role_id = r.role_id
       ORDER BY t.is_sticky DESC, last_activity DESC`
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
 * POST /api/forum/topics
 */
router.post('/topics', authenticateToken, async (req, res) => {
  try {
    const { topic_name, title, description, content } = req.body;
    const tName = topic_name || title;
    const tDesc = description || content || '';

    if (!tName) {
      return res.status(400).json({ success: false, message: 'Judul topik forum wajib diisi.' });
    }

    const result = await query(
      `INSERT INTO forum_topics (topic_name, description, created_by, is_sticky, created_at)
       VALUES ($1, $2, $3, FALSE, CURRENT_TIMESTAMP)
       RETURNING *`,
      [tName, tDesc, req.user.user_id]
    );

    // If initial content was provided, create first message
    if (tDesc) {
      await query(
        `INSERT INTO forum_messages (topic_id, user_id, message_content, created_at)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
        [result.rows[0].topic_id, req.user.user_id, tDesc]
      );
    }

    return res.status(201).json({
      success: true,
      message: 'Topik forum berhasil dibuat.',
      data: result.rows[0]
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/forum/topics/:id/messages
 */
router.get('/topics/:id/messages', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const messages = await query(
      `SELECT m.message_id, m.topic_id, m.user_id, m.message_content, m.created_at,
              u.full_name as author_name, r.role_name as author_role
       FROM forum_messages m
       JOIN users u ON m.user_id = u.user_id
       JOIN roles r ON u.role_id = r.role_id
       WHERE m.topic_id = $1
       ORDER BY m.created_at ASC`,
      [id]
    );

    return res.json({
      success: true,
      data: messages.rows
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/forum/topics/:id/messages
 */
router.post('/topics/:id/messages', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { message_content, content, message } = req.body;
    const bodyText = message_content || content || message;

    if (!bodyText || bodyText.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Pesan tidak boleh kosong.' });
    }

    const result = await query(
      `INSERT INTO forum_messages (topic_id, user_id, message_content, created_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       RETURNING *`,
      [id, req.user.user_id, bodyText.trim()]
    );

    const messageWithUser = await query(
      `SELECT m.*, u.full_name as author_name, r.role_name as author_role
       FROM forum_messages m
       JOIN users u ON m.user_id = u.user_id
       JOIN roles r ON u.role_id = r.role_id
       WHERE m.message_id = $1`,
      [result.rows[0].message_id]
    );

    return res.status(201).json({
      success: true,
      message: 'Pesan berhasil dikirim.',
      data: messageWithUser.rows[0]
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
