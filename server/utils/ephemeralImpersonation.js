// server/utils/ephemeralImpersonation.js - Zero-Trust Ephemeral Impersonation Mode
import { query } from '../db.js';
import crypto from 'crypto';

const SESSION_TTL_MINUTES = 15;

/**
 * Creates a time-boxed ephemeral impersonation session
 */
export async function startImpersonationSession({ adminUserId, targetUserId, reason }) {
  if (!reason || reason.trim().length < 5) {
    throw new Error('Alasan impersonasi yang jelas dan terdokumentasi diperlukan (minimal 5 karakter).');
  }

  // 1. Fetch target user
  const targetRes = await query(`
    SELECT user_id, unique_id, full_name, role_id
    FROM users
    WHERE user_id = $1
  `, [targetUserId]);

  if (targetRes.rows.length === 0) {
    throw new Error('Target pengguna tidak ditemukan.');
  }

  const target = targetRes.rows[0];

  // 2. Generate secure ephemeral token
  const sessionId = 'imp_' + crypto.randomBytes(24).toString('hex');
  const now = Date.now();
  const expiresAt = new Date(now + SESSION_TTL_MINUTES * 60 * 1000);

  const initialAudit = [{
    action: 'SESSION_INITIALIZED',
    adminId: adminUserId,
    targetId: targetUserId,
    reason,
    timestamp: new Date().toISOString()
  }];

  await query(`
    INSERT INTO ephemeral_impersonation_sessions (
      session_id, admin_user_id, target_user_id, reason, consent_granted, expires_at, is_active, session_audit_log
    ) VALUES ($1, $2, $3, $4, TRUE, $5, TRUE, $6)
  `, [sessionId, adminUserId, targetUserId, reason, expiresAt, JSON.stringify(initialAudit)]);

  return {
    success: true,
    sessionId,
    expiresAt,
    ttlMinutes: SESSION_TTL_MINUTES,
    targetUser: {
      userId: target.user_id,
      uniqueId: target.unique_id,
      fullName: target.full_name
    },
    message: `Sesi impersonasi aktif selama ${SESSION_TTL_MINUTES} menit. Seluruh aksi diawasi audit trail.`
  };
}

/**
 * Terminates an active impersonation session
 */
export async function terminateImpersonationSession(sessionId) {
  const res = await query(`
    UPDATE ephemeral_impersonation_sessions
    SET is_active = FALSE
    WHERE session_id = $1
    RETURNING *
  `, [sessionId]);

  if (res.rows.length === 0) {
    return { success: false, message: 'Sesi impersonasi tidak ditemukan.' };
  }

  return {
    success: true,
    message: 'Sesi impersonasi berhasil diakhiri secara aman.'
  };
}

/**
 * Retrieves list of active impersonation sessions
 */
export async function getActiveImpersonationSessions() {
  const res = await query(`
    SELECT s.session_id, s.reason, s.expires_at, s.is_active, s.created_at,
           admin.full_name as admin_name, admin.unique_id as admin_id,
           target.full_name as target_name, target.unique_id as target_id
    FROM ephemeral_impersonation_sessions s
    JOIN users admin ON s.admin_user_id = admin.user_id
    JOIN users target ON s.target_user_id = target.user_id
    WHERE s.is_active = TRUE AND s.expires_at > CURRENT_TIMESTAMP
    ORDER BY s.created_at DESC
  `);

  return res.rows;
}
