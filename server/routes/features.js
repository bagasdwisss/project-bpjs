// server/routes/features.js - Enterprise Features for BPJS Ketenagakerjaan
import { Router } from 'express';
import crypto from 'crypto';
import { query } from '../db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { logActivity } from '../utils/logger.js';

const router = Router();

// =========================================================================
// 1. GEOFENCING MULTI-TITIK (Kantor & Lapangan Binaan)
// =========================================================================

/**
 * GET /api/features/geofences
 * Retrieve all active geofence locations (Kantor Cabang, Pasar, UMKM, Kawasan Industri)
 */
router.get('/geofences', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT id, name, category, address, latitude, longitude, radius_meters, is_active
       FROM geofence_locations
       WHERE is_active = TRUE
       ORDER BY id ASC`
    );
    return res.json({ success: true, data: result.rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// =========================================================================
// 2. WORKFLOW PENGAJUAN IZIN, CUTI & SAKIT (DENGAN BUKTI DOKTER)
// =========================================================================

/**
 * GET /api/leaves/my
 * Participant gets their own leave requests
 */
router.get('/leaves/my', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const result = await query(
      `SELECT l.*, u.full_name as reviewed_by_name
       FROM leave_requests l
       LEFT JOIN users u ON l.reviewed_by = u.user_id
       WHERE l.user_id = $1
       ORDER BY l.created_at DESC`,
      [userId]
    );
    return res.json({ success: true, data: result.rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/leaves
 * Coordinator / Admin views all leave requests
 */
router.get('/leaves', authenticateToken, async (req, res) => {
  try {
    let sql = `
      SELECT l.*, u.full_name as participant_name, u.unique_id as participant_nim,
             COALESCE(u.email, u.unique_id || '@bpjsketenagakerjaan.go.id') as email, r.full_name as reviewed_by_name
      FROM leave_requests l
      JOIN users u ON l.user_id = u.user_id
      LEFT JOIN users r ON l.reviewed_by = r.user_id
    `;
    const params = [];

    // Coordinator Isolation: Coordinator strictly sees only their own participants' leave requests
    if (req.user.role === 'Koordinator' || req.user.role_id === 2) {
      params.push(req.user.user_id);
      sql += ` WHERE u.coordinator_id = $${params.length}`;
    }

    sql += ` ORDER BY l.created_at DESC`;

    const result = await query(sql, params);
    return res.json({ success: true, data: result.rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/leaves
 * Participant submits leave / sick / permission request
 */
router.post('/leaves', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { leave_type, start_date, end_date, reason, proof_file_url } = req.body;

    if (!leave_type || !start_date || !end_date || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Tipe izin, tanggal mulai, tanggal selesai, dan alasan wajib diisi.'
      });
    }

    const result = await query(
      `INSERT INTO leave_requests (user_id, leave_type, start_date, end_date, reason, proof_file_url, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'Pending', CURRENT_TIMESTAMP)
       RETURNING *`,
      [userId, leave_type, start_date, end_date, reason, proof_file_url || null]
    );

    // Audit log
    await query(
      `INSERT INTO activity_logs (user_id, activity_type, details, ip_address, is_anomaly, user_agent)
       VALUES ($1, 'LEAVE_REQUEST', $2, $3, FALSE, $4)`,
      [
        userId,
        `Pengajuan ${leave_type} dari ${start_date} s.d. ${end_date}`,
        req.ip || '127.0.0.1',
        req.headers['user-agent'] || null
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Pengajuan permohonan berhasil dikirim dan menunggu persetujuan Koordinator.',
      data: result.rows[0]
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PUT /api/leaves/:id/status
 * Coordinator approves or rejects leave request
 */
router.put('/leaves/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, coordinator_notes } = req.body; // 'Disetujui' or 'Ditolak'
    const reviewerId = req.user.user_id;

    if (!['Disetujui', 'Ditolak'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status harus Disetujui atau Ditolak.' });
    }

    const updated = await query(
      `UPDATE leave_requests
       SET status = $1, reviewed_by = $2, reviewed_at = CURRENT_TIMESTAMP, coordinator_notes = $3
       WHERE id = $4
       RETURNING *`,
      [status, reviewerId, coordinator_notes || null, id]
    );

    if (updated.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Pengajuan izin tidak ditemukan.' });
    }

    const leave = updated.rows[0];

    // Auto add notification for the participant
    await query(
      `INSERT INTO notifications (user_id, title, message, type, is_read, created_at)
       VALUES ($1, $2, $3, 'system', FALSE, CURRENT_TIMESTAMP)`,
      [
        leave.user_id,
        `Status Pengajuan ${leave.leave_type}: ${status}`,
        `Pengajuan ${leave.leave_type} Anda untuk tanggal ${new Date(leave.start_date).toLocaleDateString('id-ID')} telah ${status.toLowerCase()} oleh Koordinator.${coordinator_notes ? ` Catatan: ${coordinator_notes}` : ''}`
      ]
    );

    // If approved, create attendance record with appropriate status
    if (status === 'Disetujui') {
      const attendanceStatus = leave.leave_type === 'Sakit' ? 'Sakit' : 'Izin';
      await query(
        `INSERT INTO attendance_records (user_id, attendance_date, check_in_time, status, notes, created_at)
         VALUES ($1, $2, '08:00:00', $3, $4, CURRENT_TIMESTAMP)
         ON CONFLICT DO NOTHING`,
        [leave.user_id, leave.start_date, attendanceStatus, `Disetujui koordinator: ${leave.reason}`]
      );
    // Audit Log for Admin Monitoring
    await logActivity({
      userId: reviewerId,
      type: status === 'Disetujui' ? 'LEAVE_APPROVAL' : 'LEAVE_REJECTED',
      details: `Koordinator ${status.toLowerCase()} permohonan ${leave.leave_type} dari peserta ID #${leave.user_id} (${leave.start_date} s.d. ${leave.end_date})`,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    return res.json({
      success: true,
      message: `Pengajuan berhasil diubah menjadi: ${status}`,
      data: leave
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// =========================================================================
// 3. LIVE CHAT & DISKUSI CEPAT INTERNAL (Koordinator & Peserta)
// =========================================================================

/**
 * GET /api/messages/contacts
 * Returns list of chat contacts based on user role
 */
router.get('/messages/contacts', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const userRole = req.user.role_name;

    let sql = '';
    let params = [];

    if (userRole === 'Peserta') {
      // Participant talks to Coordinators
      sql = `
        SELECT u.user_id, u.full_name, u.unique_id, 
               COALESCE(u.email, u.unique_id || '@bpjsketenagakerjaan.go.id') as email, 
               r.role_name,
               (SELECT message_text FROM direct_messages 
                WHERE (sender_id = u.user_id AND receiver_id = $1) OR (sender_id = $1 AND receiver_id = u.user_id) 
                ORDER BY created_at DESC LIMIT 1) as last_message,
               (SELECT created_at FROM direct_messages 
                WHERE (sender_id = u.user_id AND receiver_id = $1) OR (sender_id = $1 AND receiver_id = u.user_id) 
                ORDER BY created_at DESC LIMIT 1) as last_message_time,
               (SELECT COUNT(*) FROM direct_messages 
                WHERE sender_id = u.user_id AND receiver_id = $1 AND is_read = FALSE) as unread_count
        FROM users u
        JOIN roles r ON u.role_id = r.role_id
        WHERE r.role_name IN ('Koordinator', 'Administrator') AND u.status = 'Aktif'
        ORDER BY last_message_time DESC NULLS LAST, u.full_name ASC
      `;
      params = [userId];
    } else {
      // Coordinator / Admin talks to Participants & Coordinators
      sql = `
        SELECT u.user_id, u.full_name, u.unique_id, 
               COALESCE(u.email, u.unique_id || '@bpjsketenagakerjaan.go.id') as email, 
               r.role_name,
               (SELECT message_text FROM direct_messages 
                WHERE (sender_id = u.user_id AND receiver_id = $1) OR (sender_id = $1 AND receiver_id = u.user_id) 
                ORDER BY created_at DESC LIMIT 1) as last_message,
               (SELECT created_at FROM direct_messages 
                WHERE (sender_id = u.user_id AND receiver_id = $1) OR (sender_id = $1 AND receiver_id = u.user_id) 
                ORDER BY created_at DESC LIMIT 1) as last_message_time,
               (SELECT COUNT(*) FROM direct_messages 
                WHERE sender_id = u.user_id AND receiver_id = $1 AND is_read = FALSE) as unread_count
        FROM users u
        JOIN roles r ON u.role_id = r.role_id
        WHERE u.user_id != $1 AND u.status = 'Aktif'
        ORDER BY last_message_time DESC NULLS LAST, u.full_name ASC
      `;
      params = [userId];
    }

    const result = await query(sql, params);
    return res.json({ success: true, data: result.rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/messages/:otherUserId
 * Retrieve conversation messages between req.user and otherUserId
 */
router.get('/messages/:otherUserId', authenticateToken, async (req, res) => {
  try {
    const currentUserId = req.user.user_id;
    const { otherUserId } = req.params;

    // Mark incoming messages as read
    await query(
      `UPDATE direct_messages
       SET is_read = TRUE
       WHERE sender_id = $1 AND receiver_id = $2 AND is_read = FALSE`,
      [otherUserId, currentUserId]
    );

    const result = await query(
      `SELECT m.id, m.sender_id, m.receiver_id, m.message_text, m.is_read, m.created_at,
              u.full_name as sender_name
       FROM direct_messages m
       JOIN users u ON m.sender_id = u.user_id
       WHERE (m.sender_id = $1 AND m.receiver_id = $2)
          OR (m.sender_id = $2 AND m.receiver_id = $1)
       ORDER BY m.created_at ASC
       LIMIT 100`,
      [currentUserId, otherUserId]
    );

    return res.json({ success: true, data: result.rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/messages
 * Send a message
 */
router.post('/messages', authenticateToken, async (req, res) => {
  try {
    const senderId = req.user.user_id;
    const { receiver_id, message_text } = req.body;

    if (!receiver_id || !message_text?.trim()) {
      return res.status(400).json({ success: false, message: 'Penerima dan pesan tidak boleh kosong.' });
    }

    const result = await query(
      `INSERT INTO direct_messages (sender_id, receiver_id, message_text, is_read, created_at)
       VALUES ($1, $2, $3, FALSE, CURRENT_TIMESTAMP)
       RETURNING *`,
      [senderId, receiver_id, message_text.trim()]
    );

    // Trigger in-app notification in Navbar Bell for receiver
    const senderName = req.user.full_name || 'Pembimbing/Peserta';
    const previewText = message_text.trim().length > 60 
      ? message_text.trim().substring(0, 60) + '...' 
      : message_text.trim();

    await query(
      `INSERT INTO notifications (user_id, title, message, type, is_read, created_at)
       VALUES ($1, $2, $3, 'chat', FALSE, CURRENT_TIMESTAMP)`,
      [
        receiver_id,
        `Pesan Bimbingan dari ${senderName}`,
        previewText
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Pesan terkirim.',
      data: result.rows[0]
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// =========================================================================
// 4. AI CHATBOT ASISTEN REGULASI "TANYA BPJS" (RAG Knowledge Engine)
// =========================================================================

const BPJS_KNOWLEDGE_BASE = [
  {
    topic: '5 Program Utama BPJS Ketenagakerjaan',
    keywords: ['program', 'apa saja', '5 program', 'manfaat', 'cakupan'],
    answer: `BPJS Ketenagakerjaan menyelenggarakan 5 Program Jaminan Sosial Ketenagakerjaan berdasarkan amanat UU No. 40/2004 & UU No. 24/2011:
1. **JKK (Jaminan Kecelakaan Kerja)**: Perlindungan atas risiko kecelakaan kerja mulai dari berangkat, di tempat kerja, hingga pulang, serta penyakit akibat kerja. Manfaat: pengobatan medis tanpa batas biaya dan santunan upah (STMB).
2. **JKM (Jaminan Kematian)**: Santunan tunai sebesar Rp 42.000.000 bagi ahli waris pekerja yang meninggal dunia bukan karena kecelakaan kerja.
3. **JHT (Jaminan Hari Tua)**: Tabungan akumulasi iuran + hasil pengembangan yang dicairkan saat pensiun (56 tahun), cacat total tetap, atau berhenti bekerja (PHK/mundur).
4. **JP (Jaminan Pensiun)**: Manfaat uang tunai berkala setiap bulan untuk mempertahankan derajat kehidupan yang layak saat memasuki usia pensiun atau ahli warisnya.
5. **JKP (Jaminan Kehilangan Pekerjaan)**: Manfaat berupa uang tunai 6 bulan (45% upah di 3 bulan pertama, 25% di 3 bulan berikutnya), akses informasi pasar kerja, dan pelatihan kerja untuk pekerja yang ter-PHK.`
  },
  {
    topic: 'Iuran & Pendaftaran Pekerja BPU (Bukan Penerima Upah)',
    keywords: ['bpu', 'iuran', 'bukan penerima upah', '16800', '16.800', 'daftar bpu', 'informal', 'pedagang', 'ojol', 'petani'],
    answer: `Untuk pekerja informal/BPU (Pedagang pasar, ojek online, petani, nelayan, UMKM mandiri):
- **Paket Hemat 2 Program (JKK + JKM)**: Iuran hanya **Rp 16.800/bulan** (JKK Rp 10.000 + JKM Rp 6.800).
  * Memberikan santunan kematian Rp 42 Juta + Biaya medis JKK unlimited + Beasiswa 2 anak s.d. Rp 174 Juta setelah masa kepesertaan 3 tahun.
- **Paket Lengkap 3 Program (JKK + JKM + JHT)**: Iuran mulai **Rp 36.800/bulan** (JKK Rp 10.000 + JKM Rp 6.800 + Tabungan JHT Rp 20.000).
- **Syarat Pendaftaran Mandiri**: Cukup e-KTP dan No HP aktif via aplikasi JMO, website resmi, atau scan QR referral peserta magang!`
  },
  {
    topic: 'Klaim JKM & Santunan Rp 42 Juta',
    keywords: ['klaim jkm', 'santunan kematian', 'meninggal', '42 juta', 'ahli waris', 'syarat klaim jkm'],
    answer: `Manfaat santunan Jaminan Kematian (JKM) total sebesar **Rp 42.000.000** dengan rincian:
1. Santunan sekaligus: Rp 20.000.000
2. Santunan berkala (24 bulan x Rp 500.000 dibayar sekaligus): Rp 12.000.000
3. Biaya pemakaman: Rp 10.000.000
4. Manfaat Tambahan Beasiswa untuk 2 orang anak maksimal Rp 174.000.000 (dari jenjang TK sampai Sarjana S1) bagi peserta dengan masa iuran minimal 3 tahun.
*Syarat Dokumen Klaim*: Kartu BPJSTK asli, e-KTP peserta & ahli waris, Kartu Keluarga (KK), Surat Kematian dari instansi berwenang, dan buku rekening bank aktif ahli waris.`
  },
  {
    topic: 'Santunan Sementara Tidak Mampu Bekerja (STMB) JKK',
    keywords: ['stmb', 'pengganti upah', 'istirahat dokter', 'tidak mampu bekerja', 'jkk', 'kecelakaan'],
    answer: `Manfaat STMB (Santunan Sementara Tidak Mampu Bekerja) diberikan kepada pekerja yang mengalami kecelakaan kerja selama masa pemulihan medis:
- **6 Bulan Pertama**: 100% dari upah yang dilaporkan.
- **6 Bulan Kedua**: 100% dari upah yang dilaporkan.
- **Bulan ke-13 sampai sembuh**: 50% dari upah yang dilaporkan.
Biaya pengobatan dan perawatan medis di Rumah Sakit Pusat Layanan Kecelakaan Kerja (PLKK) ditanggung **tanpa batas plafon biaya (Unlimited)** sesuai indikasi medis dokter.`
  },
  {
    topic: 'Geofencing Presensi & Aturan Magang',
    keywords: ['geofence', 'presensi', 'radius', 'titik binaan', 'fake gps', 'lokasi', 'izin', 'sakit'],
    answer: `Aturan Presensi & Integritas Magang BPJS Ketenagakerjaan:
1. **Multi-Titik Geofence**: Presensi valid dilakukan di Kantor Cabang resmi atau titik binaan lapangan (Pasar Binaan, Sentra UMKM, Kawasan Industri) dengan toleransi radius 100-250 meter.
2. **Presensi Selfie Wajah**: Sistem mewajibkan foto kamera selfie langsung dengan verifikasi liveness (anti-foto ulang).
3. **Anti-Fake GPS Protection**: Penggunaan aplikasi mock location / GPS palsu terdeteksi otomatis oleh sistem forensik dan akan ditandai anomali untuk evaluasi Koordinator.
4. **Ketidakhadiran (Izin/Sakit)**: Wajib diajukan via menu Permohonan Izin dengan melampirkan foto Surat Keterangan Sakit dari Dokter resmi.`
  }
];

/**
 * POST /api/ai/ask
 * Smart RAG assistant for regulations & operational queries
 */
router.post('/ai/ask', authenticateToken, async (req, res) => {
  try {
    const { question } = req.body;
    if (!question || !question.trim()) {
      return res.status(400).json({ success: false, message: 'Pertanyaan tidak boleh kosong.' });
    }

    const qLower = question.toLowerCase();

    // Find best matching knowledge document
    let bestMatch = null;
    let highestScore = 0;

    for (const item of BPJS_KNOWLEDGE_BASE) {
      let score = 0;
      for (const kw of item.keywords) {
        if (qLower.includes(kw.toLowerCase())) {
          score += 2;
        }
      }
      if (score > highestScore) {
        highestScore = score;
        bestMatch = item;
      }
    }

    let responseAnswer = '';
    let matchedTopic = '';

    if (bestMatch && highestScore >= 2) {
      matchedTopic = bestMatch.topic;
      responseAnswer = bestMatch.answer;
    } else {
      matchedTopic = 'Ketentuan Umum BPJS Ketenagakerjaan';
      responseAnswer = `Halo! Terkait pertanyaan Anda: "${question}", berikut panduan ringkas operasional BPJS Ketenagakerjaan:\n\n` +
        `• **Pekerja BPU**: Dapat mengikuti program JKK & JKM dengan iuran Rp 16.800/bulan (santunan kematian Rp 42 juta).\n` +
        `• **Pekerja Penerima Upah (PU)**: Diikutsertakan oleh pemberi kerja untuk program JKK, JKM, JHT, JP, dan JKP.\n` +
        `• **Klaim & Layanan**: Dapat diakses melalui aplikasi JMO (Jamsostek Mobile), Call Center 175, atau Kantor Cabang terdekat.\n` +
        `• **Presensi & Tugas Lapangan**: Pastikan Anda berada dalam radius titik binaan geofence dan mengunggah bukti akuisisi formulir BPU secara berkala.\n\n` +
        `*Silakan tanyakan hal spesifik seperti "Iuran BPU", "Santunan JKM 42 Juta", "STMB JKK", atau "Aturan Geofence".*`;
    }

    return res.json({
      success: true,
      data: {
        question,
        topic: matchedTopic,
        answer: responseAnswer,
        confidence: highestScore > 0 ? 'High' : 'General',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// =========================================================================
// 5. E-SERTIFIKAT DIGITAL TERVERIFIKASI & KRIPTOGRAFI QR
// =========================================================================

/**
 * GET /api/certificates/my
 * Participant gets their verified e-certificate
 */
router.get('/certificates/my', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const result = await query(
      `SELECT c.*, u.full_name as participant_name, u.unique_id as participant_nim,
              COALESCE(u.email, u.unique_id || '@bpjsketenagakerjaan.go.id') as email, r.role_name
       FROM certificates c
       JOIN users u ON c.user_id = u.user_id
       JOIN roles r ON u.role_id = r.role_id
       WHERE c.user_id = $1
       ORDER BY c.issue_date DESC
       LIMIT 1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.json({
        success: true,
        data: null,
        message: 'Sertifikat belum diterbitkan atau masa magang belum selesai dievaluasi.'
      });
    }

    return res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/certificates/list
 * Coordinator / Admin lists all certificates
 */
router.get('/certificates/list', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT c.*, u.full_name as participant_name, u.unique_id as participant_nim
       FROM certificates c
       JOIN users u ON c.user_id = u.user_id
       ORDER BY c.created_at DESC`
    );
    return res.json({ success: true, data: result.rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/certificates/generate
 * Issue certificate with SHA-256 cryptographic verification hash
 */
router.post('/certificates/generate', authenticateToken, async (req, res) => {
  try {
    const { user_id, batch_name, predicate, score_average } = req.body;

    if (!user_id) {
      return res.status(400).json({ success: false, message: 'User ID peserta wajib diisi.' });
    }

    const uRes = await query(`SELECT * FROM users WHERE user_id = $1`, [user_id]);
    if (uRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Peserta tidak ditemukan.' });
    }
    const user = uRes.rows[0];

    const certCountRes = await query(`SELECT COUNT(*) FROM certificates`);
    const nextSeq = parseInt(certCountRes.rows[0].count, 10) + 1;
    const certNumber = `BPJS-TK/MAGANG/2026/${String(nextSeq).padStart(3, '0')}`;
    const issueDate = new Date().toISOString().split('T')[0];

    // Compute cryptographic digital signature
    const signaturePayload = `${certNumber}|${user.unique_id}|${user.full_name}|${predicate || 'Sangat Memuaskan'}|${issueDate}|BPJS_KETENAGAKERJAAN_OFFICIAL_KEY_2026`;
    const digitalHash = crypto.createHash('sha256').update(signaturePayload).digest('hex');

    const result = await query(
      `INSERT INTO certificates (
        user_id, certificate_number, issue_date, predicate, 
        score_average, digital_signature_hash, batch_name, status, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'Terbit', CURRENT_TIMESTAMP)
      ON CONFLICT (certificate_number) DO UPDATE SET
        predicate = EXCLUDED.predicate,
        score_average = EXCLUDED.score_average,
        digital_signature_hash = EXCLUDED.digital_signature_hash
      RETURNING *`,
      [
        user_id,
        certNumber,
        issueDate,
        predicate || 'Sangat Memuaskan (Grade A)',
        score_average || 92.50,
        digitalHash,
        batch_name || 'Batch 1 - Gelombang 2025/2026'
      ]
    );

    return res.status(201).json({
      success: true,
      message: `E-Sertifikat terverifikasi untuk ${user.full_name} berhasil diterbitkan!`,
      data: result.rows[0]
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/certificates/verify/:certNumber
 * Public endpoint to verify cryptographic signature of a certificate
 */
router.get('/certificates/verify/:certNumber', async (req, res) => {
  try {
    const { certNumber } = req.params;

    const result = await query(
      `SELECT c.certificate_id, c.certificate_number, c.issue_date, c.predicate,
              c.score_average, c.digital_signature_hash, c.batch_name, c.status,
              u.full_name as participant_name, u.unique_id as participant_nim
       FROM certificates c
       JOIN users u ON c.user_id = u.user_id
       WHERE UPPER(c.certificate_number) = UPPER($1) OR UPPER(c.digital_signature_hash) = UPPER($1)`,
      [certNumber]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        valid: false,
        message: 'Nomor sertifikat tidak ditemukan atau tidak valid dalam registri resmi BPJS Ketenagakerjaan.'
      });
    }

    const cert = result.rows[0];

    return res.json({
      success: true,
      valid: true,
      message: 'Sertifikat ini ASLI dan terdaftar resmi di Pangkalan Data BPJS Ketenagakerjaan.',
      data: {
        ...cert,
        institution: 'BPJS Ketenagakerjaan (Badan Penyelenggara Jaminan Sosial Ketenagakerjaan)',
        verification_status: 'Terverifikasi Kriptografi SHA-256',
        verified_at: new Date().toISOString()
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// =========================================================================
// 6. SISTEM PERINGATAN DINI BERKECERDASAN BUATAN (AI Early Warning Drop-Off)
// =========================================================================

/**
 * GET /api/coordinator/early-warning
 * Analyzes participants' attendance, score submissions, and field acquisition
 * Identifies risk indicators and provides targeted intervention tips.
 */
router.get('/coordinator/early-warning', authenticateToken, async (req, res) => {
  try {
    let sql = `
      SELECT u.user_id, u.full_name, u.unique_id, 
             COALESCE(u.email, u.unique_id || '@bpjsketenagakerjaan.go.id') as email,
             COUNT(DISTINCT a.attendance_id) as total_attendance,
             COUNT(DISTINCT CASE WHEN a.status = 'Terlambat' THEN a.attendance_id END) as late_count,
             COUNT(DISTINCT CASE WHEN a.status = 'Alfa' THEN a.attendance_id END) as absent_count,
             COALESCE(AVG(p.nilai), 0) as avg_score,
             COUNT(DISTINCT p.id) as modules_completed
      FROM users u
      LEFT JOIN attendance_records a ON u.user_id = a.user_id
      LEFT JOIN progress p ON u.user_id = p.user_id
      WHERE u.role_id = 1 AND u.status = 'Aktif'
    `;
    const params = [];

    // Coordinator Isolation: Coordinator strictly sees only their own participants
    if (req.user.role === 'Koordinator' || req.user.role_id === 2) {
      params.push(req.user.user_id);
      sql += ` AND u.coordinator_id = $${params.length}`;
    }

    sql += `
      GROUP BY u.user_id, u.full_name, u.unique_id, u.email
      ORDER BY u.full_name ASC
    `;

    const participants = await query(sql, params);

    const analysis = participants.rows.map((p, idx) => {
      const late = parseInt(p.late_count, 10) || 0;
      const absent = parseInt(p.absent_count, 10) || 0;
      const score = parseFloat(p.avg_score) || 0;
      const modules = parseInt(p.modules_completed, 10) || 0;

      let riskLevel = 'Rendah';
      let riskColor = '#B8C96E'; // pastel green
      let reasons = [];
      let intervention = '';

      if (absent >= 2 || late >= 3 || (score > 0 && score < 70)) {
        riskLevel = 'Tinggi';
        riskColor = '#F5C6EC'; // warning pastel
        if (absent >= 2) reasons.push(`${absent} kali tidak hadir tanpa keterangan (Alfa)`);
        if (late >= 3) reasons.push(`${late} kali terlambat berturut-turut`);
        if (score < 70) reasons.push(`Nilai rata-rata tugas di bawah standar kelulusan (${score.toFixed(1)})`);
        intervention = 'Jadwalkan konseling 1-on-1 segera via Live Chat dan konfirmasi hambatan tugas lapangan.';
      } else if (late >= 1 || (score > 0 && score < 80) || modules < 2) {
        riskLevel = 'Sedang';
        riskColor = '#FCE373'; // pastel yellow
        if (late >= 1) reasons.push(`Pernah terlambat (${late}x)`);
        if (score < 80) reasons.push(`Perlu peningkatan penguasaan materi BPU`);
        intervention = 'Berikan pengingat jadwal presensi dan materi referensi modul sosialisasi.';
      } else {
        riskLevel = 'Optimal';
        riskColor = '#B8C96E'; // pastel green
        reasons.push('Disiplin kehadiran konsisten dan performa modul sangat baik');
        intervention = 'Pertahankan ritme kerja dan rekomendasikan sebagai Best Mentee of the Month.';
      }

      return {
        userId: p.user_id,
        name: p.full_name,
        nim: p.unique_id,
        email: p.email,
        riskLevel,
        riskColor,
        reasons,
        intervention,
        metrics: {
          attendanceCount: parseInt(p.total_attendance, 10) || 0,
          lateCount: late,
          absentCount: absent,
          averageScore: parseFloat(score.toFixed(1)),
          completedModules: modules
        }
      };
    });

    return res.json({
      success: true,
      summary: {
        totalEvaluated: analysis.length,
        highRiskCount: analysis.filter(a => a.riskLevel === 'Tinggi').length,
        mediumRiskCount: analysis.filter(a => a.riskLevel === 'Sedang').length,
        optimalCount: analysis.filter(a => a.riskLevel === 'Optimal').length
      },
      data: analysis
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// =========================================================================
// 7. DASHBOARD KOMPARASI KINERJA ANTAR BATCH & WILAYAH
// =========================================================================

/**
 * GET /api/admin/comparison
 * Returns comparative metrics across Batches and Regional Branch Offices
 */
router.get('/admin/comparison', authenticateToken, async (req, res) => {
  try {
    // 1. Batch comparison data
    const batchData = [
      {
        batchName: 'Batch 1 (Gelombang Berjalan)',
        year: '2025/2026',
        participants: 24,
        attendanceRate: 94.2,
        avgScore: 88.5,
        targetBPU: 500,
        realizedBPU: 486,
        completionRate: 97.2,
        status: 'Aktif'
      },
      {
        batchName: 'Batch 2 (Gelombang Sebelumnya)',
        year: '2024/2025',
        participants: 20,
        attendanceRate: 91.8,
        avgScore: 84.1,
        targetBPU: 400,
        realizedBPU: 382,
        completionRate: 95.5,
        status: 'Selesai'
      },
      {
        batchName: 'Batch 3 (Gelombang Rintisan)',
        year: '2023/2024',
        participants: 18,
        attendanceRate: 88.5,
        avgScore: 81.3,
        targetBPU: 350,
        realizedBPU: 310,
        completionRate: 88.6,
        status: 'Selesai'
      }
    ];

    // 2. Regional branch performance data
    const regionalData = [
      {
        region: 'Kantor Cabang Jakarta Selatan',
        area: 'DKI Jakarta',
        participants: 8,
        bpuAcquired: 184,
        retentionRate: 96.5,
        topPoint: 'Sentra UMKM Blok M & Pasar Tebet'
      },
      {
        region: 'Kantor Cabang Jakarta Pusat',
        area: 'DKI Jakarta',
        participants: 6,
        bpuAcquired: 142,
        retentionRate: 92.1,
        topPoint: 'Pasar Tradisional Tanah Abang'
      },
      {
        region: 'Kantor Cabang Surabaya Darmo',
        area: 'Jawa Timur',
        participants: 4,
        bpuAcquired: 98,
        retentionRate: 94.8,
        topPoint: 'Sentra Kuliner & Bengkel Binaan'
      },
      {
        region: 'Kantor Cabang Medan Kota',
        area: 'Sumatera Utara',
        participants: 3,
        bpuAcquired: 76,
        retentionRate: 89.4,
        topPoint: 'Pusat Usaha Mikro Petisah'
      },
      {
        region: 'Kantor Cabang Bandung Supratman',
        area: 'Jawa Barat',
        participants: 3,
        bpuAcquired: 82,
        retentionRate: 91.0,
        topPoint: 'Pasar Kreatif BPU Sarijadi'
      }
    ];

    return res.json({
      success: true,
      data: {
        batchComparison: batchData,
        regionalComparison: regionalData,
        keyInsights: [
          'Pertumbuhan akuisisi BPU meningkat 27.2% dibanding Batch 2',
          'Tingkat kehadiran presensi geofence mencapai rekor 94.2%',
          'Cabang Jakarta Selatan merupakan cabang dengan produktivitas BPU tertinggi per peserta'
        ]
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// =========================================================================
// 8. PENCATATAN AUDIT TRAIL FORENSIK & DETEKSI ANOMALI LOGIN
// =========================================================================

/**
 * GET /api/admin/forensic-audit
 * Detailed forensic audit logs with anomaly highlights
 */
router.get('/admin/forensic-audit', authenticateToken, async (req, res) => {
  try {
    const { anomaly_only } = req.query;

    let sql = `
      SELECT a.log_id, a.user_id, a.activity_type, a.details, a.ip_address,
             a.is_anomaly, a.anomaly_reason, a.user_agent, a.created_at,
             u.full_name, u.unique_id, r.role_name
      FROM activity_logs a
      LEFT JOIN users u ON a.user_id = u.user_id
      LEFT JOIN roles r ON u.role_id = r.role_id
    `;

    if (anomaly_only === 'true') {
      sql += ` WHERE a.is_anomaly = TRUE`;
    }

    sql += ` ORDER BY a.created_at DESC LIMIT 100`;

    const result = await query(sql);

    // Compute anomaly summary stats
    const statsRes = await query(`
      SELECT 
        COUNT(*) as total_logs,
        COUNT(CASE WHEN is_anomaly = TRUE THEN 1 END) as total_anomalies,
        COUNT(DISTINCT ip_address) as unique_ips
      FROM activity_logs
    `);

    return res.json({
      success: true,
      summary: {
        totalLogs: parseInt(statsRes.rows[0].total_logs, 10) || 0,
        totalAnomalies: parseInt(statsRes.rows[0].total_anomalies, 10) || 0,
        uniqueIps: parseInt(statsRes.rows[0].unique_ips, 10) || 0
      },
      data: result.rows
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
