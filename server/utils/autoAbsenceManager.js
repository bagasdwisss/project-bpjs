// server/utils/autoAbsenceManager.js - Automated Absence (Alfa) Enforcement Engine
import { query } from '../db.js';

/**
 * Evaluates active participants and marks any participant who failed to check in
 * before the work hours cutoff as "Alfa" (Tidak Hadir).
 */
export async function runAutoAbsenceCheck() {
  try {
    // 1. Get current time in Asia/Jakarta (WIB)
    const nowJakarta = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
    const pad = (n) => String(n).padStart(2, '0');
    const todayStr = `${nowJakarta.getFullYear()}-${pad(nowJakarta.getMonth() + 1)}-${pad(nowJakarta.getDate())}`;
    const currentTimeStr = `${pad(nowJakarta.getHours())}:${pad(nowJakarta.getMinutes())}:${pad(nowJakarta.getSeconds())}`;

    // 2. Load work schedule settings from attendance_settings
    const sRes = await query(`SELECT * FROM attendance_settings ORDER BY id ASC LIMIT 1`);
    const settings = sRes.rows[0] || {
      work_start_time: '07:00:00',
      work_end_time: '17:00:00',
      allow_weekend: false
    };

    const endTimeStr = String(settings.work_end_time || '17:00:00').substring(0, 8);
    const isWeekendLocked = settings.allow_weekend === false;

    // 3. Collect dates to inspect (today if cutoff passed, plus past 7 workdays)
    const datesToCheck = [];

    // Check if today is eligible (current time passed work_end_time)
    const dayOfWeek = nowJakarta.getDay(); // 0 = Sun, 6 = Sat
    const isTodayWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    if (currentTimeStr >= endTimeStr && (!isWeekendLocked || !isTodayWeekend)) {
      datesToCheck.push(todayStr);
    }

    // Also look back at recent past days to guarantee no missing records
    for (let i = 1; i <= 7; i++) {
      const pastDate = new Date(nowJakarta);
      pastDate.setDate(pastDate.getDate() - i);
      const pastDow = pastDate.getDay();
      if (isWeekendLocked && (pastDow === 0 || pastDow === 6)) {
        continue; // Skip weekends
      }
      const pastDateStr = `${pastDate.getFullYear()}-${pad(pastDate.getMonth() + 1)}-${pad(pastDate.getDate())}`;
      datesToCheck.push(pastDateStr);
    }

    if (datesToCheck.length === 0) {
      return { markedCount: 0, message: 'Batas jam presensi hari ini belum selesai.' };
    }

    // 4. Retrieve holidays
    const holRes = await query(`SELECT holiday_date FROM holidays WHERE holiday_date = ANY($1)`, [datesToCheck]);
    const holidayDates = new Set(holRes.rows.map(r => {
      const d = new Date(r.holiday_date);
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    }));

    // Filter out holidays
    const eligibleDates = datesToCheck.filter(d => !holidayDates.has(d));
    if (eligibleDates.length === 0) {
      return { markedCount: 0, message: 'Tidak ada hari kerja yang memerlukan evaluasi absen.' };
    }

    // 5. Retrieve all active intern participants (role_id = 1)
    const userRes = await query(`
      SELECT user_id, unique_id, full_name, penempatan 
      FROM users 
      WHERE role_id = 1 AND status = 'Aktif'
    `);
    const activeParticipants = userRes.rows;

    let markedCount = 0;

    for (const targetDate of eligibleDates) {
      for (const participant of activeParticipants) {
        // A. Skip if participant already has attendance record for this date
        const attCheck = await query(
          `SELECT attendance_id FROM attendance_records WHERE user_id = $1 AND attendance_date = $2 LIMIT 1`,
          [participant.user_id, targetDate]
        );
        if (attCheck.rows.length > 0) {
          continue;
        }

        // B. Skip if participant has approved or pending leave/cuti/sakit for this date
        const leaveCheck = await query(
          `SELECT id FROM leave_requests 
           WHERE user_id = $1 
             AND $2 BETWEEN start_date AND end_date 
             AND status IN ('Disetujui', 'Pending') 
           LIMIT 1`,
          [participant.user_id, targetDate]
        );
        if (leaveCheck.rows.length > 0) {
          continue;
        }

        // C. Participant failed to check in and has no leave: Automatically mark as Alfa
        await query(
          `INSERT INTO attendance_records (
            user_id, attendance_date, check_in_time, status, notes,
            location_address, ip_address, created_at
          )
          VALUES ($1, $2, $3, 'Alfa', 'Tidak melakukan absensi hingga batas waktu jam kerja berakhir (Ditandai Alfa Otomatis oleh Sistem)', 'Sistem Otomatis BPJSTK', '127.0.0.1', CURRENT_TIMESTAMP)`,
          [participant.user_id, targetDate, endTimeStr]
        );

        markedCount++;
      }
    }

    if (markedCount > 0) {
      console.log(`⏱️ [AutoAbsenceManager] Berhasil mencatat ${markedCount} peserta Alfa otomatis karena tidak absen hingga jam kerja ditutup.`);
    }

    return {
      success: true,
      markedCount,
      evaluatedDates: eligibleDates,
      message: `Evaluasi presensi selesai: ${markedCount} catatan Alfa otomatis diterbitkan.`
    };
  } catch (err) {
    console.error('⚠️ [AutoAbsenceManager] Error running auto-absence check:', err.message);
    return { success: false, error: err.message };
  }
}
