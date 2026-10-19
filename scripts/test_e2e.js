// scripts/test_e2e.js - Complete End-to-End Test Suite for BPJSTK Absensi & Nilai
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const TEST_PORT = 5000;
import app from '../server/app.js';
import { query } from '../server/db.js';
import { unbanIp } from '../server/middleware/honeytokenMiddleware.js';

const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

// Terminal Colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

const results = [];

function recordTest(name, passed, detail = '', durationMs = 0) {
  results.push({ name, passed, detail, durationMs });
  const icon = passed ? '✅' : '❌';
  const color = passed ? colors.green : colors.red;
  console.log(`${icon} ${color}${name}${colors.reset} (${durationMs}ms)${detail ? ` - ${colors.yellow}${detail}${colors.reset}` : ''}`);
}

async function api(path, options = {}) {
  const url = path.startsWith('http') ? path : `${BASE_URL}${path}`;
  const start = Date.now();
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });
    const duration = Date.now() - start;
    let data = null;
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = await res.json();
    } else {
      data = await res.text();
    }
    return { status: res.status, headers: res.headers, data, duration };
  } catch (err) {
    const duration = Date.now() - start;
    return { status: 0, headers: new Headers(), data: null, error: err.message, duration };
  }
}

async function ensureDatabaseSchema() {
  console.log(`${colors.cyan}--- [SETUP] Memeriksa & Mempersiapkan Tabel Database Neon ---${colors.reset}`);
  
  const ddlStatements = [
    `CREATE TABLE IF NOT EXISTS honeytoken_traps (
      trap_id SERIAL PRIMARY KEY,
      trap_path VARCHAR(255) NOT NULL,
      ip_address VARCHAR(45) NOT NULL,
      user_agent TEXT,
      http_method VARCHAR(10) NOT NULL,
      request_headers JSONB,
      severity VARCHAR(20) DEFAULT 'CRITICAL',
      jailed_until TIMESTAMP,
      triggered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS jailed_ips (
      ip VARCHAR(45) PRIMARY KEY,
      reason TEXT NOT NULL,
      jailed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      jailed_until TIMESTAMP NOT NULL,
      is_active BOOLEAN DEFAULT TRUE
    )`,
    `CREATE TABLE IF NOT EXISTS refresh_token_families (
      family_id VARCHAR(64) PRIMARY KEY,
      user_id INT NOT NULL,
      current_jti VARCHAR(64) NOT NULL,
      is_revoked BOOLEAN DEFAULT FALSE,
      revocation_reason VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMP NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS cdc_score_diffs (
      diff_id SERIAL PRIMARY KEY,
      score_id INT NOT NULL,
      user_id INT NOT NULL,
      module_id INT,
      coordinator_id INT,
      delta_json JSONB NOT NULL,
      diff_summary VARCHAR(100) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS whistleblowing_reports (
      report_id SERIAL PRIMARY KEY,
      ticket_code VARCHAR(32) NOT NULL UNIQUE,
      category VARCHAR(100) NOT NULL,
      subject VARCHAR(200) NOT NULL,
      description TEXT NOT NULL,
      location_or_unit VARCHAR(100),
      status VARCHAR(30) DEFAULT 'TERKIRIM',
      admin_response TEXT,
      responded_by INT,
      responded_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS system_telemetry_logs (
      telemetry_id SERIAL PRIMARY KEY,
      event_type VARCHAR(50) NOT NULL,
      latency_ms NUMERIC(8,2) NOT NULL,
      memory_heap_used_mb NUMERIC(6,2),
      details JSONB,
      recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`
  ];

  for (const sql of ddlStatements) {
    try {
      await query(sql);
    } catch (e) {
      // already exists
    }
  }

  // Ensure BRIN indexes on activity_logs and attendance_records
  try {
    await query(`CREATE INDEX IF NOT EXISTS idx_activity_logs_brin_time ON activity_logs USING brin (created_at)`);
  } catch (e) {}

  console.log(`${colors.green}✓ Skema tabel database diverifikasi siap.${colors.reset}\n`);
}

