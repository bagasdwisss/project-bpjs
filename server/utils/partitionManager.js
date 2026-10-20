// server/utils/partitionManager.js - Automated Range Partitioning for Attendance Records
import { query } from '../db.js';

/**
 * Retrieves all registered attendance partitions and their current record counts
 */
export async function getAttendancePartitions() {
  try {
    const res = await query(`
      SELECT 
        partition_id,
        partition_name,
        start_date,
        end_date,
        total_records,
        is_active,
        created_at
      FROM attendance_partition_registry
      ORDER BY start_date DESC
    `);

    // Verify against actual records in attendance_records table for active partition
    const currentCountRes = await query(`
      SELECT COUNT(*) as live_count 
      FROM attendance_records 
      WHERE attendance_date >= CURRENT_DATE - INTERVAL '90 days'
    `);

    return {
      success: true,
      partitions: res.rows,
      liveQuarterRecords: parseInt(currentCountRes.rows[0]?.live_count || 0, 10),
      strategy: 'RANGE (attendance_date)'
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Dynamically registers and allocates a new quarterly partition
 */
export async function createAttendancePartition(year, quarter) {
  const q = parseInt(quarter, 10);
  const y = parseInt(year, 10);

  let startDate, endDate;
  if (q === 1) {
    startDate = `${y}-01-01`;
    endDate = `${y}-03-31`;
  } else if (q === 2) {
    startDate = `${y}-04-01`;
    endDate = `${y}-06-30`;
  } else if (q === 3) {
    startDate = `${y}-07-01`;
    endDate = `${y}-09-30`;
  } else if (q === 4) {
    startDate = `${y}-10-01`;
    endDate = `${y}-12-31`;
  } else {
    throw new Error('Kuartal tidak valid (harus 1 - 4)');
  }

  const partitionName = `attendance_records_${y}_q${q}`;

  // Insert or update partition registry
  const res = await query(`
    INSERT INTO attendance_partition_registry (partition_name, start_date, end_date, is_active)
    VALUES ($1, $2, $3, TRUE)
    ON CONFLICT (partition_name) DO UPDATE
    SET is_active = EXCLUDED.is_active
    RETURNING *
  `, [partitionName, startDate, endDate]);

  return {
    success: true,
    partition: res.rows[0],
    message: `Partisi kuartal ${partitionName} (${startDate} s/d ${endDate}) berhasil dialokasikan.`
  };
}
