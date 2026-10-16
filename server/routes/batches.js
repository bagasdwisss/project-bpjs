import { Router } from 'express';
import { query } from '../db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { logActivity } from '../utils/logger.js';

const router = Router();

/**
 * GET /api/admin/batches
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT b.*,
              (SELECT COUNT(*) FROM user_batches ub WHERE ub.batch_id = b.batch_id) as participant_count
       FROM batches b
       ORDER BY b.start_date DESC`
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
 * POST /api/admin/batches
 */
router.post('/', authenticateToken, requireRole('Administrator'), async (req, res) => {
  try {
    const { batch_name, start_date, end_date, status } = req.body;

    if (!batch_name || !start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: 'Nama batch, tanggal mulai, dan tanggal selesai wajib diisi.'
      });
    }

    const result = await query(
      `INSERT INTO batches (batch_name, start_date, end_date, status, created_at)
       VALUES ($1, $2, $3, COALESCE($4, 'Aktif'), CURRENT_TIMESTAMP)
       RETURNING *`,
      [batch_name, start_date, end_date, status || 'Aktif']
    );

    await logActivity({
      userId: req.user.user_id,
      type: 'BATCH_CREATED',
      details: `Membuat batch magang baru: '${batch_name}' (${start_date} s.d. ${end_date})`,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    return res.status(201).json({
      success: true,
      message: 'Batch berhasil dibuat.',
      data: result.rows[0]
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/admin/batches/:id
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const batch = await query(`SELECT * FROM batches WHERE batch_id = $1`, [id]);
    if (batch.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Batch tidak ditemukan.' });
    }

    // Get assigned users
    const users = await query(
      `SELECT u.user_id, u.unique_id, u.full_name, u.role_id, ub.assigned_at
       FROM user_batches ub
       JOIN users u ON ub.user_id = u.user_id
       WHERE ub.batch_id = $1`,
      [id]
    );

    return res.json({
      success: true,
      data: {
        ...batch.rows[0],
        users: users.rows
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PUT /api/admin/batches/:id
 */
router.put('/:id', authenticateToken, requireRole('Administrator'), async (req, res) => {
  try {
    const { id } = req.params;
    const { batch_name, start_date, end_date, status } = req.body;

    const result = await query(
      `UPDATE batches
       SET batch_name = COALESCE($1, batch_name),
           start_date = COALESCE($2, start_date),
           end_date = COALESCE($3, end_date),
           status = COALESCE($4, status)
       WHERE batch_id = $5
       RETURNING *`,
      [batch_name, start_date, end_date, status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Batch tidak ditemukan.' });
    }

    await logActivity({
      userId: req.user.user_id,
      type: 'BATCH_UPDATED',
      details: `Memperbarui batch ID #${id} (${result.rows[0].batch_name}, Status: ${status || result.rows[0].status})`,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    return res.json({
      success: true,
      message: 'Batch berhasil diperbarui.',
      data: result.rows[0]
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/admin/batches/:id/start-fresh
 * Activates new batch and resets participants list (retaining only Administrator accounts)
 */
router.post('/:id/start-fresh', authenticateToken, requireRole('Administrator'), async (req, res) => {
  try {
    const { id } = req.params;
    const { reset_coordinators = false } = req.body;

    // 1. Mark other batches as Selesai
    await query(`UPDATE batches SET status = 'Selesai' WHERE batch_id != $1`, [id]);

    // 2. Activate this batch
    const batchRes = await query(`UPDATE batches SET status = 'Aktif' WHERE batch_id = $1 RETURNING *`, [id]);
    if (batchRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Batch tidak ditemukan.' });
    }
    const batch = batchRes.rows[0];

    // 3. Reset participants (role_id = 1), strictly leaving Administrator intact
    let deleteSql = `DELETE FROM users WHERE role_id = 1`;
    if (reset_coordinators) {
      deleteSql = `DELETE FROM users WHERE role_id IN (1, 2)`;
    }
    const deletedRes = await query(deleteSql);
    const resetCount = deletedRes.rowCount || 0;

    await logActivity({
      userId: req.user.user_id,
      type: 'BATCH_RESET',
      details: `Memulai batch baru '${batch.batch_name}' dan mereset ${resetCount} akun peserta magang (Menyisakan Administrator)`,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    return res.json({
      success: true,
      message: `Batch '${batch.batch_name}' resmi diaktifkan. Sebanyak ${resetCount} akun peserta berhasil direset untuk periode baru.`,
      data: batch,
      resetCount
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * DELETE /api/admin/batches/:id
 */
router.delete('/:id', authenticateToken, requireRole('Administrator'), async (req, res) => {
  try {
    const { id } = req.params;
    const batchToDelete = await query(`SELECT batch_name FROM batches WHERE batch_id = $1`, [id]);
    const bName = batchToDelete.rows[0]?.batch_name || id;

    await query(`DELETE FROM batches WHERE batch_id = $1`, [id]);

    await logActivity({
      userId: req.user.user_id,
      type: 'BATCH_DELETED',
      details: `Menghapus batch: ${bName}`,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    return res.json({ success: true, message: 'Batch berhasil dihapus.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/admin/batches/:id/assign-users
 */
router.post('/:id/assign-users', authenticateToken, requireRole('Administrator'), async (req, res) => {
  try {
    const { id } = req.params;
    const { user_ids } = req.body;

    if (!Array.isArray(user_ids)) {
      return res.status(400).json({ success: false, message: 'user_ids harus berupa array.' });
    }

    for (const uId of user_ids) {
      await query(
        `INSERT INTO user_batches (user_id, batch_id, assigned_at)
         VALUES ($1, $2, CURRENT_TIMESTAMP)
         ON CONFLICT DO NOTHING`,
        [uId, id]
      );
    }

    return res.json({
      success: true,
      message: `${user_ids.length} pengguna berhasil ditugaskan ke batch.`
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
