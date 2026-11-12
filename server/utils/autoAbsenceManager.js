// server/utils/autoAbsenceManager.js - Automated Absence (Alfa) Enforcement Engine
import pool, { query } from '../db.js';
import { getJakartaNow, shiftDateStr } from './jakartaTime.js';

const AUTO_ABSENCE_LOCK_KEY = 84729201;
const LAZY_COOLDOWN_SECONDS = 180; // Throttle passive request checks to max once per 3 minutes across instances

/**
 * Parses configured work_days string (e.g. '1,2,3,4,5') plus allow_weekend flag.
 */
function buildAllowedWorkDaysSet(settings) {
  const raw = String(settings.work_days || '1,2,3,4,5');
  const set = new Set(
    raw
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n) && n >= 0 && n <= 6)
  );
  if (set.size === 0) {
    [1, 2, 3, 4, 5].forEach((d) => set.add(d));
  }
  if (settings.allow_weekend === true) {
    set.add(0);
    set.add(6);
  } else if (settings.allow_weekend === false) {
    set.delete(0);
    set.delete(6);
  }
  return set;
}

/**
 * Evaluates active participants and marks any participant who failed to check in
 * before the work hours cutoff as "Alfa" (Tidak Hadir).
 *
 * Uses a single set-based atomic INSERT ... ON CONFLICT DO NOTHING per run and
 * a PostgreSQL advisory lock so concurrent serverless requests cannot race or duplicate rows.
 */
