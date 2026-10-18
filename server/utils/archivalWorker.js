// server/utils/archivalWorker.js - Cold Storage Archival Worker for Expired Chat & Activity Logs
import { query } from '../db.js';

export const runColdStorageArchival = async (options = {}) => {
  const chatRetentionDays = options.chatRetentionDays || 90;
  const logRetentionDays = options.logRetentionDays || 180;
  const startTime = Date.now();

  try {
    // 1. Archive direct messages older than retention window
    const chatArchiveRes = await query(
      `WITH moved_rows AS (
         DELETE FROM direct_messages
         WHERE created_at < NOW() - INTERVAL '${chatRetentionDays} days'
         RETURNING id, sender_id, receiver_id, message, is_read, created_at
       )
       INSERT INTO archived_messages (message_id, sender_id, receiver_id, message, is_read, created_at, archived_at)
       SELECT id, sender_id, receiver_id, message, is_read, created_at, CURRENT_TIMESTAMP
       FROM moved_rows
       RETURNING message_id`
    );

    // 2. Archive activity logs older than retention window
    const logArchiveRes = await query(
      `WITH moved_logs AS (
         DELETE FROM activity_logs
         WHERE created_at < NOW() - INTERVAL '${logRetentionDays} days'
         RETURNING log_id, user_id, activity_type, details, ip_address, created_at, prev_hash, current_hash
       )
       INSERT INTO archived_activity_logs (log_id, user_id, activity_type, details, ip_address, created_at, prev_hash, current_hash, archived_at)
       SELECT log_id, user_id, activity_type, details, ip_address, created_at, prev_hash, current_hash, CURRENT_TIMESTAMP
       FROM moved_logs
       RETURNING log_id`
    );

    const elapsedMs = Date.now() - startTime;

    return {
      success: true,
      archivedMessagesCount: chatArchiveRes.rowCount || 0,
      archivedLogsCount: logArchiveRes.rowCount || 0,
      executionTimeMs: elapsedMs,
      message: `Berhasil mengarsipkan ${chatArchiveRes.rowCount || 0} pesan chat (> ${chatRetentionDays} hari) dan ${logArchiveRes.rowCount || 0} riwayat audit (> ${logRetentionDays} hari) ke cold storage.`
    };
  } catch (err) {
    console.error('Error during cold storage archival:', err.message);
    throw err;
  }
};
