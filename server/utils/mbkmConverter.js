// server/utils/mbkmConverter.js - Automated MBKM / Kemendikbudristek Logbook & Grade Converter
import { query } from '../db.js';
import crypto from 'crypto';

/**
 * Compiles and converts internship metrics into official Kemendikbudristek MBKM format
 */
export async function generateMbkmDossier(userId) {
  // 1. Fetch user & internship profile
  const userRes = await query(`
    SELECT u.user_id, u.unique_id, u.full_name, u.status,
           c.full_name as coordinator_name,
           b.batch_name, b.start_date as batch_start, b.end_date as batch_end,
           p.program_terdaftar, p.status_pendaftaran
    FROM users u
    LEFT JOIN users c ON u.coordinator_id = c.user_id
    LEFT JOIN user_batches ub ON u.user_id = ub.user_id
    LEFT JOIN batches b ON ub.batch_id = b.batch_id
    LEFT JOIN peserta p ON u.user_id = p.user_id
    WHERE u.user_id = $1
  `, [userId]);

  if (userRes.rows.length === 0) {
    throw new Error('Peserta tidak ditemukan.');
  }

  const intern = userRes.rows[0];

  // 2. Fetch attendance hours
  const attRes = await query(`
    SELECT 
      COUNT(*) as total_days,
      COUNT(*) FILTER (WHERE status = 'Hadir') as hadir_days
    FROM attendance_records
    WHERE user_id = $1
  `, [userId]);

  const hadirDays = parseInt(attRes.rows[0]?.hadir_days || 0, 10);
  const totalHours = hadirDays * 8; // 8 hours per working day
  // MBKM Standard: 1 SKS is equivalent to ~45 learning/internship hours. Max 20 SKS per semester.
  const recommendedSks = Math.min(20, Math.max(1, Math.round(totalHours / 45)));

  // 3. Fetch module competencies & grades
  const scoresRes = await query(`
    SELECT s.score_id, s.module_id, m.module_name, s.score_value, s.comments, s.graded_at
    FROM scores s
    LEFT JOIN modules m ON s.module_id = m.module_id
    WHERE s.user_id = $1
    ORDER BY s.graded_at ASC
  `, [userId]);

  const scores = scoresRes.rows;
  let avgScore = 85.0;
  if (scores.length > 0) {
    avgScore = Number((scores.reduce((acc, s) => acc + parseFloat(s.score_value || 0), 0) / scores.length).toFixed(1));
  }

  let gradeLetter = 'A';
  if (avgScore < 70) gradeLetter = 'C';
  else if (avgScore < 80) gradeLetter = 'B';
  else if (avgScore >= 85) gradeLetter = 'A';

  // 4. Cryptographic MBKM Verification Seal
  const mbkmSerial = `MBKM-BPJSTK-${intern.unique_id}-${new Date().getFullYear()}`;
  const mbkmSeal = crypto.createHash('sha256')
    .update(`${mbkmSerial}:${intern.user_id}:${totalHours}:${recommendedSks}`)
    .digest('hex');

  // 5. Standardized Kemendikbudristek Template HTML
  const htmlTemplate = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>LOGBOOK & REKOMENDASI KONVERSI SKS MBKM - ${intern.full_name}</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; margin: 40px; color: #1e293b; line-height: 1.5; }
    .header { border-bottom: 3px double #059669; padding-bottom: 12px; margin-bottom: 24px; text-align: center; }
    .inst-name { font-size: 18px; font-weight: bold; color: #065f46; text-transform: uppercase; }
    .doc-title { font-size: 15px; font-weight: 600; margin-top: 4px; color: #334155; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
    th { background: #f8fafc; font-weight: 600; }
    .sks-box { background: #ecfdf5; border: 1.5px solid #10b981; padding: 16px; border-radius: 8px; margin-top: 24px; }
    .seal-footer { margin-top: 32px; border-top: 1px dashed #94a3b8; padding-top: 12px; font-size: 11px; color: #64748b; }
  </style>
</head>
<body>
  <div class="header">
    <div class="inst-name">BPJS KETENAGAKERJAAN (BADAN PENYELENGGARA JAMINAN SOSIAL)</div>
    <div class="doc-title">LEMBAR PENGESAHAN LOGBOOK & REKOMENDASI KONVERSI SKS KAMPUS MERDEKA (MBKM)</div>
    <div style="font-size: 12px; color: #64748b;">Standar Permendikbudristek No. 53 Tahun 2023 tentang Penjaminan Mutu Pendidikan Tinggi</div>
  </div>

  <h3>I. Identitas Mahasiswa Magang</h3>
  <table>
    <tr><th width="30%">Nama Lengkap</th><td><strong>${intern.full_name}</strong></td></tr>
    <tr><th>NIM / Nomor Induk</th><td>${intern.unique_id}</td></tr>
    <tr><th>Program Magang</th><td>${intern.program_terdaftar || 'Operasional dan Akuisisi Kepesertaan BPU'}</td></tr>
    <tr><th>Gelombang / Periode</th><td>${intern.batch_name || 'Gelombang 1 2026'}</td></tr>
    <tr><th>Pembimbing Lapangan</th><td>${intern.coordinator_name || 'Tim Pembimbing Resmi BPJSTK'}</td></tr>
  </table>

  <h3 style="margin-top: 24px;">II. Rekapitulasi Jam Kerja & Konversi Beban Belajar (SKS)</h3>
  <table>
    <tr><th>Total Hari Kehadiran Efektif</th><td>${hadirDays} Hari Kerja</td></tr>
    <tr><th>Akumulasi Jam Aktivitas Lapangan</th><td><strong>${totalHours} Jam</strong> (Standar 8 Jam / Hari)</td></tr>
    <tr><th>Nilai Evaluasi Kumulatif</th><td><strong>${avgScore} / 100</strong> (Predikat: ${gradeLetter})</td></tr>
  </table>

  <div class="sks-box">
    <div style="font-size: 16px; font-weight: bold; color: #065f46;">
      Rekomendasi Bobot Konversi Akademik: ${recommendedSks} SKS
    </div>
    <div style="font-size: 12px; color: #047857; margin-top: 4px;">
      Berdasarkan pemenuhan ${totalHours} jam kerja praktik lapangan dan penguasaan kompetensi operasional jaminan sosial ketenagakerjaan.
    </div>
  </div>

  <h3 style="margin-top: 24px;">III. Matriks Capaian Pembelajaran Modul (CPL)</h3>
  <table>
    <thead>
      <tr><th>Capaian Kompetensi Modul</th><th>Nilai</th><th>Evaluasi Pembimbing</th></tr>
    </thead>
    <tbody>
      ${scores.length > 0 ? scores.map(s => `
        <tr>
          <td>${s.module_name || 'Kompetensi Jaminan Sosial'}</td>
          <td><strong>${s.score_value || 0}</strong></td>
          <td>${s.comments || 'Tuntas Sesuai Standar'}</td>
        </tr>
      `).join('') : `
        <tr>
          <td>Kompetensi Program Edukasi & Sosialisasi BPU BPJS Ketenagakerjaan</td>
          <td><strong>${avgScore}</strong></td>
          <td>Memenuhi Standar Kelulusan Magang</td>
        </tr>
      `}
    </tbody>
  </table>

  <div class="seal-footer">
    <div><strong>Nomor Registrasi MBKM:</strong> ${mbkmSerial}</div>
    <div><strong>Segel Integritas Kriptografis (SHA-256):</strong> ${mbkmSeal}</div>
    <div><strong>Diterbitkan Resmi:</strong> ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB</div>
  </div>
</body>
</html>
  `;

  return {
    success: true,
    mbkmSerial,
    mbkmSeal,
    intern,
    metrics: {
      hadirDays,
      totalHours,
      recommendedSks,
      avgScore,
      gradeLetter
    },
    htmlTemplate
  };
}
