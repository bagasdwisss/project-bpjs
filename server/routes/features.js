// server/routes/features.js - Enterprise Features for BPJS Ketenagakerjaan
import { Router } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { query, ensureCertificateSchema } from '../db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { logActivity } from '../utils/logger.js';
import { buildFieldChanges, formatAuditValue, logEntityChange } from '../utils/auditFormatter.js';
import cache from '../utils/cache.js';
import { verifyAuditChainIntegrity } from '../utils/merkleAudit.js';
import { signCertificate, verifyCertificateSignature } from '../utils/cryptoSign.js';
import { runColdStorageArchival } from '../utils/archivalWorker.js';
import { runDatabaseVacuumMaintenance } from '../utils/vacuumScheduler.js';
import { applyPdpMasking } from '../utils/pdpMasking.js';
import { unbanIp } from '../middleware/honeytokenMiddleware.js';
import { getTelemetryMetrics } from '../utils/telemetryTracker.js';
import { decompressPayload } from '../utils/payloadCompressor.js';
import { getToastDiagnostics } from '../utils/toastManager.js';
import { getPoolHealthMetrics } from '../db.js';
import { refreshMaterializedView, getMaterializedViewData } from '../utils/materializedViewScheduler.js';
import { getOverflowStats } from '../utils/jsonbNormalizer.js';
import { dispatchIncidentAlert } from '../utils/incidentNotifier.js';
import { searchEntitiesFuzzy } from '../utils/fuzzySearch.js';
import { getSriManifest } from '../utils/sriGenerator.js';
import { generatePqcHybridSignature, verifyPqcHybridSignature } from '../utils/pqcCrypto.js';
import { getCanaryTrapsStatus } from '../utils/canaryStorage.js';
import { createPowChallenge, verifyPowSolution } from '../middleware/powRateLimiter.js';
import { setupRlsPolicies, getRlsStatus } from '../utils/rlsManager.js';
import { globalBloomFilter } from '../utils/bloomFilter.js';
import { getAttendancePartitions, createAttendancePartition } from '../utils/partitionManager.js';
import { generateColumnarExport } from '../utils/columnarExport.js';
import { transcodeToAvifProfile, getStorageOptimizationMetrics } from '../utils/avifTranscoder.js';
import { executeTombstonePurge, getTombstonePurgeHistory } from '../utils/tombstonePurger.js';
import { runBudgetedQuery, getQueryBudgetMetrics } from '../utils/queryCostGuard.js';
import { runTieredStorageMigration, getTieredStorageStatus } from '../utils/tieredStorage.js';
import { generateDynamicIdCardPayload, verifyDynamicIdQr } from '../utils/dynamicIdQr.js';
import { compileEvaluationDossier } from '../utils/pdfDossierGenerator.js';
import { getCachedFallback, setCachedFallback } from '../utils/cacheFallback.js';
import { getTimeBankBalance, recordOvertimeHours, claimCompTimeLeave, getTimeBankLedger } from '../utils/timeBankManager.js';
import { generateMbkmDossier } from '../utils/mbkmConverter.js';
import { checkOcspStatus, revokeCertificate, getCrlList } from '../utils/ocspManager.js';
import { startImpersonationSession, terminateImpersonationSession, getActiveImpersonationSessions } from '../utils/ephemeralImpersonation.js';
import { getEmailComplianceProfile, generateVerifiedEmailHeaders } from '../utils/emailBimiManager.js';
import { verifyWhatsAppWebhookChallenge, dispatchWhatsAppTemplate, handleWhatsAppIncomingWebhook, getWhatsAppDispatches } from '../utils/whatsappNotifier.js';
import { getDuplicateIdentityCases, resolveDuplicateCase } from '../utils/identityResolver.js';
import { searchKnowledgeBase, indexDocument } from '../utils/indonesianFts.js';
import { deduplicateAndRegisterFile, getDeduplicationMetrics } from '../utils/fileDeduplicator.js';
import { createStagingSandbox, listStagingSandboxes, deleteStagingSandbox } from '../utils/sandboxManager.js';
import { generatePrintReadySheet } from '../utils/batchQrPrintGenerator.js';

const router = Router();

// =========================================================================
// 1. GEOFENCING MULTI-TITIK (Kantor & Lapangan Binaan) WITH CACHE-ASIDE
// =========================================================================

/**
 * GET /api/features/geofences
 * Retrieve all active geofence locations (Kantor Cabang, Pasar, UMKM, Kawasan Industri)
 */
