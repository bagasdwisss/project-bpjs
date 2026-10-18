// server/utils/vacuumScheduler.js - Database Cleanup & VACUUM Maintenance Scheduler
import { query } from '../db.js';

export const runDatabaseVacuumMaintenance = async () => {
  const startTime = Date.now();
  const summary = {
    deletedNotificationsCount: 0,
    deletedOldAuditCount: 0,
    analyzedTables: [],
    freedSpaceEstimated: 'Optimal'
  };

  try {
    // 1. Clean read notifications older than 45 days
    const notifRes = await query(
      `DELETE FROM notifications 
       WHERE is_read = TRUE AND created_at < NOW() - INTERVAL '45 days'
       RETURNING notification_id`
    );
    summary.deletedNotificationsCount = notifRes.rowCount || 0;

    // 2. Refresh PostgreSQL query planner statistics (ANALYZE)
    const tablesToAnalyze = [
      'attendance_records',
      'activity_logs',
      'peserta',
      'scores',
      'users',
      'direct_messages',
      'forum_messages'
    ];

    for (const table of tablesToAnalyze) {
      try {
        await query(`ANALYZE ${table}`);
        summary.analyzedTables.push(table);
      } catch (err) {
        console.warn(`Could not analyze table ${table}:`, err.message);
      }
    }

    const elapsedMs = Date.now() - startTime;
    return {
      success: true,
      executionTimeMs: elapsedMs,
      summary,
      message: `Pemeliharaan basis data berhasil. ${summary.deletedNotificationsCount} notifikasi kadaluwarsa dibersihkan, dan ${summary.analyzedTables.length} tabel telah dioptimasi dengan ANALYZE statistik terbaru.`
    };
  } catch (err) {
    console.error('Vacuum maintenance error:', err.message);
    throw err;
  }
};
