// server/utils/bpjstkAgent.js
// Dual-Mode Multi-Tool Agentic Engine untuk "Tanya BPJSTK AI":
// 1. Jika AI_GATEWAY_API_KEY / VERCEL_OIDC_TOKEN aktif -> menjalankan Vercel AI SDK ToolLoopAgent
// 2. Jika tidak / terjadi gangguan gateway -> menjalankan Autonomous Deterministic Planner Agent
// Kedua mode berbagi 7 tool RBAC terhubung langsung ke PostgreSQL Neon.

import { ToolLoopAgent, tool, isStepCount } from 'ai';
import { z } from 'zod';
import { query } from '../db.js';
import { searchKnowledgeBase } from './indonesianFts.js';
import { getJakartaNow } from './jakartaTime.js';

const fmtRp = (val) => `Rp ${Math.round(Number(val || 0)).toLocaleString('id-ID')}`;

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const hasWordKeyword = (textLower, kw) => {
  const rx = new RegExp(`(?:^|[^a-z0-9])${escapeRegex(kw)}(?:$|[^a-z0-9])`, 'i');
  return rx.test(textLower);
};

const CURATED_REGULATIONS = [
  {
    id: '5_program',
    topic: '5 Program Utama BPJSTK',
    keywords: ['5 program', 'program bpjs', 'program bpjstk', 'apa itu bpjs', 'apa itu bpjstk', 'tentang bpjs', 'jaminan sosial', 'jkk', 'jkm', 'jht', 'jp', 'jkp', 'cakupan program', 'manfaat utama'],
    buildAnswer: () =>
      `BPJS Ketenagakerjaan menyelenggarakan **5 Program Jaminan Sosial** (UU No. 40/2004 & UU No. 24/2011):\n` +
      `1. **JKK (Jaminan Kecelakaan Kerja)**: Perlindungan kecelakaan kerja sejak berangkat, saat bekerja, perjalanan pulang, hingga penyakit akibat kerja. Biaya pengobatan medis **unlimited** di RS PLKK + santunan upah STMB.\n` +
      `2. **JKM (Jaminan Kematian)**: Santunan tunai total **{{DEATH_BENEFIT}}** bagi ahli waris jika peserta meninggal bukan akibat kecelakaan kerja + beasiswa maksimal **{{MAX_SCHOLARSHIP}}** (syarat masa iur minimal 3 tahun).\n` +
      `3. **JHT (Jaminan Hari Tua)**: Tabungan jangka panjang berbunga pengembangan; cair saat pensiun, berhenti bekerja/PHK/mengundurkan diri, atau klaim sebagian (10% / 30%) setelah masa kepesertaan 10 tahun.\n` +
      `4. **JP (Jaminan Pensiun)**: Uang tunai bulanan berkala bagi pekerja Penerima Upah (PU) saat usia pensiun, cacat total tetap, atau ahli warisnya.\n` +
      `5. **JKP (Jaminan Kehilangan Pekerjaan)**: Bantuan uang tunai hingga 6 bulan (45% upah 3 bulan pertama + 25% upah 3 bulan berikutnya), akses pasar kerja, dan pelatihan kerja bagi pekerja ter-PHK.`
  },
  {
    id: 'bpu_daftar',
    topic: 'Iuran & Pendaftaran Pekerja BPU',
    keywords: ['bpu', 'iuran', 'bukan penerima upah', '16800', '16.800', '36800', '36.800', 'daftar bpu', 'informal', 'pedagang', 'ojol', 'umkm', 'petani'],
    buildAnswer: (rates) => {
      const p2 = rates.jkkMin + rates.jkmFlat;
      const p3 = p2 + rates.jhtMin;
      return (
        `Skema kepesertaan **Pekerja Bukan Penerima Upah (BPU)** untuk pekerja mandiri/informal (pedagang, ojol, petani, nelayan, pelaku UMKM):\n` +
        `• **Paket 2 Program (JKK + JKM)**: Iuran mulai **${fmtRp(p2)}/bulan** (JKK ${fmtRp(rates.jkkMin)} + JKM ${fmtRp(rates.jkmFlat)}).\n` +
        `• **Paket 3 Program (JKK + JKM + JHT)**: Iuran mulai **${fmtRp(p3)}/bulan** (JKK ${fmtRp(rates.jkkMin)} + JKM ${fmtRp(rates.jkmFlat)} + Tabungan JHT ${fmtRp(rates.jhtMin)}).\n` +
        `• **Manfaat Utama**: Pengobatan medis JKK tanpa batas plafon, santunan kematian JKM **${fmtRp(rates.deathBenefit)}**, dan beasiswa 2 anak hingga **${fmtRp(rates.maxScholarship)}**.\n` +
        `• **Syarat Daftar**: Cukup e-KTP + nomor HP aktif melalui aplikasi JMO, kanal agen/Perisai, atau formulir Akuisisi BPU peserta magang.`
      );
    }
  },
  {
    id: 'jkm_klaim',
    topic: 'Klaim JKM & Beasiswa Anak',
    keywords: ['klaim jkm', 'santunan kematian', 'meninggal', '42 juta', 'beasiswa', '174 juta', 'ahli waris'],
    buildAnswer: (rates) =>
      `Rincian **Santunan Jaminan Kematian (JKM)** total **${fmtRp(rates.deathBenefit)}**:\n` +
      `1. **Santunan Kematian Sekaligus**: Rp 20.000.000\n` +
      `2. **Santunan Berkala**: 24 bulan x Rp 500.000 dibayarkan sekaligus = Rp 12.000.000\n` +
      `3. **Biaya Pemakaman**: Rp 10.000.000\n` +
      `4. **Beasiswa Pendidikan (2 Anak)**: Hingga **${fmtRp(rates.maxScholarship)}** (TK–Sarjana S1) apabila peserta aktif minimal 3 tahun.\n` +
      `• **Dokumen Klaim**: Kartu kepesertaan BPJSTK, e-KTP peserta & ahli waris, Kartu Keluarga (KK), Akta/Surat Kematian resmi, serta buku rekening ahli waris.`
  },
  {
    id: 'stmb_jkk',
    topic: 'STMB & Perlindungan JKK',
    keywords: ['stmb', 'pengganti upah', 'kecelakaan kerja', 'istirahat dokter', 'plkk', 'cacat'],
    buildAnswer: () =>
      `Manfaat **STMB (Santunan Sementara Tidak Mampu Bekerja)** pada program **JKK** diberikan selama pekerja dalam pemulihan medis:\n` +
      `• **6 Bulan Pertama**: 100% upah yang dilaporkan.\n` +
      `• **6 Bulan Kedua**: 100% upah yang dilaporkan.\n` +
      `• **Bulan ke-13 hingga sembuh**: 50% upah yang dilaporkan.\n` +
      `• **Perawatan Medis**: Ditanggung **tanpa batas biaya (unlimited)** di RS/Klinik Pusat Layanan Kecelakaan Kerja (PLKK) sesuai indikasi medis.`
  },
  {
    id: 'jkp_klaim',
    topic: 'Program JKP (Jaminan Kehilangan Pekerjaan)',
    keywords: ['jkp', 'kehilangan pekerjaan', 'phk', 'pesangon', 'resign', 'lapak asik'],
    buildAnswer: () =>
      `Ketentuan **JKP (Jaminan Kehilangan Pekerjaan)** bagi pekerja Penerima Upah (PU) yang mengalami PHK:\n` +
      `• **Manfaat Uang Tunai**: 45% upah (maks batas upah Rp 5 juta) selama 3 bulan pertama + 25% upah selama 3 bulan berikutnya.\n` +
      `• **Akses Layanan**: Konseling & informasi lowongan kerja di SIAPkerja serta pelatihan peningkatan kompetensi.\n` +
      `• **Syarat Utama**: WNI usia < 54 tahun, memiliki masa iur minimal 12 bulan dalam 24 bulan (6 bulan berturut-turut sebelum PHK), dan bukan karena mengundurkan diri (resign), pensiun, atau cacat total.`
  },
  {
    id: 'jht_cair',
    topic: 'Pencairan & Klaim JHT',
    keywords: ['jht', 'jaminan hari tua', 'cair jht', 'saldo jht', 'jmo', 'klaim sebagian', '10%', '30%'],
    buildAnswer: () =>
      `Ketentuan **Klaim Jaminan Hari Tua (JHT)**:\n` +
      `• **Klaim Penuh (100%)**: Saat mencapai usia pensiun 56 tahun, berhenti bekerja (mengundurkan diri/PHK melewati masa tunggu 1 bulan), cacat total tetap, atau meninggal dunia.\n` +
      `• **Klaim Sebagian (Minimal kepesertaan 10 tahun)**: Dapat mencairkan **10%** untuk persiapan pensiun atau **30%** untuk kepemilikan rumah (maksimal 1 kali).\n` +
      `• **Kanal Pengajuan**: Klaim saldo hingga Rp 10 juta cukup via aplikasi **JMO**, sedangkan di atasnya melalui layanan **Lapak Asik** atau Kantor Cabang.`
  },
  {
    id: 'presensi_magang',
    topic: 'Aturan Presensi, Geofence, Izin & Auto-Alfa',
    keywords: ['geofence', 'presensi', 'absen', 'absensi', 'radius', 'fake gps', 'auto alfa', 'alfa', 'terlambat', 'kuota izin', 'liveness'],
    buildAnswer: () =>
      `Aturan **Presensi & Integritas Pemagangan BPJSTK**:\n` +
      `• **Geofence & Liveness**: Wajib check-in berada di radius sah Kantor Cabang / Titik Binaan dengan swafoto kamera langsung (anti fake-GPS & anti foto ulang).\n` +
      `• **Evaluasi Auto-Alfa**: Sistem otomatis mencatat **Alfa** jika melewati jam batas kerja pada hari kerja aktif (bukan hari libur) tanpa presensi maupun pengajuan izin/sakit.\n` +
      `• **Izin & Sakit**: Diajukan melalui menu Permohonan Izin dengan lampiran bukti (Surat Dokter untuk sakit). Pengajuan yang disetujui Koordinator otomatis mengganti catatan Alfa pada rentang tanggal terkait.`
  },
  {
    id: 'sertifikat_penilaian',
    topic: 'Sertifikat & Standar Kelulusan Magang',
    keywords: ['sertifikat', 'kelulusan', 'prestasi', 'partisipasi', 'reissue', 'koreksi sertifikat', 'nilai', 'grade', 'bobot', 'lulus'],
    buildAnswer: () =>
      `Aturan **Penilaian & Penerbitan Sertifikat Magang BPJSTK**:\n` +
      `• **3 Jenis Sertifikat Resmi**: *Kelulusan*, *Prestasi*, dan *Partisipasi* (masing-masing berdesain khusus, ditandatangani Kepala Cabang & Mentor, serta dilindungi QR & segel HMAC-SHA256).\n` +
      `• **Aturan Anti-Fraud (1 Peserta = 1 Sertifikat)**: Setiap peserta hanya dapat diterbitkan sertifikat satu kali. Bila terjadi kesalahan data, Koordinator wajib mengajukan *Koreksi / Reissue* yang harus disetujui Administrator (menghapus bersih sertifikat lama sebelum terbit ulang).`
  }
];

