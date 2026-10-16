// api/routes/peserta.js
import { Router } from 'express';
import { query } from '../db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();

/**
 * GET /api/participant/progress
 */
router.get('/progress', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.user_id;

    const result = await query(
      `SELECT p.*, u.full_name, u.unique_id, COALESCE(u.email, u.unique_id || '@bpjsketenagakerjaan.go.id') as email,
              c.full_name as coordinator_name
       FROM progress p
       JOIN users u ON p.user_id = u.user_id
       LEFT JOIN users c ON u.coordinator_id = c.user_id
       WHERE p.user_id = $1
       LIMIT 1`,
      [userId]
    );

    if (result.rows.length === 0) {
      // Auto-initialize progress row if not yet created
      let progRow;
      const existing = await query(`SELECT * FROM progress WHERE user_id = $1`, [userId]);
      if (existing.rows.length > 0) {
        progRow = existing.rows[0];
      } else {
        const insertRes = await query(
          `INSERT INTO progress (user_id, created_at, updated_at)
           VALUES ($1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
           RETURNING *`,
          [userId]
        );
        progRow = insertRes.rows[0];
      }

      const userRes = await query(
        `SELECT u.full_name, u.unique_id, COALESCE(u.email, u.unique_id || '@bpjsketenagakerjaan.go.id') as email,
                c.full_name as coordinator_name
         FROM users u
         LEFT JOIN users c ON u.coordinator_id = c.user_id
         WHERE u.user_id = $1`,
        [userId]
      );

      return res.json({
        success: true,
        data: {
          ...(progRow || {}),
          ...(userRes.rows[0] || {})
        }
      });
    }

    return res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/participant/acquisition-result
 */
router.get('/acquisition-result', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.user_id;

    const result = await query(
      `SELECT * FROM peserta WHERE user_id = $1 ORDER BY tanggal_pendaftaran DESC, peserta_id DESC`,
      [userId]
    );

    // Compute summary statistics
    const totalRecords = result.rows.length;
    const paidRecords = result.rows.filter(r => r.status_pendaftaran === 'PEMBAYARAN BERHASIL').length;
    const pendingRecords = result.rows.filter(r => r.status_pendaftaran === 'MENUNGGU PEMBAYARAN').length;
    const totalRevenue = result.rows.reduce((acc, r) => acc + (parseFloat(r.biaya) || 0), 0);

    return res.json({
      success: true,
      data: result.rows,
      statistics: {
        total: totalRecords,
        paid: paidRecords,
        pending: pendingRecords,
        revenue: totalRevenue
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/coordinator/acquisitions or /acquisitions
 * Fetches BPU acquisition records of intern participants assigned to this coordinator.
 */
const getCoordinatorAcquisitionsHandler = async (req, res) => {
  try {
    const isCoordinator = req.user.role_id === 2 || req.user.role === 'Koordinator';
    const isAdmin = req.user.role_id === 3 || req.user.role === 'Administrator';

    let result;
    if (isCoordinator) {
      result = await query(
        `SELECT p.*, u.full_name as intern_name, u.unique_id as intern_nim, u.penempatan
         FROM peserta p
         JOIN users u ON p.user_id = u.user_id
         WHERE u.coordinator_id = $1
         ORDER BY p.tanggal_pendaftaran DESC, p.peserta_id DESC`,
        [req.user.user_id]
      );
    } else if (isAdmin) {
      result = await query(
        `SELECT p.*, u.full_name as intern_name, u.unique_id as intern_nim, u.penempatan,
                c.full_name as coordinator_name
         FROM peserta p
         JOIN users u ON p.user_id = u.user_id
         LEFT JOIN users c ON u.coordinator_id = c.user_id
         ORDER BY p.tanggal_pendaftaran DESC, p.peserta_id DESC`
      );
    } else {
      // Participant fallback
      result = await query(
        `SELECT p.*, u.full_name as intern_name, u.unique_id as intern_nim, u.penempatan
         FROM peserta p
         JOIN users u ON p.user_id = u.user_id
         WHERE p.user_id = $1
         ORDER BY p.tanggal_pendaftaran DESC, p.peserta_id DESC`,
        [req.user.user_id]
      );
    }

    const rows = result.rows;
    const totalRecords = rows.length;
    const paidRecords = rows.filter(r => r.status_pendaftaran === 'PEMBAYARAN BERHASIL').length;
    const pendingRecords = rows.filter(r => r.status_pendaftaran === 'MENUNGGU PEMBAYARAN' || r.status_pendaftaran === 'BARU DAFTAR').length;
    const totalRevenue = rows.reduce((acc, r) => acc + (parseFloat(r.biaya) || 0), 0);

    return res.json({
      success: true,
      data: rows,
      statistics: {
        total: totalRecords,
        paid: paidRecords,
        pending: pendingRecords,
        revenue: totalRevenue
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

router.get('/coordinator/acquisitions', authenticateToken, getCoordinatorAcquisitionsHandler);
router.get('/acquisitions', authenticateToken, getCoordinatorAcquisitionsHandler);

/**
 * PUT /api/coordinator/acquisitions/:id/verify or /acquisitions/:id/verify
 */
const verifyAcquisitionHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { status_pendaftaran } = req.body;
    const newStatus = status_pendaftaran || 'PEMBAYARAN BERHASIL';

    // Coordinator isolation: verify acquisition belongs to an assigned student
    if (req.user.role === 'Koordinator' || req.user.role_id === 2) {
      const check = await query(
        `SELECT u.coordinator_id 
         FROM peserta p 
         JOIN users u ON p.user_id = u.user_id 
         WHERE p.peserta_id = $1`,
        [id]
      );
      if (check.rows.length === 0 || check.rows[0].coordinator_id !== req.user.user_id) {
        return res.status(403).json({ success: false, message: 'Akses dilarang. Anda hanya dapat memverifikasi akuisisi anak didik Anda sendiri.' });
      }
    }

    const result = await query(
      `UPDATE peserta
       SET status_pendaftaran = $1, updated_at = CURRENT_TIMESTAMP
       WHERE peserta_id = $2
       RETURNING *`,
      [newStatus, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Data akuisisi BPU tidak ditemukan.' });
    }

    return res.json({
      success: true,
      message: `Status akuisisi berhasil diubah menjadi ${newStatus}.`,
      data: result.rows[0]
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

router.put('/coordinator/acquisitions/:id/verify', authenticateToken, requireRole('Koordinator', 'Administrator'), verifyAcquisitionHandler);
router.put('/acquisitions/:id/verify', authenticateToken, requireRole('Koordinator', 'Administrator'), verifyAcquisitionHandler);

/**
 * POST /api/participant/peserta
 */
router.post('/peserta', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const {
      nama_peserta,
      nik,
      tanggal_pendaftaran,
      no_telepon,
      pekerjaan,
      email,
      status_pendaftaran,
      periode_pelatihan,
      biaya,
      program_terdaftar,
      bukti_pembayaran_link,
      bukti_sosialisasi_link
    } = req.body;

    const result = await query(
      `INSERT INTO peserta (
         user_id, nama_peserta, nik, tanggal_pendaftaran, no_telepon, pekerjaan, email,
         status_pendaftaran, periode_pelatihan, biaya, program_terdaftar, bukti_pembayaran_link,
         bukti_sosialisasi_link, created_at, updated_at
       ) VALUES ($1, $2, $3, COALESCE($4, CURRENT_DATE), $5, $6, $7, COALESCE($8, 'BARU DAFTAR'), $9, COALESCE($10, 0), $11, $12, $13, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [
        userId,
        nama_peserta || null,
        nik || null,
        tanggal_pendaftaran || null,
        no_telepon || null,
        pekerjaan || null,
        email || null,
        status_pendaftaran || 'BARU DAFTAR',
        periode_pelatihan || null,
        biaya ? parseFloat(biaya) : 0,
        program_terdaftar || null,
        bukti_pembayaran_link || null,
        bukti_sosialisasi_link || null
      ]
    );

    // Increment hasil_akuisisi_bpu in progress table automatically
    await query(
      `UPDATE progress 
       SET hasil_akuisisi_bpu = hasil_akuisisi_bpu + 1,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1`,
      [userId]
    );

    return res.status(201).json({
      success: true,
      message: 'Data peserta berhasil ditambahkan.',
      data: result.rows[0]
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/participant/peserta/:id
 */
router.get('/peserta/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(`SELECT * FROM peserta WHERE peserta_id = $1`, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Data peserta tidak ditemukan.' });
    }

    const row = result.rows[0];

    // IDOR Protection: Peserta can only view their own acquisition record
    if ((req.user.role === 'Peserta' || req.user.role_id === 1) && row.user_id !== req.user.user_id) {
      return res.status(403).json({ success: false, message: 'Akses dilarang. Anda hanya dapat melihat data akuisisi Anda sendiri.' });
    }

    // Coordinator isolation
    if (req.user.role === 'Koordinator' || req.user.role_id === 2) {
      const uCheck = await query(`SELECT coordinator_id FROM users WHERE user_id = $1`, [row.user_id]);
      if (uCheck.rows.length === 0 || uCheck.rows[0].coordinator_id !== req.user.user_id) {
        return res.status(403).json({ success: false, message: 'Akses dilarang. Peserta ini tidak berada di bawah bimbingan Anda.' });
      }
    }

    return res.json({ success: true, data: row });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PUT /api/participant/peserta/:id
 */
router.put('/peserta/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Verify existing record ownership
    const check = await query(`SELECT user_id FROM peserta WHERE peserta_id = $1`, [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Data peserta tidak ditemukan.' });
    }

    const ownerId = check.rows[0].user_id;
    if ((req.user.role === 'Peserta' || req.user.role_id === 1) && ownerId !== req.user.user_id) {
      return res.status(403).json({ success: false, message: 'Akses dilarang. Anda hanya dapat mengubah data akuisisi Anda sendiri.' });
    }

    if (req.user.role === 'Koordinator' || req.user.role_id === 2) {
      const uCheck = await query(`SELECT coordinator_id FROM users WHERE user_id = $1`, [ownerId]);
      if (uCheck.rows.length === 0 || uCheck.rows[0].coordinator_id !== req.user.user_id) {
        return res.status(403).json({ success: false, message: 'Akses dilarang. Peserta ini tidak berada di bawah bimbingan Anda.' });
      }
    }

    const {
      nama_peserta,
      nik,
      tanggal_pendaftaran,
      no_telepon,
      pekerjaan,
      email,
      status_pendaftaran,
      periode_pelatihan,
      biaya,
      program_terdaftar,
      bukti_pembayaran_link,
      bukti_sosialisasi_link
    } = req.body;

    const result = await query(
      `UPDATE peserta
       SET nama_peserta = COALESCE($1, nama_peserta),
           nik = COALESCE($2, nik),
           tanggal_pendaftaran = COALESCE($3, tanggal_pendaftaran),
           no_telepon = COALESCE($4, no_telepon),
           pekerjaan = COALESCE($5, pekerjaan),
           email = COALESCE($6, email),
           status_pendaftaran = COALESCE($7, status_pendaftaran),
           periode_pelatihan = COALESCE($8, periode_pelatihan),
           biaya = COALESCE($9, biaya),
           program_terdaftar = COALESCE($10, program_terdaftar),
           bukti_pembayaran_link = COALESCE($11, bukti_pembayaran_link),
           bukti_sosialisasi_link = COALESCE($12, bukti_sosialisasi_link),
           updated_at = CURRENT_TIMESTAMP
       WHERE peserta_id = $13
       RETURNING *`,
      [
        nama_peserta, nik, tanggal_pendaftaran, no_telepon, pekerjaan, email,
        status_pendaftaran, periode_pelatihan, biaya, program_terdaftar,
        bukti_pembayaran_link, bukti_sosialisasi_link, id
      ]
    );

    return res.json({
      success: true,
      message: 'Data peserta berhasil diperbarui.',
      data: result.rows[0]
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * DELETE /api/participant/peserta/:id
 */
router.delete('/peserta/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Verify existing record ownership
    const check = await query(`SELECT user_id FROM peserta WHERE peserta_id = $1`, [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Data peserta tidak ditemukan.' });
    }

    const ownerId = check.rows[0].user_id;
    if ((req.user.role === 'Peserta' || req.user.role_id === 1) && ownerId !== req.user.user_id) {
      return res.status(403).json({ success: false, message: 'Akses dilarang. Anda hanya dapat menghapus data akuisisi Anda sendiri.' });
    }

    if (req.user.role === 'Koordinator' || req.user.role_id === 2) {
      const uCheck = await query(`SELECT coordinator_id FROM users WHERE user_id = $1`, [ownerId]);
      if (uCheck.rows.length === 0 || uCheck.rows[0].coordinator_id !== req.user.user_id) {
        return res.status(403).json({ success: false, message: 'Akses dilarang. Peserta ini tidak berada di bawah bimbingan Anda.' });
      }
    }

    await query(`DELETE FROM peserta WHERE peserta_id = $1`, [id]);
    return res.json({ success: true, message: 'Data peserta berhasil dihapus.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PUT /api/participant/acquisition-result/:id/confirm-payment
 */
router.put('/acquisition-result/:id/confirm-payment', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Verify ownership
    const check = await query(`SELECT user_id FROM peserta WHERE peserta_id = $1`, [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Data peserta tidak ditemukan.' });
    }

    const ownerId = check.rows[0].user_id;
    if ((req.user.role === 'Peserta' || req.user.role_id === 1) && ownerId !== req.user.user_id) {
      return res.status(403).json({ success: false, message: 'Akses dilarang. Anda hanya dapat mengonfirmasi pembayaran akuisisi Anda sendiri.' });
    }

    if (req.user.role === 'Koordinator' || req.user.role_id === 2) {
      const uCheck = await query(`SELECT coordinator_id FROM users WHERE user_id = $1`, [ownerId]);
      if (uCheck.rows.length === 0 || uCheck.rows[0].coordinator_id !== req.user.user_id) {
        return res.status(403).json({ success: false, message: 'Akses dilarang. Peserta ini tidak berada di bawah bimbingan Anda.' });
      }
    }

    const result = await query(
      `UPDATE peserta SET status_pendaftaran = 'PEMBAYARAN BERHASIL', updated_at = CURRENT_TIMESTAMP WHERE peserta_id = $1 RETURNING *`,
      [id]
    );
    return res.json({ success: true, message: 'Status pembayaran berhasil dikonfirmasi.', data: result.rows[0] });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