export async function runAutoAbsenceCheck(options = {}) {
  const { force = false, lookbackDays = 7 } = options;

  let client;
  let lockAcquired = false;

  try {
    client = await pool.connect();

    // Acquire non-blocking transaction/session advisory lock so concurrent requests skip duplicate sweeps
    const lockRes = await client.query('SELECT pg_try_advisory_lock($1) AS locked', [AUTO_ABSENCE_LOCK_KEY]);
    lockAcquired = Boolean(lockRes.rows[0]?.locked);
    if (!lockAcquired) {
      return {
        success: true,
        markedCount: 0,
        skippedBusy: true,
        message: 'Evaluasi presensi otomatis sedang berjalan di proses lain.'
      };
    }

    // For passive request triggers, check shared DB cooldown in system_settings so Vercel instances throttle cleanly
    if (!force) {
      const cdRes = await client.query(
        `SELECT setting_value FROM system_settings WHERE setting_key = 'last_auto_absence_run' LIMIT 1`
      );
      const lastRunIso = cdRes.rows[0]?.setting_value;
      if (lastRunIso) {
        const elapsedSec = (Date.now() - new Date(lastRunIso).getTime()) / 1000;
        if (!isNaN(elapsedSec) && elapsedSec >= 0 && elapsedSec < LAZY_COOLDOWN_SECONDS) {
          return {
            success: true,
            markedCount: 0,
            skippedCooldown: true,
            message: 'Evaluasi otomatis baru saja dijalankan.'
          };
        }
      }
    }

    // 1. Authoritative Asia/Jakarta wall-clock
    const { dateStr: todayStr, timeStr: currentTimeStr, dayOfWeek } = getJakartaNow();

    // 2. Load work schedule settings dynamically from attendance_settings
    const sRes = await client.query(`SELECT * FROM attendance_settings ORDER BY id ASC LIMIT 1`);
    const settings = sRes.rows[0] || {
      work_start_time: '07:00:00',
      work_end_time: '17:00:00',
      work_days: '1,2,3,4,5',
      allow_weekend: false
    };

    const endTimeStr = String(settings.work_end_time || '17:00:00').substring(0, 8);
    const allowedDays = buildAllowedWorkDaysSet(settings);

    // 3. Collect candidate dates (today ONLY if cutoff time passed and today is a working day, plus past N working days)
    const candidateDates = [];
    if (currentTimeStr >= endTimeStr && allowedDays.has(dayOfWeek)) {
      candidateDates.push(todayStr);
    }

    const safeLookback = Math.min(Math.max(parseInt(lookbackDays, 10) || 7, 1), 30);
    for (let i = 1; i <= safeLookback; i++) {
      const past = shiftDateStr(todayStr, -i);
      if (allowedDays.has(past.dayOfWeek)) {
        candidateDates.push(past.dateStr);
      }
    }

    if (candidateDates.length === 0) {
      await recordSweepTimestamp(client);
      return {
        success: true,
        markedCount: 0,
        evaluatedDates: [],
        message: 'Batas jam presensi hari ini belum selesai.'
      };
    }

    // 4. Filter out national holidays using exact DATE string formatting (prevents UTC off-by-one shift)
    const holRes = await client.query(
      `SELECT TO_CHAR(holiday_date, 'YYYY-MM-DD') AS hdate FROM holidays WHERE holiday_date = ANY($1::date[])`,
      [candidateDates]
    );
    const holidaySet = new Set(holRes.rows.map((r) => r.hdate));
    const eligibleDates = candidateDates.filter((d) => !holidaySet.has(d));

    if (eligibleDates.length === 0) {
      await recordSweepTimestamp(client);
      return {
        success: true,
        markedCount: 0,
        evaluatedDates: [],
        message: 'Tidak ada hari kerja yang memerlukan evaluasi absen.'
      };
    }

    // 5. Ensure unique constraint exists to guarantee zero duplicates under any race condition
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_user_date_uniq
      ON attendance_records(user_id, attendance_date)
    `);

    // 6. Set-based atomic sweep across all eligible dates & active participants:
    //    - Only marks participants registered on or before targetDate (in Asia/Jakarta)
    //    - Skips if attendance_records already exists for (user_id, targetDate)
    //    - Skips if leave_requests has Pending or Disetujui covering targetDate
    const insertRes = await client.query(
      `WITH target_dates AS (
         SELECT UNNEST($1::date[]) AS d
       ),
       inserted AS (
         INSERT INTO attendance_records (
           user_id, attendance_date, check_in_time, status, notes,
           location_address, ip_address, created_at
         )
         SELECT
           u.user_id,
           td.d,
           $2::time,
           'Alfa',
           'Tidak melakukan absensi hingga batas waktu jam kerja berakhir (Ditandai Alfa Otomatis oleh Sistem)',
           'Sistem Otomatis BPJSTK',
           '127.0.0.1',
           CURRENT_TIMESTAMP
         FROM target_dates td
         JOIN users u ON u.role_id = 1 AND LOWER(u.status) = 'aktif'
         WHERE (u.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jakarta')::date <= td.d
           AND NOT EXISTS (
             SELECT 1 FROM attendance_records ar
             WHERE ar.user_id = u.user_id AND ar.attendance_date = td.d
           )
           AND NOT EXISTS (
             SELECT 1 FROM leave_requests lr
             WHERE lr.user_id = u.user_id
               AND td.d BETWEEN lr.start_date AND lr.end_date
               AND lr.status IN ('Disetujui', 'Pending')
           )
         ON CONFLICT (user_id, attendance_date) DO NOTHING
         RETURNING attendance_id, user_id, TO_CHAR(attendance_date, 'YYYY-MM-DD') AS att_date
       )
       SELECT * FROM inserted`,
      [eligibleDates, endTimeStr]
    );

    const markedRows = insertRes.rows || [];
    const markedCount = markedRows.length;

    // 7. Notify participants for newly generated Alfa entries
    if (markedCount > 0) {
      await client.query(
        `INSERT INTO notifications (user_id, title, message, type, priority, is_read, created_at)
         SELECT
           v.user_id,
           'Pencatatan Tidak Hadir Otomatis (Alfa)',
           'Sistem mencatat status Alfa pada tanggal ' || v.att_date || ' karena Anda belum melakukan presensi hingga batas jam kerja (' || $3 || ' WIB) berakhir.',
           'warning',
           'high',
           FALSE,
           CURRENT_TIMESTAMP
         FROM UNNEST($1::int[], $2::text[]) AS v(user_id, att_date)`,
        [markedRows.map((r) => r.user_id), markedRows.map((r) => r.att_date), endTimeStr.substring(0, 5)]
      );
      console.log(`⏱️ [AutoAbsenceManager] Berhasil mencatat ${markedCount} catatan Alfa otomatis.`);
    }

    await recordSweepTimestamp(client);

    return {
      success: true,
      markedCount,
      evaluatedDates: eligibleDates,
      message: `Evaluasi presensi selesai: ${markedCount} catatan Alfa otomatis diterbitkan.`
    };
  } catch (err) {
    console.error('⚠️ [AutoAbsenceManager] Error running auto-absence check:', err.message);
    throw err;
  } finally {
    if (client) {
      if (lockAcquired) {
        await client.query('SELECT pg_advisory_unlock($1)', [AUTO_ABSENCE_LOCK_KEY]).catch(() => {});
      }
      client.release();
    }
  }
}

async function recordSweepTimestamp(client) {
  await client.query(
    `INSERT INTO system_settings (setting_key, setting_value, description, updated_at)
     VALUES ('last_auto_absence_run', $1, 'Timestamp eksekusi terakhir engine Alfa otomatis', CURRENT_TIMESTAMP)
     ON CONFLICT (setting_key) DO UPDATE SET setting_value = $1, updated_at = CURRENT_TIMESTAMP`,
    [new Date().toISOString()]
  ).catch(() => {});
}
