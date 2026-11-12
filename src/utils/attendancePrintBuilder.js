// src/utils/attendancePrintBuilder.js
// Membangun dokumen HTML A4 resmi (Kop Surat, Rekap Per Anak Didik, Log Harian, TTD)
// dan mencetak via hidden iframe srcdoc terisolasi tanpa mencapture UI dashboard web.

const MONTH_NAMES_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeSignatureSrc(src) {
  if (typeof src !== 'string') return '';
  return /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/i.test(src.trim()) ? src.trim() : '';
}

function formatDatePrintId(dateStr) {
  if (!dateStr) return '-';
  const raw = String(dateStr).slice(0, 10);
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const dt = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0));
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    return `${days[dt.getUTCDay()]}, ${match[3]} ${MONTH_NAMES_ID[Number(match[2]) - 1]} ${match[1]}`;
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleDateString('id-ID', {
    timeZone: 'Asia/Jakarta',
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
}

function statusPillClass(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'hadir') return 'st-hadir';
  if (s === 'terlambat') return 'st-terlambat';
  if (s === 'izin') return 'st-izin';
  if (s === 'sakit') return 'st-sakit';
  if (s === 'alfa' || s === 'alpa') return 'st-alfa';
  return 'st-other';
}

function statusDisplayLabel(status) {
  if (!status) return '-';
  const s = String(status).toLowerCase();
  if (s === 'alfa' || s === 'alpa') return 'Alfa';
  return status;
}

