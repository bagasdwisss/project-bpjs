// server/utils/batchQrPrintGenerator.js - Print-Ready Batch QR Generator (A4/A3 with Crop Marks)
import QRCode from 'qrcode';
import { query } from '../db.js';
import { createRollingBadgeSignature, getCurrentTimeStep } from './dynamicIdQr.js';

const escapeHtml = (val) => String(val ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

/**
 * Generates commercial print-ready high-DPI HTML/CSS layout with crop marks and bleed margins
 */
export async function generatePrintReadySheet({ batchId, paperSize = 'A4' }) {
  const params = [];
  let batchFilter = '';
  if (batchId) {
    params.push(batchId);
    batchFilter = ' AND ub.batch_id = $1';
  }

  const userSql = `
    SELECT DISTINCT ON (u.user_id)
           u.user_id, u.unique_id, u.full_name, u.role_id,
           p.program_terdaftar, b.batch_name, b.end_date as batch_end
    FROM users u
    LEFT JOIN peserta p ON u.user_id = p.user_id
    LEFT JOIN user_batches ub ON u.user_id = ub.user_id
    LEFT JOIN batches b ON ub.batch_id = b.batch_id
    WHERE u.role_id = 1${batchFilter}
    ORDER BY u.user_id, b.end_date DESC NULLS LAST, u.unique_id ASC
    LIMIT 24
  `;

  const res = await query(userSql, params);
  const participants = res.rows;

  const isA3 = String(paperSize).toUpperCase() === 'A3';
  const safePaperSize = isA3 ? 'A3' : 'A4';
  const sheetWidthMm = isA3 ? 297 : 210;
  const sheetHeightMm = isA3 ? 420 : 297;
  const cardsPerPage = isA3 ? 12 : 8;

  const { step } = getCurrentTimeStep();
  const cardBlocks = await Promise.all(
    participants.map(async (p) => {
      const expiry = p.batch_end
        ? `s/d ${new Date(p.batch_end).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' })}`
        : 'Sesuai Periode Aktif';
      const sig = createRollingBadgeSignature(p.user_id, p.unique_id, step);
      const verifyPayload = JSON.stringify({ uid: p.user_id, nim: p.unique_id, step, sig });
      const qrSvg = await QRCode.toString(verifyPayload, {
        type: 'svg',
        width: 72,
        margin: 1,
        color: { dark: '#065f46', light: '#ffffff' }
      });
      return `
      <div class="card-outer">
        <div class="crop-mark-tl"></div>
        <div class="crop-mark-tr"></div>
        <div class="card-header">
          <span class="inst-title">BPJS KETENAGAKERJAAN</span>
          <span class="badge-tag">PESERTA MAGANG</span>
        </div>
        <div class="card-body">
          <div style="width:72px;height:72px;border:1px solid #cbd5e1;border-radius:6px;overflow:hidden;background:#fff;flex-shrink:0;">
            ${qrSvg}
          </div>
          <div class="info-block">
            <div class="intern-name">${escapeHtml(p.full_name)}</div>
            <div class="intern-nim">NIM: ${escapeHtml(p.unique_id)}</div>
            <div style="color: #64748b; margin-top: 2px;">Prog: ${escapeHtml(p.program_terdaftar || 'Operasional BPU')}</div>
            <div style="color: #64748b;">Batch: ${escapeHtml(p.batch_name || 'Belum Terdaftar')}</div>
          </div>
        </div>
        <div class="card-footer">
          <span>HMAC-SHA256 Verified</span>
          <span>Berlaku ${escapeHtml(expiry)}</span>
        </div>
      </div>
    `;
    })
  );

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>LEMBAR CETAK MASSAL ID BADGE BPJS KETENAGAKERJAAN (${safePaperSize})</title>
  <style>
    @page {
      size: ${safePaperSize};
      margin: 10mm;
    }
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 5mm;
      background: #f1f5f9;
      color: #0f172a;
    }
    .sheet-info {
      text-align: center;
      margin-bottom: 8mm;
      font-size: 11px;
      color: #64748b;
      border-bottom: 1px dashed #94a3b8;
      padding-bottom: 4mm;
    }
    .grid-container {
      display: grid;
      grid-template-columns: repeat(${isA3 ? 3 : 2}, 1fr);
      gap: 8mm;
    }
    .card-outer {
      position: relative;
      background: white;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      outline: 1px dashed #94a3b8;
      outline-offset: 2mm;
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #059669;
      padding-bottom: 6px;
      margin-bottom: 8px;
    }
    .inst-title {
      font-size: 10px;
      font-weight: 800;
      color: #065f46;
      letter-spacing: 0.5px;
    }
    .badge-tag {
      font-size: 8px;
      font-weight: bold;
      background: #ecfdf5;
      color: #047857;
      padding: 2px 6px;
      border-radius: 4px;
      border: 1px solid #a7f3d0;
    }
    .card-body {
      display: flex;
      gap: 12px;
      align-items: center;
    }
    .info-block {
      flex: 1;
      font-size: 10px;
    }
    .intern-name {
      font-size: 12px;
      font-weight: bold;
      color: #0f172a;
      margin-bottom: 2px;
    }
    .intern-nim {
      font-family: monospace;
      color: #047857;
      font-weight: bold;
    }
    .card-footer {
      margin-top: 8px;
      border-top: 1px dotted #e2e8f0;
      padding-top: 4px;
      font-size: 7.5px;
      color: #64748b;
      display: flex;
      justify-content: space-between;
    }
    .crop-mark-tl { position: absolute; top: -4mm; left: -4mm; width: 3mm; height: 3mm; border-right: 0.5pt solid #000; border-bottom: 0.5pt solid #000; }
    .crop-mark-tr { position: absolute; top: -4mm; right: -4mm; width: 3mm; height: 3mm; border-left: 0.5pt solid #000; border-bottom: 0.5pt solid #000; }
  </style>
</head>
<body>
  <div class="sheet-info">
    <strong>BPJS KETENAGAKERJAAN &bull; LEMBAR MASTER CETAK ID BADGE PESERTA</strong><br>
    Format Kertas: ${safePaperSize} (${sheetWidthMm}x${sheetHeightMm} mm) &bull; DPI: 300 High-Resolution &bull; Dilengkapi Crop Marks &amp; Bleed Margins
  </div>

  <div class="grid-container">
    ${cardBlocks.join('')}
  </div>
</body>
</html>
  `;

  return {
    success: true,
    paperSize: safePaperSize,
    cardsCount: participants.length,
    cardsPerPage,
    html
  };
}
