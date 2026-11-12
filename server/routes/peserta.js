// api/routes/peserta.js
import { Router } from 'express';
import { query } from '../db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { checkSubmissionVelocityDb, checkDuplicateNikRecent } from '../utils/velocityDetector.js';
import { applyPdpMasking } from '../utils/pdpMasking.js';
import { logActivity } from '../utils/logger.js';
import { computeBlindIndex } from '../utils/blindIndex.js';
import { buildFieldChanges, logEntityChange } from '../utils/auditFormatter.js';

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

    // Retrieve active grading settings dynamically
    const gSetRes = await query(`SELECT * FROM grading_settings ORDER BY id ASC LIMIT 1`);
    const gSettings = gSetRes.rows[0] || { target_akuisisi_bpu: 20, target_kunjungan_bpu: 30 };

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
           ON CONFLICT (user_id) DO UPDATE SET updated_at = CURRENT_TIMESTAMP
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
          ...(userRes.rows[0] || {}),
          target_akuisisi_bpu: parseInt(gSettings.target_akuisisi_bpu, 10) || 20,
          target_kunjungan_bpu: parseInt(gSettings.target_kunjungan_bpu, 10) || 30
        }
      });
    }

    return res.json({ 
      success: true, 
      data: {
        ...result.rows[0],
        target_akuisisi_bpu: parseInt(gSettings.target_akuisisi_bpu, 10) || 20,
        target_kunjungan_bpu: parseInt(gSettings.target_kunjungan_bpu, 10) || 30
      } 
    });
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

    // Apply PDP Masking
    const maskedData = applyPdpMasking(result.rows, req.user.role);

    return res.json({
      success: true,
      data: maskedData,
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
    const pendingRecords = rows.filter(r => r.status_pendaftaran === 'MENUNGGU PEMBAYARAN' || r.status_pendaftaran === 'MENUNGGU VERIFIKASI' || r.status_pendaftaran === 'BARU DAFTAR').length;
    const totalRevenue = rows.reduce((acc, r) => acc + (parseFloat(r.biaya) || 0), 0);
    const maskedRows = applyPdpMasking(rows, req.user.role);

    return res.json({
      success: true,
      data: maskedRows,
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

    const existingRes = await query(
      `SELECT p.*, u.coordinator_id, u.full_name, u.unique_id
       FROM peserta p
       JOIN users u ON p.user_id = u.user_id
       WHERE p.peserta_id = $1`,
      [id]
    );
    if (existingRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Data akuisisi BPU tidak ditemukan.' });
    }
    const existingRow = existingRes.rows[0];

    // Coordinator isolation: verify acquisition belongs to an assigned student
    if ((req.user.role === 'Koordinator' || req.user.role_id === 2) && existingRow.coordinator_id !== req.user.user_id) {
      return res.status(403).json({ success: false, message: 'Akses dilarang. Anda hanya dapat memverifikasi akuisisi anak didik Anda sendiri.' });
    }

    const result = await query(
      `UPDATE peserta
       SET status_pendaftaran = $1, updated_at = CURRENT_TIMESTAMP
       WHERE peserta_id = $2
       RETURNING *`,
      [newStatus, id]
    );

    const changes = buildFieldChanges(existingRow, result.rows[0], [
      { key: 'status_pendaftaran', label: 'Status Pendaftaran' }
    ]);

    await logEntityChange({
      req,
      targetUser: {
        user_id: existingRow.user_id,
        full_name: existingRow.full_name,
        unique_id: existingRow.unique_id
      },
      action: 'ACQUISITION_VERIFIED',
      verb: 'memverifikasi/mengubah',
      entityLabel: 'Status Akuisisi BPU',
      recordContext: `Calon Peserta BPU: ${existingRow.nama_peserta} (ID #${id})`,
      changes
    });

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

    const clientIp = (req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || '127.0.0.1').trim();

    // UU PDP Compliance: Compute HMAC Blind Index for confidential exact matching
    const nikBlindIndex = nik ? computeBlindIndex(nik) : null;

    // 1. Anti-Fraud & Spike Input Velocity Detector (persistent DB-backed)
    const velocity = await checkSubmissionVelocityDb(userId, 5, 15);
    let fraudFlag = 'NORMAL';
    if (velocity.isSpike) {
      fraudFlag = 'FLAGGED_VELOCITY_SPIKE';
      console.warn(`🚨 [Velocity Spike Detected] User #${userId} submitted > 5 records in 15 minutes!`);
      await logActivity({
        userId,
        action: 'ANOMALY_VELOCITY_SPIKE',
        details: velocity.reason,
        req,
        isAnomaly: true,
        anomalyReason: 'Lonjakan input data BPU tidak wajar dalam rentang waktu singkat'
      });
    }

    const isPeserta = req.user.role === 'Peserta' || req.user.role_id === 1;
    let initialStatus = status_pendaftaran || 'BARU DAFTAR';
    if (isPeserta && String(initialStatus).toUpperCase() === 'PEMBAYARAN BERHASIL') {
      initialStatus = bukti_pembayaran_link ? 'MENUNGGU VERIFIKASI' : 'MENUNGGU PEMBAYARAN';
    }

    const result = await query(
      `INSERT INTO peserta (
         user_id, nama_peserta, nik, nik_blind_index, tanggal_pendaftaran, no_telepon, pekerjaan, email,
         status_pendaftaran, periode_pelatihan, biaya, program_terdaftar, bukti_pembayaran_link,
         bukti_sosialisasi_link, fraud_flag, submission_velocity_ip, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, COALESCE($5, CURRENT_DATE), $6, $7, $8, $9, $10, COALESCE($11, 0), $12, $13, $14, $15, $16, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [
        userId,
        nama_peserta || null,
        nik || null,
        nikBlindIndex,
        tanggal_pendaftaran || null,
        no_telepon || null,
        pekerjaan || null,
        email || null,
        initialStatus,
        periode_pelatihan || null,
        biaya ? parseFloat(biaya) : 0,
        program_terdaftar || null,
        bukti_pembayaran_link || null,
        bukti_sosialisasi_link || null,
        fraudFlag,
        clientIp
      ]
    );

    // Increment hasil_akuisisi_bpu in progress table atomically
    await query(
      `INSERT INTO progress (user_id, hasil_akuisisi_bpu, created_at, updated_at)
       VALUES ($1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id) DO UPDATE SET
         hasil_akuisisi_bpu = progress.hasil_akuisisi_bpu + 1,
         updated_at = CURRENT_TIMESTAMP`,
      [userId]
    );

    return res.status(201).json({
      success: true,
      message: velocity.isSpike 
        ? 'Data peserta tersimpan. Catatan: Lonjakan input terdeteksi dan ditandai untuk peninjauan koordinator.' 
        : 'Data peserta berhasil ditambahkan.',
      data: result.rows[0],
      velocity_alert: velocity.isSpike ? velocity.reason : null
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

    return res.json({ success: true, data: applyPdpMasking(row, req.user.role) });
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

    // Verify existing record ownership & snapshot before update
    const check = await query(`SELECT * FROM peserta WHERE peserta_id = $1`, [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Data peserta tidak ditemukan.' });
    }

    const prevPeserta = check.rows[0];
    const ownerId = prevPeserta.user_id;
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

    const nikBlindIndex = nik ? computeBlindIndex(nik) : undefined;
    const isPeserta = req.user.role === 'Peserta' || req.user.role_id === 1;
    let safeStatus = status_pendaftaran;
    if (isPeserta && safeStatus && String(safeStatus).toUpperCase() === 'PEMBAYARAN BERHASIL') {
      safeStatus = undefined; // Peserta cannot self-approve final payment
    }

    const result = await query(
      `UPDATE peserta
       SET nama_peserta = COALESCE($1, nama_peserta),
           nik = COALESCE($2, nik),
           nik_blind_index = COALESCE($3, nik_blind_index),
           tanggal_pendaftaran = COALESCE($4, tanggal_pendaftaran),
           no_telepon = COALESCE($5, no_telepon),
           pekerjaan = COALESCE($6, pekerjaan),
           email = COALESCE($7, email),
           status_pendaftaran = COALESCE($8, status_pendaftaran),
           periode_pelatihan = COALESCE($9, periode_pelatihan),
           biaya = COALESCE($10, biaya),
           program_terdaftar = COALESCE($11, program_terdaftar),
           bukti_pembayaran_link = COALESCE($12, bukti_pembayaran_link),
           bukti_sosialisasi_link = COALESCE($13, bukti_sosialisasi_link),
           updated_at = CURRENT_TIMESTAMP
       WHERE peserta_id = $14
       RETURNING *`,
      [
        nama_peserta, nik, nikBlindIndex, tanggal_pendaftaran, no_telepon, pekerjaan, email,
        safeStatus, periode_pelatihan, biaya, program_terdaftar,
        bukti_pembayaran_link, bukti_sosialisasi_link, id
      ]
    );

    const changes = buildFieldChanges(prevPeserta, result.rows[0], [
      { key: 'nama_peserta', label: 'Nama Calon BPU' },
      { key: 'status_pendaftaran', label: 'Status Pendaftaran' },
      { key: 'biaya', label: 'Biaya Iuran', type: 'number' },
      { key: 'program_terdaftar', label: 'Program' },
      { key: 'periode_pelatihan', label: 'Periode' },
      { key: 'pekerjaan', label: 'Pekerjaan' }
    ]);

    if (changes.length > 0 || !isPeserta) {
      await logEntityChange({
        req,
        targetUserId: ownerId,
        action: 'ACQUISITION_UPDATED',
        verb: 'mengubah',
        entityLabel: 'Data Akuisisi BPU',
        recordContext: `Calon Peserta BPU: ${result.rows[0].nama_peserta} (ID #${id})`,
        changes
      });
    }

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

    // Verify existing record ownership & snapshot before deletion
    const check = await query(`SELECT peserta_id, user_id, nama_peserta, status_pendaftaran, program_terdaftar FROM peserta WHERE peserta_id = $1`, [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Data peserta tidak ditemukan.' });
    }

    const deletedRow = check.rows[0];
    const ownerId = deletedRow.user_id;
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
    await query(
      `UPDATE progress
       SET hasil_akuisisi_bpu = GREATEST(0, hasil_akuisisi_bpu - 1),
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1`,
      [ownerId]
    );

    await logEntityChange({
      req,
      targetUserId: ownerId,
      action: 'ACQUISITION_DELETED',
      verb: 'menghapus',
      entityLabel: 'Data Akuisisi BPU',
      recordContext: `Calon Peserta BPU: ${deletedRow.nama_peserta} (ID #${id})`,
      changes: [{ label: 'Status Pendaftaran', from: deletedRow.status_pendaftaran || '-', to: 'DIHAPUS' }]
    });

    return res.json({ success: true, message: 'Data peserta berhasil dihapus.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/participant/acquisition-result/:id/upload-payment-proof
 * & upload-socialization-proof
 */
const handleProofUpload = (fieldType) => async (req, res) => {
  try {
    const pesertaId = parseInt(req.params.id, 10);
    if (!Number.isInteger(pesertaId) || pesertaId <= 0) {
      return res.status(400).json({ success: false, message: 'ID peserta tidak valid.' });
    }

    const check = await query(`SELECT user_id FROM peserta WHERE peserta_id = $1`, [pesertaId]);
    if (check.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Data peserta tidak ditemukan.' });
    }
    const ownerId = check.rows[0].user_id;
    if ((req.user.role === 'Peserta' || req.user.role_id === 1) && ownerId !== req.user.user_id) {
      return res.status(403).json({ success: false, message: 'Akses dilarang.' });
    }
    if (req.user.role === 'Koordinator' || req.user.role_id === 2) {
      const uCheck = await query(`SELECT coordinator_id FROM users WHERE user_id = $1`, [ownerId]);
      if (uCheck.rows.length === 0 || uCheck.rows[0].coordinator_id !== req.user.user_id) {
        return res.status(403).json({ success: false, message: 'Akses dilarang.' });
      }
    }

    const { fileDataUri, link, file_url } = req.body;
    const proofVal = fileDataUri || link || file_url;
    if (!proofVal) {
      return res.status(400).json({ success: false, message: 'Berkas atau tautan bukti wajib disertakan dalam JSON.' });
    }

    const col = fieldType === 'payment' ? 'bukti_pembayaran_link' : 'bukti_sosialisasi_link';
    const result = await query(
      `UPDATE peserta
       SET ${col} = $1,
           status_pendaftaran = CASE
             WHEN $2 = 'payment' AND status_pendaftaran != 'PEMBAYARAN BERHASIL' THEN 'MENUNGGU VERIFIKASI'
             ELSE status_pendaftaran
           END,
           updated_at = CURRENT_TIMESTAMP
       WHERE peserta_id = $3
       RETURNING *`,
      [proofVal, fieldType, pesertaId]
    );

    return res.json({
      success: true,
      message: `Bukti ${fieldType === 'payment' ? 'pembayaran' : 'sosialisasi'} berhasil disimpan.`,
      data: applyPdpMasking(result.rows[0], req.user.role)
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

router.post('/acquisition-result/:id/upload-payment-proof', authenticateToken, handleProofUpload('payment'));
router.post('/acquisition-result/:id/upload-socialization-proof', authenticateToken, handleProofUpload('socialization'));

/**
 * PUT /api/participant/acquisition-result/:id/confirm-payment
 * Restricted to Coordinator/Admin approval (or Participant submits verification request)
 */
router.put('/acquisition-result/:id/confirm-payment', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Verify record
    const check = await query(`SELECT user_id, nama_peserta, status_pendaftaran, bukti_pembayaran_link FROM peserta WHERE peserta_id = $1`, [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Data peserta tidak ditemukan.' });
    }

    const ownerId = check.rows[0].user_id;
    const isPeserta = req.user.role === 'Peserta' || req.user.role_id === 1;
    if (isPeserta) {
      if (ownerId !== req.user.user_id) {
        return res.status(403).json({ success: false, message: 'Akses dilarang.' });
      }
      if (!check.rows[0].bukti_pembayaran_link && !req.body?.bukti_pembayaran_link) {
        return res.status(403).json({
          success: false,
          message: 'Unggah bukti pembayaran terlebih dahulu; persetujuan akhir dilakukan oleh Koordinator Pembimbing.'
        });
      }
      const pendingRes = await query(
        `UPDATE peserta
         SET bukti_pembayaran_link = COALESCE($1, bukti_pembayaran_link),
             status_pendaftaran = 'MENUNGGU VERIFIKASI',
             updated_at = CURRENT_TIMESTAMP
         WHERE peserta_id = $2
         RETURNING *`,
        [req.body?.bukti_pembayaran_link || null, id]
      );
      return res.json({
        success: true,
        message: 'Pengajuan verifikasi pembayaran dikirim ke Koordinator.',
        data: applyPdpMasking(pendingRes.rows[0], req.user.role)
      });
    }

    if (req.user.role === 'Koordinator' || req.user.role_id === 2) {
      const uCheck = await query(`SELECT coordinator_id FROM users WHERE user_id = $1`, [ownerId]);
      if (uCheck.rows.length === 0 || uCheck.rows[0].coordinator_id !== req.user.user_id) {
        return res.status(403).json({ success: false, message: 'Akses dilarang. Peserta ini tidak berada di bawah bimbingan Anda.' });
      }
    }

    const prevPeserta = check.rows[0];
    const result = await query(
      `UPDATE peserta SET status_pendaftaran = 'PEMBAYARAN BERHASIL', updated_at = CURRENT_TIMESTAMP WHERE peserta_id = $1 RETURNING *`,
      [id]
    );

    const changes = buildFieldChanges(prevPeserta, result.rows[0], [
      { key: 'status_pendaftaran', label: 'Status Pendaftaran' }
    ]);

    await logEntityChange({
      req,
      targetUserId: ownerId,
      action: 'ACQUISITION_PAYMENT_CONFIRMED',
      verb: 'mengonfirmasi pembayaran',
      entityLabel: 'Status Akuisisi BPU',
      recordContext: `Calon Peserta BPU: ${prevPeserta.nama_peserta || `ID #${id}`} (ID #${id})`,
      changes
    });

    return res.json({ success: true, message: 'Status pembayaran berhasil dikonfirmasi.', data: result.rows[0] });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/participant/peserta/search-blind-index
 * Blind index exact search compliant with UU PDP No. 27/2022
 */
router.get('/search-blind-index', authenticateToken, async (req, res) => {
  try {
    const { nik } = req.query;
    if (!nik) {
      return res.status(400).json({ success: false, message: 'Parameter query NIK wajib diisi.' });
    }

    const blindHash = computeBlindIndex(nik);
    let sql = `
      SELECT p.*, u.full_name as intern_name 
      FROM peserta p 
      JOIN users u ON p.user_id = u.user_id 
      WHERE p.nik_blind_index = $1
    `;
    const params = [blindHash];

    if (req.user.role === 'Peserta' || req.user.role_id === 1) {
      params.push(req.user.user_id);
      sql += ` AND p.user_id = $${params.length}`;
    } else if (req.user.role === 'Koordinator' || req.user.role_id === 2) {
      params.push(req.user.user_id);
      sql += ` AND u.coordinator_id = $${params.length}`;
    }

    const result = await query(sql, params);

    const masked = applyPdpMasking(result.rows, req.user.role);
    return res.json({
      success: true,
      blindIndexUsed: true,
      matchCount: result.rows.length,
      data: masked
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