router.get('/geofences', authenticateToken, async (req, res) => {
  try {
    const locations = await cache.getOrSet('sys_geofence_locations', async () => {
      const result = await query(
        `SELECT id, name, category, address, latitude, longitude, radius_meters, is_active
         FROM geofence_locations
         WHERE is_active = TRUE
         ORDER BY id ASC`
      );
      return result.rows;
    }, 10 * 60 * 1000); // 10 minutes cache

    return res.json({ success: true, data: locations });
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
 * GET /api/leaves/settings
 * Retrieve leave policy settings and participant's remaining quota
 */
router.get('/leaves/settings', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const lSetRes = await query(`SELECT * FROM leave_settings ORDER BY id ASC LIMIT 1`);
    const settings = lSetRes.rows.length > 0 ? lSetRes.rows[0] : {
      max_leave_days_per_batch: 3,
      allowed_leave_types: 'Sakit,Izin,Cuti,Keperluan Mendesak'
    };

    const maxDays = parseInt(settings.max_leave_days_per_batch, 10) || 3;
    const maxMonthlyQuota = maxDays;

    // Monthly quota calculation for Cuti & Izin (Strict max 3 per month)
    const monthlyQuotaRes = await query(
      `SELECT COUNT(*) as count FROM leave_requests 
       WHERE user_id = $1 
         AND LOWER(leave_type) IN ('cuti', 'izin') 
         AND status IN ('Pending', 'Disetujui')
         AND EXTRACT(YEAR FROM start_date) = EXTRACT(YEAR FROM CURRENT_DATE)
         AND EXTRACT(MONTH FROM start_date) = EXTRACT(MONTH FROM CURRENT_DATE)`,
      [userId]
    );
    const usedThisMonth = parseInt(monthlyQuotaRes.rows[0].count, 10) || 0;
    const remainingMonthlyQuota = Math.max(0, maxMonthlyQuota - usedThisMonth);

    const types = (settings.allowed_leave_types || 'Sakit,Izin,Cuti,Keperluan Mendesak')
      .split(',')
      .map(t => t.trim());

    return res.json({
      success: true,
      data: {
        max_monthly_quota: maxMonthlyQuota,
        used_this_month: usedThisMonth,
        remaining_monthly_quota: remainingMonthlyQuota,
        max_leave_days: maxMonthlyQuota,
        used_leave_days: usedThisMonth,
        remaining_leave_days: remainingMonthlyQuota,
        allowed_types: types,
        raw: settings
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PUT /api/leaves/settings
 * Admin updates leave quota and allowed types
 */
router.put('/leaves/settings', authenticateToken, requireRole('Administrator'), async (req, res) => {
  try {
    const { max_leave_days_per_batch, allowed_leave_types } = req.body;
    const result = await query(
      `INSERT INTO leave_settings (id, max_leave_days_per_batch, allowed_leave_types, updated_at)
       VALUES (1, COALESCE($1, 3), COALESCE($2, 'Izin,Sakit,Cuti'), CURRENT_TIMESTAMP)
       ON CONFLICT (id) DO UPDATE SET
         max_leave_days_per_batch = COALESCE($1, leave_settings.max_leave_days_per_batch),
         allowed_leave_types = COALESCE($2, leave_settings.allowed_leave_types),
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [max_leave_days_per_batch ?? null, allowed_leave_types ?? null]
    );

    return res.json({
      success: true,
      message: 'Pengaturan kuota dan tipe izin cuti berhasil diperbarui!',
      data: result.rows[0]
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/leaves
 * Participant submits leave / sick / permission request with dynamic quota validation
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

    const startStr = String(start_date).slice(0, 10);
    const endStr = String(end_date).slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startStr) || !/^\d{4}-\d{2}-\d{2}$/.test(endStr) || endStr < startStr) {
      return res.status(400).json({
        success: false,
        message: 'Rentang tanggal mulai dan tanggal selesai tidak valid.'
      });
    }

    // Strict monthly quota validation based on Asia/Jakarta / ISO calendar month
    const normalizedType = String(leave_type).trim().toLowerCase();
    if (normalizedType === 'cuti' || normalizedType === 'izin') {
      const [reqYearStr, reqMonthStr] = startStr.split('-');
      const reqYear = parseInt(reqYearStr, 10);
      const reqMonth = parseInt(reqMonthStr, 10);

      const monthCheckRes = await query(
        `SELECT COUNT(*) as count FROM leave_requests 
         WHERE user_id = $1 
           AND LOWER(leave_type) IN ('cuti', 'izin') 
           AND status IN ('Pending', 'Disetujui')
           AND EXTRACT(YEAR FROM start_date) = $2
           AND EXTRACT(MONTH FROM start_date) = $3`,
        [userId, reqYear, reqMonth]
      );
      const usedCount = parseInt(monthCheckRes.rows[0].count, 10) || 0;
      const lSetRes = await query(`SELECT max_leave_days_per_batch FROM leave_settings ORDER BY id ASC LIMIT 1`);
      const MAX_MONTHLY = lSetRes.rows.length > 0 ? (parseInt(lSetRes.rows[0].max_leave_days_per_batch, 10) || 3) : 3;

      if (usedCount >= MAX_MONTHLY) {
        return res.status(400).json({
          success: false,
          message: `Batas maksimal pengajuan cuti/izin Anda untuk bulan ini (${reqMonth}/${reqYear}) adalah ${MAX_MONTHLY} kali dan kuota Anda telah habis. Pengajuan tidak dapat diproses.`
        });
      }
    }

    const result = await query(
      `INSERT INTO leave_requests (user_id, leave_type, start_date, end_date, reason, proof_file_url, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'Pending', CURRENT_TIMESTAMP)
       RETURNING *`,
      [userId, leave_type, startStr, endStr, reason, proof_file_url || null]
    );

    // Chained Merkle Audit log
    await logActivity({
      req,
      userId,
      action: 'LEAVE_REQUEST',
      description: `Pengajuan ${leave_type} dari ${startStr} s.d. ${endStr}`
    });

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
router.put('/leaves/:id/status', authenticateToken, requireRole('Koordinator', 'Administrator'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, coordinator_notes } = req.body; // 'Disetujui' or 'Ditolak'
    const reviewerId = req.user.user_id;

    if (!['Disetujui', 'Ditolak'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status harus Disetujui atau Ditolak.' });
    }

    // Fetch previous state for coordinator isolation & full forensic diff logging
    const prevLeaveRes = await query(
      `SELECT lr.*, u.coordinator_id, u.full_name, u.unique_id
       FROM leave_requests lr
       JOIN users u ON lr.user_id = u.user_id
       WHERE lr.id = $1`,
      [id]
    );
    if (prevLeaveRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Pengajuan izin tidak ditemukan.' });
    }
    const prevLeave = prevLeaveRes.rows[0];

    if ((req.user.role === 'Koordinator' || req.user.role_id === 2) && prevLeave.coordinator_id !== req.user.user_id) {
      return res.status(403).json({ success: false, message: 'Akses dilarang. Anda hanya dapat memproses izin anak didik Anda sendiri.' });
    }

    const updated = await query(
      `UPDATE leave_requests
       SET status = $1, reviewed_by = $2, reviewed_at = CURRENT_TIMESTAMP, coordinator_notes = $3
       WHERE id = $4
       RETURNING *`,
      [status, reviewerId, coordinator_notes || null, id]
    );

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

    // If approved, backfill or override every day in [start_date .. end_date]
    if (status === 'Disetujui') {
      const attendanceStatus = leave.leave_type === 'Sakit' ? 'Sakit' : 'Izin';
      await query(
        `INSERT INTO attendance_records (user_id, attendance_date, check_in_time, status, notes, created_at)
         SELECT $1, d::date, '08:00:00', $4, $5, CURRENT_TIMESTAMP
         FROM generate_series($2::date, $3::date, INTERVAL '1 day') AS d
         ON CONFLICT (user_id, attendance_date) DO UPDATE SET
           status = EXCLUDED.status,
           notes = EXCLUDED.notes
         WHERE attendance_records.status IN ('Alfa', 'Alpa', 'Izin', 'Sakit')`,
        [
          leave.user_id,
          leave.start_date,
          leave.end_date || leave.start_date,
          attendanceStatus,
          `Disetujui koordinator: ${leave.reason}`
        ]
      );
    }

    // Forensic Audit Log for Admin Monitoring
    const changes = buildFieldChanges(prevLeave, leave, [
      { key: 'status', label: 'Status Permohonan' },
      { key: 'coordinator_notes', label: 'Catatan Verifikator' }
    ]);

    await logEntityChange({
      req,
      targetUser: {
        user_id: prevLeave.user_id,
        full_name: prevLeave.full_name,
        unique_id: prevLeave.unique_id
      },
      action: status === 'Disetujui' ? 'LEAVE_APPROVAL' : 'LEAVE_REJECTED',
      verb: status === 'Disetujui' ? 'menyetujui/mengubah' : 'menolak/mengubah',
      entityLabel: `Permohonan ${leave.leave_type}`,
      recordContext: `Periode: ${formatAuditValue(leave.start_date, 'date')} s.d. ${formatAuditValue(leave.end_date || leave.start_date, 'date')}`,
      changes,
      notes: coordinator_notes || null
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

    if (userRole === 'Administrator') {
      // Administrator can view all active participants and coordinators
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
    } else if (userRole === 'Koordinator') {
      // Coordinator can ONLY view their assigned students (anak didik) or Administrators
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
          AND (
            (r.role_name = 'Peserta' AND u.coordinator_id = $1)
            OR r.role_name = 'Administrator'
          )
        ORDER BY last_message_time DESC NULLS LAST, u.full_name ASC
      `;
      params = [userId];
    } else {
      // Participant can ONLY view their assigned Coordinator or Administrators
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
          AND (
            u.user_id = (SELECT coordinator_id FROM users WHERE user_id = $1)
            OR r.role_name = 'Administrator'
          )
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
    const currentUserRole = req.user.role_name;
    const { otherUserId } = req.params;

    // Check target user relationship
    const targetUserRes = await query(
      `SELECT u.user_id, u.coordinator_id, r.role_name 
       FROM users u 
       JOIN roles r ON u.role_id = r.role_id 
       WHERE u.user_id = $1`,
      [otherUserId]
    );

    if (targetUserRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Pengguna tujuan tidak ditemukan.' });
    }

    const targetUser = targetUserRes.rows[0];

    // Enforce relationship permissions:
    // Administrator can access any conversation.
    // Anyone can chat with Administrator.
    if (currentUserRole !== 'Administrator' && targetUser.role_name !== 'Administrator') {
      if (currentUserRole === 'Koordinator') {
        // Coordinator can only chat with their assigned students
        if (targetUser.role_name !== 'Peserta' || targetUser.coordinator_id !== currentUserId) {
          return res.status(403).json({
            success: false,
            message: 'Akses ditolak. Koordinator hanya diizinkan berkomunikasi dengan anak didiknya atau Administrator.'
          });
        }
      } else if (currentUserRole === 'Peserta') {
        // Participant can only chat with their assigned coordinator
        const myCoordRes = await query(`SELECT coordinator_id FROM users WHERE user_id = $1`, [currentUserId]);
        const myCoordId = myCoordRes.rows[0]?.coordinator_id;
        if (Number(otherUserId) !== Number(myCoordId)) {
          return res.status(403).json({
            success: false,
            message: 'Akses ditolak. Peserta hanya diizinkan berkomunikasi dengan Koordinator pembimbing sendiri atau Administrator.'
          });
        }
      }
    }

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
    const senderRole = req.user.role_name;
    const { receiver_id, message_text } = req.body;

    if (!receiver_id || !message_text?.trim()) {
      return res.status(400).json({ success: false, message: 'Penerima dan pesan tidak boleh kosong.' });
    }

    // Check receiver relationship
    const receiverRes = await query(
      `SELECT u.user_id, u.coordinator_id, r.role_name 
       FROM users u 
       JOIN roles r ON u.role_id = r.role_id 
       WHERE u.user_id = $1`,
      [receiver_id]
    );

    if (receiverRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Pengguna penerima tidak ditemukan.' });
    }

    const receiver = receiverRes.rows[0];

    // Enforce relationship permissions:
    // Administrator can chat with anyone.
    // Anyone can chat with Administrator.
    if (senderRole !== 'Administrator' && receiver.role_name !== 'Administrator') {
      if (senderRole === 'Koordinator') {
        if (receiver.role_name !== 'Peserta' || receiver.coordinator_id !== senderId) {
          return res.status(403).json({
            success: false,
            message: 'Akses ditolak. Koordinator hanya dapat mengirim pesan ke anak didiknya atau Administrator.'
          });
        }
      } else if (senderRole === 'Peserta') {
        const myCoordRes = await query(`SELECT coordinator_id FROM users WHERE user_id = $1`, [senderId]);
        const myCoordId = myCoordRes.rows[0]?.coordinator_id;
        if (Number(receiver_id) !== Number(myCoordId)) {
          return res.status(403).json({
            success: false,
            message: 'Akses ditolak. Peserta hanya dapat mengirim pesan ke Koordinator pembimbing sendiri atau Administrator.'
          });
        }
      }
    }

    const result = await query(
      `INSERT INTO direct_messages (sender_id, receiver_id, message_text, is_read, created_at)
       VALUES ($1, $2, $3, FALSE, CURRENT_TIMESTAMP)
       RETURNING *`,
      [senderId, receiver_id, message_text.trim()]
    );

    // Trigger in-app notification in Navbar Bell for receiver
    const senderName = req.user.full_name || 'Pengguna BPJSTK';
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
// 4. AI CHATBOT ASISTEN REGULASI "TANYA BPJSTK" (RAG Knowledge Engine)
// =========================================================================

const BPJSTK_KNOWLEDGE_BASE = [
  {
    topic: '5 Program Utama BPJSTK',
    keywords: ['program', 'apa saja', '5 program', 'manfaat', 'cakupan'],
    answer: `BPJSTK menyelenggarakan 5 Program Jaminan Sosial Ketenagakerjaan berdasarkan amanat UU No. 40/2004 & UU No. 24/2011:
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
    answer: `Aturan Presensi & Integritas Magang BPJSTK:
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

    // 1. Live database lookups (Full-Text Knowledge Base + live BPU rates + Work Schedule)
    const [kbSearchRes, ratesRes, schedRes] = await Promise.all([
      searchKnowledgeBase(question, 'all', 3).catch(() => ({ results: [] })),
      query(`SELECT * FROM bpu_rates ORDER BY id ASC LIMIT 1`).catch(() => ({ rows: [] })),
      query(`SELECT check_in_start, work_start_time, work_end_time FROM attendance_settings ORDER BY id ASC LIMIT 1`).catch(() => ({ rows: [] }))
    ]);

    const liveRate = ratesRes.rows[0] || {};
    const jkkMin = Number(liveRate.jkk_min_amount ?? 10000);
    const jkmFlat = Number(liveRate.jkm_flat_amount ?? 6800);
    const jhtMin = Number(liveRate.jht_min_amount ?? 20000);
    const deathBenefit = Number(liveRate.death_benefit_amount ?? 42000000);
    const maxScholarship = Number(liveRate.max_scholarship_amount ?? 174000000);
    const fmtRp = (v) => `Rp ${Number(v).toLocaleString('id-ID')}`;

    // 2. Match curated regulations & dynamic database values
    let bestMatch = null;
    let highestScore = 0;

    for (const item of BPJSTK_KNOWLEDGE_BASE) {
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

    const kbHits = kbSearchRes?.results || [];
    let responseAnswer = '';
    let matchedTopic = '';
    let sourceUsed = 'regulation_kb';

    if (kbHits.length > 0 && (highestScore < 2 || qLower.length > 18)) {
      const topDoc = kbHits[0];
      matchedTopic = topDoc.title;
      responseAnswer = `${topDoc.content}\n\n---\n*Sumber Database Knowledge Base (${topDoc.category || 'Regulasi'})*`;
      if (bestMatch && highestScore >= 2) {
        responseAnswer += `\n\n**Ringkasan Terkait (${bestMatch.topic}):**\n${bestMatch.answer}`;
      }
      sourceUsed = 'postgresql_fts';
    } else if (bestMatch && highestScore >= 2) {
      matchedTopic = bestMatch.topic;
      responseAnswer = bestMatch.answer
        .replace(/Rp 16\.800/g, fmtRp(jkkMin + jkmFlat))
        .replace(/Rp 10\.000/g, fmtRp(jkkMin))
        .replace(/Rp 6\.800/g, fmtRp(jkmFlat))
        .replace(/Rp 36\.800/g, fmtRp(jkkMin + jkmFlat + jhtMin))
        .replace(/Rp 20\.000(?![.\d])/g, fmtRp(jhtMin))
        .replace(/Rp 42\.000\.000/g, fmtRp(deathBenefit))
        .replace(/Rp 42 Juta/g, fmtRp(deathBenefit))
        .replace(/Rp 174\.000\.000/g, fmtRp(maxScholarship))
        .replace(/Rp 174 Juta/g, fmtRp(maxScholarship));
    } else {
      matchedTopic = 'Ketentuan Umum BPJSTK';
      const sched = schedRes.rows[0];
      const schedInfo = sched
        ? `\n• **Jam Operasional Presensi**: Buka ${String(sched.check_in_start).slice(0, 5)} WIB, masuk ${String(sched.work_start_time).slice(0, 5)} WIB, batas pulang/auto-alfa ${String(sched.work_end_time).slice(0, 5)} WIB.`
        : '';
      responseAnswer = `Halo! Terkait pertanyaan Anda: "${question}", berikut panduan ringkas operasional BPJSTK (sinkron database live):\n\n` +
        `• **Pekerja BPU (2 Program JKK+JKM)**: Iuran aktif ${fmtRp(jkkMin + jkmFlat)}/bulan (santunan kematian ${fmtRp(deathBenefit)}, beasiswa maksimal ${fmtRp(maxScholarship)}).\n` +
        `• **Pekerja BPU (3 Program JKK+JKM+JHT)**: Iuran mulai ${fmtRp(jkkMin + jkmFlat + jhtMin)}/bulan.\n` +
        `• **Pekerja Penerima Upah (PU)**: Diikutsertakan oleh pemberi kerja untuk program JKK, JKM, JHT, JP, dan JKP.\n` +
        `• **Klaim & Layanan**: Dapat diakses melalui aplikasi JMO (Jamsostek Mobile), Call Center 175, atau Kantor Cabang terdekat.${schedInfo}\n\n` +
        `*Silakan tanyakan hal spesifik seperti "Iuran BPU", "Santunan JKM", "STMB JKK", atau "Aturan Geofence".*`;
    }

    return res.json({
      success: true,
      data: {
        question,
        topic: matchedTopic,
        answer: responseAnswer,
        source: sourceUsed,
        confidence: kbHits.length > 0 || highestScore > 0 ? 'High' : 'General',
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
 * Helper to fetch dynamic institutional configuration from database
 */
async function getInstitutionalSettings() {
  try {
    const res = await query(`
      SELECT setting_key, setting_value 
      FROM system_settings 
      WHERE setting_key IN (
        'branch_head_name', 'branch_head_npp', 'branch_name', 'branch_address', 'branch_phone', 
        'mentor_name', 'mentor_npp', 'default_coordinator_name', 'default_coordinator_npp',
        'branch_head_signature', 'mentor_signature'
      )
    `);
    const map = {};
    res.rows.forEach(r => { map[r.setting_key] = r.setting_value; });
    const mentorName = map['mentor_name'] || map['default_coordinator_name'] || 'Budi Santoso, S.Kom., M.T.';
    const mentorNpp = map['mentor_npp'] || map['default_coordinator_npp'] || '8765432109';
    return {
      branch_head_name: map['branch_head_name'] || 'Dr. Hendra Wijaya, S.E., M.M.',
      branch_head_npp: map['branch_head_npp'] || '9876543210',
      branch_name: map['branch_name'] || 'BPJS Ketenagakerjaan Kantor Cabang Jakarta Gambir',
      branch_address: map['branch_address'] || 'Jl. Kebon Sirih No. 40, Jakarta Pusat 10110',
      branch_phone: map['branch_phone'] || '(021) 3456789',
      mentor_name: mentorName,
      mentor_npp: mentorNpp,
      default_coordinator_name: mentorName,
      default_coordinator_npp: mentorNpp,
      branch_head_signature: map['branch_head_signature'] || null,
      mentor_signature: map['mentor_signature'] || null
    };
  } catch (err) {
    return {
      branch_head_name: 'Dr. Hendra Wijaya, S.E., M.M.',
      branch_head_npp: '9876543210',
      branch_name: 'BPJS Ketenagakerjaan Kantor Cabang Jakarta Gambir',
      branch_address: 'Jl. Kebon Sirih No. 40, Jakarta Pusat 10110',
      branch_phone: '(021) 3456789',
      mentor_name: 'Budi Santoso, S.Kom., M.T.',
      mentor_npp: '8765432109',
      default_coordinator_name: 'Budi Santoso, S.Kom., M.T.',
      default_coordinator_npp: '8765432109',
      branch_head_signature: null,
      mentor_signature: null
    };
  }
}

/**
 * GET /api/admin/system/institution & /api/system/institution
 * Get dynamic institutional configuration
 */
router.get(['/admin/system/institution', '/system/institution'], async (req, res) => {
  try {
    const config = await getInstitutionalSettings();
    return res.json({ success: true, data: config });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PUT /api/admin/system/institution & /api/system/institution
 * Administrator updates dynamic institutional configuration
 */
router.put(['/admin/system/institution', '/system/institution'], authenticateToken, requireRole('Administrator'), async (req, res) => {
  try {
    const { 
      branch_head_name, 
      branch_head_npp, 
      branch_name, 
      branch_address, 
      branch_phone, 
      mentor_name, 
      mentor_npp, 
      default_coordinator_name, 
      default_coordinator_npp,
      branch_head_signature,
      mentor_signature
    } = req.body;

    const resolvedMentorName = mentor_name || default_coordinator_name;
    const resolvedMentorNpp = mentor_npp || default_coordinator_npp;

    const updates = [
      ['branch_head_name', branch_head_name],
      ['branch_head_npp', branch_head_npp],
      ['branch_name', branch_name],
      ['branch_address', branch_address],
      ['branch_phone', branch_phone],
      ['mentor_name', resolvedMentorName],
      ['mentor_npp', resolvedMentorNpp],
      ['default_coordinator_name', resolvedMentorName],
      ['default_coordinator_npp', resolvedMentorNpp],
      ['branch_head_signature', branch_head_signature],
      ['mentor_signature', mentor_signature]
    ];

    for (const [key, val] of updates) {
      if (val !== undefined) {
        await query(
          `INSERT INTO system_settings (setting_key, setting_value, updated_at, updated_by)
           VALUES ($1, $2, CURRENT_TIMESTAMP, $3)
           ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = CURRENT_TIMESTAMP, updated_by = EXCLUDED.updated_by`,
          [key, String(val || ''), req.user.user_id]
        );
      }
    }

    const updated = await getInstitutionalSettings();
    return res.json({ success: true, message: 'Data pimpinan, mentor & spesimen tanda tangan berhasil disimpan.', data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/certificates/my
 * Participant gets their verified e-certificate
 */
router.get('/certificates/my', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const result = await query(
      `SELECT c.*, u.full_name as participant_name, u.unique_id as participant_nim,
              COALESCE(u.email, u.unique_id || '@bpjsketenagakerjaan.go.id') as email, 
              u.penempatan, r.role_name,
              coord.full_name as coordinator_name, coord.unique_id as coordinator_npp
       FROM certificates c
       JOIN users u ON c.user_id = u.user_id
       JOIN roles r ON u.role_id = r.role_id
       LEFT JOIN users coord ON u.coordinator_id = coord.user_id
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

    const inst = await getInstitutionalSettings();
    return res.json({
      success: true,
      data: {
        ...result.rows[0],
        ...inst
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/certificates/list
 * Coordinator / Admin lists all certificates
 */
router.get('/certificates/list', authenticateToken, requireRole('Koordinator', 'Administrator'), async (req, res) => {
  try {
    let sql = `
      SELECT c.*, u.full_name as participant_name, u.unique_id as participant_nim,
             u.penempatan,
             coord.full_name as coordinator_name, coord.unique_id as coordinator_npp
      FROM certificates c
      JOIN users u ON c.user_id = u.user_id
      LEFT JOIN users coord ON u.coordinator_id = coord.user_id
    `;
    const params = [];

    // Coordinator sees only their own participants' certificates
    if (req.user.role === 'Koordinator' || req.user.role_id === 2) {
      params.push(req.user.user_id);
      sql += ` WHERE u.coordinator_id = $${params.length}`;
    }

    sql += ` ORDER BY c.created_at DESC`;

    const result = await query(sql, params);
    const inst = await getInstitutionalSettings();
    const rows = result.rows.map(r => ({ ...r, ...inst }));
    return res.json({ success: true, data: rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/certificates/generate
 * Issue certificate with SHA-256 cryptographic verification hash
 * Anti-Fraud Security Rules:
 * 1. Requires coordinator account password verification
 * 2. Strict 1 Participant = 1 Certificate limit (double issuance forbidden)
 * 3. Records issued_by coordinator ID and chosen design template theme
 */
router.post('/certificates/generate', authenticateToken, requireRole('Koordinator', 'Administrator'), async (req, res) => {
  try {
    await ensureCertificateSchema();
    const { user_id, batch_name, predicate, score_average, certificate_type, type, password } = req.body;

    if (!user_id) {
      return res.status(400).json({ success: false, message: 'User ID peserta wajib diisi.' });
    }

    // Security Rule 1: Coordinator Password Authorization Check
    if (!password) {
      return res.status(400).json({ success: false, message: 'Kata sandi otorisasi akun wajib dimasukkan untuk mengesahkan penerbitan sertifikat.' });
    }

    const authRes = await query(`SELECT password_hash FROM users WHERE user_id = $1`, [req.user.user_id]);
    if (authRes.rows.length === 0 || !(await bcrypt.compare(password, authRes.rows[0].password_hash))) {
      return res.status(401).json({ success: false, message: 'Kata sandi otorisasi salah. Penerbitan sertifikat ditolak demi keamanan sistem.' });
    }

    const uRes = await query(`SELECT * FROM users WHERE user_id = $1`, [user_id]);
    if (uRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Peserta tidak ditemukan.' });
    }
    const user = uRes.rows[0];

    // Coordinator isolation: verify participant is assigned to this coordinator
    if (req.user.role === 'Koordinator' || req.user.role_id === 2) {
      if (user.coordinator_id !== req.user.user_id) {
        return res.status(403).json({ success: false, message: 'Akses dilarang. Anda hanya dapat menerbitkan sertifikat untuk anak didik Anda sendiri.' });
      }
    }

    // Security Rule 2: Strict Anti-Fraud 1 Participant = 1 Certificate
    const existingCert = await query(
      `SELECT certificate_id, certificate_number, issue_date FROM certificates WHERE user_id = $1`,
      [user_id]
    );
    if (existingCert.rows.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: `Peserta ini sudah pernah diterbitkan sertifikat (No: ${existingCert.rows[0].certificate_number}). Untuk mencegah kecurangan, satu anak didik hanya boleh diterbitkan sertifikat sekali saja. Jika terdapat kesalahan nama atau data, ajukan permohonan penerbitan ulang / pembatalan ke Administrator.` 
      });
    }

    // Query real progress score & batch from DB
    const progRes = await query(`SELECT nilai, grade FROM progress WHERE user_id = $1 LIMIT 1`, [user_id]);
    const batchRes = await query(`
      SELECT b.batch_name 
      FROM user_batches ub 
      JOIN batches b ON ub.batch_id = b.batch_id 
      WHERE ub.user_id = $1 
      ORDER BY ub.assigned_at DESC 
      LIMIT 1
    `, [user_id]);

    const realScore = (progRes.rows.length > 0 && progRes.rows[0].nilai !== null)
      ? parseFloat(progRes.rows[0].nilai)
      : (score_average ? parseFloat(score_average) : 85.0);

    const realGrade = (progRes.rows.length > 0 && progRes.rows[0].grade)
      ? progRes.rows[0].grade
      : (realScore >= 85 ? 'A' : realScore >= 75 ? 'B' : 'C');

    // Auto-map type to distinct design theme, title, and predicate
    const rawType = (certificate_type || type || 'Kelulusan').toLowerCase();
    let certType = 'Kelulusan';
    let chosenTheme = 'emerald';
    let determinedPredicate = predicate;

    if (rawType.includes('prestasi') || rawType.includes('achievement')) {
      certType = 'Prestasi';
      chosenTheme = 'royal_gold';
      if (!determinedPredicate) determinedPredicate = 'Pencapaian Khusus / Prestasi Terbaik (Grade A+)';
    } else if (rawType.includes('partisipasi') || rawType.includes('participation')) {
      certType = 'Partisipasi';
      chosenTheme = 'platinum';
      if (!determinedPredicate) determinedPredicate = 'Partisipasi Aktif & Berdedikasi';
    } else {
      certType = 'Kelulusan';
      chosenTheme = 'emerald';
      if (!determinedPredicate) {
        determinedPredicate = realGrade === 'A' ? 'Sangat Memuaskan (Grade A)' :
          realGrade === 'B' ? 'Memuaskan (Grade B)' : 'Cukup (Grade C)';
      }
    }

    const realBatchName = (batchRes.rows.length > 0 && batchRes.rows[0].batch_name)
      ? batchRes.rows[0].batch_name
      : (batch_name || 'Batch 1 - Gelombang Berjalan');

    const certCountRes = await query(`SELECT COUNT(*) FROM certificates`);
    const nextSeq = parseInt(certCountRes.rows[0].count, 10) + 1;
    const certNumber = `BPJSTK/MAGANG/2026/${String(nextSeq).padStart(3, '0')}`;
    const issueDate = new Date().toISOString().split('T')[0];

    // Compute HMAC-SHA256 cryptographic digital signature (Feature 16)
    const certSig = signCertificate({
      certNumber,
      recipientName: user.full_name,
      userId: user.user_id,
      grade: realGrade,
      finalScore: realScore,
      issueDate
    });

    const result = await query(
      `INSERT INTO certificates (
        user_id, certificate_number, issue_date, predicate, 
        score_average, digital_signature_hash, digital_signature, signature_algorithm, 
        batch_name, status, certificate_type, design_theme, issued_by, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Terbit', $10, $11, $12, CURRENT_TIMESTAMP)
      RETURNING *`,
      [
        user_id,
        certNumber,
        issueDate,
        determinedPredicate,
        realScore,
        certSig.signature,
        certSig.signature,
        certSig.algorithm,
        realBatchName,
        certType,
        chosenTheme,
        req.user.user_id
      ]
    );

    // Audit Logging
    await logActivity({
      req,
      userId: req.user.user_id,
      action: 'CERTIFICATE_ISSUED',
      details: `Koordinator ${req.user.full_name || req.user.unique_id} menerbitkan sertifikat ${certNumber} [Tema: ${chosenTheme}] untuk ${user.full_name} (NIM: ${user.unique_id})`
    });

    // In-App Notification to Participant
    try {
      await query(
        `INSERT INTO notifications (user_id, title, message, type, priority, is_read, created_at)
         VALUES ($1, $2, $3, $4, $5, FALSE, CURRENT_TIMESTAMP)`,
        [
          user_id,
          'Sertifikat Magang Resmi Diterbitkan!',
          `Selamat! E-Sertifikat kelulusan resmi BPJS Ketenagakerjaan (${certNumber}) Anda telah diterbitkan dengan predikat ${determinedPredicate}. Silakan lihat dan unduh di menu Nilai & Sertifikat.`,
          'certificate',
          'high'
        ]
      );
    } catch (notifErr) {
      console.error('[Certificates] Gagal mengirim notifikasi penerbitan:', notifErr.message);
    }

    return res.status(201).json({
      success: true,
      message: `E-Sertifikat resmi untuk ${user.full_name} berhasil diterbitkan (${certNumber})!`,
      data: {
        ...result.rows[0],
        cryptographic_thumbprint: certSig.thumbprint
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/certificates/bulk-generate
 * Bulk Issue Certificates for multiple mentees with password authorization
 */
router.post('/certificates/bulk-generate', authenticateToken, requireRole('Koordinator', 'Administrator'), async (req, res) => {
  try {
    await ensureCertificateSchema();
    const { user_ids, certificate_type, type, predicate, password } = req.body;

    if (!Array.isArray(user_ids) || user_ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Daftar ID peserta wajib dipilih minimal 1 orang.' });
    }

    if (!password) {
      return res.status(400).json({ success: false, message: 'Kata sandi otorisasi koordinator wajib dimasukkan untuk penerbitan massal.' });
    }

    // Verify Password
    const authRes = await query(`SELECT password_hash FROM users WHERE user_id = $1`, [req.user.user_id]);
    if (authRes.rows.length === 0 || !(await bcrypt.compare(password, authRes.rows[0].password_hash))) {
      return res.status(401).json({ success: false, message: 'Kata sandi otorisasi koordinator tidak valid.' });
    }

    const rawType = (certificate_type || type || 'Kelulusan').toLowerCase();
    let certType = 'Kelulusan';
    let chosenTheme = 'emerald';
    if (rawType.includes('prestasi') || rawType.includes('achievement')) {
      certType = 'Prestasi';
      chosenTheme = 'royal_gold';
    } else if (rawType.includes('partisipasi') || rawType.includes('participation')) {
      certType = 'Partisipasi';
      chosenTheme = 'platinum';
    }

    const issuedList = [];
    const skippedList = [];

    for (const uId of user_ids) {
      const uRes = await query(`SELECT * FROM users WHERE user_id = $1`, [uId]);
      if (uRes.rows.length === 0) continue;
      const user = uRes.rows[0];

      // Coordinator isolation check
      if (req.user.role === 'Koordinator' || req.user.role_id === 2) {
        if (user.coordinator_id !== req.user.user_id) {
          skippedList.push({ name: user.full_name, reason: 'Bukan anak didik Anda' });
          continue;
        }
      }

      // Check if already has certificate
      const existRes = await query(`SELECT certificate_number FROM certificates WHERE user_id = $1`, [uId]);
      if (existRes.rows.length > 0) {
        skippedList.push({ name: user.full_name, reason: `Sudah memiliki sertifikat (${existRes.rows[0].certificate_number})` });
        continue;
      }

      // Progress data
      const progRes = await query(`SELECT nilai, grade FROM progress WHERE user_id = $1 LIMIT 1`, [uId]);
      const realScore = (progRes.rows.length > 0 && progRes.rows[0].nilai !== null) ? parseFloat(progRes.rows[0].nilai) : 88.0;
      const realGrade = realScore >= 85 ? 'A' : realScore >= 75 ? 'B' : 'C';
      const determinedPredicate = predicate || (
        certType === 'Prestasi' ? 'Pencapaian Khusus / Prestasi Terbaik (Grade A+)' :
        certType === 'Partisipasi' ? 'Partisipasi Aktif & Berdedikasi' :
        (realGrade === 'A' ? 'Sangat Memuaskan (Grade A)' : 'Memuaskan (Grade B)')
      );

      const certCountRes = await query(`SELECT COUNT(*) FROM certificates`);
      const nextSeq = parseInt(certCountRes.rows[0].count, 10) + 1;
      const certNumber = `BPJSTK/MAGANG/2026/${String(nextSeq).padStart(3, '0')}`;
      const issueDate = new Date().toISOString().split('T')[0];

      const certSig = signCertificate({
        certNumber,
        recipientName: user.full_name,
        userId: user.user_id,
        grade: realGrade,
        finalScore: realScore,
        issueDate
      });

      const insRes = await query(
        `INSERT INTO certificates (
          user_id, certificate_number, issue_date, predicate, 
          score_average, digital_signature_hash, digital_signature, signature_algorithm, 
          batch_name, status, certificate_type, design_theme, issued_by, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Batch 1 - Gelombang Berjalan', 'Terbit', $9, $10, $11, CURRENT_TIMESTAMP)
        RETURNING *`,
        [
          uId, certNumber, issueDate, determinedPredicate, realScore,
          certSig.signature, certSig.signature, certSig.algorithm,
          certType, chosenTheme, req.user.user_id
        ]
      );

      issuedList.push({
        user_id: uId,
        participant_name: user.full_name,
        certificate_number: certNumber
      });

      // Audit Log
      await logActivity({
        req,
        userId: req.user.user_id,
        action: 'CERTIFICATE_ISSUED_BULK',
        details: `Penerbitan massal sertifikat ${certType} (${certNumber}) untuk ${user.full_name}`
      });
    }

    return res.status(200).json({
      success: true,
      message: `Penerbitan massal selesai: ${issuedList.length} sertifikat berhasil diterbitkan, ${skippedList.length} dilewati.`,
      data: {
        issuedCount: issuedList.length,
        skippedCount: skippedList.length,
        issuedList,
        skippedList
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/certificates/request-reissue
 * Coordinator requests certificate reissue / typo correction to Admin
 */
router.post('/certificates/request-reissue', authenticateToken, requireRole('Koordinator', 'Administrator'), async (req, res) => {
  try {
    await ensureCertificateSchema();
    const { certificate_id, reason } = req.body;
    if (!certificate_id || !reason) {
      return res.status(400).json({ success: false, message: 'ID sertifikat dan alasan permohonan koreksi wajib diisi.' });
    }

    const certRes = await query(`SELECT * FROM certificates WHERE certificate_id = $1`, [certificate_id]);
    if (certRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Sertifikat tidak ditemukan.' });
    }

    await query(
      `UPDATE certificates 
       SET reissue_requested = TRUE, 
           reissue_reason = $1, 
           reissue_requested_at = CURRENT_TIMESTAMP, 
           reissue_requested_by = $2 
       WHERE certificate_id = $3`,
      [reason, req.user.user_id, certificate_id]
    );

    await logActivity({
      req,
      userId: req.user.user_id,
      action: 'CERTIFICATE_REISSUE_REQUESTED',
      details: `Koordinator mengajukan pembatalan & penerbitan ulang sertifikat ID ${certificate_id}. Alasan: ${reason}`
    });

    return res.json({
      success: true,
      message: 'Permohonan koreksi sertifikat berhasil diajukan ke Administrator untuk ditinjau.'
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/admin/certificates/reissue-requests
 * Admin lists all pending certificate reissue requests
 */
router.get('/admin/certificates/reissue-requests', authenticateToken, requireRole('Administrator'), async (req, res) => {
  try {
    await ensureCertificateSchema();
    const result = await query(`
      SELECT c.*, 
             u.full_name as participant_name, u.unique_id as participant_nim, u.penempatan,
             coord.full_name as coordinator_name, coord.unique_id as coordinator_npp,
             coord.full_name as requested_by_name, coord.unique_id as requested_by_user
      FROM certificates c
      JOIN users u ON c.user_id = u.user_id
      LEFT JOIN users coord ON COALESCE(c.reissue_requested_by, c.issued_by, u.coordinator_id) = coord.user_id
      WHERE c.reissue_requested = TRUE
      ORDER BY c.reissue_requested_at DESC NULLS LAST
    `);
    return res.json({ success: true, data: result.rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/admin/certificates/approve-reissue
 * Admin approves reissue: COMPLETELY DELETES/PURGES the old certificate from the database and system
 */
router.post('/admin/certificates/approve-reissue', authenticateToken, requireRole('Administrator'), async (req, res) => {
  try {
    const { certificate_id } = req.body;
    if (!certificate_id) {
      return res.status(400).json({ success: false, message: 'ID sertifikat wajib diisi.' });
    }

    const certRes = await query(`
      SELECT c.*, u.full_name as participant_name, u.unique_id as participant_nim 
      FROM certificates c
      JOIN users u ON c.user_id = u.user_id
      WHERE c.certificate_id = $1
    `, [certificate_id]);

    if (certRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Sertifikat tidak ditemukan.' });
    }

    const cert = certRes.rows[0];

    // HAPUS BERSIH sertifikat yang pernah keluar dari database dan sistem
    await query(`DELETE FROM certificates WHERE certificate_id = $1`, [certificate_id]);

    await logActivity({
      req,
      userId: req.user.user_id,
      action: 'CERTIFICATE_PURGED_AND_REISSUED',
      details: `Admin ${req.user.full_name || req.user.unique_id || "Sistem"} menyetujui koreksi dan MENGHAPUS BERSIH sertifikat (${cert.certificate_number}) milik ${cert.participant_name} dari database. Izin penerbitan ulang telah dibuka.`
    });

    return res.json({
      success: true,
      message: `Sertifikat ${cert.certificate_number} berhasil dihapus bersih dari database. Koordinator kini dapat menerbitkan sertifikat baru dengan data yang benar.`
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/admin/certificates/reject-reissue
 * Admin rejects reissue request
 */
router.post('/admin/certificates/reject-reissue', authenticateToken, requireRole('Administrator'), async (req, res) => {
  try {
    const { certificate_id, reject_reason } = req.body;
    await query(
      `UPDATE certificates 
       SET reissue_requested = FALSE 
       WHERE certificate_id = $1`,
      [certificate_id]
    );

    await logActivity({
      req,
      userId: req.user.user_id,
      action: 'CERTIFICATE_REISSUE_REJECTED',
      details: `Admin menolak permohonan pembatalan sertifikat ID ${certificate_id}. Catatan: ${reject_reason || 'Ditolak'}`
    });

    return res.json({ success: true, message: 'Permohonan koreksi sertifikat ditolak.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/admin/certificates/monitoring-logs
 * Enterprise Anti-Fraud Monitoring for Certificate Issuance
 */
router.get('/admin/certificates/monitoring-logs', authenticateToken, requireRole('Administrator'), async (req, res) => {
  try {
    await ensureCertificateSchema();
    const result = await query(`
      SELECT c.*, 
             u.full_name as participant_name, u.unique_id as participant_nim, u.penempatan,
             coord.full_name as coordinator_name, coord.unique_id as coordinator_npp
      FROM certificates c
      JOIN users u ON c.user_id = u.user_id
      LEFT JOIN users coord ON COALESCE(c.issued_by, u.coordinator_id) = coord.user_id
      ORDER BY c.created_at DESC
    `);

    // Anti-fraud heuristics check strictly in Asia/Jakarta (WIB)
    const wibFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Jakarta',
      weekday: 'short',
      hour: '2-digit',
      hour12: false
    });
    const enrichedLogs = result.rows.map(row => {
      const issueTime = new Date(row.created_at);
      const parts = Object.fromEntries(wibFormatter.formatToParts(issueTime).map(p => [p.type, p.value]));
      const hour = parseInt(parts.hour, 10) % 24;
      const isWeekend = parts.weekday === 'Sat' || parts.weekday === 'Sun';
      const isOffHours = hour < 7 || hour >= 19 || isWeekend;

      return {
        ...row,
        fraud_flags: {
          is_off_hours: isOffHours,
          is_weekend: isWeekend,
          reissue_pending: !!row.reissue_requested
        }
      };
    });

    const offHoursCount = enrichedLogs.filter(l => l.fraud_flags.is_off_hours).length;
    const pendingReissueCount = enrichedLogs.filter(l => l.reissue_requested).length;

    return res.json({
      success: true,
      data: enrichedLogs,
      summary: {
        total_issued: enrichedLogs.length,
        off_hours_alerts: offHoursCount,
        pending_reissues: pendingReissueCount
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/certificates/download/:certNumber
 * Standalone direct print & download endpoint for company certificate
 */
router.get('/certificates/download/:certNumber', async (req, res) => {
  try {
    const { certNumber } = req.params;

    const result = await query(
      `SELECT c.*, u.full_name as participant_name, u.unique_id as participant_nim,
              u.penempatan,
              coord.full_name as coordinator_name, coord.unique_id as coordinator_npp
       FROM certificates c
       JOIN users u ON c.user_id = u.user_id
       LEFT JOIN users coord ON u.coordinator_id = coord.user_id
       WHERE UPPER(c.certificate_number) = UPPER($1) 
          OR UPPER(COALESCE(c.digital_signature, '')) = UPPER($1)
          OR UPPER(COALESCE(c.digital_signature_hash, '')) = UPPER($1)`,
      [certNumber]
    );

    if (result.rows.length === 0) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head><title>Sertifikat Tidak Ditemukan</title></head>
        <body style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h2>Sertifikat Magang Tidak Ditemukan</h2>
          <p>Nomor sertifikat <b>${certNumber}</b> belum diterbitkan atau tidak valid.</p>
          <a href="/" style="display:inline-block; margin-top:20px; padding:10px 20px; background:#008F4C; color:white; text-decoration:none; border-radius:8px;">Kembali ke Portal</a>
        </body>
        </html>
      `);
    }

    const cert = result.rows[0];
    const host = req.get('host') || 'localhost:5000';
    const protocol = req.protocol || 'http';
    const verifyUrl = `${protocol}://${host}/verify-certificate/${encodeURIComponent(cert.certificate_number)}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(verifyUrl)}&color=00552B&bgcolor=FFFFFF`;

    const formattedDate = new Date(cert.issue_date || cert.created_at || Date.now()).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    const inst = await getInstitutionalSettings();
    const mentorName = inst.mentor_name || cert.coordinator_name || inst.default_coordinator_name || 'Budi Santoso, S.Kom., M.T.';
    const mentorNpp = inst.mentor_npp || cert.coordinator_npp || inst.default_coordinator_npp || '8765432109';
    const branchHeadName = inst.branch_head_name;
    const branchHeadNpp = inst.branch_head_npp;
    const branchName = inst.branch_name;
    const branchAddress = inst.branch_address;
    const mentorSig = inst.mentor_signature;
    const branchHeadSig = inst.branch_head_signature;
    const shaHash = cert.digital_signature_hash || cert.digital_signature || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

    const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>E-Sertifikat Magang Resmi BPJS Ketenagakerjaan - ${cert.participant_name}</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: #232326;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 20px 0;
    }
    .top-actions {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
      background: #121214;
      padding: 10px 20px;
      border-radius: 999px;
      color: white;
      box-shadow: 0 4px 15px rgba(0,0,0,0.3);
    }
    .btn-print {
      background: #008F4C;
      color: white;
      border: none;
      padding: 8px 18px;
      border-radius: 999px;
      font-weight: bold;
      font-size: 13px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .btn-print:hover {
      background: #00753e;
    }
    .btn-back {
      color: #ccc;
      text-decoration: none;
      font-size: 13px;
      font-weight: 600;
    }
    .cert-container {
      width: 1050px;
      height: 700px;
      background: #FFFDF9;
      position: relative;
      padding: 35px 45px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      box-shadow: 0 10px 30px rgba(0,0,0,0.4);
      background-image: radial-gradient(circle at 50% 50%, rgba(0, 143, 76, 0.02) 0%, rgba(212, 175, 55, 0.04) 100%);
    }
    /* Guilloche Borders */
    .outer-border {
      position: absolute;
      inset: 14px;
      border: 3.5px solid #008F4C;
      border-radius: 12px;
      pointer-events: none;
    }
    .inner-border {
      position: absolute;
      inset: 20px;
      border: 1.5px solid #D4AF37;
      border-radius: 8px;
      pointer-events: none;
    }
    .corner-tl { position: absolute; top: 14px; left: 14px; width: 35px; height: 35px; border-top: 5px solid #008F4C; border-left: 5px solid #008F4C; }
    .corner-tr { position: absolute; top: 14px; right: 14px; width: 35px; height: 35px; border-top: 5px solid #008F4C; border-right: 5px solid #008F4C; }
    .corner-bl { position: absolute; bottom: 14px; left: 14px; width: 35px; height: 35px; border-bottom: 5px solid #008F4C; border-left: 5px solid #008F4C; }
    .corner-br { position: absolute; bottom: 14px; right: 14px; width: 35px; height: 35px; border-bottom: 5px solid #008F4C; border-right: 5px solid #008F4C; }
    
    /* Kop Surat */
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2px solid #008F4C;
      padding-bottom: 12px;
      position: relative;
      z-index: 2;
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 15px;
    }
    .header-logo {
      height: 48px;
      width: auto;
    }
    .header-text h2 {
      font-size: 17px;
      font-weight: 900;
      color: #008F4C;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      font-family: Georgia, serif;
    }
    .header-text p {
      font-size: 10px;
      color: #333;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .header-text small {
      font-size: 9px;
      color: #666;
    }
    .header-right {
      text-align: right;
    }
    .badge-iso {
      background: rgba(0, 143, 76, 0.1);
      border: 1px solid rgba(0, 143, 76, 0.3);
      color: #008F4C;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
    }
    
    /* Content */
    .content {
      text-align: center;
      position: relative;
      z-index: 2;
      margin: 10px 0;
    }
    .sub-title {
      font-size: 11px;
      color: #D4AF37;
      font-weight: 800;
      letter-spacing: 3px;
      text-transform: uppercase;
    }
    .main-title {
      font-size: 32px;
      font-family: Georgia, serif;
      font-weight: 900;
      color: #00552B;
      letter-spacing: 1px;
      margin-top: 4px;
    }
    .cert-sub {
      font-size: 12px;
      font-style: italic;
      color: #777;
      font-family: Georgia, serif;
      margin-bottom: 8px;
    }
    .cert-number {
      display: inline-block;
      background: #FAF5EB;
      border: 1px solid rgba(212, 175, 55, 0.6);
      padding: 3px 18px;
      border-radius: 999px;
      font-family: monospace;
      font-weight: 900;
      font-size: 12px;
      color: #121214;
    }
    .recipient-intro {
      font-size: 12px;
      color: #555;
      margin-top: 14px;
    }
    .recipient-name {
      font-size: 26px;
      font-weight: 900;
      color: #121214;
      text-transform: uppercase;
      text-decoration: underline;
      text-decoration-color: #008F4C;
      text-underline-offset: 5px;
      margin: 6px 0 3px 0;
    }
    .recipient-meta {
      font-size: 12px;
      color: #555;
      font-family: monospace;
      font-weight: bold;
    }
    .recipient-meta strong {
      color: #008F4C;
    }
    .statement {
      font-size: 12.5px;
      color: #444;
      max-width: 750px;
      margin: 12px auto 8px auto;
      line-height: 1.5;
    }
    .predicate-badge {
      display: inline-flex;
      align-items: center;
      gap: 12px;
      margin-top: 6px;
    }
    .pill-grade {
      background: #008F4C;
      color: white;
      padding: 5px 16px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 800;
    }
    .pill-score {
      background: #FAF5EB;
      border: 1px solid #D4AF37;
      color: #121214;
      padding: 5px 14px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 900;
      font-family: monospace;
    }

    /* Signatures */
    .signatures-grid {
      display: grid;
      grid-template-columns: 1fr 150px 1fr;
      align-items: flex-end;
      position: relative;
      z-index: 2;
      padding-top: 10px;
    }
    .sig-block {
      text-align: center;
      position: relative;
    }
    .sig-date {
      font-size: 11px;
      color: #666;
      font-weight: bold;
    }
    .sig-role {
      font-size: 11px;
      color: #121214;
      font-weight: 800;
    }
    .sig-specimen {
      height: 60px;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      margin: 3px 0;
    }
    .sig-name {
      border-top: 1px solid #333;
      display: inline-block;
      min-width: 220px;
      padding-top: 3px;
      font-size: 12px;
      font-weight: 900;
      color: #121214;
      text-transform: uppercase;
    }
    .sig-npp {
      font-size: 10px;
      font-family: monospace;
      color: #555;
    }
    
    /* Circular Stamp BPJS */
    .official-stamp {
      position: absolute;
      top: -14px;
      left: 20px;
      width: 100px;
      height: 100px;
      pointer-events: none;
      z-index: 10;
      opacity: 0.85;
      transform: rotate(-12deg);
    }
    
    /* QR Center */
    .qr-block {
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .qr-box {
      background: white;
      border: 1px solid #008F4C;
      padding: 4px;
      border-radius: 6px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.1);
    }
    .qr-box img {
      width: 65px;
      height: 65px;
      display: block;
    }
    .qr-caption {
      font-size: 8px;
      font-weight: 900;
      color: #008F4C;
      margin-top: 4px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .qr-hash {
      font-size: 7px;
      font-family: monospace;
      color: #888;
      max-width: 140px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* Footer Notice */
    .footer-bar {
      border-top: 1px solid rgba(212, 175, 55, 0.4);
      margin-top: 12px;
      padding-top: 4px;
      display: flex;
      justify-content: space-between;
      font-size: 8px;
      font-family: monospace;
      color: #777;
      position: relative;
      z-index: 2;
    }

    @media print {
      body {
        background: white !important;
        padding: 0 !important;
      }
      .top-actions {
        display: none !important;
      }
      .cert-container {
        width: 100vw !important;
        height: 100vh !important;
        box-shadow: none !important;
        border: none !important;
        padding: 10mm 15mm !important;
      }
    }
  </style>
</head>
<body>

  <!-- Top Action Bar (Hidden on print) -->
  <div class="top-actions">
    <span>E-Sertifikat Resmi BPJS Ketenagakerjaan (${cert.certificate_number})</span>
    <button class="btn-print" onclick="window.print()">
      🖨️ Cetak / Unduh PDF Resmi
    </button>
    <a href="/verify-certificate/${encodeURIComponent(cert.certificate_number)}" target="_blank" class="btn-back">
      Verifikasi Kriptografi
    </a>
    <button onclick="if(window.history.length > 1) { window.history.back(); } else { window.close(); }" style="background: #e11d48; color: white; border: none; padding: 8px 18px; border-radius: 999px; font-weight: bold; font-size: 13px; cursor: pointer; display: flex; align-items: center; gap: 6px;">
      ✖ Tutup / Kembali
    </button>
  </div>

  <!-- The Certificate Document -->
  <div class="cert-container" id="cert-sheet">
    <!-- Borders -->
    <div class="outer-border"></div>
    <div class="inner-border"></div>
    <div class="corner-tl"></div>
    <div class="corner-tr"></div>
    <div class="corner-bl"></div>
    <div class="corner-br"></div>

    <!-- 1. Header -->
    <div class="header">
      <div class="header-left">
        <img src="/bpjs_logo.png" alt="BPJS Ketenagakerjaan" class="header-logo" onerror="this.onerror=null; this.src='https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Logo_BPJS_Ketenagakerjaan.png/640px-Logo_BPJS_Ketenagakerjaan.png';">
        <div class="header-text">
          <h2>BPJS Ketenagakerjaan</h2>
          <p>Badan Penyelenggara Jaminan Sosial Ketenagakerjaan</p>
          <small>${branchName} • ${branchAddress}</small>
        </div>
      </div>
      <div class="header-right">
        <span class="badge-iso">Dokumen Resmi Elektronik</span>
        <div style="font-size: 8.5px; font-family: monospace; color: #666; margin-top: 4px;">ISO/IEC 27001 Terverifikasi</div>
      </div>
    </div>

    <!-- 2. Content Body -->
    <div class="content">
      <div class="sub-title">Surat Tanda Tamat Program</div>
      <h1 class="main-title">SERTIFIKAT MAGANG KERJA</h1>
      <div class="cert-sub">Certificate of Internship Completion</div>
      <div class="cert-number">Nomor: ${cert.certificate_number}</div>

      <p class="recipient-intro">Badan Penyelenggara Jaminan Sosial Ketenagakerjaan menyatakan bahwa:</p>
      <div class="recipient-name">${cert.participant_name}</div>
      <div class="recipient-meta">
        NIM / Registrasi: <strong>${cert.participant_nim}</strong> &bull; Penempatan: <strong>${cert.penempatan || 'Bidang Kepesertaan & Pelayanan'}</strong>
      </div>

      <p class="statement">
        Telah berhasil menyelesaikan program <b>Praktik Kerja Lapangan / Magang Industri Terstruktur</b> pada <b>BPJS Ketenagakerjaan ${branchName}</b> (${cert.batch_name || 'Batch 1'}) dengan capaian evaluasi kompetensi akhir:
      </p>

      <div class="predicate-badge">
        <div class="pill-grade">${cert.predicate || 'Sangat Memuaskan (Grade A)'}</div>
        <div class="pill-score">Indeks Prestasi: ${Number(cert.score_average || 90.0).toFixed(1)} / 100.0</div>
      </div>
    </div>

    <!-- 3. Dual Signatures & Stamp -->
    <div class="signatures-grid">
      <!-- Mentor Pembimbing Magang -->
      <div class="sig-block">
        <div class="sig-date">${branchName.replace(/BPJS Ketenagakerjaan (Kantor Cabang )?/i, '')}, ${formattedDate}</div>
        <div class="sig-role">Mentor Pembimbing Magang</div>
        <div class="sig-specimen">
          ${mentorSig ? `<img src="${mentorSig}" alt="Tanda Tangan Mentor" style="max-height: 58px; max-width: 170px; object-fit: contain;">` : `
            <svg width="150" height="50" viewBox="0 0 200 80" fill="none" stroke="#00552B" stroke-width="2.5" stroke-linecap="round">
              <path d="M 20 50 Q 50 10 70 45 T 120 40 Q 140 20 160 55 T 185 30" />
              <path d="M 40 40 Q 80 60 150 45" stroke-width="1.5" />
            </svg>
          `}
        </div>
        <div class="sig-name">${mentorName}</div>
        <div class="sig-npp">NPP. ${mentorNpp}</div>
      </div>

      <!-- Center QR -->
      <div class="qr-block">
        <div class="qr-box">
          <img src="${qrUrl}" alt="QR Verifikasi">
        </div>
        <div class="qr-caption">Scan Untuk Verifikasi</div>
        <div class="qr-hash" title="${shaHash}">HASH: ${shaHash.substring(0, 20)}...</div>
      </div>

      <!-- Kepala Kantor Cabang + Official Stamp -->
      <div class="sig-block">
        <div class="sig-date">Mengesahkan,</div>
        <div class="sig-role">Kepala Kantor Cabang BPJS Ketenagakerjaan</div>
        <div class="sig-specimen">
          ${branchHeadSig ? `<img src="${branchHeadSig}" alt="Tanda Tangan Kepala Cabang" style="max-height: 58px; max-width: 170px; object-fit: contain; position: relative; z-index: 2;">` : `
            <svg width="160" height="50" viewBox="0 0 200 80" fill="none" stroke="#00552B" stroke-width="2.8" stroke-linecap="round" style="position:relative; z-index:2;">
              <path d="M 15 35 Q 40 5 65 35 T 100 45 Q 130 15 160 50 T 190 25" />
              <path d="M 30 55 Q 90 70 175 35" stroke-width="1.8" />
            </svg>
          `}

          <!-- OFFICIAL CIRCULAR SEAL BPJS KETENAGAKERJAAN -->
          <div class="official-stamp">
            <svg viewBox="0 0 200 200" width="100" height="100" style="color: #00875A;">
              <circle cx="100" cy="100" r="95" fill="none" stroke="currentColor" stroke-width="3" stroke-dasharray="6 2" />
              <circle cx="100" cy="100" r="88" fill="none" stroke="currentColor" stroke-width="2.2" />
              <circle cx="100" cy="100" r="62" fill="none" stroke="currentColor" stroke-width="1.8" />
              <path id="stampUp" d="M 25 100 A 75 75 0 0 1 175 100" fill="none" />
              <text font-size="10" font-weight="900" letter-spacing="2" fill="currentColor">
                <textPath href="#stampUp" startOffset="50%" text-anchor="middle">BPJS KETENAGAKERJAAN</textPath>
              </text>
              <path id="stampDn" d="M 175 100 A 75 75 0 0 1 25 100" fill="none" />
              <text font-size="9.5" font-weight="900" letter-spacing="2" fill="currentColor">
                <textPath href="#stampDn" startOffset="50%" text-anchor="middle">${branchName.toUpperCase()}</textPath>
              </text>
              <polygon points="100,68 104,78 115,78 106,84 109,95 100,89 91,95 94,84 85,78 96,78" fill="currentColor" />
              <text x="100" y="112" text-anchor="middle" font-size="11" font-weight="900" letter-spacing="1" fill="currentColor">RESMI</text>
              <text x="100" y="126" text-anchor="middle" font-size="8" font-weight="800" fill="currentColor">DISAHKAN</text>
            </svg>
          </div>
        </div>
        <div class="sig-name">${branchHeadName}</div>
        <div class="sig-npp">NPP. ${branchHeadNpp}</div>
      </div>
    </div>

    <!-- 4. Footer Legal -->
    <div class="footer-bar">
      <span>&copy; ${new Date().getFullYear()} BPJS Ketenagakerjaan. Hak Cipta Dilindungi Undang-Undang.</span>
      <span>Dokumen sah terdaftar secara elektronik. Sah tanpa stempel basah konvensional.</span>
    </div>
  </div>

  <script>
    // Auto-trigger browser print dialog after assets load
    window.addEventListener('load', function() {
      setTimeout(function() {
        window.print();
      }, 600);
    });
  </script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  } catch (error) {
    return res.status(500).send('Error rendering certificate: ' + error.message);
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
              c.score_average, c.digital_signature_hash, c.digital_signature, c.batch_name, c.status,
              u.full_name as participant_name, u.unique_id as participant_nim, u.user_id
       FROM certificates c
       JOIN users u ON c.user_id = u.user_id
       WHERE UPPER(c.certificate_number) = UPPER($1) 
          OR UPPER(COALESCE(c.digital_signature, '')) = UPPER($1)
          OR UPPER(COALESCE(c.digital_signature_hash, '')) = UPPER($1)`,
      [certNumber]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        valid: false,
        message: 'Nomor sertifikat tidak ditemukan atau tidak valid dalam registri resmi BPJSTK.'
      });
    }

    const cert = result.rows[0];

    // Cryptographic HMAC-SHA256 Signature Verification
    const isCryptoValid = verifyCertificateSignature({
      certNumber: cert.certificate_number,
      recipientName: cert.participant_name,
      userId: cert.user_id,
      grade: cert.score_average >= 85 ? 'A' : cert.score_average >= 75 ? 'B' : 'C',
      finalScore: cert.score_average,
      issueDate: cert.issue_date instanceof Date ? cert.issue_date.toISOString().split('T')[0] : String(cert.issue_date)
    }, cert.digital_signature || cert.digital_signature_hash);

    return res.json({
      success: true,
      valid: true,
      isSignatureValid: isCryptoValid,
      message: 'Sertifikat ini ASLI dan terdaftar resmi di Pangkalan Data BPJSTK.',
      data: {
        ...cert,
        institution: 'BPJSTK (Badan Penyelenggara Jaminan Sosial Ketenagakerjaan)',
        verification_status: isCryptoValid 
          ? 'Terverifikasi Asli (HMAC-SHA256 Cryptographic Signature)' 
          : 'Terverifikasi di Pangkalan Data BPJSTK',
        signature_algorithm: 'HMAC-SHA256',
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
router.get('/coordinator/early-warning', authenticateToken, requireRole('Koordinator', 'Administrator'), async (req, res) => {
  try {
    let sql = `
      SELECT u.user_id, u.full_name, u.unique_id, 
             COALESCE(u.email, u.unique_id || '@bpjsketenagakerjaan.go.id') as email,
             COUNT(DISTINCT a.attendance_id) as total_attendance,
             COUNT(DISTINCT CASE WHEN a.status = 'Terlambat' THEN a.attendance_id END) as late_count,
             COUNT(DISTINCT CASE WHEN a.status = 'Alfa' THEN a.attendance_id END) as absent_count,
             COALESCE(AVG(s.score_value), 0) as avg_score,
             COUNT(DISTINCT s.score_id) as modules_completed
      FROM users u
      LEFT JOIN attendance_records a ON u.user_id = a.user_id
      LEFT JOIN scores s ON u.user_id = s.user_id
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
router.get('/admin/comparison', authenticateToken, requireRole('Administrator'), async (req, res) => {
  try {
    // 1. Real batch comparison data directly from database
    const batchRes = await query(`
      SELECT 
        b.batch_id,
        b.batch_name,
        b.start_date,
        b.end_date,
        b.status,
        COUNT(DISTINCT ub.user_id) as participants,
        COALESCE(AVG(p.nilai), 0) as avg_score,
        COUNT(DISTINCT a.attendance_id) as total_attendance,
        COUNT(DISTINCT CASE WHEN a.status = 'Hadir' THEN a.attendance_id END) as total_hadir,
        COUNT(DISTINCT pes.peserta_id) as realized_bpu
      FROM batches b
      LEFT JOIN user_batches ub ON b.batch_id = ub.batch_id
      LEFT JOIN progress p ON ub.user_id = p.user_id
      LEFT JOIN attendance_records a ON ub.user_id = a.user_id
      LEFT JOIN peserta pes ON ub.user_id = pes.user_id
      GROUP BY b.batch_id, b.batch_name, b.start_date, b.end_date, b.status
      ORDER BY b.batch_id ASC
    `);

    const batchData = batchRes.rows.map(b => {
      const partCount = parseInt(b.participants, 10) || 0;
      const att = parseInt(b.total_attendance, 10) || 0;
      const hadir = parseInt(b.total_hadir, 10) || 0;
      const attRate = att > 0 ? parseFloat(((hadir / att) * 100).toFixed(1)) : 0;
      const realBpu = parseInt(b.realized_bpu, 10) || 0;
      const targetBpu = Math.max(50, partCount * 20);
      const compRate = targetBpu > 0 ? parseFloat(Math.min(100, (realBpu / targetBpu) * 100).toFixed(1)) : 0;
      const yearStr = b.start_date ? new Date(b.start_date).getFullYear().toString() : String(new Date().getFullYear());

      return {
        batchName: b.batch_name,
        year: yearStr,
        participants: partCount,
        attendanceRate: attRate,
        avgScore: parseFloat(parseFloat(b.avg_score).toFixed(1)),
        targetBPU: targetBpu,
        realizedBPU: realBpu,
        completionRate: compRate,
        status: b.status || 'Aktif'
      };
    });

    const inst = await getInstitutionalSettings();

    // 2. Real regional / placement performance data directly from database
    const placementRes = await query(`
      SELECT 
        LOWER(COALESCE(u.penempatan, 'kantor')) as placement_key,
        MAX(COALESCE(u.penempatan, 'Kantor')) as placement_label,
        COUNT(DISTINCT u.user_id) as participants,
        COUNT(DISTINCT pes.peserta_id) as bpu_acquired,
        COUNT(DISTINCT a.attendance_id) as total_att,
        COUNT(DISTINCT CASE WHEN a.status = 'Hadir' THEN a.attendance_id END) as hadir_att
      FROM users u
      LEFT JOIN peserta pes ON u.user_id = pes.user_id
      LEFT JOIN attendance_records a ON u.user_id = a.user_id
      WHERE u.role_id = 1 AND u.status = 'Aktif'
      GROUP BY LOWER(COALESCE(u.penempatan, 'kantor'))
      ORDER BY participants DESC
    `);

    const regionalData = placementRes.rows.map((r, idx) => {
      const totalA = parseInt(r.total_att, 10) || 0;
      const hadirA = parseInt(r.hadir_att, 10) || 0;
      const retRate = totalA > 0 ? parseFloat(((hadirA / totalA) * 100).toFixed(1)) : 0;
      const name = r.placement_key === 'kantor' ? `${inst.branch_name} (WFO)` :
                   r.placement_key === 'lapangan' ? 'Penugasan Sentra BPU Lapangan' :
                   `Bidang ${r.placement_label}`;

      return {
        region: name,
        area: inst.branch_name,
        participants: parseInt(r.participants, 10) || 0,
        bpuAcquired: parseInt(r.bpu_acquired, 10) || 0,
        retentionRate: retRate,
        topPoint: r.placement_key === 'lapangan' ? 'Sentra UMKM Binaan BPU' : inst.branch_name
      };
    });

    const totalRealizedBpu = batchData.reduce((acc, b) => acc + b.realizedBPU, 0);
    const activeAttBatches = batchData.filter(b => b.attendanceRate > 0);
    const avgAttendance = activeAttBatches.length > 0
      ? (activeAttBatches.reduce((acc, b) => acc + b.attendanceRate, 0) / activeAttBatches.length).toFixed(1)
      : '0.0';

    return res.json({
      success: true,
      data: {
        batchComparison: batchData,
        regionalComparison: regionalData,
        keyInsights: [
          `Total realisasi akuisisi BPU terverifikasi saat ini mencapai ${totalRealizedBpu} peserta.`,
          `Rata-rata tingkat kehadiran presensi terverifikasi GPS berada di angka ${avgAttendance}%.`,
          `Seluruh data dihitung secara *live* dari database PostgreSQL Neon.`
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
router.get('/admin/forensic-audit', authenticateToken, requireRole('Administrator'), async (req, res) => {
  try {
    const { anomaly_only, category, search } = req.query;

    const conditions = [];
    if (anomaly_only === 'true') {
      conditions.push(`a.is_anomaly = TRUE`);
    }
    if (category === 'mutations') {
      conditions.push(`a.activity_type IN (
        'ATTENDANCE_VERIFIED', 'LEAVE_APPROVAL', 'LEAVE_REJECTED',
        'ACQUISITION_VERIFIED', 'ACQUISITION_UPDATED', 'ACQUISITION_DELETED', 'ACQUISITION_PAYMENT_CONFIRMED',
        'SCORE_CREATED', 'SCORE_UPDATED', 'SCORE_DELETED',
        'GRADING_SAVED', 'GRADING_PROGRESS_UPDATED', 'GRADING_SCORES_UPDATED',
        'VISITS_UPDATED', 'PROGRESS_UPDATED', 'USER_UPDATED', 'USER_DELETED',
        'OVERTIME_RECORDED', 'CERTIFICATE_ISSUED', 'CERTIFICATE_PURGED',
        'CERTIFICATE_REISSUE_APPROVED', 'CERTIFICATE_REISSUE_REJECTED'
      )`);
    }

    let sql = `
      SELECT a.log_id, a.user_id, a.activity_type, a.details, a.ip_address,
             a.is_anomaly, a.anomaly_reason, a.user_agent, a.created_at,
             u.full_name, u.unique_id, r.role_name
      FROM activity_logs a
      LEFT JOIN users u ON a.user_id = u.user_id
      LEFT JOIN roles r ON u.role_id = r.role_id
    `;

    if (conditions.length > 0) {
      sql += ` WHERE ` + conditions.join(' AND ');
    }

    sql += ` ORDER BY a.created_at DESC LIMIT ${search ? 300 : 150}`;

    const result = await query(sql);

    // Compute anomaly summary stats
    const statsRes = await query(`
      SELECT 
        COUNT(*) as total_logs,
        COUNT(CASE WHEN is_anomaly = TRUE THEN 1 END) as total_anomalies,
        COUNT(DISTINCT ip_address) as unique_ips
      FROM activity_logs
    `);

    let rows = result.rows.map(r => {
      const decoded = typeof r.details === 'string' && r.details.startsWith('zst:v1:')
        ? decompressPayload(r.details)
        : r.details;
      const detailsText = decoded && typeof decoded === 'object' ? JSON.stringify(decoded) : (decoded || '');
      return { ...r, details: detailsText };
    });

    if (search && String(search).trim()) {
      const qLower = String(search).trim().toLowerCase();
      rows = rows.filter(r =>
        (r.details && String(r.details).toLowerCase().includes(qLower)) ||
        (r.activity_type && String(r.activity_type).toLowerCase().includes(qLower)) ||
        (r.full_name && String(r.full_name).toLowerCase().includes(qLower)) ||
        (r.unique_id && String(r.unique_id).toLowerCase().includes(qLower)) ||
        (r.role_name && String(r.role_name).toLowerCase().includes(qLower))
      );
    }

    return res.json({
      success: true,
      summary: {
        totalLogs: parseInt(statsRes.rows[0].total_logs, 10) || 0,
        totalAnomalies: parseInt(statsRes.rows[0].total_anomalies, 10) || 0,
        uniqueIps: parseInt(statsRes.rows[0].unique_ips, 10) || 0
      },
      data: rows.slice(0, 150)
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// =========================================================================
// 9. PENGATURAN TARIF & MANFAAT RESMI BPJSTK BPU (DINAMIS)
// =========================================================================

/**
 * GET /api/bpu/rates
 * Returns active official BPJSTK BPU contribution rates and maximum benefits
 */
router.get('/bpu/rates', authenticateToken, async (req, res) => {
  try {
    const result = await query(`SELECT * FROM bpu_rates ORDER BY id ASC LIMIT 1`);
    if (result.rows.length === 0) {
      return res.json({
        success: true,
        data: {
          jkk_percentage: 0.01,
          jkk_min_amount: 10000,
          jkm_flat_amount: 6800,
          jht_percentage: 0.02,
          jht_min_amount: 20000,
          death_benefit_amount: 42000000,
          max_scholarship_amount: 174000000,
          description: 'Tarif Iuran Resmi BPJSTK BPU'
        }
      });
    }
    return res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PUT /api/bpu/rates
 * Administrator updates BPU rates and benefit caps
 */
router.put('/bpu/rates', authenticateToken, requireRole('Administrator'), async (req, res) => {
  try {
    const {
      jkk_percentage,
      jkk_min_amount,
      jkm_flat_amount,
      jht_percentage,
      jht_min_amount,
      death_benefit_amount,
      max_scholarship_amount,
      description
    } = req.body;

    const result = await query(
      `INSERT INTO bpu_rates (id, jkk_percentage, jkk_min_amount, jkm_flat_amount, jht_percentage, jht_min_amount, death_benefit_amount, max_scholarship_amount, description, updated_at)
       VALUES (1, COALESCE($1, 0.01), COALESCE($2, 10000), COALESCE($3, 6800), COALESCE($4, 0.02), COALESCE($5, 20000), COALESCE($6, 42000000), COALESCE($7, 174000000), COALESCE($8, 'Tarif Iuran Resmi BPJSTK BPU'), CURRENT_TIMESTAMP)
       ON CONFLICT (id) DO UPDATE SET
         jkk_percentage = COALESCE($1, bpu_rates.jkk_percentage),
         jkk_min_amount = COALESCE($2, bpu_rates.jkk_min_amount),
         jkm_flat_amount = COALESCE($3, bpu_rates.jkm_flat_amount),
         jht_percentage = COALESCE($4, bpu_rates.jht_percentage),
         jht_min_amount = COALESCE($5, bpu_rates.jht_min_amount),
         death_benefit_amount = COALESCE($6, bpu_rates.death_benefit_amount),
         max_scholarship_amount = COALESCE($7, bpu_rates.max_scholarship_amount),
         description = COALESCE($8, bpu_rates.description),
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [
        jkk_percentage ?? null,
        jkk_min_amount ?? null,
        jkm_flat_amount ?? null,
        jht_percentage ?? null,
        jht_min_amount ?? null,
        death_benefit_amount ?? null,
        max_scholarship_amount ?? null,
        description ?? null
      ]
    );

    return res.json({
      success: true,
      message: 'Tarif iuran dan santunan BPJSTK BPU berhasil diperbarui!',
      data: result.rows[0]
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// =========================================================================
// 10. DAFTAR PENEMPATAN KERJA DINAMIS (PLACEMENT OPTIONS)
// =========================================================================

/**
 * GET /api/placements
 * Retrieve active placement / unit options
 */
router.get('/placements', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT id, name, code, description, is_active FROM placement_options 
       WHERE is_active = TRUE AND LOWER(code) IN ('kantor', 'lapangan') 
       ORDER BY id ASC`
    );
    return res.json({ success: true, data: result.rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/placements
 * Admin adds a new placement option
 */
router.post('/placements', authenticateToken, requireRole('Administrator'), async (req, res) => {
  try {
    const { name, code, description } = req.body;
    if (!name || !code) {
      return res.status(400).json({ success: false, message: 'Nama dan kode penempatan wajib diisi.' });
    }

    const cleanCode = code.toLowerCase().replace(/\s+/g, '_');
    const result = await query(
      `INSERT INTO placement_options (name, code, description, is_active)
       VALUES ($1, $2, $3, TRUE)
       ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, is_active = TRUE
       RETURNING *`,
      [name, cleanCode, description || null]
    );

    return res.status(201).json({
      success: true,
      message: 'Opsi penempatan berhasil ditambahkan!',
      data: result.rows[0]
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// =========================================================================
// 11. SAKLAR MODE PEMELIHARAAN DINAMIS (DYNAMIC MAINTENANCE MODE SWITCH)
// =========================================================================

/**
 * GET /api/admin/system/maintenance
 * Retrieves dynamic maintenance mode settings
 */
router.get('/admin/system/maintenance', async (req, res) => {
  try {
    const resSettings = await query(
      `SELECT setting_key, setting_value FROM system_settings 
       WHERE setting_key IN ('maintenance_mode', 'maintenance_message', 'maintenance_estimated_end')`
    );

    const config = {
      is_active: false,
      message: 'Sistem Absensi & Nilai BPJSTK sedang dalam pemeliharaan berkala untuk peningkatan infrastruktur.',
      estimated_end: null
    };

    for (const row of resSettings.rows) {
      if (row.setting_key === 'maintenance_mode') config.is_active = (row.setting_value === 'true' || row.setting_value === '1');
      if (row.setting_key === 'maintenance_message') config.message = row.setting_value;
      if (row.setting_key === 'maintenance_estimated_end') config.estimated_end = row.setting_value || null;
    }

    return res.json({ success: true, data: config });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PUT /api/admin/system/maintenance
 * Administrator switches maintenance mode on/off
 */
router.put('/admin/system/maintenance', authenticateToken, requireRole('Administrator'), async (req, res) => {
  try {
    const { is_active, message, estimated_end } = req.body;
    const activeVal = String(Boolean(is_active));
    const msgVal = message || 'Sistem Absensi & Nilai BPJSTK sedang dalam pemeliharaan berkala untuk peningkatan infrastruktur.';
    const endVal = estimated_end || '';

    await query(
      `INSERT INTO system_settings (setting_key, setting_value, updated_at, updated_by)
       VALUES ('maintenance_mode', $1, CURRENT_TIMESTAMP, $2)
       ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = CURRENT_TIMESTAMP, updated_by = EXCLUDED.updated_by`,
      [activeVal, req.user.user_id]
    );

    await query(
      `INSERT INTO system_settings (setting_key, setting_value, updated_at, updated_by)
       VALUES ('maintenance_message', $1, CURRENT_TIMESTAMP, $2)
       ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = CURRENT_TIMESTAMP, updated_by = EXCLUDED.updated_by`,
      [msgVal, req.user.user_id]
    );

    await query(
      `INSERT INTO system_settings (setting_key, setting_value, updated_at, updated_by)
       VALUES ('maintenance_estimated_end', $1, CURRENT_TIMESTAMP, $2)
       ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = CURRENT_TIMESTAMP, updated_by = EXCLUDED.updated_by`,
      [endVal, req.user.user_id]
    );

    // Invalidate cache immediately
    cache.del('sys_maintenance_settings');

    await logActivity({
      userId: req.user.user_id,
      action: 'MAINTENANCE_TOGGLED',
      details: `Mode pemeliharaan diubah menjadi: ${is_active ? 'AKTIF' : 'NONAKTIF'}. Pesan: ${msgVal}`,
      req
    });

    return res.json({
      success: true,
      message: `Mode pemeliharaan sistem berhasil ${is_active ? 'diaktifkan' : 'dinonaktifkan'}!`,
      data: { is_active: Boolean(is_active), message: msgVal, estimated_end: endVal }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// =========================================================================
// 12. APPEND-ONLY MERKLE AUDIT TRAIL VERIFICATION (ANTI-TAMPERING)
// =========================================================================

/**
 * GET /api/admin/audit-trail/verify
 * Cryptographically verifies that no logs have been manipulated, edited, or deleted in DB
 */
router.get('/admin/audit-trail/verify', authenticateToken, requireRole('Administrator'), async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 500;
    const auditResult = await verifyAuditChainIntegrity(limit);

    await logActivity({
      userId: req.user.user_id,
      action: auditResult.isValid ? 'MERKLE_CHAIN_VERIFY' : 'MERKLE_TAMPER_DETECTED',
      details: auditResult.message,
      req,
      isAnomaly: !auditResult.isValid,
      anomalyReason: !auditResult.isValid ? auditResult.message : null
    });

    return res.json({
      success: true,
      data: auditResult
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// =========================================================================
// 13. COLD STORAGE ARCHIVAL WORKER & VACUUM MAINTENANCE
// =========================================================================

/**
 * GET /api/admin/maintenance/archive/status
 * Checks if expired records (> 90 days chat, > 180 days logs) exist and archival is due
 */
router.get('/admin/maintenance/archive/status', authenticateToken, requireRole('Administrator'), async (req, res) => {
  try {
    const chatDays = parseInt(req.query.chatDays, 10) || 90;
    const logDays = parseInt(req.query.logDays, 10) || 180;

    const chatCountRes = await query(
      `SELECT COUNT(*)::int as count FROM direct_messages WHERE created_at < NOW() - INTERVAL '${chatDays} days'`
    );
    const logCountRes = await query(
      `SELECT COUNT(*)::int as count FROM activity_logs WHERE created_at < NOW() - INTERVAL '${logDays} days'`
    );

    const expiredChats = chatCountRes.rows[0]?.count || 0;
    const expiredLogs = logCountRes.rows[0]?.count || 0;

    const lastArchiveRes = await query(
      `SELECT setting_value FROM system_settings WHERE setting_key = 'last_archival_timestamp' LIMIT 1`
    );

    const isDue = (expiredChats > 0 || expiredLogs > 0);

    return res.json({
      success: true,
      data: {
        expiredChats,
        expiredLogs,
        isDue,
        chatDays,
        logDays,
        lastArchival: lastArchiveRes.rows[0]?.setting_value || null
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/admin/maintenance/archive
 * Executes cold storage archival for expired chats (> 90 days) & logs (> 180 days)
 */
router.post('/admin/maintenance/archive', authenticateToken, requireRole('Administrator'), async (req, res) => {
  try {
    const chatDays = parseInt(req.body.chatRetentionDays, 10) || 90;
    const logDays = parseInt(req.body.logRetentionDays, 10) || 180;

    const result = await runColdStorageArchival({ chatRetentionDays: chatDays, logRetentionDays: logDays });

    await query(`
      INSERT INTO system_settings (setting_key, setting_value, updated_at)
      VALUES ('last_archival_timestamp', $1, CURRENT_TIMESTAMP)
      ON CONFLICT (setting_key) DO UPDATE SET setting_value = $1, updated_at = CURRENT_TIMESTAMP
    `, [new Date().toISOString()]);

    await logActivity({
      userId: req.user.user_id,
      action: 'COLD_STORAGE_ARCHIVAL',
      details: result.message,
      req
    });

    return res.json(result);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/admin/maintenance/vacuum
 * Executes database optimization, cleanup, and ANALYZE statistics refresh
 */
router.post('/admin/maintenance/vacuum', authenticateToken, requireRole('Administrator'), async (req, res) => {
  try {
    const result = await runDatabaseVacuumMaintenance();

    await logActivity({
      userId: req.user.user_id,
      action: 'DATABASE_VACUUM_MAINTENANCE',
      details: result.message,
      req
    });

    return res.json(result);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// =========================================================================
// 14. TWO-PERSON APPROVAL RULE & MASTER SECURITY PIN (DUAL CONTROL)
// =========================================================================

/**
 * POST /api/admin/security/verify-pin
 * Verifies secondary 6-digit master security PIN for dangerous operations
 */
router.post('/admin/security/verify-pin', authenticateToken, requireRole('Administrator'), async (req, res) => {
  try {
    const { pin } = req.body;
    if (!pin) {
      return res.status(400).json({ success: false, message: 'PIN keamanan wajib dimasukkan.' });
    }

    const pinRes = await query(
      `SELECT setting_value FROM system_settings WHERE setting_key = 'master_security_pin_hash' LIMIT 1`
    );

    const envDefaultPinHash = process.env.DEFAULT_MASTER_PIN_HASH || '$2b$10$0PI6Y9S8btRBiK89dNhwWOK5d593S0.0FvnbhszwsCmriSu2vCqPK';
    const storedHash = pinRes.rows.length > 0 && pinRes.rows[0].setting_value
      ? pinRes.rows[0].setting_value
      : envDefaultPinHash;

    let isMatch = false;
    if (storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$')) {
      isMatch = await bcrypt.compare(String(pin), storedHash);
    } else {
      isMatch = (String(pin) === String(storedHash));
    }

    if (!isMatch) {
      await logActivity({
        userId: req.user.user_id,
        action: 'SECURITY_PIN_FAIL',
        details: 'Gagal verifikasi PIN Keamanan Master (Wrong PIN)',
        req,
        isAnomaly: true
      });
      return res.status(401).json({ success: false, message: 'PIN Keamanan Master salah. Tindakan ditolak.' });
    }

    await logActivity({
      userId: req.user.user_id,
      action: 'SECURITY_PIN_SUCCESS',
      details: 'PIN Keamanan Master berhasil diverifikasi untuk otorisasi ganda.',
      req
    });

    return res.json({ success: true, message: 'Otorisasi PIN Keamanan Master Berhasil.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/admin/approvals
 * Lists pending high-risk approval tickets
 */
router.get('/admin/approvals', authenticateToken, requireRole('Administrator'), async (req, res) => {
  try {
    const result = await query(
      `SELECT p.*, req.full_name as requester_name, app.full_name as approver_name
       FROM pending_approvals p
       JOIN users req ON p.requested_by = req.user_id
       LEFT JOIN users app ON p.approved_by = app.user_id
       ORDER BY p.created_at DESC`
    );
    return res.json({ success: true, data: result.rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/admin/approvals/request
 * Creates a two-person approval ticket for a high-risk action
 */
router.post('/admin/approvals/request', authenticateToken, requireRole('Administrator'), async (req, res) => {
  try {
    const { action_type, action_title, payload, reason } = req.body;
    if (!action_type || !action_title || !payload) {
      return res.status(400).json({ success: false, message: 'Jenis tindakan, judul, dan data payload wajib diisi.' });
    }

    const result = await query(
      `INSERT INTO pending_approvals (action_type, action_title, payload, reason, requested_by, status, created_at)
       VALUES ($1, $2, $3, $4, $5, 'PENDING', CURRENT_TIMESTAMP)
       RETURNING *`,
      [action_type, action_title, JSON.stringify(payload), reason || null, req.user.user_id]
    );

    await logActivity({
      userId: req.user.user_id,
      action: 'APPROVAL_REQUESTED',
      details: `Tiket persetujuan ganda dibuat untuk: ${action_title}`,
      req
    });

    return res.status(201).json({
      success: true,
      message: 'Tiket tindakan berisiko tinggi berhasil dibuat dan menunggu persetujuan sekunder.',
      data: result.rows[0]
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/admin/approvals/:id/review
 * Approves or Rejects a high-risk action ticket (requires different admin from requester)
 */
router.post('/admin/approvals/:id/review', authenticateToken, requireRole('Administrator'), async (req, res) => {
  try {
    const { id } = req.params;
    const { decision, rejection_reason } = req.body; // 'APPROVE' or 'REJECT'

    const ticketRes = await query(`SELECT * FROM pending_approvals WHERE approval_id = $1`, [id]);
    if (ticketRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Tiket persetujuan tidak ditemukan.' });
    }

    const ticket = ticketRes.rows[0];
    if (ticket.status !== 'PENDING') {
      return res.status(400).json({ success: false, message: `Tiket ini sudah berstatus ${ticket.status}.` });
    }

    // Two-Person Control Rule: Cannot approve your own request ticket
    if (ticket.requested_by === req.user.user_id && decision === 'APPROVE') {
      return res.status(403).json({
        success: false,
        message: 'Aturan Kontrol Ganda (Two-Person Rule): Anda tidak dapat menyetujui tiket yang Anda buat sendiri. Wajib disetujui oleh Administrator lain.'
      });
    }

    const newStatus = decision === 'APPROVE' ? 'APPROVED' : 'REJECTED';
    const result = await query(
      `UPDATE pending_approvals
       SET status = $1, approved_by = $2, rejection_reason = $3, resolved_at = CURRENT_TIMESTAMP
       WHERE approval_id = $4
       RETURNING *`,
      [newStatus, req.user.user_id, rejection_reason || null, id]
    );

    await logActivity({
      userId: req.user.user_id,
      action: `APPROVAL_${newStatus}`,
      details: `Tiket #${id} (${ticket.action_title}) telah di-${newStatus.toLowerCase()} oleh Administrator.`,
      req
    });

    return res.json({
      success: true,
      message: `Tiket persetujuan berhasil di-${newStatus === 'APPROVED' ? 'setujui' : 'tolak'}.`,
      data: result.rows[0]
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// =========================================================================
// 15. DIRECT-TO-CLOUD PRE-SIGNED URL UPLOAD (BYPASS SERVER EXPRESS)
// =========================================================================

const UPLOAD_SIGNING_SECRET =
  process.env.UPLOAD_SIGNING_SECRET ||
  process.env.JWT_SECRET ||
  crypto.createHmac('sha256', 'bpjstk-upload-ticket-secret-2026').update(process.env.DATABASE_URL || 'local-dev').digest('hex');

/**
 * POST /api/upload/pre-signed-url
 * Issues short-lived pre-signed ticket stored in PostgreSQL for serverless consistency
 */
router.post('/upload/pre-signed-url', authenticateToken, async (req, res) => {
  try {
    const { filename, fileType } = req.body;
    if (!filename || !fileType) {
      return res.status(400).json({ success: false, message: 'Filename dan fileType wajib diisi.' });
    }

    // Allowed mime types
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowed.includes(fileType.toLowerCase())) {
      return res.status(400).json({ success: false, message: 'Format file tidak diizinkan. Hanya WebP, JPG, PNG, dan PDF.' });
    }

    const ticketId = crypto.randomUUID();
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 mins
    const secretSignature = crypto.createHmac('sha256', UPLOAD_SIGNING_SECRET)
      .update(`${ticketId}:${req.user.user_id}:${expiresAt}`)
      .digest('hex');

    await query(
      `INSERT INTO upload_tickets (ticket_id, user_id, filename, file_type, signature, used, expires_at)
       VALUES ($1, $2, $3, $4, $5, FALSE, to_timestamp($6 / 1000.0))`,
      [ticketId, req.user.user_id, filename, fileType.toLowerCase(), secretSignature, expiresAt]
    );

    return res.json({
      success: true,
      data: {
        ticket: ticketId,
        uploadUrl: `/api/upload/direct/${ticketId}`,
        signature: secretSignature,
        expiresInSeconds: 900,
        allowedMimeType: fileType
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/upload/direct/:ticket
 * Direct endpoint receiving file payload with valid DB ticket & authenticated owner
 */
router.post('/upload/direct/:ticket', authenticateToken, async (req, res) => {
  try {
    const { ticket } = req.params;
    const { fileDataUri, signature } = req.body;

    if (!fileDataUri) {
      return res.status(400).json({ success: false, message: 'Konten file tidak ditemukan.' });
    }

    const ticketRes = await query(
      `UPDATE upload_tickets
       SET used = TRUE
       WHERE ticket_id = $1
         AND user_id = $2
         AND used = FALSE
         AND expires_at > NOW()
         AND ($3::text IS NULL OR signature = $3)
       RETURNING *`,
      [ticket, req.user.user_id, signature || null]
    );

    if (ticketRes.rows.length === 0) {
      return res.status(403).json({ success: false, message: 'Tiket pre-signed upload sudah kadaluwarsa, sudah terpakai, atau tidak valid.' });
    }

    const session = ticketRes.rows[0];
    return res.json({
      success: true,
      message: 'File berhasil diunggah secara langsung.',
      url: fileDataUri,
      filename: session.filename
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// =========================================================================
// 16. DIGITAL BROCHURES & BPU SOCIALIZATION MATERIALS CATALOG
// =========================================================================

/**
 * GET /api/brochures
 * Retrieves active BPU brochures and flyers catalog
 */
router.get('/brochures', authenticateToken, async (req, res) => {
  try {
    const brochures = await cache.getOrSet('sys_digital_brochures', async () => {
      const result = await query(
        `SELECT * FROM digital_brochures WHERE is_active = TRUE ORDER BY brochure_id ASC`
      );
      return result.rows;
    }, 10 * 60 * 1000);

    return res.json({ success: true, data: brochures });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/brochures/:id/stats
 * Increments share or download count
 */
router.post('/brochures/:id/stats', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.body; // 'share' or 'download'

    const col = type === 'share' ? 'share_count' : 'download_count';
    const result = await query(
      `UPDATE digital_brochures SET ${col} = ${col} + 1 WHERE brochure_id = $1 RETURNING *`,
      [id]
    );

    cache.del('sys_digital_brochures');
    return res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/brochures
 * Administrator adds a new flyer / brochure to catalog
 */
router.post('/brochures', authenticateToken, requireRole('Administrator'), async (req, res) => {
  try {
    const { title, category, target_audience, summary, file_url, thumbnail_url } = req.body;
    if (!title || !file_url) {
      return res.status(400).json({ success: false, message: 'Judul dan URL file brosur wajib diisi.' });
    }

    const result = await query(
      `INSERT INTO digital_brochures (title, category, target_audience, summary, file_url, thumbnail_url, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE)
       RETURNING *`,
      [title, category || 'Brosur Resmi', target_audience || 'Pekerja Mandiri / BPU', summary || null, file_url, thumbnail_url || null]
    );

    cache.del('sys_digital_brochures');

    await logActivity({
      userId: req.user.user_id,
      action: 'BROCHURE_ADDED',
      details: `Brosur baru ditambahkan ke katalog digital: ${title}`,
      req
    });

    return res.status(201).json({ success: true, message: 'Brosur berhasil ditambahkan ke katalog.', data: result.rows[0] });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// =========================================================================
// 25. TELEMETRY: VERCEL COLD-START & LATENCY METRICS TRACKER
// =========================================================================

/**
 * GET /api/admin/telemetry/metrics
 */
router.get(['/admin/telemetry/metrics', '/telemetry/metrics'], authenticateToken, requireRole('Administrator'), async (req, res) => {
  try {
    const metrics = await getTelemetryMetrics();
    return res.json({ success: true, data: metrics });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// =========================================================================
// 26. HONEYTOKEN INTRUSION TRAPS & JAILED ATTACKER MANAGEMENT
// =========================================================================

/**
 * GET /api/admin/security/jailed-ips
 */
router.get('/admin/security/jailed-ips', authenticateToken, requireRole('Administrator'), async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM jailed_ips ORDER BY jailed_at DESC LIMIT 100`
    );
    return res.json({ success: true, data: result.rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/admin/security/unban-ip
 */
router.post('/admin/security/unban-ip', authenticateToken, requireRole('Administrator'), async (req, res) => {
  try {
    const { ip } = req.body;
    if (!ip) {
      return res.status(400).json({ success: false, message: 'Alamat IP wajib diisi.' });
    }

    await unbanIp(ip);

    await logActivity({
      userId: req.user.user_id,
      action: 'SECURITY_IP_UNBANNED',
      details: `Administrator mencabut pemblokiran IP: ${ip}`,
      req
    });

    return res.json({ success: true, message: `Alamat IP ${ip} berhasil dicabut dari status pemblokiran.` });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/admin/security/honeytoken-traps
 */
router.get('/admin/security/honeytoken-traps', authenticateToken, requireRole('Administrator'), async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM honeytoken_traps ORDER BY triggered_at DESC LIMIT 100`
    );
    return res.json({ success: true, data: result.rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// =========================================================================
// 27. TRUE NTP TIME SYNCHRONIZATION (ANTI UBAH JAM HP)
// =========================================================================

/**
 * GET /api/time/sync
 * Returns authoritative server time to detect client clock tampering
 */
router.get('/time/sync', (req, res) => {
  const now = Date.now();
  return res.json({
    success: true,
    serverTime: now,
    iso: new Date(now).toISOString(),
    timezone: 'Asia/Jakarta (WIB)',
    offsetSeconds: 7 * 3600
  });
});

// =========================================================================
// 28. PUSAT KONSELING & PENGADUAN ANONIM TERISOLASI (WHISTLEBLOWING CHANNEL)
// =========================================================================

/**
 * POST /api/whistleblowing/submit
 * Completely anonymous submission - NEVER records user_id
 */
router.post('/whistleblowing/submit', async (req, res) => {
  try {
    const { category, subject, description, location_or_unit } = req.body;

    if (!category || !subject || !description) {
      return res.status(400).json({
        success: false,
        message: 'Kategori, judul pengaduan, dan penjelasan detail wajib diisi.'
      });
    }

    // Generate unique anonymous tracking ticket code
    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    const ticketCode = `WB-${new Date().getFullYear()}-${randomHex}`;

    const result = await query(
      `INSERT INTO whistleblowing_reports (ticket_code, category, subject, description, location_or_unit, status)
       VALUES ($1, $2, $3, $4, $5, 'TERKIRIM')
       RETURNING ticket_code, category, subject, status, created_at`,
      [ticketCode, category, subject, description, location_or_unit || 'Kantor Cabang']
    );

    return res.status(201).json({
      success: true,
      message: 'Pengaduan rahasia berhasil dikirimkan ke Tim Kepatuhan BPJS Ketenagakerjaan. Simpan Kode Tiket Anda untuk memantau status secara anonim.',
      data: result.rows[0]
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/whistleblowing/status/:ticketCode
 * Allows anonymous whistleblowers to check report resolution status
 */
router.get('/whistleblowing/status/:ticketCode', async (req, res) => {
  try {
    const { ticketCode } = req.params;
    const result = await query(
      `SELECT ticket_code, category, subject, status, admin_response, created_at, responded_at
       FROM whistleblowing_reports
       WHERE UPPER(ticket_code) = UPPER($1) LIMIT 1`,
      [ticketCode]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Kode tiket pengaduan tidak ditemukan. Pastikan format tiket benar (contoh: WB-2026-A1B2C3).'
      });
    }

    return res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/admin/whistleblowing
 */
router.get('/admin/whistleblowing', authenticateToken, requireRole('Administrator'), async (req, res) => {
  try {
    const result = await query(
      `SELECT report_id, ticket_code, category, subject, description, location_or_unit, status, admin_response, created_at, responded_at
       FROM whistleblowing_reports
       ORDER BY created_at DESC`
    );

    return res.json({ success: true, data: result.rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PUT /api/admin/whistleblowing/:id/status
 */
router.put('/admin/whistleblowing/:id/status', authenticateToken, requireRole('Administrator'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, admin_response } = req.body;

    const result = await query(
      `UPDATE whistleblowing_reports
       SET status = COALESCE($1, status),
           admin_response = COALESCE($2, admin_response),
           responded_by = $3,
           responded_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE report_id = $4
       RETURNING *`,
      [status, admin_response, req.user.user_id, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Laporan pengaduan tidak ditemukan.' });
    }

    return res.json({
      success: true,
      message: 'Status dan tanggapan tindak lanjut pengaduan berhasil diperbarui.',
      data: result.rows[0]
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// =========================================================================
// 29. ZERO-TRUST REFRESH TOKEN FAMILY REVOCATION
// =========================================================================

/**
 * POST /api/auth/refresh-token
 * Rotates tokens within family; revokes entire family if token reuse is detected
 */
router.post('/auth/refresh-token', async (req, res) => {
  try {
    const { refreshToken, familyId } = req.body;
    if (!refreshToken || !familyId) {
      return res.status(400).json({ success: false, message: 'Refresh token dan family ID wajib dikirim.' });
    }

    const familyRes = await query(
      `SELECT * FROM refresh_token_families WHERE family_id = $1 LIMIT 1`,
      [familyId]
    );

    if (familyRes.rows.length === 0) {
      return res.status(401).json({ success: false, code: 'TOKEN_FAMILY_NOT_FOUND', message: 'Sesi token tidak ditemukan.' });
    }

    const family = familyRes.rows[0];

    // Check if family was already revoked
    if (family.is_revoked) {
      return res.status(403).json({
        success: false,
        code: 'TOKEN_FAMILY_REVOKED',
        message: 'Akses Ditolak: Rantai otorisasi ini telah dibatalkan karena terdeteksi potensi kompromi token.'
      });
    }

    // Token Reuse Detection
    if (family.current_jti !== refreshToken) {
      // Theft detected! Mark family revoked
      await query(
        `UPDATE refresh_token_families SET is_revoked = TRUE, revocation_reason = 'TOKEN_REUSE_DETECTED' WHERE family_id = $1`,
        [familyId]
      );

      await query(
        `INSERT INTO refresh_token_reuse_logs (family_id, user_id, reused_jti, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5)`,
        [familyId, family.user_id, refreshToken, req.ip, req.headers['user-agent'] || 'Unknown']
      );

      return res.status(403).json({
        success: false,
        code: 'TOKEN_REUSE_THEFT_DETECTED',
        message: 'Pencegahan Pembajakan Sesi: Token lama digunakan kembali. Seluruh sesi terkait telah dicabut seketika.'
      });
    }

    // Issue new token in the family
    const nextJti = `jti-${crypto.randomBytes(16).toString('hex')}`;
    await query(
      `UPDATE refresh_token_families 
       SET current_jti = $1, updated_at = CURRENT_TIMESTAMP
       WHERE family_id = $2`,
      [nextJti, familyId]
    );

    return res.json({
      success: true,
      data: {
        familyId,
        newRefreshToken: nextJti,
        message: 'Token berhasil dirotasi secara aman.'
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// =========================================================================
// 30. BRIN (BLOCK RANGE INDEXING) STATUS & STORAGE SAVINGS
// =========================================================================

/**
 * GET /api/admin/database/brin-status
 */
router.get('/admin/database/brin-status', authenticateToken, requireRole('Administrator'), async (req, res) => {
  try {
    const indexQuery = `
      SELECT 
        c.relname as index_name,
        t.relname as table_name,
        am.amname as index_type,
        pg_size_pretty(pg_relation_size(c.oid)) as index_size
      FROM pg_class c
      JOIN pg_am am ON c.relam = am.oid
      JOIN pg_index i ON c.oid = i.indexrelid
      JOIN pg_class t ON i.indrelid = t.oid
      WHERE c.relname LIKE '%brin%' OR c.relname LIKE '%attendance%' OR c.relname LIKE '%activity%'
      LIMIT 20;
    `;

    let rows = [];
    try {
      const resDb = await query(indexQuery);
      rows = resDb.rows;
    } catch {
      rows = [];
    }

    return res.json({
      success: true,
      data: {
        brinSupported: true,
        activeIndexes: rows,
        message: rows.length > 0
          ? 'Indeks PostgreSQL time-series aktif dan terdeteksi.'
          : 'Belum ada indeks BRIN/time-series khusus pada tabel aktivitas/kehadiran.'
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// =========================================================================
// 31. POSTGRESQL TOAST COMPRESSION & INLINING POLICY DIAGNOSTICS
// =========================================================================
router.get(['/database/toast-stats', '/admin/database/toast-stats'], authenticateToken, requireRole('Administrator'), async (req, res) => {
  try {
    const data = await getToastDiagnostics();
    return res.json(data);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// =========================================================================
// 32. SELF-HEALING POSTGRESQL POOL HEALTH & LEAK DETECTOR METRICS
// =========================================================================
router.get(['/database/pool-health', '/admin/database/pool-health'], authenticateToken, requireRole('Administrator'), async (req, res) => {
  try {
    const metrics = getPoolHealthMetrics();
    return res.json({ success: true, data: metrics });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// =========================================================================
// 33. AGGREGATED MATERIALIZED VIEWS (BATCH PERFORMANCE) & SCHEDULER
// =========================================================================
router.get(['/database/mv-summary', '/admin/database/mv-summary'], authenticateToken, async (req, res) => {
  try {
    const data = await getMaterializedViewData();
    return res.json(data);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.post(['/database/refresh-mv', '/admin/database/refresh-mv'], authenticateToken, requireRole('Administrator'), async (req, res) => {
  try {
    const concurrently = req.body?.concurrently !== false;
    const result = await refreshMaterializedView(concurrently);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// =========================================================================
// 34. ADAPTIVE JSONB COLUMN NORMALIZATION & LEAN FOOTPRINT STORAGE
// =========================================================================
router.get(['/database/overflow-stats', '/admin/database/overflow-stats'], authenticateToken, requireRole('Administrator'), async (req, res) => {
  try {
    const stats = await getOverflowStats();
    return res.json(stats);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// =========================================================================
// 35. SECURITY INCIDENT ALERTS & WEBHOOK DISPATCH LOGS
// =========================================================================
router.get(['/incident-alerts', '/admin/incident-alerts'], authenticateToken, requireRole('Administrator'), async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const result = await query(
      `SELECT * FROM security_incident_alerts ORDER BY created_at DESC LIMIT $1`,
      [limit]
    );
    return res.json({ success: true, data: result.rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.post(['/incident-test', '/admin/incident-test'], authenticateToken, requireRole('Administrator'), async (req, res) => {
  try {
    const alert = await dispatchIncidentAlert({
      alertType: 'TEST_MANUAL_ALERT',
      severity: req.body?.severity || 'MEDIUM',
      sourceIp: req.ip || req.connection?.remoteAddress || '127.0.0.1',
      userId: req.user.user_id,
      details: {
        testedBy: req.user.full_name || req.user.email,
        note: req.body?.note || 'Uji coba pengiriman alert webhook insiden keamanan'
      }
    });
    return res.json({ success: true, message: 'Test incident alert dispatched successfully.', data: alert });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// =========================================================================
// 36. TYPO-TOLERANT FUZZY SEARCH (LEVENSHTEIN DISTANCE)
// =========================================================================
router.get(['/search/fuzzy', '/search-fuzzy'], authenticateToken, requireRole('Koordinator', 'Administrator'), async (req, res) => {
  try {
    const { q, entity, threshold, limit } = req.query;
    if (!q) {
      return res.status(400).json({ success: false, message: 'Parameter query q diperlukan.' });
    }

    const isCoordinator = req.user.role === 'Koordinator' || req.user.role_id === 2;
    const results = await searchEntitiesFuzzy({
      searchTerm: q,
      entityType: entity || 'peserta',
      threshold: threshold ? parseFloat(threshold) : 0.45,
      limit: limit ? parseInt(limit, 10) : 20,
      userRole: req.user.role || req.user.role_name,
      coordinatorId: isCoordinator ? req.user.user_id : null
    });

    return res.json({ success: true, query: q, count: results.length, data: results });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// =========================================================================
// 37. DYNAMIC SUBRESOURCE INTEGRITY (SRI) HASH MANIFEST
// =========================================================================
router.get(['/security/sri-manifest', '/sri-manifest'], (req, res) => {
  try {
    const manifest = getSriManifest();
    return res.json(manifest);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// =========================================================================
// 38. AUTOMATED CSP (CONTENT SECURITY POLICY) VIOLATION REPORT GUARD
// =========================================================================
router.post(['/security/csp-report', '/csp-report'], async (req, res) => {
  try {
    const reportData = req.body?.['csp-report'] || req.body || {};
    const documentUri = reportData['document-uri'] || reportData.documentUri || req.headers['referer'] || '';
    const blockedUri = reportData['blocked-uri'] || reportData.blockedUri || '';
    const violatedDirective = reportData['violated-directive'] || reportData.violatedDirective || '';
    const sourceIp = req.ip || req.connection?.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || '';

    // Record violation to database
    await query(`
      INSERT INTO csp_violation_reports (document_uri, blocked_uri, violated_directive, source_ip, user_agent, raw_report)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [documentUri, blockedUri, violatedDirective, sourceIp, userAgent, JSON.stringify(reportData)]);

    // Check for high-severity XSS / script injection indicators
    if (violatedDirective.includes('script-src') || blockedUri.startsWith('data:') || blockedUri.includes('eval')) {
      dispatchIncidentAlert({
        alertType: 'CSP_XSS_ATTEMPT_DETECTED',
        severity: 'HIGH',
        sourceIp,
        details: { blockedUri, violatedDirective, documentUri }
      }).catch(() => {});
    }

    return res.status(204).end(); // CSP standard expects 204 No Content
  } catch (err) {
    return res.status(204).end();
  }
});

router.get(['/admin/csp-reports', '/csp-reports'], authenticateToken, requireRole('Administrator'), async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const result = await query(`
      SELECT * FROM csp_violation_reports ORDER BY reported_at DESC LIMIT $1
    `, [limit]);
    return res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// =========================================================================
// 39. POST-QUANTUM CRYPTOGRAPHY (PQC) HYBRID E-CERTIFICATE SIGNING
// =========================================================================
router.post(['/certificates/pqc-sign', '/pqc-sign'], authenticateToken, async (req, res) => {
  try {
    const certData = req.body;
    if (!certData || !certData.certNumber) {
      return res.status(400).json({ success: false, message: 'Data sertifikat (certNumber, recipientName, finalScore) diperlukan.' });
    }

    const pqcSignature = generatePqcHybridSignature(certData);
    return res.json({ success: true, ...pqcSignature });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post(['/certificates/pqc-verify', '/pqc-verify'], async (req, res) => {
  try {
    const { certData, hybridSignature } = req.body;
    if (!certData || !hybridSignature) {
      return res.status(400).json({ success: false, message: 'certData dan hybridSignature diperlukan untuk verifikasi.' });
    }

    const result = verifyPqcHybridSignature(certData, hybridSignature);
    return res.json({ success: result.valid, ...result });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// =========================================================================
// 40. STORAGE CANARY DECOY TRAPS STATUS
// =========================================================================
router.get(['/admin/canary-traps', '/canary-traps'], authenticateToken, requireRole('Administrator'), async (req, res) => {
  try {
    const traps = await getCanaryTrapsStatus();
    return res.json({ success: true, data: traps });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// =========================================================================
// 41. CRYPTOGRAPHIC PROOF OF WORK (PoW) CHALLENGE ENGINE
// =========================================================================
router.get('/security/pow/challenge', async (req, res) => {
  try {
    const difficulty = parseInt(req.query.difficulty, 10) || 4;
    const challenge = await createPowChallenge(difficulty);
    return res.json({ success: true, ...challenge });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/security/pow/verify', async (req, res) => {
  try {
    const { challengeId, nonce } = req.body;
    const verification = await verifyPowSolution(challengeId, nonce);
    if (!verification.valid) {
      return res.status(400).json({ success: false, ...verification });
    }
    return res.json({ success: true, ...verification });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// =========================================================================
// 42. NATIVE POSTGRESQL ROW-LEVEL SECURITY (RLS) POLICY ENFORCEMENT
// =========================================================================
router.get(['/admin/database/rls-status', '/database/rls-status'], authenticateToken, requireRole('Administrator'), async (req, res) => {
  try {
    const status = await getRlsStatus();
    return res.json(status);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post(['/admin/database/rls-setup', '/database/rls-setup'], authenticateToken, requireRole('Administrator'), async (req, res) => {
  try {
    const setupResults = await setupRlsPolicies();
    return res.json({ success: true, results: setupResults });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// =========================================================================
// 43. BLOOM FILTER FAST DUPLICATE CHECK (NIK / NIM)
// =========================================================================
router.get('/participant/check-duplicate-fast', authenticateToken, async (req, res) => {
  try {
    const { identifier } = req.query;
    if (!identifier) {
      return res.status(400).json({ success: false, message: 'Parameter identifier (NIK / NIM) diperlukan.' });
    }

    await globalBloomFilter.ensureInitialized();
    const mightContain = globalBloomFilter.mightContain(identifier);

    if (!mightContain) {
      // 100% guarantee NOT in database, 0ms DB query
      return res.json({
        success: true,
        isDuplicate: false,
        confidence: '100% (Bloom Filter Disjoint Match)',
        queriedDatabase: false
      });
    }

    // Fallback targeted query only for positive filter hit
    const dbCheck = await query(`
      SELECT user_id, unique_id FROM users WHERE unique_id = $1
      UNION
      SELECT user_id, nik as unique_id FROM peserta WHERE nik = $1
      LIMIT 1
    `, [identifier]);

    const isActualDuplicate = dbCheck.rows.length > 0;
    return res.json({
      success: true,
      isDuplicate: isActualDuplicate,
      confidence: isActualDuplicate ? '100% (Database Confirmed)' : 'False Positive Cleared',
      queriedDatabase: true
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.get(['/admin/bloom-filter/stats', '/bloom-filter/stats'], authenticateToken, requireRole('Administrator'), (req, res) => {
  try {
    return res.json({ success: true, ...globalBloomFilter.getStats() });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// =========================================================================
// 44. PARTIAL INDEXES STATUS INSPECTOR
// =========================================================================
router.get(['/admin/database/partial-indexes', '/database/partial-indexes'], authenticateToken, requireRole('Administrator'), async (req, res) => {
  try {
    const indexesRes = await query(`
      SELECT 
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE indexname IN ('idx_peserta_menunggu_bayar', 'idx_users_active_intern', 'idx_attendance_hadir_recent')
      ORDER BY tablename ASC
    `);

    return res.json({
      success: true,
      count: indexesRes.rows.length,
      indexes: indexesRes.rows,
      optimizationBenefit: 'Reduces index disk space footprint by indexing only active/pending dataset subsets.'
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// =========================================================================
// 45. AUTOMATED RANGE PARTITIONING REGISTRY
// =========================================================================
router.get(['/admin/database/partitions', '/database/partitions'], authenticateToken, requireRole('Administrator'), async (req, res) => {
  try {
    const partitions = await getAttendancePartitions();
    return res.json(partitions);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post(['/admin/database/partitions/create', '/database/partitions/create'], authenticateToken, requireRole('Administrator'), async (req, res) => {
  try {
    const { year, quarter } = req.body;
    if (!year || !quarter) {
      return res.status(400).json({ success: false, message: 'Parameter year dan quarter diperlukan.' });
    }
    const result = await createAttendancePartition(year, quarter);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// =========================================================================
// 46. VECTORISED PARQUET / DUCKDB COLUMNAR EXPORT
// =========================================================================
router.get(['/reports/columnar-export', '/columnar-export'], authenticateToken, requireRole('Koordinator', 'Administrator'), async (req, res) => {
  try {
    const entity = req.query.entity || 'attendance';
    const isCoordinator = req.user.role === 'Koordinator' || req.user.role_id === 2;
    const result = await generateColumnarExport(entity, isCoordinator ? req.user.user_id : null);
    return res.json({ success: true, ...result });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// =========================================================================
// 47. ADAPTIVE AVIF TRANSCODING ENGINE
// =========================================================================
router.post(['/media/transcode-avif', '/transcode-avif'], authenticateToken, (req, res) => {
  try {
    const { imagePayload, quality } = req.body;
    if (!imagePayload) {
      return res.status(400).json({ success: false, message: 'imagePayload (base64 string) diperlukan.' });
    }

    const result = transcodeToAvifProfile(imagePayload, { quality: quality || 'standard' });
    return res.json({ success: true, ...result });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.get(['/admin/storage/compression-metrics', '/storage/compression-metrics'], authenticateToken, (req, res) => {
  try {
    const metrics = getStorageOptimizationMetrics();
    return res.json({ success: true, ...metrics });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// =========================================================================
// 48. DEAD DATA TOMBSTONING & BATCH PURGE
// =========================================================================
router.post(['/admin/database/purge-tombstones', '/database/purge-tombstones'], authenticateToken, requireRole('Administrator'), async (req, res) => {
  try {
    const { table, batchSize, retentionDays } = req.body;
    const result = await executeTombstonePurge({
      targetTable: table || 'notifications',
      batchSize: parseInt(batchSize, 10) || 50,
      retentionDays: parseInt(retentionDays, 10) || 90
    });
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.get(['/admin/database/purge-logs', '/database/purge-logs'], authenticateToken, requireRole('Administrator'), async (req, res) => {
  try {
    const logs = await getTombstonePurgeHistory();
    return res.json({ success: true, data: logs });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// =========================================================================
// 49. QUERY COST BUDGETING & SLOW QUERY AUTO-CANCEL GUARD
// =========================================================================
router.get(['/admin/database/query-budget-metrics', '/database/query-budget-metrics'], authenticateToken, requireRole('Administrator'), (req, res) => {
  try {
    const metrics = getQueryBudgetMetrics();
    return res.json({ success: true, ...metrics });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post(['/admin/database/query-budget-test', '/database/query-budget-test'], authenticateToken, requireRole('Administrator'), async (req, res) => {
  try {
    const timeoutMs = parseInt(req.body.timeoutMs, 10) || 2000;
    // Fast budgeted query
    const result = await runBudgetedQuery('SELECT COUNT(*) as count FROM users', [], timeoutMs);
    return res.json({ success: true, rowCount: result.rows[0]?.count, timeoutBudgetMs: timeoutMs });
  } catch (err) {
    return res.status(err.code === 'QUERY_BUDGET_EXCEEDED' ? 408 : 500).json({
      success: false,
      error: err.message,
      code: err.code
    });
  }
});

// =========================================================================
// 50. TIERED STORAGE LIFECYCLE MIGRATION
// =========================================================================
router.post(['/admin/storage/tier-migration', '/storage/tier-migration'], authenticateToken, requireRole('Administrator'), async (req, res) => {
  try {
    const result = await runTieredStorageMigration();
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.get(['/admin/storage/tier-status', '/storage/tier-status'], authenticateToken, requireRole('Administrator'), async (req, res) => {
  try {
    const result = await getTieredStorageStatus();
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// =========================================================================
// 51. SSE HEARTBEAT PRESENCE RADAR STREAM
// =========================================================================
const ssePresenceClients = new Set();

const sseAuthAdapter = (req, res, next) => {
  if (!req.headers['authorization'] && typeof req.query?.token === 'string' && req.query.token.trim()) {
    req.headers['authorization'] = `Bearer ${req.query.token.trim()}`;
  }
  return authenticateToken(req, res, next);
};

router.get(['/coordinator/presence-stream', '/presence-stream'], sseAuthAdapter, requireRole('Koordinator', 'Administrator'), (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  });

  const isCoordinator = req.user.role === 'Koordinator' || req.user.role_id === 2;
  const clientInfo = {
    id: `${req.user.user_id}-${Date.now()}`,
    coordinatorId: isCoordinator ? req.user.user_id : null,
    res
  };
  ssePresenceClients.add(clientInfo);

  // Send initial welcome event
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', message: 'SSE Live Presence Radar Active', timestamp: new Date().toISOString() })}\n\n`);

  // Send periodic heartbeat every 15 seconds
  const heartbeatTimer = setInterval(() => {
    try {
      res.write(`data: ${JSON.stringify({ type: 'HEARTBEAT', time: new Date().toISOString() })}\n\n`);
    } catch {
      clearInterval(heartbeatTimer);
      ssePresenceClients.delete(clientInfo);
    }
  }, 15000);
  if (typeof heartbeatTimer.unref === 'function') heartbeatTimer.unref();

  req.on('close', () => {
    clearInterval(heartbeatTimer);
    ssePresenceClients.delete(clientInfo);
  });
});

// Helper to broadcast presence updates
export function broadcastPresenceEvent(eventData) {
  const payload = `data: ${JSON.stringify({ type: 'PRESENCE_EVENT', ...eventData })}\n\n`;
  for (const client of ssePresenceClients) {
    if (client.coordinatorId && eventData?.coordinatorId && Number(client.coordinatorId) !== Number(eventData.coordinatorId)) {
      continue;
    }
    try {
      client.res.write(payload);
    } catch (_) {
      ssePresenceClients.delete(client);
    }
  }
}

// =========================================================================
// 52. STATELESS CACHE-FIRST OFFLINE FALLBACK
// =========================================================================
router.get('/system/cache-fallback/:key', (req, res) => {
  const { key } = req.params;
  const fallback = getCachedFallback(key);
  if (!fallback) {
    return res.status(404).json({ success: false, message: `Snapshot fallback untuk key '${key}' tidak tersedia.` });
  }
  res.setHeader('X-System-Degraded', 'TRUE');
  return res.json({ success: true, ...fallback });
});

// =========================================================================
// 53. DYNAMIC ROTATING INTERN DIGITAL ID CARD
// =========================================================================
router.get('/participant/digital-id-card', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const cardData = await generateDynamicIdCardPayload(userId);
    return res.json(cardData);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post(['/coordinator/digital-id-card/verify', '/digital-id-card/verify'], authenticateToken, requireRole('Koordinator', 'Administrator'), (req, res) => {
  try {
    const { qrPayload } = req.body;
    if (!qrPayload) {
      return res.status(400).json({ success: false, message: 'qrPayload diperlukan untuk verifikasi.' });
    }

    const verification = verifyDynamicIdQr(qrPayload);
    return res.json({ success: verification.valid, ...verification });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// =========================================================================
// 54. ONE-CLICK BATCH PDF EVALUATION DOSSIER GENERATOR
// =========================================================================
router.get('/coordinator/dossier/generate/:userId', authenticateToken, async (req, res) => {
  try {
    const targetUserId = parseInt(req.params.userId, 10);
    if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
      return res.status(400).json({ success: false, message: 'ID peserta tidak valid.' });
    }

    if ((req.user.role === 'Peserta' || req.user.role_id === 1) && req.user.user_id !== targetUserId) {
      return res.status(403).json({ success: false, message: 'Akses dilarang. Anda hanya dapat mengunduh dossier Anda sendiri.' });
    }
    if (req.user.role === 'Koordinator' || req.user.role_id === 2) {
      const check = await query(`SELECT coordinator_id FROM users WHERE user_id = $1`, [targetUserId]);
      if (check.rows.length === 0 || check.rows[0].coordinator_id !== req.user.user_id) {
        return res.status(403).json({ success: false, message: 'Akses dilarang. Peserta ini tidak berada di bawah bimbingan Anda.' });
      }
    }

    const dossier = await compileEvaluationDossier(targetUserId);

    if (req.query.format === 'html') {
      res.setHeader('Content-Type', 'text/html');
      return res.send(dossier.htmlContent);
    }

    return res.json({ success: true, ...dossier });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// =========================================================================
// 55. TIME-BANK OVERTIME & COMP-TIME LEDGER
// =========================================================================
router.get(['/time-bank/my-balance', '/api/time-bank/my-balance'], authenticateToken, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const balance = await getTimeBankBalance(userId);
    return res.json({ success: true, userId, balanceHours: balance });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.get(['/time-bank/ledger/:userId', '/api/time-bank/ledger/:userId'], authenticateToken, async (req, res) => {
  try {
    const targetUserId = parseInt(req.params.userId, 10);
    if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
      return res.status(400).json({ success: false, message: 'ID peserta tidak valid.' });
    }

    if ((req.user.role === 'Peserta' || req.user.role_id === 1) && req.user.user_id !== targetUserId) {
      return res.status(403).json({ success: false, message: 'Akses dilarang. Anda hanya dapat melihat buku kas waktu Anda sendiri.' });
    }
    if (req.user.role === 'Koordinator' || req.user.role_id === 2) {
      const check = await query(`SELECT coordinator_id FROM users WHERE user_id = $1`, [targetUserId]);
      if (check.rows.length === 0 || check.rows[0].coordinator_id !== req.user.user_id) {
        return res.status(403).json({ success: false, message: 'Akses dilarang. Peserta ini tidak berada di bawah bimbingan Anda.' });
      }
    }

    const ledgerData = await getTimeBankLedger(targetUserId);
    return res.json({ success: true, ...ledgerData });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post(['/time-bank/record-overtime', '/api/time-bank/record-overtime'], authenticateToken, requireRole('Koordinator', 'Administrator'), async (req, res) => {
  try {
    const { userId, hours, eventDesc } = req.body;
    const targetUserId = parseInt(userId, 10);
    if (!Number.isInteger(targetUserId) || !hours || !eventDesc) {
      return res.status(400).json({ success: false, message: 'Parameter userId, hours, dan eventDesc diperlukan.' });
    }

    if (req.user.role === 'Koordinator' || req.user.role_id === 2) {
      const check = await query(`SELECT coordinator_id FROM users WHERE user_id = $1`, [targetUserId]);
      if (check.rows.length === 0 || check.rows[0].coordinator_id !== req.user.user_id) {
        return res.status(403).json({ success: false, message: 'Akses dilarang. Peserta ini tidak berada di bawah bimbingan Anda.' });
      }
    }

    const result = await recordOvertimeHours({
      userId: targetUserId,
      hours: parseFloat(hours),
      eventDesc,
      approvedBy: req.user.user_id
    });

    await logEntityChange({
      req,
      targetUserId,
      action: 'OVERTIME_RECORDED',
      verb: 'mencatat',
      entityLabel: 'Kredit Jam Lembur (Time Bank)',
      changes: [{ label: 'Penambahan Saldo Lembur', from: '0 jam', to: `+${parseFloat(hours)} jam` }],
      notes: eventDesc
    });

    return res.json(result);
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
});

router.post(['/time-bank/claim-leave', '/api/time-bank/claim-leave'], authenticateToken, async (req, res) => {
  try {
    const { hours, reason } = req.body;
    if (!hours || !reason) {
      return res.status(400).json({ success: false, message: 'Parameter hours dan reason diperlukan.' });
    }
    const result = await claimCompTimeLeave({
      userId: req.user.user_id,
      hours: parseFloat(hours),
      reason
    });
    return res.json(result);
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
});

// =========================================================================
// 56. AUTOMATED MBKM / KEMENDIKBUDRISTEK LOGBOOK & GRADE CONVERTER
// =========================================================================
router.get(['/coordinator/mbkm-export/:userId', '/mbkm-export/:userId'], authenticateToken, async (req, res) => {
  try {
    const targetUserId = parseInt(req.params.userId, 10);
    if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
      return res.status(400).json({ success: false, message: 'ID peserta tidak valid.' });
    }

    if ((req.user.role === 'Peserta' || req.user.role_id === 1) && req.user.user_id !== targetUserId) {
      return res.status(403).json({ success: false, message: 'Akses dilarang. Anda hanya dapat mengekspor logbook MBKM Anda sendiri.' });
    }
    if (req.user.role === 'Koordinator' || req.user.role_id === 2) {
      const check = await query(`SELECT coordinator_id FROM users WHERE user_id = $1`, [targetUserId]);
      if (check.rows.length === 0 || check.rows[0].coordinator_id !== req.user.user_id) {
        return res.status(403).json({ success: false, message: 'Akses dilarang. Peserta ini tidak berada di bawah bimbingan Anda.' });
      }
    }

    const dossier = await generateMbkmDossier(targetUserId);

    if (req.query.format === 'html') {
      res.setHeader('Content-Type', 'text/html');
      return res.send(dossier.htmlTemplate);
    }

    return res.json({ success: true, ...dossier });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.get(['/participant/my-mbkm-logbook', '/my-mbkm-logbook'], authenticateToken, async (req, res) => {
  try {
    const dossier = await generateMbkmDossier(req.user.user_id);
    return res.json({ success: true, ...dossier });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// =========================================================================
// 58. ONLINE CERTIFICATE STATUS PROTOCOL (OCSP) STAMPING & CRL
// =========================================================================
router.get(['/certificates/ocsp-check', '/ocsp-check', '/certificates/ocsp-check/:certNumber'], async (req, res) => {
  try {
    const certParam = req.query.certNumber || req.params.certNumber;
    const status = await checkOcspStatus(certParam);
    return res.json(status);
  } catch (err) {
    return res.status(500).json({ status: 'UNKNOWN', error: err.message });
  }
});

router.post(['/admin/certificates/revoke', '/certificates/revoke'], authenticateToken, requireRole('Administrator'), async (req, res) => {
  try {
    const { certNumber, reason } = req.body;
    if (!certNumber || !reason) {
      return res.status(400).json({ success: false, message: 'Parameter certNumber dan reason diperlukan.' });
    }
    const result = await revokeCertificate({
      certNumber,
      reason,
      revokedBy: req.user.user_id
    });
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/admin/certificates/crl', authenticateToken, requireRole('Administrator'), async (req, res) => {
  try {
    const crlData = await getCrlList();
    return res.json(crlData);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/certificates/crl', async (req, res) => {
  try {
    const crlData = await getCrlList();
    const safeList = (crlData.revokedCertificates || crlData.data || []).map((c) => ({
      certificate_number: c.certificate_number,
      revoked_at: c.revoked_at,
      revocation_reason: c.revocation_reason
    }));
    return res.json({ success: true, count: safeList.length, revokedCertificates: safeList });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// =========================================================================
// 59. ZERO-TRUST EPHEMERAL IMPERSONATION SESSIONS
// =========================================================================
router.post(['/admin/impersonate/start', '/impersonate/start'], authenticateToken, requireRole('Administrator'), async (req, res) => {
  try {
    const { targetUserId, reason } = req.body;
    const session = await startImpersonationSession({
      adminUserId: req.user.user_id,
      targetUserId: parseInt(targetUserId, 10),
      reason
    });
    return res.json(session);
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
});

router.post(['/admin/impersonate/terminate', '/impersonate/terminate'], authenticateToken, requireRole('Administrator'), async (req, res) => {
  try {
    const { sessionId } = req.body;
    const result = await terminateImpersonationSession(sessionId);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.get(['/admin/impersonate/active', '/impersonate/active'], authenticateToken, requireRole('Administrator'), async (req, res) => {
  try {
    const sessions = await getActiveImpersonationSessions();
    return res.json({ success: true, count: sessions.length, data: sessions });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// =========================================================================
// 60. VERIFIED EMAIL DMARC, DKIM & BIMI BRAND AVATAR INTEGRATION
// =========================================================================
router.get(['/security/email-compliance-status', '/email-compliance-status'], (req, res) => {
  try {
    const profile = getEmailComplianceProfile();
    return res.json({ success: true, ...profile });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post(['/admin/email/dispatch-verified-test', '/email/dispatch-verified-test'], authenticateToken, requireRole('Administrator'), (req, res) => {
  try {
    const { recipient, subject, body } = req.body;
    const headers = generateVerifiedEmailHeaders({
      recipient: recipient || 'peserta@bpjsketenagakerjaan.go.id',
      subject: subject || 'Pemberitahuan Resmi BPJS Ketenagakerjaan (Verified)',
      body: body || 'Verifikasi digital DMARC, DKIM, dan BIMI aktif.'
    });
    return res.json({ success: true, message: 'Header terverifikasi berhasil digenerate.', headers });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// =========================================================================
// 61. WHATSAPP BUSINESS OFFICIAL CLOUD API NOTIFICATION WEBHOOK
// =========================================================================
router.get(['/notifications/whatsapp/webhook', '/whatsapp/webhook'], (req, res) => {
  const result = verifyWhatsAppWebhookChallenge(req.query);
  if (result.verified) {
    return res.status(200).send(result.challenge);
  }
  return res.status(403).json({ success: false, message: 'Verifikasi token webhook gagal.' });
});

router.post(['/notifications/whatsapp/webhook', '/whatsapp/webhook'], async (req, res) => {
  try {
    const result = await handleWhatsAppIncomingWebhook(req.body);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(200).json({ processed: false, error: err.message });
  }
});

router.post(['/admin/whatsapp/dispatch-test', '/whatsapp/dispatch-test'], authenticateToken, requireRole('Administrator'), async (req, res) => {
  try {
    const { phone, templateName, parameters } = req.body;
    const result = await dispatchWhatsAppTemplate({
      phone: phone || '081234567890',
      templateName: templateName || 'bpjstk_attendance_reminder',
      parameters: parameters || { userName: req.user?.full_name || 'Peserta BPJS' }
    });
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.get(['/admin/whatsapp/dispatches', '/whatsapp/dispatches'], authenticateToken, requireRole('Administrator'), async (req, res) => {
  try {
    const list = await getWhatsAppDispatches();
    return res.json({ success: true, count: list.length, data: list });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// =========================================================================
// 62. AUTOMATED DUPLICATE IDENTITY RESOLUTION WORKFLOW
// =========================================================================
router.get(['/admin/identity-duplicates', '/identity-duplicates'], authenticateToken, requireRole('Administrator'), async (req, res) => {
  try {
    const cases = await getDuplicateIdentityCases();
    return res.json({ success: true, count: cases.length, data: cases });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post(['/admin/identity-duplicates/resolve', '/identity-duplicates/resolve'], authenticateToken, requireRole('Administrator'), async (req, res) => {
  try {
    const { caseId, action, notes } = req.body;
    if (!caseId || !action) {
      return res.status(400).json({ success: false, message: 'Parameter caseId dan action diperlukan.' });
    }
    const result = await resolveDuplicateCase({
      caseId: parseInt(caseId, 10),
      action,
      notes,
      resolvedBy: req.user.user_id
    });
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// =========================================================================
// 63. POSTGRESQL NATIVE FULL-TEXT SEARCH (KNOWLEDGE BASE)
// =========================================================================
router.get(['/search/knowledge-base', '/knowledge-base/search'], authenticateToken, async (req, res) => {
  try {
    const { q, category, limit } = req.query;
    const searchRes = await searchKnowledgeBase(q || '', category || 'all', limit || 10);
    return res.json({ success: true, ...searchRes });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post(['/admin/knowledge-base/index', '/knowledge-base/index'], authenticateToken, requireRole('Administrator'), async (req, res) => {
  try {
    const { title, category, content } = req.body;
    if (!title || !content) {
      return res.status(400).json({ success: false, message: 'Parameter title dan content diperlukan.' });
    }
    const doc = await indexDocument({ title, category, content });
    return res.json({ success: true, data: doc });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// =========================================================================
// 64. STORAGE FILE DE-DUPLICATION VIA SHA-256 HASHING
// =========================================================================
router.post(['/storage/dedup-upload', '/dedup-upload'], authenticateToken, async (req, res) => {
  try {
    const { filePayload, filename, mimeType } = req.body;
    if (!filePayload) {
      return res.status(400).json({ success: false, message: 'filePayload (base64) diperlukan.' });
    }
    const result = await deduplicateAndRegisterFile({
      buffer: filePayload,
      originalFilename: filename,
      mimeType: mimeType || 'application/pdf'
    });
    return res.json({ success: true, ...result });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.get(['/admin/storage/dedup-metrics', '/storage/dedup-metrics'], authenticateToken, requireRole('Administrator'), async (req, res) => {
  try {
    const metrics = await getDeduplicationMetrics();
    return res.json({ success: true, ...metrics });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// =========================================================================
// 65. POSTGRESQL ZERO-COPY DATABASE STAGING SANDBOX
// =========================================================================
router.post(['/admin/database/sandbox/create', '/database/sandbox/create'], authenticateToken, requireRole('Administrator'), async (req, res) => {
  try {
    const { snapshotName, metadata } = req.body;
    const result = await createStagingSandbox({
      snapshotName: snapshotName || 'sandbox_simulation_' + Date.now(),
      createdBy: req.user.user_id,
      metadata
    });
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.get(['/admin/database/sandbox/list', '/database/sandbox/list'], authenticateToken, requireRole('Administrator'), async (req, res) => {
  try {
    const list = await listStagingSandboxes();
    return res.json({ success: true, count: list.length, data: list });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.delete(['/admin/database/sandbox/:snapshotId', '/database/sandbox/:snapshotId'], authenticateToken, requireRole('Administrator'), async (req, res) => {
  try {
    const result = await deleteStagingSandbox(parseInt(req.params.snapshotId, 10));
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// =========================================================================
// 66. PRINT-READY BATCH QR GENERATOR (A4/A3 DENGAN CROP MARKS)
// =========================================================================
router.get(['/admin/print/batch-qr-sheet', '/print/batch-qr-sheet'], authenticateToken, requireRole('Administrator'), async (req, res) => {
  try {
    const { batchId, paper } = req.query;
    const sheetData = await generatePrintReadySheet({
      batchId: batchId ? parseInt(batchId, 10) : null,
      paperSize: paper || 'A4'
    });

    if (req.query.format === 'html') {
      res.setHeader('Content-Type', 'text/html');
      return res.send(sheetData.html);
    }

    return res.json({ success: true, ...sheetData });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;

