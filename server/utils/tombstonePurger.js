// server/utils/tombstonePurger.js - Dead Data Tombstoning & Soft-Delete Batch Purge Worker
import { query } from '../db.js';

/**
 * Executes throttled batch purging for soft-deleted / tombstoned records
 * @param {string} targetTable - Table to purge (e.g., 'notifications', 'activity_logs')
 * @param {number} batchSize - Number of rows to delete per iteration (default 50)
 * @param {number} retentionDays - Retention threshold in days (default 90)
 */
export async function executeTombstonePurge({ targetTable = 'notifications', batchSize = 50, retentionDays = 90 } = {}) {
  const startTime = Date.now();
  let totalPurged = 0;

  try {
    // Purge read/soft-deleted notifications older than retention days
    if (targetTable === 'notifications') {
      let hasMore = true;
      while (hasMore) {
        const deleteRes = await query(`
          DELETE FROM notifications
          WHERE notification_id IN (
            SELECT notification_id 
            FROM notifications
            WHERE is_read = TRUE 
              AND created_at < NOW() - INTERVAL '1 day' * $1
            LIMIT $2
          )
          RETURNING notification_id
        `, [retentionDays, batchSize]);

        const count = deleteRes.rows.length;
        totalPurged += count;

        if (count < batchSize) {
          hasMore = false;
        } else {
          // Throttle pause to avoid holding row-level locks
          await new Promise(resolve => setTimeout(resolve, 30));
        }
      }
    } else if (targetTable === 'activity_logs') {
      // Purge old routine activity logs
      const deleteRes = await query(`
        DELETE FROM activity_logs
        WHERE log_id IN (
          SELECT log_id FROM activity_logs
          WHERE action LIKE '%VIEW%' 
            AND created_at < NOW() - INTERVAL '1 day' * $1
          LIMIT $2
        )
        RETURNING log_id
      `, [retentionDays, batchSize]);
      totalPurged += deleteRes.rows.length;
    }

    const durationMs = Date.now() - startTime;
    const freedEstimateKb = totalPurged * 1.5; // ~1.5 KB per row estimate
    const freedSpaceEstimate = `${freedEstimateKb.toFixed(1)} KB`;

    // Record to tombstone_purge_logs table
    await query(`
      INSERT INTO tombstone_purge_logs (table_name, purged_count, duration_ms, freed_space_estimate)
      VALUES ($1, $2, $3, $4)
    `, [targetTable, totalPurged, durationMs, freedSpaceEstimate]);

    return {
      success: true,
      table: targetTable,
      purgedCount: totalPurged,
      durationMs,
      freedSpaceEstimate,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Tombstone purge error:', error);
    return {
      success: false,
      table: targetTable,
      error: error.message
    };
  }
}

/**
 * Returns recent tombstone purge history
 */
export async function getTombstonePurgeHistory(limit = 20) {
  try {
    const res = await query(`
      SELECT purge_id, table_name, purged_count, duration_ms, freed_space_estimate, purged_at
      FROM tombstone_purge_logs
      ORDER BY purged_at DESC
      LIMIT $1
    `, [limit]);
    return res.rows;
  } catch (err) {
    return [];
  }
}