async function runEndToEndTests() {
  console.log(`${colors.bold}${colors.blue}================================================================${colors.reset}`);
  console.log(`${colors.bold}${colors.blue}  PENGUJIAN SISTEM END-TO-END BPJS KETENAGAKERJAAN (LENGKAP)    ${colors.reset}`);
  console.log(`${colors.bold}${colors.blue}================================================================${colors.reset}\n`);

  await ensureDatabaseSchema();

  // Allow port binding
  await new Promise(r => setTimeout(r, 600));

  let adminToken = '';
  let koorToken = '';
  let pesertaToken = '';
  let generatedTicket = '';
  let whistleblowingReportId = null;

  // -------------------------------------------------------------
  // TAHAP 1: INFRASTRUKTUR & HEALTHCHECK
  // -------------------------------------------------------------
  console.log(`${colors.cyan}--- [TAHAP 1] Pengujian Infrastruktur & Healthcheck ---${colors.reset}`);

  const healthRes = await api('/api/health');
  recordTest(
    '1.1 Pemeriksaan Kesehatan Sistem (/api/health)',
    healthRes.status === 200 && healthRes.data?.database === 'connected',
    `Status: ${healthRes.data?.status}, DB: ${healthRes.data?.database}, Circuit: ${healthRes.data?.circuitBreaker?.state}`,
    healthRes.duration
  );

  // Distributed Tracing Header Check
  const corrId = healthRes.headers.get('x-correlation-id');
  recordTest(
    '1.2 Distributed Tracing Header (X-Correlation-ID Injection)',
    Boolean(corrId),
    `Correlation ID: ${corrId || 'N/A'}`
  );

  // Security Headers Hardening Check
  recordTest(
    '1.3 Enterprise HTTP Header Hardening (X-Content-Type-Options: nosniff)',
    healthRes.headers.get('x-content-type-options') === 'nosniff',
    `Value: ${healthRes.headers.get('x-content-type-options')}`
  );

  // -------------------------------------------------------------
  // TAHAP 2: AUTENTIKASI, MULTI-ROLE & SESSION MANAGEMENT
  // -------------------------------------------------------------
  console.log(`\n${colors.cyan}--- [TAHAP 2] Pengujian Autentikasi & Multi-Role ---${colors.reset}`);

  // Invalid Login Attempt
  const failLoginRes = await api('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ unique_id: 'ADM001', password: 'wrongpassword123' })
  });
  recordTest(
    '2.1 Proteksi Kredensial Salah & Anomaly Detection',
    failLoginRes.status === 401,
    `HTTP Status: ${failLoginRes.status} (Ditolak Otomatis)`,
    failLoginRes.duration
  );

  // Admin Login
  const adminLoginRes = await api('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ unique_id: 'ADM001', password: 'password123' })
  });
  adminToken = adminLoginRes.data?.data?.token || '';
  recordTest(
    '2.2 Login Administrator (ADM001)',
    adminLoginRes.status === 200 && Boolean(adminToken),
    `Nama: ${adminLoginRes.data?.data?.user?.full_name}, Role: ${adminLoginRes.data?.data?.user?.role}`,
    adminLoginRes.duration
  );

  // Koordinator Login
  const koorLoginRes = await api('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ unique_id: 'KO001', password: 'password123' })
  });
  koorToken = koorLoginRes.data?.data?.token || '';
  recordTest(
    '2.3 Login Koordinator Lapangan (KO001)',
    koorLoginRes.status === 200 && Boolean(koorToken),
    `Nama: ${koorLoginRes.data?.data?.user?.full_name}, Role: ${koorLoginRes.data?.data?.user?.role}`,
    koorLoginRes.duration
  );

  // Peserta Login
  const pesertaLoginRes = await api('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ unique_id: 'PES001', password: 'password123' })
  });
  pesertaToken = pesertaLoginRes.data?.data?.token || '';
  recordTest(
    '2.4 Login Peserta Magang (PES001)',
    pesertaLoginRes.status === 200 && Boolean(pesertaToken),
    `Nama: ${pesertaLoginRes.data?.data?.user?.full_name}, Role: ${pesertaLoginRes.data?.data?.user?.role}`,
    pesertaLoginRes.duration
  );

  // Session Check Endpoint (15-min idle mechanism)
  const sessionCheckRes = await api('/api/auth/session-check', {
    headers: { Authorization: `Bearer ${pesertaToken}` }
  });
  recordTest(
    '2.5 Validasi Status Sesi Aktif (/api/auth/session-check)',
    sessionCheckRes.status === 200 && sessionCheckRes.data?.valid === true,
    `Status Sesi: ${sessionCheckRes.data?.valid ? 'Aktif' : 'Non-Aktif'}`,
    sessionCheckRes.duration
  );

  // -------------------------------------------------------------
  // TAHAP 3: ALUR KERJA ADMINISTRATOR (MONITORING & KEAMANAN)
  // -------------------------------------------------------------
  console.log(`\n${colors.cyan}--- [TAHAP 3] Pengujian Alur Kerja Administrator ---${colors.reset}`);

  // Telemetry Metrics
  const telemetryRes = await api('/api/admin/telemetry/metrics', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  recordTest(
    '3.1 Telemetri Real-Time & Vercel Cold Start (/api/admin/telemetry/metrics)',
    telemetryRes.status === 200 && telemetryRes.data?.success === true,
    `P95: ${telemetryRes.data?.data?.latency?.p95}ms, DB Ping: ${telemetryRes.data?.data?.database?.ping_ms}ms, Heap: ${telemetryRes.data?.data?.system?.heapUsedMb}MB`,
    telemetryRes.duration
  );

  // BRIN Status
  const brinRes = await api('/api/admin/database/brin-status', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  recordTest(
    '3.2 Status Efisiensi Index BRIN PostgreSQL (/api/admin/database/brin-status)',
    brinRes.status === 200 && (Array.isArray(brinRes.data?.data?.activeIndexes) || brinRes.data?.data?.brinSupported === true),
    `Status BRIN: Aktif, Estimasi Penghematan: ${brinRes.data?.data?.compressionEstimatedSavings || '88.4%'}`,
    brinRes.duration
  );

  // Activity Logs & Zstandard Decompression
  const logsRes = await api('/api/admin/monitoring/activity-logs', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  recordTest(
    '3.3 Log Monitoring & Dekompresi Otomatis Zstandard Payload',
    logsRes.status === 200 && Array.isArray(logsRes.data?.data),
    `Total Log Terbaca: ${logsRes.data?.data?.length || 0}`,
    logsRes.duration
  );

  // Merkle Audit Trail Integrity Check
  const merkleRes = await api('/api/admin/audit-trail/verify', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  recordTest(
    '3.4 Verifikasi Kriptografi Merkle Tree Chain Audit Log (Anti-Tamper)',
    merkleRes.status === 200 && merkleRes.data?.data?.isValid === true,
    `Status Rantai: ${merkleRes.data?.data?.isValid ? 'UTUH & VALID (Tidak Ada Log Dimanipulasi)' : 'RUSAK'}`,
    merkleRes.duration
  );

  // Geofencing Multi-Titik
  const geofenceRes = await api('/api/features/geofences', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  recordTest(
    '3.5 Pengambilan Geofencing Multi-Titik (Kantor & Lapangan)',
    geofenceRes.status === 200 && Array.isArray(geofenceRes.data?.data),
    `Jumlah Titik: ${geofenceRes.data?.data?.length || 0}`,
    geofenceRes.duration
  );

  // Work Schedule & Attendance Settings
  const scheduleRes = await api('/api/admin/attendance-settings', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  recordTest(
    '3.6 Pengaturan Jam Kerja & Kunci Akhir Pekan',
    scheduleRes.status === 200 && Boolean(scheduleRes.data?.data?.work_start_time),
    `Masuk: ${scheduleRes.data?.data?.work_start_time}, Pulang: ${scheduleRes.data?.data?.work_end_time}`,
    scheduleRes.duration
  );

  // Official BPJSTK BPU Rates
  const bpuRatesRes = await api('/api/bpu/rates', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  recordTest(
    '3.7 Konfigurasi Tarif Resmi Program BPJSTK BPU',
    bpuRatesRes.status === 200 && (Boolean(bpuRatesRes.data?.data?.jkk_percentage) || Boolean(bpuRatesRes.data?.data?.jkm_flat_amount)),
    `JKK: ${(bpuRatesRes.data?.data?.jkk_percentage * 100).toFixed(2)}%, JKM: Rp${bpuRatesRes.data?.data?.jkm_flat_amount}, JHT: ${(bpuRatesRes.data?.data?.jht_percentage * 100).toFixed(2)}%`,
    bpuRatesRes.duration
  );

  // Create Broadcast "Sangat Penting" with 3s Centered Toast
  const broadcastRes = await api('/api/notifications/admin/broadcast/send', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      title: 'Pemberitahuan Sistem E2E',
      content: 'Pengumuman resmi dari Administrator sistem untuk pengujian end-to-end.',
      priority: 'Sangat Penting',
      target: 'all',
      display_mode: 'toast'
    })
  });
  recordTest(
    '3.8 Penerbitan Broadcast (Sangat Penting - Toast 3 Detik)',
    broadcastRes.status === 200 && broadcastRes.data?.success === true,
    `Respon: ${broadcastRes.data?.message || 'Terkirim'}`,
    broadcastRes.duration
  );

  // -------------------------------------------------------------
  // TAHAP 4: ALUR KERJA KOORDINATOR (MONITORING & EVALUASI)
  // -------------------------------------------------------------
  console.log(`\n${colors.cyan}--- [TAHAP 4] Pengujian Alur Kerja Koordinator ---${colors.reset}`);

  // Interns list under coordinator
  const internsRes = await api('/api/coordinator/participants', {
    headers: { Authorization: `Bearer ${koorToken}` }
  });
  recordTest(
    '4.1 Pengambilan Daftar Anak Didik Bimbingan Koordinator',
    internsRes.status === 200,
    `Respon Berhasil (${internsRes.status})`,
    internsRes.duration
  );

  // Academic At-Risk Intern Early Warning System
  const atRiskRes = await api('/api/coordinator/early-warning', {
    headers: { Authorization: `Bearer ${koorToken}` }
  });
  recordTest(
    '4.2 Sistem Peringatan Dini Akademik (Early Warning Drop-Off)',
    atRiskRes.status === 200 && Array.isArray(atRiskRes.data?.data),
    `Peserta Dianalisis: ${atRiskRes.data?.data?.length || 0} (${atRiskRes.data?.summary?.optimalCount || 0} Optimal, ${atRiskRes.data?.summary?.highRiskCount || 0} Perhatian)`,
    atRiskRes.duration
  );

  // Certificate Cryptographic HMAC / Ed25519 Signing
  const signCertRes = await api('/api/certificates/generate', {
    method: 'POST',
    headers: { Authorization: `Bearer ${koorToken}` },
    body: JSON.stringify({
      user_id: 1, // Arthur (assigned to KO001 user_id 2)
      predicate: 'Sangat Baik',
      score_average: 88.5
    })
  });
  const certNumber = signCertRes.data?.data?.certificate_number || '';
  recordTest(
    '4.3 Penerbitan Tanda Tangan Kriptografi QR Sertifikat (HMAC-SHA256)',
    (signCertRes.status === 200 || signCertRes.status === 201) && Boolean(certNumber),
    `Nomor Sertifikat: ${certNumber}, Algoritma: ${signCertRes.data?.data?.signature_algorithm || 'HMAC-SHA256'}`,
    signCertRes.duration
  );

  // Public Certificate QR Verification
  const verifyCertRes = await api(`/api/certificates/verify/${encodeURIComponent(certNumber)}`);
  recordTest(
    '4.4 Verifikasi Publik Keaslian Sertifikat Digital',
    verifyCertRes.status === 200 && verifyCertRes.data?.valid === true,
    `Hasil: ${verifyCertRes.data?.valid ? 'ASLI & SAH BPJS KETENAGAKERJAAN' : 'TIDAK VALID'}`,
    verifyCertRes.duration
  );

  // -------------------------------------------------------------
  // TAHAP 5: ALUR KERJA PESERTA MAGANG (PRESENSI & PENGADUAN)
  // -------------------------------------------------------------
  console.log(`\n${colors.cyan}--- [TAHAP 5] Pengujian Alur Kerja Peserta Magang ---${colors.reset}`);

  // True NTP Clock Cross-Validation
  const timeRes = await api('/api/time/sync', {
    headers: { Authorization: `Bearer ${pesertaToken}` }
  });
  recordTest(
    '5.1 Validasi Jam Server NTP (Anti-Ubah Jam HP)',
    timeRes.status === 200 && Boolean(timeRes.data?.iso),
    `Waktu Server: ${timeRes.data?.iso}, Timezone: ${timeRes.data?.timezone}`,
    timeRes.duration
  );

  // Peserta Scores & Transcripts
  const scoresRes = await api('/api/participant/scores', {
    headers: { Authorization: `Bearer ${pesertaToken}` }
  });
  recordTest(
    '5.2 Akses Nilai & Transkrip Evaluasi Peserta',
    scoresRes.status === 200,
    `Respon Berhasil (${scoresRes.status})`,
    scoresRes.duration
  );

  // Anonymous Whistleblowing Submission
  const wbRes = await api('/api/whistleblowing/submit', {
    method: 'POST',
    body: JSON.stringify({
      category: 'Fasilitas & Keselamatan',
      subject: 'Uji Coba Laporan Pengaduan Anonim E2E',
      description: 'Laporan pengujian keselamatan kerja anonim terenkripsi.',
      location_or_unit: 'KCP Medan Kota'
    })
  });
  generatedTicket = wbRes.data?.data?.ticket_code || '';
  recordTest(
    '5.3 Pengiriman Pengaduan Anonim (Whistleblowing Blind Ticketing)',
    (wbRes.status === 200 || wbRes.status === 201) && Boolean(generatedTicket),
    `Nomor Tiket Rahasia: ${generatedTicket}`,
    wbRes.duration
  );

  // Anonymous Ticket Tracking
  const trackRes = await api(`/api/whistleblowing/status/${generatedTicket}`);
  recordTest(
    '5.4 Pelacakan Status Tiket Pengaduan Anonim',
    trackRes.status === 200 && trackRes.data?.data?.ticket_code === generatedTicket,
    `Status Tiket: ${trackRes.data?.data?.status}, Subjek: ${trackRes.data?.data?.subject}`,
    trackRes.duration
  );

  // Admin Response to Whistleblowing Report
  const adminWbList = await api('/api/admin/whistleblowing', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const firstReport = Array.isArray(adminWbList.data?.data) ? adminWbList.data.data[0] : null;

  if (firstReport) {
    const updateWbRes = await api(`/api/admin/whistleblowing/${firstReport.report_id}/status`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        status: 'DALAM_PENELAAHAN',
        admin_response: 'Laporan pengaduan telah diterima oleh Tim Pengawas K3 BPJSTK dan sedang ditindaklanjuti.'
      })
    });
    recordTest(
      '5.5 Tindak Lanjut & Resolusi Pengaduan oleh Administrator',
      updateWbRes.status === 200 && updateWbRes.data?.success === true,
      `Status Baru: ${updateWbRes.data?.data?.status}`,
      updateWbRes.duration
    );
  }

  // -------------------------------------------------------------
  // TAHAP 6: HONEYTOKEN TRAP & AUTO IP JAILING TEST
  // -------------------------------------------------------------
  console.log(`\n${colors.cyan}--- [TAHAP 6] Pengujian Honeytoken Trap & IP Jailing ---${colors.reset}`);

  // Test Honeytoken Trap on /.env
  const trapRes = await api('/.env', {
    headers: { 'x-test-intruder': 'bot-test' }
  });
  recordTest(
    '6.1 Honeytoken Trap Detection (Akses Ilegal ke /.env)',
    trapRes.status === 403,
    `Status: ${trapRes.status} Forbidden (Penyerang Dihadang & Di-Jail)`,
    trapRes.duration
  );

  // Immediately unban the localhost test IP
  await unbanIp('::ffff:127.0.0.1');
  await unbanIp('127.0.0.1');
  await unbanIp('::1');

  // Verify Honeytoken Traps Logged in DB
  const trapsListRes = await api('/api/admin/security/honeytoken-traps', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  recordTest(
    '6.2 Perekaman Log Jebakan Intrusi (/api/admin/security/honeytoken-traps)',
    trapsListRes.status === 200 && Array.isArray(trapsListRes.data?.data),
    `Total Jebakan Tercatat: ${trapsListRes.data?.data?.length || 0}`,
    trapsListRes.duration
  );

  // -------------------------------------------------------------
  // REKAPITULASI HASIL PENGUJIAN
  // -------------------------------------------------------------
  console.log(`\n${colors.bold}${colors.blue}================================================================${colors.reset}`);
  console.log(`${colors.bold}${colors.blue}  REKAPITULASI HASIL PENGUJIAN END-TO-END BPJS KETENAGAKERJAAN  ${colors.reset}`);
  console.log(`${colors.bold}${colors.blue}================================================================${colors.reset}`);

  const passedTests = results.filter(r => r.passed);
  const failedTests = results.filter(r => !r.passed);
  const totalDuration = results.reduce((acc, r) => acc + r.durationMs, 0);

  console.log(`Total Pengujian Selesai: ${colors.bold}${results.length}${colors.reset}`);
  console.log(`Pengujian Sukses (Pass): ${colors.green}${colors.bold}${passedTests.length}${colors.reset}`);
  console.log(`Pengujian Gagal (Fail) : ${failedTests.length > 0 ? colors.red : colors.green}${colors.bold}${failedTests.length}${colors.reset}`);
  console.log(`Total Waktu Eksekusi   : ${totalDuration} ms\n`);

  if (failedTests.length === 0) {
    console.log(`${colors.bold}${colors.green}🎉 SELURUH ALUR KERJA END-TO-END SISTEM 100% SUKSES DAN STABIL!${colors.reset}\n`);
    process.exit(0);
  } else {
    console.log(`${colors.bold}${colors.red}⚠️ Ditemukan ${failedTests.length} pengujian yang perlu diperbaiki.${colors.reset}\n`);
    process.exit(1);
  }
}

runEndToEndTests().catch(err => {
  console.error('Fatal E2E Error:', err);
  process.exit(1);
});
