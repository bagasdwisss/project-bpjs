// api/routes/dashboard.js
import { Router } from 'express';
import { query } from '../db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();

/**
 * GET /api/dashboard/participant
 */
router.get('/participant', authenticateToken, requireRole('Peserta'), async (req, res) => {
  try {
    const userId = req.user.user_id;

    // 1. Attendance statistics
    const attendanceRes = await query(
      `SELECT 
         COUNT(*) as total,
         COUNT(CASE WHEN status = 'Hadir' THEN 1 END) as hadir,
         COUNT(CASE WHEN status = 'Izin' THEN 1 END) as izin,
         COUNT(CASE WHEN status = 'Sakit' THEN 1 END) as sakit,
         COUNT(CASE WHEN status = 'Alfa' THEN 1 END) as alfa,
         COUNT(CASE WHEN status = 'Terlambat' THEN 1 END) as terlambat
       FROM attendance_records
       WHERE user_id = $1`,
      [userId]
    );

    const attRow = attendanceRes.rows[0];
    const totalAtt = parseInt(attRow.total, 10) || 0;
    const hadir = parseInt(attRow.hadir, 10) || 0;
    const rate = totalAtt > 0 ? Math.round((hadir / totalAtt) * 100) : 100;

    const attendanceStats = {
      total: totalAtt,
      present: hadir,
      permission: parseInt(attRow.izin, 10) || 0,
      sick: parseInt(attRow.sakit, 10) || 0,
      absent: parseInt(attRow.alfa, 10) || 0,
      late: parseInt(attRow.terlambat, 10) || 0,
      rate
    };

    // 2. Score statistics & Ranking
    const scoreRes = await query(
      `SELECT 
         COALESCE(AVG(score_value), 0) as avg_score,
         COALESCE(MAX(score_value), 0) as max_score,
         COALESCE(MIN(score_value), 0) as min_score,
         COUNT(*) as total_scores
       FROM scores
       WHERE user_id = $1`,
      [userId]
    );

    const sRow = scoreRes.rows[0];

    // Compute rank among all active participants
    const rankRes = await query(
      `SELECT user_id, COALESCE(AVG(score_value), 0) as avg_s
       FROM scores
       GROUP BY user_id
       ORDER BY avg_s DESC`
    );

    let rank = 1;
    const totalParticipants = rankRes.rows.length || 1;
    for (let i = 0; i < rankRes.rows.length; i++) {
      if (rankRes.rows[i].user_id === userId) {
        rank = i + 1;
        break;
      }
    }

    const scoreStats = {
      average: parseFloat(parseFloat(sRow.avg_score).toFixed(1)),
      max: parseFloat(sRow.max_score),
      min: parseFloat(sRow.min_score),
      total: parseInt(sRow.total_scores, 10),
      rank,
      totalParticipants
    };

    // 3. Progress statistics
    const progRes = await query(
      `SELECT * FROM progress WHERE user_id = $1 LIMIT 1`,
      [userId]
    );

    const progRow = progRes.rows[0] || {
      kunjungan_bpu: 0,
      hasil_akuisisi_bpu: 0,
      kunjungan_pu: 0,
      video_viralisasi: 0,
      kehadiran_seminar: 0,
      kehadiran_sosialisasi: 0,
      total_poin: 0,
      nilai: 0,
      grade: 'E'
    };

    // 4. Recent scores
    const recentScoresRes = await query(
      `SELECT s.score_id, s.score_value, s.graded_at, s.comments, m.module_name
       FROM scores s
       LEFT JOIN modules m ON s.module_id = m.module_id
       WHERE s.user_id = $1
       ORDER BY s.graded_at DESC, s.created_at DESC
       LIMIT 4`,
      [userId]
    );

    // 5. Upcoming events
    const eventsRes = await query(
      `SELECT event_id, event_title, event_description, start_datetime, end_datetime
       FROM events
       WHERE end_datetime >= CURRENT_TIMESTAMP - INTERVAL '1 day'
       ORDER BY start_datetime ASC
       LIMIT 3`
    );

    // 6. Module progress
    const modulesRes = await query(
      `SELECT m.module_id, m.module_name, s.score_value
       FROM modules m
       LEFT JOIN scores s ON m.module_id = s.module_id AND s.user_id = $1
       ORDER BY m.module_id ASC`,
      [userId]
    );

    // 7. Unread notifications
    const notifRes = await query(
      `SELECT COUNT(*) as unread FROM notifications WHERE user_id = $1 AND is_read = FALSE`,
      [userId]
    );

    // 8. Assigned Coordinator Details
    const coordRes = await query(
      `SELECT c.user_id, c.unique_id, c.full_name, c.penempatan
       FROM users u
       JOIN users c ON u.coordinator_id = c.user_id
       WHERE u.user_id = $1`,
      [userId]
    );
    const coordinator = coordRes.rows[0] || null;

    return res.json({
      success: true,
      data: {
        coordinator,
        stats: {
          attendance: attendanceStats,
          averageScore: scoreStats.average,
          maxScore: scoreStats.max,
          minScore: scoreStats.min,
          totalScores: scoreStats.total,
          rank: scoreStats.rank,
          totalParticipants: scoreStats.totalParticipants,
          completedModules: modulesRes.rows.filter(m => m.score_value !== null).length,
          totalModules: modulesRes.rows.length,
          akuisisiBPU: progRow.hasil_akuisisi_bpu,
          hasilAkuisisiBPU: progRow.hasil_akuisisi_bpu,
          kunjunganBPU: progRow.kunjungan_bpu,
          kunjunganPU: progRow.kunjungan_pu,
          videoViralisasi: progRow.video_viralisasi,
          kehadiranSeminar: progRow.kehadiran_seminar,
          kehadiranSosialisasi: progRow.kehadiran_sosialisasi,
          totalPoin: progRow.total_poin,
          nilai: progRow.nilai,
          grade: progRow.grade
        },
        recentScores: recentScoresRes.rows,
        upcomingEvents: eventsRes.rows,
        modules: modulesRes.rows,
        unreadNotifications: parseInt(notifRes.rows[0].unread, 10) || 0
      }
    });
  } catch (error) {
    console.error('Participant dashboard error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil data dashboard peserta: ' + error.message
    });
  }
});