async function getLiveBpuRates() {
  const res = await query(`SELECT * FROM bpu_rates ORDER BY id ASC LIMIT 1`).catch(() => ({ rows: [] }));
  const r = res.rows[0] || {};
  return {
    jkkPct: Number(r.jkk_percentage ?? 0.01),
    jkkMin: Number(r.jkk_min_amount ?? 10000),
    jkmFlat: Number(r.jkm_flat_amount ?? 6800),
    jhtPct: Number(r.jht_percentage ?? 0.02),
    jhtMin: Number(r.jht_min_amount ?? 20000),
    deathBenefit: Number(r.death_benefit_amount ?? 42000000),
    maxScholarship: Number(r.max_scholarship_amount ?? 174000000)
  };
}

function getUserRoleGroup(user) {
  const roleName = String(user?.role || user?.role_name || '').toLowerCase();
  if (user?.role_id === 3 || roleName.includes('admin')) return 'Administrator';
  if (user?.role_id === 2 || roleName.includes('koordinator') || roleName.includes('coordinator')) return 'Koordinator';
  return 'Peserta';
}

/**
 * Membangun 7 tool database & regulasi real yang patuh RBAC untuk dipakai Agent.
 */
function createAgentTools(user, executionTrace) {
  const roleGroup = getUserRoleGroup(user);
  const track = (name, summary) => {
    executionTrace.push({ tool: name, summary });
  };

  return {
    lookup_bpjs_regulation: tool({
      description:
        'Mencari regulasi resmi BPJS Ketenagakerjaan (5 program JKK/JKM/JHT/JP/JKP, BPU, STMB, klaim, geofence, auto-alfa, sertifikat) dari database Knowledge Base PostgreSQL dan korpus aturan resmi.',
      inputSchema: z.object({
        topicQuery: z.string().describe('Kata kunci topik regulasi BPJSTK atau aturan magang yang dicari.')
      }),
      execute: async ({ topicQuery }) => {
        const qLower = String(topicQuery || '').toLowerCase();
        const [kbRes, rates] = await Promise.all([
          searchKnowledgeBase(topicQuery, 'all', 3).catch(() => ({ results: [] })),
          getLiveBpuRates()
        ]);

        let bestCurated = null;
        let bestScore = 0;
        for (const item of CURATED_REGULATIONS) {
          let score = 0;
          for (const kw of item.keywords) {
            if (hasWordKeyword(qLower, kw)) score += kw.includes(' ') ? 3 : 2;
          }
          if (score > bestScore) {
            bestScore = score;
            bestCurated = item;
          }
        }

        const curatedText = bestCurated
          ? bestCurated
              .buildAnswer(rates)
              .replace(/\{\{DEATH_BENEFIT\}\}/g, fmtRp(rates.deathBenefit))
              .replace(/\{\{MAX_SCHOLARSHIP\}\}/g, fmtRp(rates.maxScholarship))
          : null;

        const dbDocs = (kbRes.results || []).map((d) => ({
          title: d.title,
          category: d.category,
          content: d.content
        }));

        track('lookup_bpjs_regulation', `${dbDocs.length} dokumen DB, topik: ${bestCurated?.topic || 'Umum'}`);
        return {
          found: Boolean(curatedText) || dbDocs.length > 0,
          matchedTopic: dbDocs[0]?.title || bestCurated?.topic || 'Regulasi BPJSTK',
          databaseDocuments: dbDocs,
          curatedRegulation: curatedText,
          liveRates: rates
        };
      }
    }),

    calculate_bpu_contribution: tool({
      description:
        'Menghitung simulasi iuran BPJS Ketenagakerjaan BPU secara presisi menggunakan tarif aktif dari tabel bpu_rates di database (Paket 2 Program JKK+JKM atau 3 Program JKK+JKM+JHT, untuk 1-12 bulan).',
      inputSchema: z.object({
        monthlyIncomeRp: z.number().min(0).optional().describe('Penghasilan/upah per bulan dalam Rupiah. Kosongkan jika memakai batas minimal.'),
        programPackage: z.enum(['2_program', '3_program']).default('2_program').describe('Pilihan paket: 2_program (JKK+JKM) atau 3_program (JKK+JKM+JHT).'),
        months: z.number().int().min(1).max(12).default(1).describe('Durasi pembayaran dalam bulan (1 sampai 12).')
      }),
      execute: async ({ monthlyIncomeRp, programPackage = '2_program', months = 1 }) => {
        const rates = await getLiveBpuRates();
        const basisIncome = monthlyIncomeRp && monthlyIncomeRp >= 1000000 ? monthlyIncomeRp : 1000000;
        const jkkMonthly = Math.max(rates.jkkMin, Math.round(basisIncome * rates.jkkPct));
        const jkmMonthly = rates.jkmFlat;
        const jhtMonthly = programPackage === '3_program' ? Math.max(rates.jhtMin, Math.round(basisIncome * rates.jhtPct)) : 0;
        const totalMonthly = jkkMonthly + jkmMonthly + jhtMonthly;
        const totalPeriod = totalMonthly * months;

        track('calculate_bpu_contribution', `${programPackage}, ${months} bln -> ${fmtRp(totalPeriod)}`);
        return {
          programPackage,
          months,
          basisIncomeRp: basisIncome,
          monthlyBreakdown: {
            jkkRp: jkkMonthly,
            jkmRp: jkmMonthly,
            jhtRp: jhtMonthly,
            totalPerMonthRp: totalMonthly
          },
          totalForPeriodRp: totalPeriod,
          benefits: {
            jkkMedicalLimit: 'Tanpa batas biaya (Unlimited di RS PLKK)',
            jkmDeathBenefitRp: rates.deathBenefit,
            maxScholarshipRp: rates.maxScholarship
          }
        };
      }
    }),

    get_my_internship_summary: tool({
      description:
        'Mengambil ringkasan data operasional real-time milik pengguna yang sedang login (Peserta: absensi bulan ini, progres target, nilai/grade, dan sertifikat; Koordinator: anak didik binaan, izin pending, verifikasi BPU pending; Admin: statistik sistem, anomali 24 jam, permohonan reissue sertifikat).',
      inputSchema: z.object({}),
      execute: async () => {
        const { year, month, dateStr } = getJakartaNow();

        if (roleGroup === 'Peserta') {
          const [attRes, progRes, scoreRes, certRes, leaveRes] = await Promise.all([
            query(
              `SELECT
                 COUNT(*)::int AS total,
                 COUNT(*) FILTER (WHERE status = 'Hadir')::int AS hadir,
                 COUNT(*) FILTER (WHERE status = 'Terlambat')::int AS terlambat,
                 COUNT(*) FILTER (WHERE status = 'Izin')::int AS izin,
                 COUNT(*) FILTER (WHERE status = 'Sakit')::int AS sakit,
                 COUNT(*) FILTER (WHERE status IN ('Alfa', 'Alpa'))::int AS alfa
               FROM attendance_records
               WHERE user_id = $1
                 AND EXTRACT(MONTH FROM attendance_date) = $2
                 AND EXTRACT(YEAR FROM attendance_date) = $3`,
              [user.user_id, month, year]
            ).catch(() => ({ rows: [{}] })),
            query(`SELECT * FROM progress WHERE user_id = $1 LIMIT 1`, [user.user_id]).catch(() => ({ rows: [] })),
            query(
              `SELECT COUNT(*)::int AS count, COALESCE(ROUND(AVG(score_value)::numeric, 1), 0) AS avg_score
               FROM scores WHERE user_id = $1`,
              [user.user_id]
            ).catch(() => ({ rows: [{}] })),
            query(
              `SELECT certificate_number, certificate_type, predicate, issue_date, status
               FROM certificates WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
              [user.user_id]
            ).catch(() => ({ rows: [] })),
            query(
              `SELECT COUNT(*) FILTER (WHERE status = 'Pending')::int AS pending_leaves,
                      COUNT(*) FILTER (WHERE status = 'Disetujui' AND EXTRACT(MONTH FROM start_date) = $2 AND EXTRACT(YEAR FROM start_date) = $3)::int AS approved_this_month
               FROM leave_requests WHERE user_id = $1`,
              [user.user_id, month, year]
            ).catch(() => ({ rows: [{}] }))
          ]);

          const att = attRes.rows[0] || {};
          const attRate = att.total > 0 ? Math.round(((att.hadir + att.terlambat) / att.total) * 100) : 0;
          track('get_my_internship_summary', `Peserta ${user.unique_id} (Hadir ${attRate}%)`);
          return {
            role: 'Peserta',
            user: { full_name: user.full_name, unique_id: user.unique_id, penempatan: user.penempatan },
            period: `${month}/${year}`,
            attendance: { ...att, attendanceRatePct: attRate },
            progress: progRes.rows[0] || null,
            moduleScores: scoreRes.rows[0] || { count: 0, avg_score: 0 },
            certificate: certRes.rows[0] || null,
            leaves: leaveRes.rows[0] || { pending_leaves: 0, approved_this_month: 0 }
          };
        }

        if (roleGroup === 'Koordinator') {
          const [menteesRes, pendingLeavesRes, pendingBpuRes, lowPerfRes, certsRes] = await Promise.all([
            query(`SELECT COUNT(*)::int AS total FROM users WHERE coordinator_id = $1 AND role_id = 1 AND status = 'Aktif'`, [user.user_id]).catch(() => ({ rows: [{ total: 0 }] })),
            query(
              `SELECT COUNT(*)::int AS total
               FROM leave_requests lr JOIN users u ON lr.user_id = u.user_id
               WHERE u.coordinator_id = $1 AND lr.status = 'Pending'`,
              [user.user_id]
            ).catch(() => ({ rows: [{ total: 0 }] })),
            query(
              `SELECT COUNT(*)::int AS total
               FROM peserta p JOIN users u ON p.user_id = u.user_id
               WHERE u.coordinator_id = $1 AND p.status_pendaftaran = 'MENUNGGU VERIFIKASI'`,
              [user.user_id]
            ).catch(() => ({ rows: [{ total: 0 }] })),
            query(
              `SELECT u.full_name, u.unique_id, COALESCE(p.nilai, 0) AS nilai, COALESCE(p.grade, '-') AS grade
               FROM users u
               LEFT JOIN progress p ON u.user_id = p.user_id
               WHERE u.coordinator_id = $1 AND u.role_id = 1 AND u.status = 'Aktif' AND COALESCE(p.nilai, 0) < 75
               ORDER BY COALESCE(p.nilai, 0) ASC LIMIT 5`,
              [user.user_id]
            ).catch(() => ({ rows: [] })),
            query(
              `SELECT COUNT(*)::int AS total
               FROM certificates c JOIN users u ON c.user_id = u.user_id
               WHERE u.coordinator_id = $1`,
              [user.user_id]
            ).catch(() => ({ rows: [{ total: 0 }] }))
          ]);

          track('get_my_internship_summary', `Koordinator ${user.unique_id}`);
          return {
            role: 'Koordinator',
            user: { full_name: user.full_name, unique_id: user.unique_id },
            activeMenteesCount: menteesRes.rows[0]?.total || 0,
            pendingLeavesToReview: pendingLeavesRes.rows[0]?.total || 0,
            pendingBpuVerifications: pendingBpuRes.rows[0]?.total || 0,
            issuedCertificatesForMentees: certsRes.rows[0]?.total || 0,
            menteesNeedingAttention: lowPerfRes.rows || []
          };
        }

        // Administrator
        const [usersRes, todayAttRes, reissueRes, anomalyRes, batchRes] = await Promise.all([
          query(
            `SELECT
               COUNT(*) FILTER (WHERE status = 'Aktif')::int AS active_users,
               COUNT(*) FILTER (WHERE role_id = 1 AND status = 'Aktif')::int AS active_peserta,
               COUNT(*) FILTER (WHERE role_id = 2 AND status = 'Aktif')::int AS active_koordinator
             FROM users`
          ).catch(() => ({ rows: [{}] })),
          query(
            `SELECT
               COUNT(*)::int AS total,
               COUNT(*) FILTER (WHERE status = 'Hadir')::int AS hadir,
               COUNT(*) FILTER (WHERE status = 'Terlambat')::int AS terlambat,
               COUNT(*) FILTER (WHERE status IN ('Alfa', 'Alpa'))::int AS alfa
             FROM attendance_records WHERE attendance_date = $1`,
            [dateStr]
          ).catch(() => ({ rows: [{}] })),
          query(`SELECT COUNT(*)::int AS pending FROM certificates WHERE reissue_requested = TRUE`).catch(() => ({ rows: [{ pending: 0 }] })),
          query(`SELECT COUNT(*)::int AS anomalies_24h FROM activity_logs WHERE is_anomaly = TRUE AND created_at >= NOW() - INTERVAL '24 hours'`).catch(() => ({ rows: [{ anomalies_24h: 0 }] })),
          query(`SELECT COUNT(*)::int AS total_batches FROM batches`).catch(() => ({ rows: [{ total_batches: 0 }] }))
        ]);

        track('get_my_internship_summary', `Administrator ${user.unique_id}`);
        return {
          role: 'Administrator',
          todayDateWib: dateStr,
          users: usersRes.rows[0] || {},
          todayAttendance: todayAttRes.rows[0] || {},
          pendingCertificateReissues: reissueRes.rows[0]?.pending || 0,
          securityAnomalies24h: anomalyRes.rows[0]?.anomalies_24h || 0,
          totalBatches: batchRes.rows[0]?.total_batches || 0
        };
      }
    }),

    get_attendance_schedule_and_geofence: tool({
      description:
        'Mengambil jadwal jam kerja resmi, batas tepat waktu, batas Auto-Alfa (WIB), hari libur terdekat, kuota izin bulanan, dan daftar titik lokasi geofence aktif dari database.',
      inputSchema: z.object({}),
      execute: async () => {
        const { dateStr } = getJakartaNow();
        const [schedRes, holRes, geoRes, quotaRes] = await Promise.all([
          query(
            `SELECT work_start_time, work_ontime_limit, work_end_time, work_days, allow_weekend, late_tolerance_minutes, inactivity_timeout_minutes
             FROM attendance_settings ORDER BY id ASC LIMIT 1`
          ).catch(() => ({ rows: [] })),
          query(`SELECT holiday_name, TO_CHAR(holiday_date, 'YYYY-MM-DD') AS holiday_date FROM holidays WHERE holiday_date >= $1::date ORDER BY holiday_date ASC LIMIT 5`, [dateStr]).catch(() => ({ rows: [] })),
          query(`SELECT name, category, address, radius_meters FROM geofence_locations WHERE is_active = TRUE ORDER BY id ASC LIMIT 10`).catch(() => ({ rows: [] })),
          query(`SELECT setting_value FROM system_settings WHERE setting_key = 'max_monthly_leaves' LIMIT 1`).catch(() => ({ rows: [] }))
        ]);

        const sched = schedRes.rows[0] || {
          work_start_time: '07:00:00',
          work_ontime_limit: '08:00:00',
          work_end_time: '17:00:00',
          work_days: '1,2,3,4,5',
          allow_weekend: false,
          late_tolerance_minutes: 0
        };

        track('get_attendance_schedule_and_geofence', `${geoRes.rows.length} titik geofence, ${holRes.rows.length} libur`);
        return {
          schedule: sched,
          maxMonthlyLeavesQuota: parseInt(quotaRes.rows[0]?.setting_value || '3', 10),
          upcomingHolidays: holRes.rows || [],
          activeGeofences: geoRes.rows || []
        };
      }
    }),

    get_grading_targets_and_rules: tool({
      description:
        'Mengambil target pencapaian magang aktif (Kunjungan BPU, Akuisisi BPU, Kunjungan PU, Video, Seminar, Sosialisasi), bobot penilaian %, batas nilai kelulusan (Grade A/B/C), dan profil penandatangan sertifikat resmi.',
      inputSchema: z.object({}),
      execute: async () => {
        const [gRes, instRes] = await Promise.all([
          query(`SELECT * FROM grading_settings ORDER BY id ASC LIMIT 1`).catch(() => ({ rows: [] })),
          query(`SELECT setting_key, setting_value FROM system_settings WHERE setting_key IN ('branch_name', 'branch_head_name', 'mentor_name')`).catch(() => ({ rows: [] }))
        ]);
        const instMap = {};
        (instRes.rows || []).forEach((r) => { instMap[r.setting_key] = r.setting_value; });
        const rawG = gRes.rows[0] || {};
        const toWeightPct = (val, fallback) => {
          const n = Number(val ?? fallback);
          return n > 0 && n <= 1 ? Math.round(n * 100) : Math.round(n);
        };
        const gradingSettings = {
          target_kunjungan_bpu: Number(rawG.target_kunjungan_bpu ?? 30),
          target_akuisisi_bpu: Number(rawG.target_akuisisi_bpu ?? 20),
          target_kunjungan_pu: Number(rawG.target_kunjungan_pu ?? 7),
          target_video: Number(rawG.target_video ?? 1),
          target_seminar: Number(rawG.target_seminar ?? 2),
          target_sosialisasi: Number(rawG.target_sosialisasi ?? 1),
          weight_akuisisi_bpu: toWeightPct(rawG.weight_akuisisi_bpu, 35),
          weight_kunjungan_bpu: toWeightPct(rawG.weight_kunjungan_bpu, 25),
          weight_kunjungan_pu: toWeightPct(rawG.weight_kunjungan_pu, 15),
          weight_video: toWeightPct(rawG.weight_video, 10),
          weight_seminar: toWeightPct(rawG.weight_seminar, 10),
          weight_sosialisasi: toWeightPct(rawG.weight_sosialisasi, 5),
          grade_a_cutoff: Number(rawG.grade_a_cutoff ?? 85),
          grade_b_cutoff: Number(rawG.grade_b_cutoff ?? 75),
          grade_c_cutoff: Number(rawG.grade_c_cutoff ?? 60),
          passing_grade: Number(rawG.passing_grade ?? rawG.grade_b_cutoff ?? 75)
        };
        track('get_grading_targets_and_rules', 'Target & bobot penilaian diambil');
        return {
          gradingSettings,
          institution: instMap
        };
      }
    }),

    check_leave_and_certificate_status: tool({
      description:
        'Mengecek status pengajuan izin/sakit terbaru, sisa kuota izin bulanan, dan status penerbitan sertifikat (untuk Peserta memeriksa miliknya sendiri; untuk Koordinator/Admin melihat antrean izin & koreksi sertifikat).',
      inputSchema: z.object({}),
      execute: async () => {
        const { month, year } = getJakartaNow();
        const quotaRes = await query(`SELECT setting_value FROM system_settings WHERE setting_key = 'max_monthly_leaves' LIMIT 1`).catch(() => ({ rows: [] }));
        const maxQuota = parseInt(quotaRes.rows[0]?.setting_value || '3', 10);

        if (roleGroup === 'Peserta') {
          const [leavesRes, certRes] = await Promise.all([
            query(
              `SELECT leave_type, TO_CHAR(start_date, 'YYYY-MM-DD') AS start_date, TO_CHAR(end_date, 'YYYY-MM-DD') AS end_date, status, coordinator_notes
               FROM leave_requests WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5`,
              [user.user_id]
            ).catch(() => ({ rows: [] })),
            query(
              `SELECT certificate_number, certificate_type, predicate, TO_CHAR(issue_date, 'YYYY-MM-DD') AS issue_date, status, reissue_requested
               FROM certificates WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
              [user.user_id]
            ).catch(() => ({ rows: [] }))
          ]);
          const usedCount = (leavesRes.rows || []).filter(
            (l) => l.status !== 'Ditolak' && l.start_date?.startsWith(`${year}-${String(month).padStart(2, '0')}`)
          ).length;

          track('check_leave_and_certificate_status', `Peserta kuota ${Math.max(0, maxQuota - usedCount)}/${maxQuota}`);
          return {
            role: 'Peserta',
            monthlyQuota: maxQuota,
            remainingQuota: Math.max(0, maxQuota - usedCount),
            recentLeaves: leavesRes.rows || [],
            certificate: certRes.rows[0] || null
          };
        }

        // Koordinator or Administrator queue overview
        const isCoord = roleGroup === 'Koordinator';
        const [leavesRes, certRes] = await Promise.all([
          query(
            `SELECT u.full_name, u.unique_id, lr.leave_type, TO_CHAR(lr.start_date, 'YYYY-MM-DD') AS start_date, lr.status
             FROM leave_requests lr JOIN users u ON lr.user_id = u.user_id
             WHERE lr.status = 'Pending' ${isCoord ? 'AND u.coordinator_id = $1' : ''}
             ORDER BY lr.created_at DESC LIMIT 6`,
            isCoord ? [user.user_id] : []
          ).catch(() => ({ rows: [] })),
          query(
            `SELECT u.full_name, u.unique_id, c.certificate_number, c.certificate_type, c.reissue_reason
             FROM certificates c JOIN users u ON c.user_id = u.user_id
             WHERE c.reissue_requested = TRUE ${isCoord ? 'AND u.coordinator_id = $1' : ''}
             ORDER BY c.reissue_requested_at DESC LIMIT 6`,
            isCoord ? [user.user_id] : []
          ).catch(() => ({ rows: [] }))
        ]);

        track('check_leave_and_certificate_status', `${leavesRes.rows.length} izin pending, ${certRes.rows.length} reissue`);
        return {
          role: roleGroup,
          pendingLeaves: leavesRes.rows || [],
          pendingReissueCertificates: certRes.rows || []
        };
      }
    }),

    search_mentee_status: tool({
      description:
        'Khusus Koordinator dan Administrator: mencari profil, kehadiran, progres, nilai/grade, dan status sertifikat peserta magang berdasarkan nama atau unique_id (mis. PES001 / Arthur), atau isi ALL untuk daftar seluruh anak didik aktif. Ditolak untuk Peserta.',
      inputSchema: z.object({
        searchNameOrId: z.string().describe('Nama lengkap/panggilan, unique_id peserta, atau ALL untuk seluruh peserta binaan.')
      }),
      execute: async ({ searchNameOrId }) => {
        if (roleGroup === 'Peserta') {
          track('search_mentee_status', 'Ditolak (RBAC Peserta)');
          return {
            authorized: false,
            error: 'Akses ditolak: Peserta hanya dapat mengecek data dirinya sendiri.'
          };
        }

        const rawSearch = String(searchNameOrId || '').trim();
        const isListAll = !rawSearch || rawSearch.toUpperCase() === 'ALL' || rawSearch === '*';
        const q = `%${rawSearch}%`;
        const isCoord = roleGroup === 'Koordinator';

        const whereParts = [`u.role_id = 1`, `u.status = 'Aktif'`];
        const params = [];
        if (isCoord) {
          params.push(user.user_id);
          whereParts.push(`u.coordinator_id = $${params.length}`);
        }
        if (!isListAll) {
          params.push(q);
          whereParts.push(`(u.full_name ILIKE $${params.length} OR u.unique_id ILIKE $${params.length})`);
        }

        const sql = `
          SELECT * FROM (
            SELECT DISTINCT ON (u.user_id)
                   u.user_id, u.full_name, u.unique_id, u.penempatan, u.status,
                   p.kunjungan_bpu, p.hasil_akuisisi_bpu, p.kunjungan_pu, p.nilai, p.grade,
                   c.certificate_number, c.certificate_type
            FROM users u
            LEFT JOIN progress p ON u.user_id = p.user_id
            LEFT JOIN certificates c ON u.user_id = c.user_id
            WHERE ${whereParts.join(' AND ')}
            ORDER BY u.user_id, c.created_at DESC NULLS LAST
          ) sub
          ORDER BY ${isListAll ? 'COALESCE(sub.nilai, 0) DESC, sub.full_name ASC' : 'sub.full_name ASC'}
          LIMIT ${isListAll ? 10 : 5}
        `;
        const res = await query(sql, params).catch(() => ({ rows: [] }));
        track('search_mentee_status', `${res.rows.length} peserta ditemukan`);
        return {
          authorized: true,
          isListAll,
          matches: res.rows || []
        };
      }
    })
  };
}

