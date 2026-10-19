// server/utils/materializedViewScheduler.js - Aggregated Materialized Views & Automated Refresh Scheduler
import { query } from '../db.js';

let lastRefreshedAt = null;
let refreshCount = 0;
let lastDurationMs = 0;

/**
 * Refreshes the aggregated materialized view concurrently
 */
export async function refreshMaterializedView(concurrently = true) {
  const start = Date.now();
  try {
    try {
      if (concurrently) {
        await query('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_batch_performance_summary');
      } else {
        await query('REFRESH MATERIALIZED VIEW mv_batch_performance_summary');
      }
    } catch (conErr) {
      // If concurrent fails (e.g. view not populated yet or unique index building), fallback to standard refresh
      console.warn('Concurrent refresh failed, falling back to standard refresh:', conErr.message);
      await query('REFRESH MATERIALIZED VIEW mv_batch_performance_summary');
    }

    lastDurationMs = Date.now() - start;
    lastRefreshedAt = new Date().toISOString();
    refreshCount++;

    console.log(`✅ [Materialized View] mv_batch_performance_summary refreshed successfully in ${lastDurationMs}ms.`);
    return {
      success: true,
      lastRefreshedAt,
      durationMs: lastDurationMs,
      refreshCount
    };
  } catch (err) {
    console.error('Error refreshing materialized view:', err.message);
    return {
      success: false,
      error: err.message
    };
  }
}

/**
 * Fetches precomputed aggregated metrics directly from the materialized view (sub-millisecond read)
 */
export async function getMaterializedViewData() {
  try {
    const res = await query(
      `SELECT mv.*, b.batch_name, u.full_name as coordinator_name
       FROM mv_batch_performance_summary mv
       LEFT JOIN batches b ON mv.batch_id = b.batch_id
       LEFT JOIN users u ON mv.coordinator_id = u.user_id
       ORDER BY mv.batch_id, mv.coordinator_id`
    );

    return {
      success: true,
      data: res.rows,
      meta: {
        lastRefreshedAt,
        refreshCount,
        lastDurationMs,
        isPrecomputed: true
      }
    };
  } catch (err) {
    console.warn('Materialized view not ready or table missing, returning fallback aggregation:', err.message);
    // Dynamic query fallback if materialized view has not been created yet
    const fallbackRes = await query(`
      SELECT 
        ub.batch_id,
        COALESCE(u.coordinator_id, 0) as coordinator_id,
        COUNT(DISTINCT u.user_id) as total_participants,
        COALESCE(AVG(p.nilai), 0)::NUMERIC(5,2) as avg_score,
        COALESCE(SUM(p.hasil_akuisisi_bpu), 0) as total_akuisisi_bpu,
        COALESCE(SUM(p.total_poin), 0) as total_points,
        CURRENT_TIMESTAMP as refreshed_at
      FROM user_batches ub
      JOIN users u ON ub.user_id = u.user_id
      LEFT JOIN progress p ON u.user_id = p.user_id
      GROUP BY ub.batch_id, u.coordinator_id
    `);
    return {
      success: true,
      data: fallbackRes.rows,
      meta: {
        isFallback: true,
        error: err.message
      }
    };
  }
}

// Background scheduler interval (every 30 minutes)
const mvInterval = setInterval(() => {
  refreshMaterializedView(true).catch(() => {});
}, 30 * 60 * 1000);

if (mvInterval.unref) {
  mvInterval.unref();
}