/**
 * GET /api/dashboard/coordinator
 */
router.get('/coordinator', authenticateToken, requireRole('Koordinator', 'Administrator'), async (req, res) => {
  try {
    const coordinatorId = req.user.user_id;

    // Get assigned participants
    const participantsRes = await query(
      `SELECT u.user_id, u.unique_id, u.full_name, u.status, u.penempatan,
              p.hasil_akuisisi_bpu, p.kunjungan_bpu, p.kunjungan_pu, p.total_poin, p.nilai, p.grade
       FROM users u
       LEFT JOIN progress p ON u.user_id = p.user_id
       WHERE u.coordinator_id = $1 AND u.role_id = 1
       ORDER BY u.full_name ASC`,
      [coordinatorId]
    );

    const participants = participantsRes.rows;
    const totalParticipants = participants.length;
    const activeParticipants = participants.filter(p => p.status === 'Aktif').length;

    // Calculate averages
    const avgScore = totalParticipants > 0 
      ? Math.round(participants.reduce((acc, p) => acc + (p.nilai || 0), 0) / totalParticipants) 
      : 0;

    const avgProgress = totalParticipants > 0
      ? Math.round(participants.reduce((acc, p) => acc + Math.min(100, Math.round(((p.hasil_akuisisi_bpu || 0) / 20) * 100)), 0) / totalParticipants)
      : 0;

    // Recent activities related to this coordinator or participants
    const activitiesRes = await query(
      `SELECT a.log_id, a.activity_type, a.details, a.created_at, u.full_name
       FROM activity_logs a
       JOIN users u ON a.user_id = u.user_id
       WHERE u.coordinator_id = $1 OR u.user_id = $1
       ORDER BY a.created_at DESC
       LIMIT 6`,
      [coordinatorId]
    );

    // Upcoming events
    const eventsRes = await query(
      `SELECT event_id, event_title, event_description, start_datetime, end_datetime
       FROM events
       WHERE end_datetime >= CURRENT_TIMESTAMP - INTERVAL '1 day'
       ORDER BY start_datetime ASC
       LIMIT 4`
    );

    // Unread notifications
    const notifRes = await query(
      `SELECT COUNT(*) as unread FROM notifications WHERE user_id = $1 AND is_read = FALSE`,
      [coordinatorId]
    );

    return res.json({
      success: true,
      data: {
        stats: {
          totalParticipants,
          activeParticipants,
          averageScore: avgScore,
          averageProgress: avgProgress
        },
        participants,
        recentActivities: activitiesRes.rows,
        upcomingEvents: eventsRes.rows,
        unreadNotifications: parseInt(notifRes.rows[0].unread, 10) || 0
      }
    });
  } catch (error) {
    console.error('Coordinator dashboard error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil data dashboard koordinator: ' + error.message
    });
  }
});

/**
 * GET /api/dashboard/admin
 */
router.get('/admin', authenticateToken, requireRole('Administrator'), async (req, res) => {
  try {
    const countsRes = await query(`
      SELECT
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM users WHERE role_id = 1 AND status = 'Aktif') as active_participants,
        (SELECT COUNT(*) FROM users WHERE role_id = 2) as total_coordinators,
        (SELECT COUNT(*) FROM users WHERE role_id = 3) as total_admins,
        (SELECT COUNT(*) FROM batches) as total_batches,
        (SELECT COUNT(*) FROM modules) as total_modules
    `);

    const counts = countsRes.rows[0];

    // Recent activities
    const activitiesRes = await query(
      `SELECT a.log_id, a.activity_type, a.details, a.created_at, u.full_name, u.unique_id
       FROM activity_logs a
       LEFT JOIN users u ON a.user_id = u.user_id
       ORDER BY a.created_at DESC
       LIMIT 8`
    );

    // Upcoming events
    const eventsRes = await query(
      `SELECT event_id, event_title, event_description, start_datetime, end_datetime
       FROM events
       ORDER BY start_datetime ASC
       LIMIT 5`
    );

    // Unread notifications for admin
    const notifRes = await query(
      `SELECT COUNT(*) as unread FROM notifications WHERE user_id = $1 AND is_read = FALSE`,
      [req.user.user_id]
    );

    return res.json({
      success: true,
      data: {
        stats: {
          totalUsers: parseInt(counts.total_users, 10) || 0,
          activeParticipants: parseInt(counts.active_participants, 10) || 0,
          totalCoordinators: parseInt(counts.total_coordinators, 10) || 0,
          totalAdmins: parseInt(counts.total_admins, 10) || 0,
          totalBatches: parseInt(counts.total_batches, 10) || 0,
          totalModules: parseInt(counts.total_modules, 10) || 0,
          systemHealth: '100% Online'
        },
        recentActivities: activitiesRes.rows,
        recent_activities: activitiesRes.rows,
        upcomingEvents: eventsRes.rows,
        upcoming_events: eventsRes.rows,
        unreadNotifications: parseInt(notifRes.rows[0].unread, 10) || 0
      }
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil data dashboard admin: ' + error.message
    });
  }
});

export default router;
