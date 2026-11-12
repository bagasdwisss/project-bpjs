// server/utils/pdfDossierGenerator.js - Official Comprehensive PDF Evaluation Dossier Aggregator
import { query } from '../db.js';
import crypto from 'crypto';
import { getJakartaNow } from './jakartaTime.js';

const escapeHtml = (val) => String(val ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

/**
 * Compiles full participant academic & internship evaluation dossier
 */
export async function compileEvaluationDossier(userId) {
  // 1. Fetch participant profile (LATERAL limits avoid Cartesian row multiplication)
  const userRes = await query(`
    SELECT u.user_id, u.unique_id, u.full_name, u.status,
           c.full_name as coordinator_name,
           ub_lat.batch_name, ub_lat.start_date as batch_start, ub_lat.end_date as batch_end,
           p_lat.program_terdaftar, p_lat.status_pendaftaran
    FROM users u
    LEFT JOIN users c ON u.coordinator_id = c.user_id
    LEFT JOIN LATERAL (
      SELECT b.batch_name, b.start_date, b.end_date
      FROM user_batches ub
      JOIN batches b ON ub.batch_id = b.batch_id
      WHERE ub.user_id = u.user_id
      ORDER BY b.end_date DESC NULLS LAST, ub.assigned_at DESC
      LIMIT 1
    ) ub_lat ON true
    LEFT JOIN LATERAL (
      SELECT program_terdaftar, status_pendaftaran
      FROM peserta
      WHERE user_id = u.user_id
      ORDER BY created_at DESC
      LIMIT 1
    ) p_lat ON true
    WHERE u.user_id = $1
  `, [userId]);

  if (userRes.rows.length === 0) {
    throw new Error('Peserta tidak ditemukan.');
  }

  const intern = userRes.rows[0];

  // 2. Fetch evaluation grades & module marks
  const scoresRes = await query(`
    SELECT s.score_id as id, s.module_id, m.module_name, s.score_value, s.comments, s.graded_at,
           evaluator.full_name as evaluator_name
    FROM scores s
    LEFT JOIN modules m ON s.module_id = m.module_id
    LEFT JOIN users evaluator ON s.coordinator_id = evaluator.user_id
    WHERE s.user_id = $1
    ORDER BY s.graded_at DESC
  `, [userId]);

  // 3. Fetch attendance recapitulation
  const attendanceRes = await query(`
    SELECT 
      COUNT(*) as total_days,
      COUNT(*) FILTER (WHERE status = 'Hadir') as hadir_count,
      COUNT(*) FILTER (WHERE status = 'Izin') as izin_count,
      COUNT(*) FILTER (WHERE status = 'Sakit') as sakit_count,
      COUNT(*) FILTER (WHERE status = 'Alfa' OR status = 'Alpa') as alpa_count
    FROM attendance_records
    WHERE user_id = $1
  `, [userId]);

  const attRecap = attendanceRes.rows[0] || { total_days: 0, hadir_count: 0, izin_count: 0, sakit_count: 0, alpa_count: 0 };
  const totalDays = parseInt(attRecap.total_days, 10) || 0;
  const hadirCount = parseInt(attRecap.hadir_count, 10) || 0;
  const attendancePct = totalDays > 0 ? Number(((hadirCount / totalDays) * 100).toFixed(1)) : 0;

  // 4. Calculate overall GPA / final weighted score
  const scores = scoresRes.rows;
  let avgFinal = 0;
  if (scores.length > 0) {
    avgFinal = Number((scores.reduce((acc, g) => acc + (parseFloat(g.score_value) || 0), 0) / scores.length).toFixed(1));
  }

  // 5. Generate tamper-evident cryptographic dossier seal
  const jktNow = getJakartaNow();
  const dossierSerial = `DOSSIER-BPJSTK-${intern.unique_id}-${jktNow.year}`;
  const dossierSeal = crypto.createHash('sha256')
    .update(`${dossierSerial}:${intern.user_id}:${avgFinal}:${attendancePct}`)
    .digest('hex');

  // 6. Generate formatted printable HTML / PDF payload (XSS-escaped)
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>DOSSIER PENILAIAN MAGANG RESMI - ${escapeHtml(intern.full_name)}</title>
  <style>
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; margin: 40px; color: #1e293b; }
    .header { border-bottom: 3px solid #059669; padding-bottom: 15px; margin-bottom: 25px; }
    .title { font-size: 22px; font-weight: bold; color: #065f46; text-transform: uppercase; }
    .subtitle { font-size: 13px; color: #64748b; margin-top: 4px; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 4px; background: #e0f2fe; color: #0369a1; font-weight: bold; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; margin-top: 15px; }
    th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; font-size: 13px; }
    th { background: #f8fafc; font-weight: 600; color: #334155; }
    .summary-card { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 15px; margin-top: 20px; }
    .seal-box { margin-top: 30px; border-top: 1px dashed #94a3b8; padding-top: 15px; font-size: 11px; color: #64748b; }
  </style>
</head>
<body>
  <div class="header">
    <div class="title">BPJS KETENAGAKERJAAN</div>
    <div class="subtitle">Bundel Berkas Penilaian &amp; Riwayat Kinerja Praktik Kerja Lapangan (PKL) / Magang</div>
  </div>

  <h3>Profil Peserta Magang</h3>
  <table>
    <tr><th width="30%">Nama Lengkap</th><td><strong>${escapeHtml(intern.full_name)}</strong></td></tr>
    <tr><th>Nomor Induk Mahasiswa / Siswa</th><td>${escapeHtml(intern.unique_id)}</td></tr>
    <tr><th>Program Pelatihan</th><td>${escapeHtml(intern.program_terdaftar || 'Operasional & Akuisisi BPU')}</td></tr>
    <tr><th>Batch / Gelombang</th><td>${escapeHtml(intern.batch_name || 'Belum Ditentukan')}</td></tr>
    <tr><th>Pembimbing / Koordinator</th><td>${escapeHtml(intern.coordinator_name || 'Tim Pembimbing BPJSTK')}</td></tr>
  </table>

  <h3 style="margin-top: 25px;">Rekapitulasi Kehadiran &amp; Kedisiplinan</h3>
  <table>
    <tr>
      <th>Total Hari Kerja</th>
      <th>Hadir</th>
      <th>Izin Resmi</th>
      <th>Sakit</th>
      <th>Alpa</th>
      <th>Persentase Kehadiran</th>
    </tr>
    <tr>
      <td>${totalDays} Hari</td>
      <td><strong style="color: #059669;">${attRecap.hadir_count}</strong></td>
      <td>${attRecap.izin_count}</td>
      <td>${attRecap.sakit_count}</td>
      <td>${attRecap.alpa_count}</td>
      <td><span class="badge">${attendancePct}%</span></td>
    </tr>
  </table>

  <h3 style="margin-top: 25px;">Daftar Nilai &amp; Evaluasi Modul</h3>
  <table>
    <thead>
      <tr>
        <th>Modul Pelatihan</th>
        <th>Nilai Akhir</th>
        <th>Catatan Evaluasi</th>
        <th>Tanggal Penilaian</th>
      </tr>
    </thead>
    <tbody>
      ${scores.length > 0 ? scores.map(s => `
        <tr>
          <td>${escapeHtml(s.module_name || 'Kompetensi Magang')}</td>
          <td><strong>${escapeHtml(s.score_value ?? 0)}</strong></td>
          <td>${escapeHtml(s.comments || 'Tuntas dengan baik')}</td>
          <td>${s.graded_at ? new Date(s.graded_at).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' }) : '-'}</td>
        </tr>
      `).join('') : `
        <tr>
          <td colspan="4" style="text-align: center; color: #64748b;">Belum ada nilai evaluasi modul yang direkam.</td>
        </tr>
      `}
    </tbody>
  </table>

  <div class="summary-card">
    <div style="font-size: 15px; font-weight: bold; color: #166534;">Rangkuman Nilai Akhir Kumulatif: ${scores.length > 0 ? `${avgFinal} / 100` : 'Belum Dinilai'}</div>
  </div>

  <div class="seal-box">
    <div><strong>Nomor Berkas Resmi:</strong> ${escapeHtml(dossierSerial)}</div>
    <div><strong>Segel Digital Kriptografis (SHA-256):</strong> ${escapeHtml(dossierSeal)}</div>
    <div><strong>Waktu Diterbitkan:</strong> ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB</div>
    <div style="margin-top: 5px; font-style: italic;">Dokumen resmi ini digenerate secara otomatis oleh Portal BPJS Ketenagakerjaan dan diakui secara institusional.</div>
  </div>
</body>
</html>
  `;

  return {
    success: true,
    dossierSerial,
    dossierSeal,
    intern,
    recap: {
      attendancePct,
      attRecap,
      avgFinal
    },
    scoresCount: scores.length,
    htmlContent
  };
}
