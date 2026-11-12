import { Router } from 'express';
import { query, pool } from '../db.js';
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
const VALID_BATCH_STATUSES = ['Aktif', 'Selesai', 'Mendatang'];
const BATCH_STATUS_ALIASES = {
  aktif: 'Aktif',
  active: 'Aktif',
  selesai: 'Selesai',
  completed: 'Selesai',
  done: 'Selesai',
  mendatang: 'Mendatang',
  direncanakan: 'Mendatang',
  planned: 'Mendatang',
  upcoming: 'Mendatang'
};

/** Normalize legacy/case-variant batch status names to the DB CHECK constraint values. */
function parseBatchStatus(rawStatus, fallback = null) {
  if (rawStatus === undefined || rawStatus === null || String(rawStatus).trim() === '') {
    return { status: fallback };
  }
  const normalized = BATCH_STATUS_ALIASES[String(rawStatus).trim().toLowerCase()];
  if (!normalized || !VALID_BATCH_STATUSES.includes(normalized)) {
    return {
      error: `Status batch "${rawStatus}" tidak valid. Gunakan salah satu: ${VALID_BATCH_STATUSES.join(', ')}.`
    };
  }
  return { status: normalized };
}

router.post('/', authenticateToken, requireRole('Administrator'), async (req, res) => {
  try {
    const { batch_name, start_date, end_date, status } = req.body;

    if (!batch_name || !start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: 'Nama batch, tanggal mulai, dan tanggal selesai wajib diisi.'
      });
    }

    const { status: normalizedStatus, error: statusError } = parseBatchStatus(status, 'Aktif');
    if (statusError) {
      return res.status(400).json({
        success: false,
        message: statusError
      });
    }

    const result = await query(
      `INSERT INTO batches (batch_name, start_date, end_date, status, created_at)
       VALUES ($1, $2, $3, COALESCE($4, 'Aktif'), CURRENT_TIMESTAMP)
       RETURNING *`,
      [batch_name, start_date, end_date, normalizedStatus]
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

    const { status: normalizedStatus, error: statusError } = parseBatchStatus(status, null);
    if (statusError) {
      return res.status(400).json({
        success: false,
        message: statusError
      });
    }

    const result = await query(
      `UPDATE batches
       SET batch_name = COALESCE($1, batch_name),
           start_date = COALESCE($2, start_date),
           end_date = COALESCE($3, end_date),
           status = COALESCE($4, status)
       WHERE batch_id = $5
       RETURNING *`,
      [batch_name, start_date, end_date, normalizedStatus, id]
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
  const client = await pool.connect();
  try {
    const batchId = parseInt(req.params.id, 10);
    if (!Number.isInteger(batchId) || batchId <= 0) {
      return res.status(400).json({ success: false, message: 'ID batch tidak valid.' });
    }
    const { reset_coordinators = false } = req.body;

    await client.query('BEGIN');

    // 1. Mark other batches as Selesai
    await client.query(`UPDATE batches SET status = 'Selesai' WHERE batch_id != $1`, [batchId]);

    // 2. Activate this batch
    const batchRes = await client.query(`UPDATE batches SET status = 'Aktif' WHERE batch_id = $1 RETURNING *`, [batchId]);
    if (batchRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Batch tidak ditemukan.' });
    }
    const batch = batchRes.rows[0];

    // 3. Reset participants (role_id = 1), strictly leaving Administrator intact
    let deleteSql = `DELETE FROM users WHERE role_id = 1`;
    if (reset_coordinators) {
      deleteSql = `DELETE FROM users WHERE role_id IN (1, 2)`;
    }
    const deletedRes = await client.query(deleteSql);
    const resetCount = deletedRes.rowCount || 0;

    await client.query('COMMIT');

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
    await client.query('ROLLBACK').catch(() => {});
    return res.status(500).json({ success: false, message: error.message });
  } finally {
    client.release();
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
  const client = await pool.connect();
  try {
    const batchId = parseInt(req.params.id, 10);
    if (!Number.isInteger(batchId) || batchId <= 0) {
      return res.status(400).json({ success: false, message: 'ID batch tidak valid.' });
    }
    const { user_ids, mode = 'sync' } = req.body;

    if (!Array.isArray(user_ids)) {
      return res.status(400).json({ success: false, message: 'user_ids harus berupa array.' });
    }

    const batchExists = await client.query(`SELECT batch_id FROM batches WHERE batch_id = $1`, [batchId]);
    if (batchExists.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Batch tidak ditemukan.' });
    }

    const cleanIds = [...new Set(user_ids.map(u => parseInt(u, 10)).filter(n => Number.isInteger(n) && n > 0))];

    await client.query('BEGIN');
    if (mode !== 'add') {
      await client.query(`DELETE FROM user_batches WHERE batch_id = $1`, [batchId]);
    }
    for (const uId of cleanIds) {
      await client.query(
        `INSERT INTO user_batches (user_id, batch_id, assigned_at)
         VALUES ($1, $2, CURRENT_TIMESTAMP)
         ON CONFLICT (user_id, batch_id) DO NOTHING`,
        [uId, batchId]
      );
    }
    await client.query('COMMIT');

    return res.json({
      success: true,
      message: `${cleanIds.length} pengguna berhasil ditugaskan ke batch.`,
      count: cleanIds.length
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    return res.status(500).json({ success: false, message: error.message });
  } finally {
    client.release();
  }
});

export default router;
