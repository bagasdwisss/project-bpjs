// api/routes/notifications.js
import { Router } from 'express';
import { query } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

/**
 * GET /api/notifications/unread-count
 */
router.get('/unread-count', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = FALSE`,
      [req.user.user_id]
    );
    return res.json({
      success: true,
      data: { count: parseInt(result.rows[0].count, 10) || 0 }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/notifications
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM notifications 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
      [req.user.user_id]
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
 * PUT /api/notifications/:id/read
 */
router.put('/:id/read', authenticateToken, async (req, res) => {
  try {
    await query(
      `UPDATE notifications SET is_read = TRUE WHERE notification_id = $1 AND user_id = $2`,
      [req.params.id, req.user.user_id]
    );
    return res.json({ success: true, message: 'Notifikasi ditandai dibaca.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PUT /api/notifications/mark-all-read
 */
router.put('/mark-all-read', authenticateToken, async (req, res) => {
  try {
    await query(
      `UPDATE notifications SET is_read = TRUE WHERE user_id = $1`,
      [req.user.user_id]
    );
    return res.json({ success: true, message: 'Semua notifikasi ditandai telah dibaca.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * DELETE /api/notifications/clear/read
 */
router.delete('/clear/read', authenticateToken, async (req, res) => {
  try {
    await query(
      `DELETE FROM notifications WHERE user_id = $1 AND is_read = TRUE`,
      [req.user.user_id]
    );
    return res.json({ success: true, message: 'Semua notifikasi terbaca telah dihapus.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * DELETE /api/notifications/:id
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await query(
      `DELETE FROM notifications WHERE notification_id = $1 AND user_id = $2`,
      [req.params.id, req.user.user_id]
    );
    return res.json({ success: true, message: 'Notifikasi berhasil dihapus.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ========================================================
// COORDINATOR NOTIFICATIONS
// ========================================================

/**
 * GET /api/notifications/coordinator
 */
router.get('/coordinator', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT n.*, u.full_name as recipient_name, u.unique_id as recipient_id
       FROM notifications n
       JOIN users u ON n.user_id = u.user_id
       WHERE u.coordinator_id = $1 OR n.user_id = $1
       ORDER BY n.created_at DESC`,
      [req.user.user_id]
    );
    return res.json({ success: true, data: result.rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/notifications/coordinator
 */
router.post('/coordinator', authenticateToken, async (req, res) => {
  try {
    const { user_id, title, message, type, priority, due_date } = req.body;

    const result = await query(
      `INSERT INTO notifications (user_id, title, message, type, priority, due_date, is_read, created_at)
       VALUES ($1, $2, $3, COALESCE($4, 'reminder'), COALESCE($5, 'medium'), $6, FALSE, CURRENT_TIMESTAMP)
       RETURNING *`,
      [user_id, title, message, type, priority, due_date || null]
    );

    return res.status(201).json({
      success: true,
      message: 'Notifikasi berhasil dikirim.',
      data: result.rows[0]
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/notifications/coordinator/broadcast
 */
router.post('/coordinator/broadcast', authenticateToken, async (req, res) => {
  try {
    const { title, message, priority, type, due_date } = req.body;

    // Get all participants assigned to this coordinator
    const participants = await query(
      `SELECT user_id FROM users WHERE coordinator_id = $1 AND role_id = 1 AND status = 'Aktif'`,
      [req.user.user_id]
    );

    for (const p of participants.rows) {
      await query(
        `INSERT INTO notifications (user_id, title, message, type, priority, due_date, is_read, created_at)
         VALUES ($1, $2, $3, COALESCE($4, 'reminder'), COALESCE($5, 'medium'), $6, FALSE, CURRENT_TIMESTAMP)`,
        [p.user_id, title, message, type, priority, due_date || null]
      );
    }

    return res.json({
      success: true,
      message: `Pesan berhasil dikirim ke ${participants.rows.length} peserta.`
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/notifications/coordinator/participants
 */
router.get('/coordinator/participants', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT user_id, unique_id, full_name, status, penempatan
       FROM users
       WHERE coordinator_id = $1 AND role_id = 1
       ORDER BY full_name ASC`,
      [req.user.user_id]
    );
    return res.json({ success: true, data: result.rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/notifications/coordinator/reminders/settings
 */
router.get('/coordinator/reminders/settings', authenticateToken, (req, res) => {
  return res.json({
    success: true,
    data: {
      attendance_reminder_time: '08:00',
      progress_reminder_day: 'Friday',
      auto_send: true
    }
  });
});

/**
 * POST /api/notifications/coordinator/reminders/settings
 */
router.post('/coordinator/reminders/settings', authenticateToken, (req, res) => {
  return res.json({
    success: true,
    message: 'Pengaturan pengingat berhasil disimpan.'
  });
});

// ========================================================
// ADMIN BROADCAST
// ========================================================

/**
 * POST /api/notifications/admin/broadcast/send
 */
router.post('/admin/broadcast/send', authenticateToken, async (req, res) => {
  try {
    const { title, message, content, priority, target } = req.body;
    const msgTitle = title || 'Pengumuman Penting';
    const msgContent = message || content || '';
    const targetGroup = target || 'all';

    let userSql = `SELECT user_id FROM users WHERE status = 'Aktif'`;
    if (targetGroup === 'participants') {
      userSql += ` AND role_id = 1`;
    } else if (targetGroup === 'coordinators') {
      userSql += ` AND role_id = 2`;
    }

    const recipients = await query(userSql);

    for (const u of recipients.rows) {
      await query(
        `INSERT INTO notifications (user_id, title, message, type, priority, is_read, created_at)
         VALUES ($1, $2, $3, 'broadcast', COALESCE($4, 'Biasa'), FALSE, CURRENT_TIMESTAMP)`,
        [u.user_id, msgTitle, msgContent, priority]
      );
    }

    // Record in broadcast_messages table
    await query(
      `INSERT INTO broadcast_messages (sender_id, title, content, priority, target_role, sent_at)
       VALUES ($1, $2, $3, COALESCE($4, 'Biasa'), $5, CURRENT_TIMESTAMP)`,
      [req.user.user_id, msgTitle, msgContent, priority, targetGroup]
    );

    return res.json({
      success: true,
      message: `Broadcast berhasil dikirim ke ${recipients.rows.length} penerima.`
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/notifications/admin/broadcast/history
 */
router.get('/admin/broadcast/history', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT b.*, u.full_name as sender_name
       FROM broadcast_messages b
       LEFT JOIN users u ON b.sender_id = u.user_id
       ORDER BY b.sent_at DESC`
    );
    return res.json({ success: true, data: result.rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