/**
 * Mengekstrak angka penghasilan (Rupiah) & durasi bulan dari kalimat natural Bahasa Indonesia
 */
function parseCalculatorParams(text) {
  const lower = String(text || '').toLowerCase();
  const is3Prog = /\b(3\s*program|jht|lengkap|tabungan)\b/.test(lower);

  let months = 1;
  const tahunMatch = lower.match(/(\d+)\s*tahun/);
  const bulanMatch = lower.match(/(\d+)\s*(bulan|bln)/);
  if (tahunMatch) months = Math.min(12, Math.max(1, parseInt(tahunMatch[1], 10) * 12));
  else if (bulanMatch) months = Math.min(12, Math.max(1, parseInt(bulanMatch[1], 10)));

  let monthlyIncomeRp = undefined;
  const jutaMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*(juta|jt)\b/);
  const rbMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*(ribu|rb)\b/);
  const rpMatch = lower.match(/(?:rp\.?|gaji|upah|penghasilan|omzet)\s*[:=]?\s*([\d.]{5,})/);
  if (jutaMatch) {
    monthlyIncomeRp = Math.round(parseFloat(jutaMatch[1].replace(',', '.')) * 1_000_000);
  } else if (rbMatch) {
    const val = Math.round(parseFloat(rbMatch[1].replace(',', '.')) * 1_000);
    if (val >= 500_000) monthlyIncomeRp = val;
  } else if (rpMatch) {
    const val = parseInt(rpMatch[1].replace(/\./g, ''), 10);
    if (val >= 500_000) monthlyIncomeRp = val;
  }

  return {
    monthlyIncomeRp,
    programPackage: is3Prog ? '3_program' : '2_program',
    months
  };
}

