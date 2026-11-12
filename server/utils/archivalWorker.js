// server/utils/archivalWorker.js - Cold Storage Archival Worker for Expired Chat & Activity Logs
import { query } from '../db.js';
import { rebuildAuditChain } from './merkleAudit.js';

export const runColdStorageArchival = async (options = {}) => {
  const chatRetentionDays = Math.max(1, parseInt(options.chatRetentionDays, 10) || 90);
  const logRetentionDays = Math.max(1, parseInt(options.logRetentionDays, 10) || 180);
  const startTime = Date.now();

  try {
    // 1. Archive direct messages older than retention window (direct_messages uses column message_text)
    const chatArchiveRes = await query(
      `WITH moved_rows AS (
         DELETE FROM direct_messages
         WHERE created_at < NOW() - ($1::int * INTERVAL '1 day')
         RETURNING id, sender_id, receiver_id, message_text, is_read, created_at
       )
       INSERT INTO archived_messages (message_id, sender_id, receiver_id, message, is_read, created_at, archived_at)
       SELECT id, sender_id, receiver_id, message_text, is_read, created_at, CURRENT_TIMESTAMP
       FROM moved_rows
       RETURNING message_id`,
      [chatRetentionDays]
    );

    // 2. Archive activity logs older than retention window
    const logArchiveRes = await query(
      `WITH moved_logs AS (
         DELETE FROM activity_logs
         WHERE created_at < NOW() - ($1::int * INTERVAL '1 day')
         RETURNING log_id, user_id, activity_type, details, ip_address, created_at, prev_hash, current_hash
       )
       INSERT INTO archived_activity_logs (log_id, user_id, activity_type, details, ip_address, created_at, prev_hash, current_hash, archived_at)
       SELECT log_id, user_id, activity_type, details, ip_address, created_at, prev_hash, current_hash, CURRENT_TIMESTAMP
       FROM moved_logs
       RETURNING log_id`,
      [logRetentionDays]
    );

    const archivedLogsCount = logArchiveRes.rowCount || 0;
    // Re-anchor remaining live Merkle audit chain from GENESIS_HASH if older logs were archived
    if (archivedLogsCount > 0) {
      await rebuildAuditChain();
    }

    const elapsedMs = Date.now() - startTime;

    return {
      success: true,
      archivedMessagesCount: chatArchiveRes.rowCount || 0,
      archivedLogsCount,
      executionTimeMs: elapsedMs,
      message: `Berhasil mengarsipkan ${chatArchiveRes.rowCount || 0} pesan chat (> ${chatRetentionDays} hari) dan ${archivedLogsCount} riwayat audit (> ${logRetentionDays} hari) ke cold storage.`
    };
  } catch (err) {
    console.error('Error during cold storage archival:', err.message);
    throw err;
  }
};
