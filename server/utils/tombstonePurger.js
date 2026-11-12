// server/utils/tombstonePurger.js - Dead Data Tombstoning & Soft-Delete Batch Purge Worker
import { query } from '../db.js';
import { rebuildAuditChain } from './merkleAudit.js';

export async function executeTombstonePurge({ targetTable = 'notifications', batchSize = 50, retentionDays = 90 } = {}) {
  const startTime = Date.now();
  let totalPurged = 0;

  const safeBatch = Math.min(Math.max(parseInt(batchSize, 10) || 50, 1), 500);
  const safeDays = Math.max(parseInt(retentionDays, 10) || 90, 1);

  try {
    if (targetTable === 'notifications') {
      let hasMore = true;
      let loops = 0;
      while (hasMore && loops < 20) {
        loops++;
        const deleteRes = await query(`
          DELETE FROM notifications
          WHERE notification_id IN (
            SELECT notification_id
            FROM notifications
            WHERE is_read = TRUE
              AND created_at < NOW() - ($1::int * INTERVAL '1 day')
            LIMIT $2
          )
          RETURNING notification_id
        `, [safeDays, safeBatch]);

        const count = deleteRes.rows.length;
        totalPurged += count;
        if (count < safeBatch) {
          hasMore = false;
        }
      }
    } else if (targetTable === 'activity_logs') {
      const deleteRes = await query(`
        DELETE FROM activity_logs
        WHERE log_id IN (
          SELECT log_id FROM activity_logs
          WHERE activity_type LIKE '%VIEW%'
            AND created_at < NOW() - ($1::int * INTERVAL '1 day')
          LIMIT $2
        )
        RETURNING log_id
      `, [safeDays, safeBatch]);
      totalPurged += deleteRes.rows.length;

      if (totalPurged > 0) {
        await rebuildAuditChain();
      }
    } else {
      return {
        success: false,
        table: targetTable,
        error: `Tabel target '${targetTable}' tidak didukung untuk pembersihan tombstone.`
      };
    }

    const durationMs = Date.now() - startTime;
    const freedSpaceEstimate = `${(totalPurged * 1.5).toFixed(1)} KB`;

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

export async function getTombstonePurgeHistory(limit = 20) {
  try {
    const res = await query(`
      SELECT purge_id, table_name, purged_count, duration_ms, freed_space_estimate, purged_at
      FROM tombstone_purge_logs
      ORDER BY purged_at DESC
      LIMIT $1
    `, [limit]);
    return res.rows;
  } catch {
    return [];
  }
}