/**
 * Engine Cadangan Mandiri (Autonomous Deterministic Tool Planner):
 * Berjalan 100% lokal + Neon DB saat AI_GATEWAY_API_KEY / OIDC belum dikonfigurasi,
 * tetap memanggil tool-tool asli berdasarkan maksud pertanyaan & riwayat chat.
 */
async function runDeterministicPlannerAgent({ user, question, history, tools, trace }) {
  const roleGroup = getUserRoleGroup(user);
  const firstName = user?.full_name?.split(' ')[0] || 'Sobat BPJSTK';
  const qRaw = String(question || '').trim();
  const qLower = qRaw.toLowerCase();
  const recentContext = Array.isArray(history)
    ? history
        .slice(-4)
        .map((m) => String(m?.text || m?.content || ''))
        .join(' ')
    : '';
  const combinedText = `${qRaw} ${qRaw.length < 24 ? recentContext : ''}`.toLowerCase();

  const wantsCalc =
    /\b(hitung|simulasi|kalkulator|estimasi|biaya|iuran|bayar|tarif)\b/.test(combinedText) &&
    /\b(bpu|jkk|jkm|jht|program|juta|jt|ribu|rb|bulan|bln|tahun|gaji|upah|penghasilan|omzet)\b/.test(combinedText);
  const wantsMenteeList =
    roleGroup !== 'Peserta' &&
    /\b(siapa saja|daftar|list|semua|tampilkan)\b/.test(qLower) &&
    /\b(peserta|anak didik|binaan|magang)\b/.test(qLower);
  const wantsMySummary = /\b(saya|aku|ku|progres|progress|rekap|ringkasan|nilai|grade|performa|anak didik|binaan|monitoring|sistem|hari ini|anomali|presensi|absen|absensi)\b/.test(combinedText);
  const wantsSchedule = /\b(jadwal|jam kerja|jam masuk|jam pulang|jam absen|libur|geofence|radius|lokasi|kantor|auto.?alfa|timeout|weekend|sabtu|minggu)\b/.test(combinedText);
  const wantsGradingRules = /\b(target|bobot|kelulusan|passing|syarat lulus|standar nilai|kepala cabang|penandatangan|kop surat|predikat|cara lulus|penilaian)\b/.test(combinedText);
  const wantsLeaveCert = /\b(izin|sakit|cuti|kuota|sertifikat|reissue|koreksi|terbit)\b/.test(combinedText);

  // Extract potential student ID or name lookup for Coordinator/Admin
  const idMatch = qRaw.match(/\b(PES\d+|ADM\d+|KO\d+)\b/i);
  const nameAfterKeyword = qRaw.match(/(?:status|nilai|progres|absen(?:si)?|cek|cari|peserta|anak didik)\s+(?:atas nama\s+|dari\s+)?([A-Za-z]{3,25})/i);
  const ignoredWords = new Set(['saya', 'aku', 'hari', 'ini', 'bulan', 'magang', 'sertifikat', 'izin', 'sakit', 'alfa', 'semua', 'anak', 'didik', 'peserta', 'bpu', 'program', 'nilai', 'progres', 'target', 'saja', 'terbaik', 'yang', 'belum']);
  const candidateSearch = idMatch?.[1] || (nameAfterKeyword && !ignoredWords.has(nameAfterKeyword[1].toLowerCase()) ? nameAfterKeyword[1] : null);
  const wantsMenteeLookup = roleGroup !== 'Peserta' && Boolean(candidateSearch) && !wantsMenteeList;

  const isGreeting = /^(halo+|hai+|hi+|hey+|selamat\s+(pagi|siang|sore|malam)|assalamu'?alaikum|permisi|pagi|siang|sore|malam|ping)\b[!.,?\s]*$/i.test(qRaw);
  const isThanks = /^(terima\s*kasih|makasih+|thanks+|thank\s*you|oke+|ok+|sip+|mantap+|siap|noted)\b[!.,?\s]*$/i.test(qRaw);
  const isHelpOrIdentity = /\b(siapa kamu|kamu siapa|bisa apa|kemampuan|bantuan|help|menu|cara pakai)\b/.test(qLower);

  const hasOperationalIntent =
    wantsCalc || wantsMenteeList || wantsMenteeLookup || wantsMySummary || wantsSchedule || wantsGradingRules || wantsLeaveCert;
  const hasExplicitRegIntent = /\b(5 program|program bpjs|program bpjstk|jkk|jkm|jht|jp|jkp|stmb|beasiswa|klaim|santunan|apa itu|bagaimana aturan|aturan|regulasi|uu|cara daftar|cara absen|syarat|sop)\b/.test(qLower);

  if (!hasOperationalIntent && !hasExplicitRegIntent) {
    if (isThanks) {
      return {
        topic: 'BPJSTK Smart Agent',
        answer: `Sama-sama, **${firstName}**! Jika ada pertanyaan lain seputar program BPJSTK, simulasi iuran BPU, atau data pemagangan, silakan ketik kapan saja.`,
        source: 'conversational_agent',
        engine: 'bpjstk-autonomous-agent',
        model: 'deterministic-planner-v3',
        toolsUsed: []
      };
    }

    if (isGreeting || isHelpOrIdentity) {
      const roleExamples =
        roleGroup === 'Administrator'
          ? [
              '*"Ringkasan sistem, anomali & reissue hari ini"*',
              '*"Daftar semua peserta magang"* atau *"Cek status PES001"*',
              '*"Jadwal kerja, hari libur & lokasi geofence"*',
              '*"Target & bobot penilaian magang"* atau *"Hitung iuran BPU 3 program upah 3 juta 6 bulan"*'
            ]
          : roleGroup === 'Koordinator'
            ? [
                '*"Ringkasan anak didik & pending approval"*',
                '*"Siapa saja peserta binaan saya?"* atau *"Cek status peserta PES001"*',
                '*"Target penilaian & standar kelulusan"*',
                '*"Hitung iuran BPU 2 program 6 bulan"*'
              ]
            : [
                '*"Cek absensi & progres saya bulan ini"*',
                '*"Cek status izin & sertifikat saya"*',
                '*"Jadwal jam masuk, libur & lokasi geofence"*',
                '*"Hitung iuran BPU 3 program upah 3 juta 6 bulan"*'
              ];

      return {
        topic: 'BPJSTK Smart Agent',
        answer:
          `Halo **${firstName}**! Saya **BPJSTK Smart Agent** (peran **${roleGroup}**) yang terhubung langsung ke database sistem.\n\n` +
          `### Hal yang bisa langsung Anda tanyakan:\n` +
          roleExamples.map((ex, i) => `${i + 1}. ${ex}`).join('\n') +
          `\n\nAnda juga bisa bertanya seputar regulasi **5 Program BPJSTK** (JKK, JKM, JHT, JP, JKP), klaim STMB, santunan JKM, maupun aturan presensi/sertifikat.`,
        source: 'conversational_agent',
        engine: 'bpjstk-autonomous-agent',
        model: 'deterministic-planner-v3',
        toolsUsed: []
      };
    }
  }

  const sections = [];
  let mainTopic = 'BPJSTK Smart Agent';
  const tasks = [];

  if (wantsMenteeList) {
    tasks.push(
      tools.search_mentee_status.execute({ searchNameOrId: 'ALL' }).then((data) => {
        mainTopic = 'Daftar Peserta Magang Aktif';
        if (!data.authorized) return;
        if (!data.matches.length) {
          sections.push('Belum ada data peserta magang aktif yang tercatat pada cakupan Anda.');
          return;
        }
        const lines = data.matches.map(
          (m, idx) =>
            `${idx + 1}. **${m.full_name} (${m.unique_id})** — ${m.penempatan || 'Umum'}\n` +
            `   Kunjungan BPU: **${m.kunjungan_bpu ?? 0}** | Akuisisi BPU: **${m.hasil_akuisisi_bpu ?? 0}** | Kunjungan PU: **${m.kunjungan_pu ?? 0}** | Nilai: **${m.nilai ?? 0}** (${m.grade || '-'})\n` +
            `   Sertifikat: ${m.certificate_number ? `Terbit (${m.certificate_type}: \`${m.certificate_number}\`)` : 'Belum terbit'}`
        );
        sections.push(`### Daftar Peserta Magang (${data.matches.length} ditampilkan):\n${lines.join('\n')}`);
      })
    );
  }

  if (wantsMenteeLookup) {
    tasks.push(
      tools.search_mentee_status.execute({ searchNameOrId: candidateSearch }).then((data) => {
        mainTopic = `Pencarian Peserta: ${candidateSearch}`;
        if (!data.authorized) return;
        if (!data.matches.length) {
          sections.push(`Belum ditemukan peserta magang aktif yang cocok dengan **"${candidateSearch}"**.`);
          return;
        }
        const lines = data.matches.map(
          (m, idx) =>
            `${idx + 1}. **${m.full_name} (${m.unique_id})** — ${m.penempatan || 'Umum'} (${m.status})\n` +
            `   Kunjungan BPU: **${m.kunjungan_bpu ?? 0}** | Akuisisi BPU: **${m.hasil_akuisisi_bpu ?? 0}** | Kunjungan PU: **${m.kunjungan_pu ?? 0}** | Nilai: **${m.nilai ?? 0}** (Grade **${m.grade || '-'}**)\n` +
            `   Sertifikat: ${m.certificate_number ? `Terbit (${m.certificate_type}: \`${m.certificate_number}\`)` : 'Belum diterbitkan'}`
        );
        sections.push(`### Profil & Capaian Peserta:\n${lines.join('\n')}`);
      })
    );
  }

  if (wantsCalc) {
    const calcParams = parseCalculatorParams(qRaw);
    tasks.push(
      tools.calculate_bpu_contribution.execute(calcParams).then((res) => {
        if (mainTopic === 'BPJSTK Smart Agent') mainTopic = 'Simulasi Kalkulator Iuran BPU';
        const mb = res.monthlyBreakdown;
        sections.push(
          `### Simulasi Iuran BPU (${res.programPackage === '3_program' ? '3 Program: JKK + JKM + JHT' : '2 Program: JKK + JKM'}) — ${res.months} Bulan\n` +
            `• Dasar Upah Dilaporkan: **${fmtRp(res.basisIncomeRp)}/bulan**\n` +
            `• Rincian/Bulan: JKK **${fmtRp(mb.jkkRp)}** + JKM **${fmtRp(mb.jkmRp)}**${mb.jhtRp ? ` + Tabungan JHT **${fmtRp(mb.jhtRp)}**` : ''}\n` +
            `• **Total Iuran/Bulan:** ${fmtRp(mb.totalPerMonthRp)} | **Total ${res.months} Bulan:** **${fmtRp(res.totalForPeriodRp)}**\n` +
            `• Manfaat Perlindungan: Medis JKK **Unlimited**, Santunan Kematian **${fmtRp(res.benefits.jkmDeathBenefitRp)}**, Beasiswa Maks **${fmtRp(res.benefits.maxScholarshipRp)}**.`
        );
      })
    );
  }

  if (wantsMySummary && !wantsMenteeList) {
    tasks.push(
      tools.get_my_internship_summary.execute({}).then((data) => {
        if (mainTopic === 'BPJSTK Smart Agent') mainTopic = `Ringkasan Live ${data.role}`;
        if (data.role === 'Peserta') {
          const a = data.attendance || {};
          const p = data.progress || {};
          sections.push(
            `### Ringkasan Magang Anda (${data.user.full_name} • ${data.user.unique_id})\n` +
              `• **Presensi Bulan Ini (${data.period})**: Hadir **${a.hadir || 0}**, Terlambat **${a.terlambat || 0}**, Izin **${a.izin || 0}**, Sakit **${a.sakit || 0}**, Alfa **${a.alfa || 0}** (Tingkat Kehadiran: **${a.attendanceRatePct || 0}%**).\n` +
              `• **Progres & Penilaian**: Kunjungan BPU **${p.kunjungan_bpu ?? 0}**, Akuisisi BPU **${p.hasil_akuisisi_bpu ?? 0}**, Kunjungan PU **${p.kunjungan_pu ?? 0}**, Nilai Akhir **${p.nilai ?? 0}** (Grade **${p.grade || '-'}**), Rata-rata Modul **${data.moduleScores?.avg_score ?? 0}** (${data.moduleScores?.count ?? 0} modul).\n` +
              `• **Sertifikat**: ${data.certificate ? `Sudah Terbit — ${data.certificate.certificate_type} (\`${data.certificate.certificate_number}\`, ${data.certificate.predicate})` : 'Belum diterbitkan koordinator'}.`
          );
        } else if (data.role === 'Koordinator') {
          const attn = (data.menteesNeedingAttention || [])
            .map((m) => `${m.full_name} (${m.unique_id}: Nilai ${m.nilai})`)
            .join(', ');
          sections.push(
            `### Ringkasan Operasional Koordinator (${data.user.full_name})\n` +
              `• **Anak Didik Binaan Aktif**: **${data.activeMenteesCount}** peserta | **Sertifikat Terbit**: **${data.issuedCertificatesForMentees}**.\n` +
              `• **Menunggu Verifikasi Anda**: **${data.pendingLeavesToReview}** pengajuan izin/sakit | **${data.pendingBpuVerifications}** bukti akuisisi BPU.\n` +
              `• **Perlu Perhatian (<75)**: ${attn || 'Seluruh peserta di atas batas minimal'}.`
          );
        } else {
          const u = data.users || {};
          const ta = data.todayAttendance || {};
          sections.push(
            `### Ringkasan Live Administrator (${data.todayDateWib} WIB)\n` +
              `• **Akun Aktif**: **${u.active_users || 0}** total (**${u.active_peserta || 0}** Peserta, **${u.active_koordinator || 0}** Koordinator) di **${data.totalBatches}** batch.\n` +
              `• **Presensi Hari Ini**: **${ta.total || 0}** log (Hadir **${ta.hadir || 0}**, Terlambat **${ta.terlambat || 0}**, Alfa **${ta.alfa || 0}**).\n` +
              `• **Keamanan & Sertifikat**: **${data.securityAnomalies24h}** anomali keamanan (24 jam) | **${data.pendingCertificateReissues}** permohonan reissue sertifikat menunggu persetujuan.`
          );
        }
      })
    );
  }

  if (wantsSchedule) {
    tasks.push(
      tools.get_attendance_schedule_and_geofence.execute({}).then((data) => {
        if (mainTopic === 'BPJSTK Smart Agent') mainTopic = 'Jadwal Kerja, Libur & Geofence';
        const s = data.schedule;
        const tol = Number(s.late_tolerance_minutes || 0);
        const holText = data.upcomingHolidays.length
          ? data.upcomingHolidays.map((h) => `${h.holiday_date} (${h.holiday_name})`).join(', ')
          : 'Tidak ada hari libur terdekat terdaftar';
        const geoText = data.activeGeofences.length
          ? data.activeGeofences.map((g) => `${g.name} (${g.radius_meters}m)`).join(', ')
          : 'Kantor Cabang Utama';
        sections.push(
          `### Jadwal Presensi, Libur & Titik Geofence\n` +
            `• **Jam Operasional (WIB)**: Buka Absen **${String(s.work_start_time).slice(0, 5)}**, Tepat Waktu s.d. **${String(s.work_ontime_limit).slice(0, 5)}**${tol > 0 ? ` (+${tol} mnt toleransi)` : ''}, Batas Pulang / Auto-Alfa **${String(s.work_end_time).slice(0, 5)}**.\n` +
            `• **Kuota Izin Bulanan**: Maksimal **${data.maxMonthlyLeavesQuota}x** per bulan | **Weekend**: ${s.allow_weekend ? 'Dibuka' : 'Terkunci'}.\n` +
            `• **Titik Geofence Aktif**: ${geoText}.\n` +
            `• **Hari Libur Terdekat**: ${holText}.`
        );
      })
    );
  }

  if (wantsGradingRules) {
    tasks.push(
      tools.get_grading_targets_and_rules.execute({}).then((data) => {
        if (mainTopic === 'BPJSTK Smart Agent') mainTopic = 'Target & Bobot Penilaian Magang';
        const g = data.gradingSettings;
        sections.push(
          `### Target, Bobot & Standar Kelulusan Magang\n` +
            `• **Target Aktivitas**: Kunjungan BPU **${g.target_kunjungan_bpu}**, Akuisisi BPU **${g.target_akuisisi_bpu}**, Kunjungan PU **${g.target_kunjungan_pu}**, Video **${g.target_video}**, Seminar **${g.target_seminar}**, Sosialisasi **${g.target_sosialisasi}**.\n` +
            `• **Bobot Penilaian**: Akuisisi BPU **${g.weight_akuisisi_bpu}%**, Kunjungan BPU **${g.weight_kunjungan_bpu}%**, Kunjungan PU **${g.weight_kunjungan_pu}%**, Video **${g.weight_video}%**, Seminar **${g.weight_seminar}%**, Sosialisasi **${g.weight_sosialisasi}%**.\n` +
            `• **Standar Nilai**: Batas Lulus **≥ ${g.passing_grade}** (Grade A ≥ ${g.grade_a_cutoff}, Grade B ≥ ${g.grade_b_cutoff}, Grade C ≥ ${g.grade_c_cutoff}).\n` +
            `• **Instansi & Penandatangan**: ${data.institution.branch_name || 'BPJS Ketenagakerjaan'} (Kepala Cabang: ${data.institution.branch_head_name || '-'}, Mentor: ${data.institution.mentor_name || '-'}).`
        );
      })
    );
  }

  if (wantsLeaveCert && !wantsMySummary) {
    tasks.push(
      tools.check_leave_and_certificate_status.execute({}).then((data) => {
        if (mainTopic === 'BPJSTK Smart Agent') mainTopic = 'Status Izin & Sertifikat';
        if (data.role === 'Peserta') {
          const leaveList = data.recentLeaves.length
            ? data.recentLeaves.map((l) => `${l.leave_type} (${l.start_date} s.d. ${l.end_date}): **${l.status}**`).join('; ')
            : 'Belum ada riwayat pengajuan izin.';
          const certText = data.certificate
            ? `Sudah Terbit — **${data.certificate.certificate_type}** (\`${data.certificate.certificate_number}\`, Predikat: ${data.certificate.predicate})`
            : 'Belum diterbitkan.';
          sections.push(
            `### Status Izin & Sertifikat Anda\n` +
              `• **Sisa Kuota Izin Bulan Ini**: **${data.remainingQuota} / ${data.monthlyQuota} kali**\n` +
              `• **Riwayat Pengajuan Terbaru**: ${leaveList}\n` +
              `• **Status Sertifikat**: ${certText}`
          );
        } else {
          sections.push(
            `### Antrean Persetujuan Izin & Koreksi Sertifikat (${data.role})\n` +
              `• **Izin/Sakit Pending**: **${data.pendingLeaves.length}** pengajuan${data.pendingLeaves.length ? ` (${data.pendingLeaves.slice(0, 3).map((l) => `${l.full_name}: ${l.leave_type} ${l.start_date}`).join(', ')})` : ''}.\n` +
              `• **Permohonan Reissue Sertifikat**: **${data.pendingReissueCertificates.length}** permohonan.`
          );
        }
      })
    );
  }

  // Only invoke regulation lookup if explicitly regulatory OR no operational tool matched
  const shouldLookupReg =
    tasks.length === 0 ||
    (!wantsCalc && hasExplicitRegIntent) ||
    (wantsCalc && /\b(stmb|beasiswa|klaim|syarat|apa itu|jht|jkp|jp)\b/.test(qLower));

  if (shouldLookupReg) {
    tasks.push(
      tools.lookup_bpjs_regulation.execute({ topicQuery: qRaw }).then((reg) => {
        if (mainTopic === 'BPJSTK Smart Agent') mainTopic = reg.matchedTopic;
        if (reg.curatedRegulation) {
          sections.push(reg.curatedRegulation);
          if (reg.databaseDocuments.length > 0 && tasks.length <= 1 && !hasExplicitRegIntent) {
            const top = reg.databaseDocuments[0];
            sections.push(`*Referensi Knowledge Base (${top.title}):* ${top.content}`);
          }
        } else if (reg.databaseDocuments.length > 0) {
          const top = reg.databaseDocuments[0];
          sections.push(`### ${top.title} *(${top.category || 'Regulasi'})*\n${top.content}`);
        }
      })
    );
  }

  await Promise.all(tasks);

  if (sections.length === 0) {
    const [rates, sched] = await Promise.all([
      getLiveBpuRates(),
      tools.get_attendance_schedule_and_geofence.execute({})
    ]);
    mainTopic = 'Asisten Pintar BPJSTK';
    const s = sched.schedule;
    sections.push(
      `Berikut panduan cepat yang bisa langsung Anda gunakan bersama **BPJSTK Smart Agent**:\n` +
        `1. **Simulasi Iuran BPU**: Ketik *"Hitung iuran BPU 3 program upah 3 juta 6 bulan"* (Mulai ${fmtRp(rates.jkkMin + rates.jkmFlat)}/bln untuk 2 program atau ${fmtRp(rates.jkkMin + rates.jkmFlat + rates.jhtMin)}/bln untuk 3 program).\n` +
        `2. **Data Live Database**: Ketik *"Cek ringkasan absensi dan progres saya"*, *"Target & bobot penilaian"*, atau *"Cek status izin dan sertifikat"*.\n` +
        `3. **Regulasi BPJSTK**: Tanyakan tentang **5 Program BPJSTK**, **klaim STMB JKK**, **santunan kematian JKM**, **pencairan JHT**, **JKP**, atau aturan **Auto-Alfa & Geofence**.\n` +
        `4. **Jam Operasional Aktif**: **${String(s.work_start_time).slice(0, 5)} – ${String(s.work_end_time).slice(0, 5)} WIB** (Tepat waktu s.d. ${String(s.work_ontime_limit).slice(0, 5)} WIB).`
    );
  }

  return {
    topic: mainTopic,
    answer: sections.join('\n\n'),
    source: trace.length > 0 ? 'agent_multi_tool' : 'regulation_kb',
    engine: 'bpjstk-autonomous-agent',
    model: 'deterministic-planner-v3',
    toolsUsed: trace
  };
}

/**
 * Entry point utama BPJSTK Agent (mendukung ToolLoopAgent AI SDK + fallback otomatis).
 */
export async function runBpjstkAgent({ user, question, history = [], hasOidcHeader = false }) {
  const executionTrace = [];
  const tools = createAgentTools(user, executionTrace);
  const roleGroup = getUserRoleGroup(user);

  const hasGatewayAuth = Boolean(
    process.env.AI_GATEWAY_API_KEY ||
    process.env.VERCEL_OIDC_TOKEN ||
    hasOidcHeader ||
    process.env.VERCEL
  );
  const gatewayModel = process.env.AI_GATEWAY_MODEL || 'google/gemini-3-flash';

  if (hasGatewayAuth) {
    try {
      const instructions = [
        'Anda adalah "BPJSTK Smart Agent", asisten ahli regulasi BPJS Ketenagakerjaan dan operasional Sistem Pemagangan BPJSTK.',
        `Pengguna saat ini: ${user?.full_name || 'Pengguna'} (ID: ${user?.unique_id || '-'}, Peran: ${roleGroup}).`,
        'WAJIB panggil tool database/kalkulator terlebih dahulu sebelum menjawab pertanyaan tentang angka iuran, jadwal, target nilai, progres, absensi, izin, atau sertifikat. Jangan pernah mengarang angka.',
        'Jawablah dengan Bahasa Indonesia yang tegas, terstruktur (poin/bold Markdown ringkas), akurat sesuai hasil tool, dan patuhi batasan peran RBAC.'
      ].join('\n');

      const agent = new ToolLoopAgent({
        model: gatewayModel,
        instructions,
        tools,
        stopWhen: isStepCount(6)
      });

      const normalizedHistory = Array.isArray(history)
        ? history
            .slice(-6)
            .filter((m) => m && (m.text || m.content))
            .map((m) => ({
              role: m.sender === 'user' || m.role === 'user' ? 'user' : 'assistant',
              content: String(m.text || m.content)
            }))
        : [];

      const messages = [...normalizedHistory, { role: 'user', content: question }];
      const result = await agent.generate({ messages });

      if (result?.text && result.text.trim()) {
        return {
          topic: executionTrace.length > 0 ? `Agent (${executionTrace[0].tool})` : 'BPJSTK AI Agent',
          answer: result.text.trim(),
          source: 'ai_sdk_tool_loop_agent',
          engine: 'vercel-ai-sdk-v7',
          model: gatewayModel,
          toolsUsed: executionTrace,
          stepsCount: Array.isArray(result.steps) ? result.steps.length : 1
        };
      }
    } catch (gatewayErr) {
      console.warn('[BPJSTK Agent] AI Gateway unavailable, falling back to Autonomous Planner Agent:', gatewayErr.message);
      executionTrace.length = 0; // Reset trace cleanly before deterministic planner run
    }
  }

  const fallbackRes = await runDeterministicPlannerAgent({
    user,
    question,
    history,
    tools,
    trace: executionTrace
  });

  return {
    ...fallbackRes,
    stepsCount: Math.max(1, fallbackRes.toolsUsed.length)
  };
}

export default { runBpjstkAgent };
