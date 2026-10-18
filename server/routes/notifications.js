import { Router } from 'express';
import { query } from '../db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { logActivity } from '../utils/logger.js';

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
 * DELETE /api/notifications/clear/all
 */
router.delete('/clear/all', authenticateToken, async (req, res) => {
  try {
    await query(
      `DELETE FROM notifications WHERE user_id = $1`,
      [req.user.user_id]
    );
    return res.json({ success: true, message: 'Semua notifikasi berhasil dibersihkan.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * DELETE /api/notifications/coordinator/:id
 */
router.delete('/coordinator/:id', authenticateToken, requireRole('Koordinator', 'Administrator'), async (req, res) => {
  try {
    await query(
      `DELETE FROM notifications WHERE notification_id = $1`,
      [req.params.id]
    );
    return res.json({ success: true, message: 'Notifikasi koordinator berhasil dihapus.' });
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
router.get('/coordinator', authenticateToken, requireRole('Koordinator', 'Administrator'), async (req, res) => {
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
router.post('/coordinator', authenticateToken, requireRole('Koordinator', 'Administrator'), async (req, res) => {
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
router.post('/coordinator/broadcast', authenticateToken, requireRole('Koordinator', 'Administrator'), async (req, res) => {
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

    await logActivity({
      req,
      action: 'COORDINATOR_BROADCAST',
      description: `Koordinator mengirim pengumuman "${title}" ke ${participants.rows.length} peserta`
    });

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
router.get('/coordinator/participants', authenticateToken, requireRole('Koordinator', 'Administrator'), async (req, res) => {
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
router.get('/coordinator/reminders/settings', authenticateToken, requireRole('Koordinator', 'Administrator'), (req, res) => {
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
router.post('/coordinator/reminders/settings', authenticateToken, requireRole('Koordinator', 'Administrator'), (req, res) => {
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
router.post('/admin/broadcast/send', authenticateToken, requireRole('Administrator'), async (req, res) => {
  try {
    const { title, message, content, priority, target, start_at, end_at, show_on_login, display_mode } = req.body;
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

    // Record in broadcast_messages table with duration, display_mode, and persistent login settings
    const broadcastResult = await query(
      `INSERT INTO broadcast_messages (
        sender_id, title, content, priority, target_role,
        start_at, end_at, show_on_login, is_active, display_mode, sent_at
      )
      VALUES ($1, $2, $3, COALESCE($4, 'Biasa'), $5, COALESCE($6, CURRENT_TIMESTAMP), $7, COALESCE($8, TRUE), TRUE, COALESCE($9, 'toast'), CURRENT_TIMESTAMP)
      RETURNING *`,
      [
        req.user.user_id, 
        msgTitle, 
        msgContent, 
        priority || 'Biasa', 
        targetGroup,
        start_at || null,
        end_at || null,
        show_on_login !== undefined ? Boolean(show_on_login) : true,
        display_mode || (priority === 'Biasa' ? 'toast' : 'modal')
      ]
    );

    await logActivity({
      req,
      action: 'BROADCAST_SENT',
      description: `Admin mengirim broadcast: "${msgTitle}" (Prioritas: ${priority || 'Biasa'}, Target: ${targetGroup})`
    });

    return res.json({
      success: true,
      message: `Broadcast berhasil dikirim ke ${recipients.rows.length} penerima.`,
      data: broadcastResult.rows[0]
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * DELETE /api/notifications/admin/broadcast/:id
 */
router.delete('/admin/broadcast/:id', authenticateToken, requireRole('Administrator'), async (req, res) => {
  try {
    const { id } = req.params;
    await query(`DELETE FROM broadcast_messages WHERE broadcast_id = $1`, [id]);
    await logActivity({
      req,
      action: 'BROADCAST_DELETED',
      description: `Admin menghapus broadcast pesan ID: ${id}`
    });
    return res.json({
      success: true,
      message: 'Pesan siaran berhasil dihapus.'
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/notifications/admin/broadcast/history
 */
router.get('/admin/broadcast/history', authenticateToken, requireRole('Administrator'), async (req, res) => {
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

/**
 * GET /api/notifications/broadcasts/active
 * Used by participants, coordinators to display popup toast / center modal.
 * Admin should NEVER receive this popup broadcast.
 */
router.get('/broadcasts/active', authenticateToken, async (req, res) => {
  try {
    const roleId = req.user.role_id;
    const roleName = (req.user.role_name || req.user.role || '').toLowerCase();
    const userId = req.user.user_id;

    // Target role matching:
    // Peserta gets 'all' and 'participants'
    // Koordinator gets 'all' and 'coordinators'
    // Admin gets 'all'
    let targetFilter = `(b.target_role = 'all'`;
    if (roleId === 1 || roleName.includes('peserta')) {
      targetFilter += ` OR b.target_role = 'participants')`;
    } else if (roleId === 2 || roleName.includes('koordinator')) {
      targetFilter += ` OR b.target_role = 'coordinators')`;
    } else {
      targetFilter += `)`;
    }

    const sql = `
      SELECT b.*
      FROM broadcast_messages b
      WHERE b.is_active = TRUE
        AND ${targetFilter}
        AND (b.start_at IS NULL OR b.start_at <= CURRENT_TIMESTAMP + INTERVAL '1 hour')
        AND (b.end_at IS NULL OR b.end_at >= CURRENT_TIMESTAMP - INTERVAL '1 hour')
        AND (
          b.show_on_login = TRUE 
          OR NOT EXISTS (
            SELECT 1 FROM broadcast_dismissals bd 
            WHERE bd.broadcast_id = b.broadcast_id AND bd.user_id = $1
          )
        )
      ORDER BY 
        CASE 
          WHEN b.priority = 'Sangat Penting' THEN 1
          WHEN b.priority = 'Penting' THEN 2
          ELSE 3
        END,
        b.sent_at DESC
      LIMIT 5
    `;

    const result = await query(sql, [userId]);
    return res.json({ success: true, data: result.rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/notifications/broadcasts/:id/dismiss
 */
router.post('/broadcasts/:id/dismiss', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.user_id;
    await query(
      `INSERT INTO broadcast_dismissals (broadcast_id, user_id, dismissed_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (broadcast_id, user_id) DO UPDATE SET dismissed_at = CURRENT_TIMESTAMP`,
      [id, userId]
    );
    return res.json({ success: true, message: 'Broadcast ditutup.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
