// server/utils/cdcDiff.js - Delta-Encoding & Change Data Capture (CDC) Diff Tracker
import { query } from '../db.js';

/**
 * Calculate structural delta between two objects
 */
export const calculateDelta = (oldObj = {}, newObj = {}) => {
  const delta = {};
  const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);

  let changesCount = 0;
  for (const key of allKeys) {
    if (['updated_at', 'created_at'].includes(key)) continue;

    const oldVal = oldObj[key];
    const newVal = newObj[key];

    if (oldVal !== newVal && newVal !== undefined) {
      delta[key] = {
        from: oldVal ?? null,
        to: newVal
      };
      changesCount++;
    }
  }

  return { delta, changesCount };
};

/**
 * Record a Change Data Capture (CDC) entry for a score update
 */
export const recordScoreCdcDiff = async ({ scoreId, userId, moduleId, coordinatorId, oldScore, newScore, comments }) => {
  try {
    const { delta, changesCount } = calculateDelta(
      { score_value: oldScore?.score_value, comments: oldScore?.comments },
      { score_value: newScore, comments }
    );

    if (changesCount === 0) return null;

    const diffPoints = Number(newScore) - Number(oldScore?.score_value || 0);
    const diffSign = diffPoints >= 0 ? `+${diffPoints}` : `${diffPoints}`;
    const diffSummary = `Revisi Nilai: ${oldScore?.score_value || 0} → ${newScore} (${diffSign} poin)`;

    const res = await query(
      `INSERT INTO cdc_score_diffs (score_id, user_id, module_id, coordinator_id, delta_json, diff_summary)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [scoreId, userId, moduleId, coordinatorId, JSON.stringify(delta), diffSummary]
    );

    return res.rows[0];
  } catch (err) {
    console.error('Failed to record score CDC diff:', err.message);
    return null;
  }
};

export default {
  calculateDelta,
  recordScoreCdcDiff
};