export function buildAttendancePrintHtml({
  institution = {},
  coordinator = {},
  month,
  year,
  records = [],
  mentees = [],
  stats = {},
  filterDescription = 'Semua Anak Didik & Semua Status'
}) {
  const periodLabel = `${MONTH_NAMES_ID[(Number(month) || 1) - 1] || month} ${year}`;
  const printedAtWib = new Date().toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }) + ' WIB';

  const branchName = institution.branch_name || 'BPJS Ketenagakerjaan Kantor Cabang Jakarta Gambir';
  const branchAddress = institution.branch_address || 'Jl. Kebon Sirih No. 40, Jakarta Pusat 10110';
  const branchPhone = institution.branch_phone || '(021) 3456789';
  const branchHeadName = institution.branch_head_name || 'Kepala Kantor Cabang';
  const branchHeadNpp = institution.branch_head_npp || '-';
  const coordName = coordinator?.full_name || institution.mentor_name || 'Koordinator Pembimbing';
  const coordNpp = coordinator?.unique_id || institution.mentor_npp || '-';

  const branchSigSrc = safeSignatureSrc(institution.branch_head_signature);
  const mentorSigSrc = safeSignatureSrc(institution.mentor_signature);

  // Build per-mentee recapitulation map from filtered records + mentees list
  const perMenteeMap = new Map();
  for (const m of mentees) {
    perMenteeMap.set(String(m.user_id), {
      user_id: m.user_id,
      unique_id: m.unique_id || '-',
      full_name: m.full_name || '-',
      penempatan: m.penempatan || '-',
      hadir: 0,
      terlambat: 0,
      izin: 0,
      sakit: 0,
      alfa: 0,
      total: 0
    });
  }

  for (const r of records) {
    const key = String(r.user_id);
    if (!perMenteeMap.has(key)) {
      perMenteeMap.set(key, {
        user_id: r.user_id,
        unique_id: r.unique_id || '-',
        full_name: r.full_name || '-',
        penempatan: r.penempatan || '-',
        hadir: 0,
        terlambat: 0,
        izin: 0,
        sakit: 0,
        alfa: 0,
        total: 0
      });
    }
    const row = perMenteeMap.get(key);
    row.total += 1;
    const st = String(r.status || '').toLowerCase();
    if (st === 'hadir') row.hadir += 1;
    else if (st === 'terlambat') row.terlambat += 1;
    else if (st === 'izin') row.izin += 1;
    else if (st === 'sakit') row.sakit += 1;
    else if (st === 'alfa' || st === 'alpa') row.alfa += 1;
  }

  // When a specific filter leaves only subset of mentees in records, prioritize active/matching rows
  const menteeSummaryRows = Array.from(perMenteeMap.values()).filter(
    (m) => records.length === 0 || m.total > 0 || filterDescription === 'Semua Anak Didik & Semua Status'
  );

  const summaryTableRowsHtml = menteeSummaryRows.length > 0
    ? menteeSummaryRows.map((m, idx) => {
        const pct = m.total > 0 ? Math.round(((m.hadir + m.terlambat) / m.total) * 100) : 0;
        return `
          <tr>
            <td class="c">${idx + 1}</td>
            <td class="mono">${escapeHtml(m.unique_id)}</td>
            <td class="bold">${escapeHtml(m.full_name)}</td>
            <td>${escapeHtml(m.penempatan || '-')}</td>
            <td class="c bold">${m.hadir}</td>
            <td class="c">${m.terlambat}</td>
            <td class="c">${m.izin}</td>
            <td class="c">${m.sakit}</td>
            <td class="c bold">${m.alfa}</td>
            <td class="c bold">${pct}%</td>
          </tr>
        `;
      }).join('')
    : `<tr><td colspan="10" class="empty">Tidak ada data anak didik pada periode/filter ini.</td></tr>`;

  const sortedRecords = [...records].sort((a, b) =>
    String(a.attendance_date || '').localeCompare(String(b.attendance_date || '')) ||
    String(a.full_name || '').localeCompare(String(b.full_name || ''))
  );

  const detailTableRowsHtml = sortedRecords.length > 0
    ? sortedRecords.map((r, idx) => `
        <tr>
          <td class="c">${idx + 1}</td>
          <td class="nowrap">${escapeHtml(formatDatePrintId(r.attendance_date))}</td>
          <td>
            <div class="bold">${escapeHtml(r.full_name || '-')}</div>
            <div class="sub">${escapeHtml(r.unique_id || '-')}${r.penempatan ? ' • ' + escapeHtml(r.penempatan) : ''}</div>
          </td>
          <td class="c mono nowrap">${escapeHtml(r.check_in_time || '-')}</td>
          <td class="c"><span class="badge ${statusPillClass(r.status)}">${escapeHtml(statusDisplayLabel(r.status))}</span></td>
          <td>
            <div>${escapeHtml(r.notes || '-')}</div>
            ${r.location_address ? `<div class="sub">Lokasi: ${escapeHtml(r.location_address)}</div>` : ''}
          </td>
        </tr>
      `).join('')
    : `<tr><td colspan="6" class="empty">Belum ada catatan presensi harian yang cocok dengan filter.</td></tr>`;

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <title>Rekap Presensi Anak Didik - ${escapeHtml(periodLabel)}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 14mm 15mm 16mm 15mm;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Segoe UI", Arial, Helvetica, sans-serif;
      color: #111827;
      font-size: 10.5pt;
      line-height: 1.4;
      background: #ffffff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .kop {
      border-bottom: 3px double #111827;
      padding-bottom: 10px;
      margin-bottom: 14px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: 12px;
    }
    .kop-brand {
      font-size: 9pt;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #007A43;
      margin-bottom: 2px;
    }
    .kop-title {
      font-size: 13.5pt;
      font-weight: 800;
      margin: 0;
      color: #111827;
    }
    .kop-meta {
      font-size: 8.8pt;
      color: #374151;
      margin: 3px 0 0 0;
    }
    .kop-doc-tag {
      font-size: 8pt;
      font-weight: 700;
      text-transform: uppercase;
      border: 1px solid #111827;
      padding: 4px 8px;
      border-radius: 4px;
      white-space: nowrap;
      color: #111827;
    }
    .doc-heading {
      text-align: center;
      margin-bottom: 14px;
    }
    .doc-heading h2 {
      margin: 0;
      font-size: 12.5pt;
      font-weight: 800;
      letter-spacing: 0.03em;
      text-transform: uppercase;
    }
    .doc-heading p {
      margin: 2px 0 0 0;
      font-size: 9.5pt;
      color: #374151;
    }
    .meta-grid {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
      font-size: 9.2pt;
    }
    .meta-grid td {
      padding: 3px 6px;
      vertical-align: top;
    }
    .meta-label {
      width: 170px;
      font-weight: 700;
      color: #374151;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 6px;
      margin-bottom: 16px;
    }
    .kpi-card {
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 6px 4px;
      text-align: center;
      background: #f8fafc;
    }
    .kpi-val {
      font-size: 13pt;
      font-weight: 800;
      color: #0f172a;
      line-height: 1.2;
    }
    .kpi-lbl {
      font-size: 7.5pt;
      font-weight: 700;
      text-transform: uppercase;
      color: #475569;
      margin-top: 2px;
    }
    .section-title {
      font-size: 10pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin: 14px 0 6px 0;
      padding-left: 8px;
      border-left: 3.5px solid #007A43;
      color: #0f172a;
    }
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 8.6pt;
      margin-bottom: 14px;
    }
    table.data-table thead {
      display: table-header-group;
    }
    table.data-table tr {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    table.data-table th {
      background: #f1f5f9;
      color: #0f172a;
      font-weight: 800;
      text-transform: uppercase;
      font-size: 7.8pt;
      letter-spacing: 0.03em;
      border: 1px solid #94a3b8;
      padding: 6px 6px;
      text-align: left;
    }
    table.data-table th.c, table.data-table td.c {
      text-align: center;
    }
    table.data-table td {
      border: 1px solid #cbd5e1;
      padding: 5px 6px;
      vertical-align: top;
      word-break: break-word;
    }
    table.data-table tbody tr:nth-child(even) {
      background: #fafafa;
    }
    .bold { font-weight: 700; }
    .mono { font-family: Consolas, "Courier New", monospace; }
    .nowrap { white-space: nowrap; }
    .sub { font-size: 7.8pt; color: #475569; margin-top: 1px; }
    .empty { text-align: center; padding: 14px; color: #64748b; font-style: italic; }
    .badge {
      display: inline-block;
      padding: 1.5px 6px;
      border-radius: 999px;
      font-size: 7.6pt;
      font-weight: 800;
      border: 1px solid #cbd5e1;
      white-space: nowrap;
    }
    .st-hadir { background: #dcfce7; color: #166534; border-color: #86efac; }
    .st-terlambat { background: #fef3c7; color: #92400e; border-color: #fcd34d; }
    .st-izin { background: #e0f2fe; color: #075985; border-color: #7dd3fc; }
    .st-sakit { background: #f3e8ff; color: #6b21a8; border-color: #d8b4fe; }
    .st-alfa { background: #ffe4e6; color: #9f1239; border-color: #fda4af; }
    .st-other { background: #f1f5f9; color: #334155; }
    .ttd-wrap {
      margin-top: 22px;
      display: flex;
      justify-content: space-between;
      gap: 32px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .ttd-box {
      width: 45%;
      text-align: center;
      font-size: 9.2pt;
    }
    .ttd-role {
      font-weight: 700;
      color: #1e293b;
      min-height: 30px;
    }
    .ttd-img-slot {
      height: 62px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 4px 0;
    }
    .ttd-img-slot img {
      max-height: 58px;
      max-width: 180px;
      object-fit: contain;
    }
    .ttd-name {
      font-weight: 800;
      text-decoration: underline;
      color: #0f172a;
    }
    .ttd-npp {
      font-size: 8.5pt;
      color: #475569;
    }
    .doc-footer {
      margin-top: 16px;
      padding-top: 6px;
      border-top: 1px solid #e2e8f0;
      font-size: 7.8pt;
      color: #64748b;
      display: flex;
      justify-content: space-between;
    }
  </style>
</head>
<body>
  <header class="kop">
    <div>
      <div class="kop-brand">BPJS Ketenagakerjaan • Program Pemagangan</div>
      <h1 class="kop-title">${escapeHtml(branchName)}</h1>
      <p class="kop-meta">${escapeHtml(branchAddress)} | Telp. ${escapeHtml(branchPhone)}</p>
    </div>
    <div class="kop-doc-tag">Arsip Resmi Presensi</div>
  </header>

  <section class="doc-heading">
    <h2>Laporan Rekapitulasi Presensi Anak Didik Magang</h2>
    <p>Periode Bulan ${escapeHtml(periodLabel)}</p>
  </section>

  <table class="meta-grid">
    <tr>
      <td class="meta-label">Koordinator / Pembimbing</td>
      <td>: ${escapeHtml(coordName)} (${escapeHtml(coordNpp)})</td>
      <td class="meta-label">Total Anak Didik</td>
      <td>: ${mentees.length} Peserta</td>
    </tr>
    <tr>
      <td class="meta-label">Cakupan Filter Laporan</td>
      <td>: ${escapeHtml(filterDescription)}</td>
      <td class="meta-label">Dicetak Pada</td>
      <td>: ${escapeHtml(printedAtWib)}</td>
    </tr>
  </table>

  <div class="kpi-grid">
    <div class="kpi-card"><div class="kpi-val">${stats.total ?? records.length}</div><div class="kpi-lbl">Total Log</div></div>
    <div class="kpi-card"><div class="kpi-val">${stats.hadir ?? 0}</div><div class="kpi-lbl">Hadir</div></div>
    <div class="kpi-card"><div class="kpi-val">${stats.terlambat ?? 0}</div><div class="kpi-lbl">Terlambat</div></div>
    <div class="kpi-card"><div class="kpi-val">${stats.izin ?? 0}</div><div class="kpi-lbl">Izin</div></div>
    <div class="kpi-card"><div class="kpi-val">${stats.sakit ?? 0}</div><div class="kpi-lbl">Sakit</div></div>
    <div class="kpi-card"><div class="kpi-val">${stats.alpa ?? 0}</div><div class="kpi-lbl">Alfa</div></div>
    <div class="kpi-card"><div class="kpi-val">${stats.rate ?? 0}%</div><div class="kpi-lbl">Kehadiran</div></div>
  </div>

  <div class="section-title">I. Rekapitulasi Kehadiran Per Anak Didik</div>
  <table class="data-table">
    <thead>
      <tr>
        <th class="c" style="width:28px;">No</th>
        <th style="width:74px;">ID Peserta</th>
        <th>Nama Lengkap Anak Didik</th>
        <th>Penempatan</th>
        <th class="c" style="width:42px;">Hadir</th>
        <th class="c" style="width:44px;">Telat</th>
        <th class="c" style="width:38px;">Izin</th>
        <th class="c" style="width:40px;">Sakit</th>
        <th class="c" style="width:38px;">Alfa</th>
        <th class="c" style="width:52px;">% Hadir</th>
      </tr>
    </thead>
    <tbody>
      ${summaryTableRowsHtml}
    </tbody>
  </table>

  <div class="section-title">II. Rincian Log Presensi Harian (${sortedRecords.length} Catatan)</div>
  <table class="data-table">
    <thead>
      <tr>
        <th class="c" style="width:28px;">No</th>
        <th style="width:132px;">Hari &amp; Tanggal</th>
        <th style="width:155px;">Nama &amp; ID Peserta</th>
        <th class="c" style="width:62px;">Jam</th>
        <th class="c" style="width:70px;">Status</th>
        <th>Catatan &amp; Lokasi Presensi</th>
      </tr>
    </thead>
    <tbody>
      ${detailTableRowsHtml}
    </tbody>
  </table>

  <section class="ttd-wrap">
    <div class="ttd-box">
      <div class="ttd-role">Mengetahui,<br />Kepala Kantor Cabang</div>
      <div class="ttd-img-slot">
        ${branchSigSrc ? `<img src="${branchSigSrc}" alt="Tanda Tangan Kepala Cabang" />` : ''}
      </div>
      <div class="ttd-name">${escapeHtml(branchHeadName)}</div>
      <div class="ttd-npp">NPP. ${escapeHtml(branchHeadNpp)}</div>
    </div>
    <div class="ttd-box">
      <div class="ttd-role">Koordinator / Pembimbing Lapangan<br />&nbsp;</div>
      <div class="ttd-img-slot">
        ${mentorSigSrc ? `<img src="${mentorSigSrc}" alt="Tanda Tangan Koordinator" />` : ''}
      </div>
      <div class="ttd-name">${escapeHtml(coordName)}</div>
      <div class="ttd-npp">ID / NPP. ${escapeHtml(coordNpp)}</div>
    </div>
  </section>

  <footer class="doc-footer">
    <span>Dokumen dihasilkan otomatis dari Sistem Monitoring Pemagangan BPJS Ketenagakerjaan</span>
    <span>Waktu Cetak: ${escapeHtml(printedAtWib)}</span>
  </footer>
</body>
</html>`;
}

/**
 * Triggers isolated document printing via hidden srcdoc iframe (no window.print() UI screenshot).
 */
export function triggerIframeDocumentPrint(htmlString) {
  return new Promise((resolve) => {
    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';

    let cleanedUp = false;
    const cleanup = () => {
      if (cleanedUp) return;
      cleanedUp = true;
      setTimeout(() => {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
        resolve();
      }, 400);
    };

    iframe.onload = () => {
      try {
        const win = iframe.contentWindow;
        if (win) {
          win.addEventListener('afterprint', cleanup, { once: true });
          win.focus();
          win.print();
          // Fallback cleanup for browsers without reliable afterprint on hidden iframes
          setTimeout(cleanup, 60000);
        } else {
          cleanup();
        }
      } catch {
        cleanup();
      }
    };

    iframe.srcdoc = htmlString;
    document.body.appendChild(iframe);
  });
}
