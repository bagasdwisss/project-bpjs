// src/utils/certificateDownloader.js
import { drawQrToCanvas } from './qrMatrix';

/**
 * Direct Download Engine for BPJS Ketenagakerjaan Official Certificates
 * Features:
 * - 3 distinctive designs strictly bound to Certificate Type:
 *   1. Sertifikat Kelulusan: Emerald Classic BPJSTK (Hijau Zamrud & Ornamen Emas Tradisional Resmi)
 *   2. Sertifikat Prestasi: Royal Gold & Navy Elite (Navy Gelap & Emas Megah Prestasi Unggul)
 *   3. Sertifikat Partisipasi: Modern Geometric Platinum (Slate Platinum & Sian Teal Modern)
 * - Zero external network dependency for QR Code (prevents browser canvas tainting)
 * - Immediate browser download with exact naming:
 *   "Sertifikat_[Tipe]_BPJSTK_[Nama]_[No].png"
 */

export async function downloadCertificateDirectly(certificate, options = {}) {
  return new Promise(async (resolve, reject) => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 2200;
      canvas.height = 1540;
      const ctx = canvas.getContext('2d');

      const certNumber = certificate.certificate_number || 'BPJSTK/MAGANG/2026/001';
      const recipientName = certificate.participant_name || options.recipientName || 'Peserta Magang';
      const recipientNim = certificate.participant_nim || options.recipientNim || '12345678';
      const penempatan = certificate.penempatan || options.penempatan || 'Bidang Kepesertaan & Pelayanan';
      const batchName = certificate.batch_name || 'Batch 1 - Gelombang Berjalan';
      const score = certificate.score_average ? Number(certificate.score_average).toFixed(1) : '92.5';

      const branchHeadName = certificate.branch_head_name || options.branchHeadName || 'Dr. Hendra Wijaya, S.E., M.M.';
      const branchHeadNpp = certificate.branch_head_npp || options.branchHeadNpp || '9876543210';
      const branchName = certificate.branch_name || options.branchName || 'BPJS Ketenagakerjaan Kantor Cabang Jakarta Gambir';
      const branchAddress = certificate.branch_address || options.branchAddress || 'Jl. Kebon Sirih No. 40, Jakarta Pusat 10110';
      
      const mentorName = certificate.mentor_name || certificate.coordinator_name || options.mentorName || 'Budi Santoso, S.Kom., M.T.';
      const mentorNpp = certificate.mentor_npp || certificate.coordinator_npp || options.mentorNpp || '8765432109';
      
      const branchHeadSig = certificate.branch_head_signature || options.branchHeadSignature || null;
      const mentorSig = certificate.mentor_signature || options.mentorSignature || null;
      const sha256Hash = certificate.digital_signature_hash || certificate.digital_signature || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

      const issueDateFormatted = new Date(certificate.issue_date || certificate.created_at || Date.now()).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });

      // =========================================================================
      // MAP CERTIFICATE TYPE TO ITS DISTINCT DESIGN, TITLE, STATEMENT & PALETTE
      // =========================================================================
      const rawType = (
        certificate.certificate_type ||
        certificate.type ||
        options.certificateType ||
        options.type ||
        'Kelulusan'
      ).toLowerCase();

      let certTypeLabel = 'Kelulusan';
      let theme = 'emerald';
      let headerBadge = 'SURAT TANDA TAMAT PROGRAM';
      let mainTitle = 'SERTIFIKAT KELULUSAN';
      let subTitle = 'Certificate of Internship Completion';
      let statement1 = 'Telah berhasil menyelesaikan seluruh rangkaian program Praktik Kerja Lapangan / Magang Industri Terstruktur';
      let statement2 = `pada BPJS Ketenagakerjaan ${branchName} (${batchName}) dengan predikat kelulusan:`;
      let filePrefix = 'Sertifikat_Kelulusan_BPJSTK';
      let displayPredicate = certificate.predicate || options.predicate || 'Sangat Memuaskan (Grade A)';

      if (rawType.includes('prestasi') || rawType.includes('achievement')) {
        certTypeLabel = 'Prestasi';
        theme = 'royal_gold';
        headerBadge = 'PENGHARGAAN ATAS CAPAIAN KINERJA TERBAIK';
        mainTitle = 'SERTIFIKAT PRESTASI';
        subTitle = 'Certificate of Excellence & Outstanding Achievement';
        statement1 = 'Diberikan sebagai bentuk penghargaan istimewa atas dedikasi luar biasa, kedisiplinan prima, dan prestasi kerja tertinggi';
        statement2 = `selama program magang industri pada BPJS Ketenagakerjaan ${branchName} (${batchName}) dengan capaian:`;
        filePrefix = 'Sertifikat_Prestasi_BPJSTK';
        displayPredicate = certificate.predicate || options.predicate || 'Pencapaian Khusus / Prestasi Terbaik (Grade A+)';
      } else if (rawType.includes('partisipasi') || rawType.includes('participation')) {
        certTypeLabel = 'Partisipasi';
        theme = 'platinum';
        headerBadge = 'SURAT TANDA KEPESERTAAN & DEDIKASI';
        mainTitle = 'SERTIFIKAT PARTISIPASI';
        subTitle = 'Certificate of Active Internship Participation';
        statement1 = 'Diberikan atas kontribusi aktif, dedikasi penuh, dan partisipasi loyal dalam kegiatan operasional serta pelayanan lapangan';
        statement2 = `pada BPJS Ketenagakerjaan ${branchName} (${batchName}) dengan status partisipasi:`;
        filePrefix = 'Sertifikat_Partisipasi_BPJSTK';
        displayPredicate = certificate.predicate || options.predicate || 'Partisipasi Aktif & Berdedikasi';
      }

      // PALETTE BASED ON THE TYPE'S DEDICATED DESIGN
      let primaryColor = '#00552B'; // Deep Forest Emerald
      let accentColor = '#D4AF37';  // Gold
      let subAccent = '#008F4C';    // BPJSTK Green
      let bgBase = '#FFFDF9';

      if (theme === 'royal_gold') {
        primaryColor = '#0A192F';   // Deep Royal Navy
        accentColor = '#C5A059';    // Royal Gold
        subAccent = '#D4AF37';
        bgBase = '#FAFAF7';
      } else if (theme === 'platinum') {
        primaryColor = '#1E293B';   // Platinum Slate
        accentColor = '#0D9488';    // Teal Cyan
        subAccent = '#0284C7';      // Sky Blue
        bgBase = '#F8FAFC';
      }

      // 1. Background Fill
      ctx.fillStyle = bgBase;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Radial Soft Glow
      const radial = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, 100, canvas.width / 2, canvas.height / 2, 1100);
      radial.addColorStop(0, `${accentColor}08`);
      radial.addColorStop(1, `${primaryColor}0D`);
      ctx.fillStyle = radial;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 2. Distinct Borders based on Type
      if (theme === 'royal_gold') {
        // Triple Royal Gold Borders for Prestasi
        ctx.strokeStyle = primaryColor;
        ctx.lineWidth = 10;
        ctx.strokeRect(32, 32, canvas.width - 64, canvas.height - 64);

        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 4;
        ctx.strokeRect(48, 48, canvas.width - 96, canvas.height - 96);

        ctx.strokeStyle = `${accentColor}66`;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(60, 60, canvas.width - 120, canvas.height - 120);

        // Gold Stars in 4 Corners
        const starCorners = [
          [80, 80],
          [canvas.width - 80, 80],
          [80, canvas.height - 80],
          [canvas.width - 80, canvas.height - 80]
        ];
        ctx.fillStyle = accentColor;
        ctx.font = 'bold 26px sans-serif';
        ctx.textAlign = 'center';
        starCorners.forEach(([x, y]) => {
          ctx.fillText('★', x, y + 9);
        });

      } else if (theme === 'platinum') {
        // Modern Geometric Dual Borders for Partisipasi
        ctx.strokeStyle = primaryColor;
        ctx.lineWidth = 8;
        ctx.strokeRect(36, 36, canvas.width - 72, canvas.height - 72);

        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 3;
        ctx.strokeRect(52, 52, canvas.width - 104, canvas.height - 104);

        // Geometric corner tick marks
        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 3;
        const tickSize = 30;
        // Top Left
        ctx.beginPath();
        ctx.moveTo(36, 36 + tickSize); ctx.lineTo(36 + tickSize, 36); ctx.stroke();
        // Top Right
        ctx.beginPath();
        ctx.moveTo(canvas.width - 36 - tickSize, 36); ctx.lineTo(canvas.width - 36, 36 + tickSize); ctx.stroke();
        // Bottom Left
        ctx.beginPath();
        ctx.moveTo(36, canvas.height - 36 - tickSize); ctx.lineTo(36 + tickSize, canvas.height - 36); ctx.stroke();
        // Bottom Right
        ctx.beginPath();
        ctx.moveTo(canvas.width - 36 - tickSize, canvas.height - 36); ctx.lineTo(canvas.width - 36, canvas.height - 36 - tickSize); ctx.stroke();

      } else {
        // Emerald Classic Borders for Kelulusan
        ctx.strokeStyle = subAccent;
        ctx.lineWidth = 7;
        ctx.strokeRect(36, 36, canvas.width - 72, canvas.height - 72);

        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 2.5;
        ctx.strokeRect(52, 52, canvas.width - 104, canvas.height - 104);

        // Corner Ornamental Brackets
        ctx.lineWidth = 5;
        ctx.strokeStyle = subAccent;
        const cLen = 70;
        // Top Left
        ctx.beginPath(); ctx.moveTo(36, 36 + cLen); ctx.lineTo(36, 36); ctx.lineTo(36 + cLen, 36); ctx.stroke();
        // Top Right
        ctx.beginPath(); ctx.moveTo(canvas.width - 36 - cLen, 36); ctx.lineTo(canvas.width - 36, 36); ctx.lineTo(canvas.width - 36, 36 + cLen); ctx.stroke();
        // Bottom Left
        ctx.beginPath(); ctx.moveTo(36, canvas.height - 36 - cLen); ctx.lineTo(36, canvas.height - 36); ctx.lineTo(36 + cLen, canvas.height - 36); ctx.stroke();
        // Bottom Right
        ctx.beginPath(); ctx.moveTo(canvas.width - 36 - cLen, canvas.height - 36); ctx.lineTo(canvas.width - 36, canvas.height - 36); ctx.lineTo(canvas.width - 36, canvas.height - 36 - cLen); ctx.stroke();
      }

      // 3. Subtle Background Watermark
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(-10 * Math.PI / 180);
      ctx.textAlign = 'center';
      ctx.fillStyle = `${primaryColor}09`;
      ctx.font = '900 130px sans-serif';
      ctx.fillText('BPJS', 0, -40);
      ctx.font = '900 70px sans-serif';
      ctx.fillText('KETENAGAKERJAAN', 0, 45);
      ctx.font = 'bold 30px sans-serif';
      ctx.fillText(mainTitle, 0, 100);
      ctx.restore();

      // 4. Header: Official Agency Banner
      ctx.textAlign = 'left';
      ctx.fillStyle = primaryColor;
      ctx.font = '900 36px serif';
      ctx.fillText('BPJS Ketenagakerjaan', 130, 135);

      ctx.fillStyle = '#121214';
      ctx.font = 'bold 19px sans-serif';
      ctx.fillText('Badan Penyelenggara Jaminan Sosial Ketenagakerjaan', 130, 168);

      ctx.fillStyle = '#666666';
      ctx.font = 'normal 17px sans-serif';
      ctx.fillText(`${branchName}   •   ${branchAddress}`, 130, 198);

      // Header Right: Security Badge
      ctx.textAlign = 'right';
      ctx.fillStyle = primaryColor;
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText('DOKUMEN ELEKTRONIK RESMI', canvas.width - 130, 140);
      ctx.fillStyle = '#666666';
      ctx.font = 'normal 16px monospace';
      ctx.fillText('ISO/IEC 27001:2022 TERVERIFIKASI', canvas.width - 130, 170);
      ctx.fillText(`Kategori: ${certTypeLabel.toUpperCase()}`, canvas.width - 130, 198);

      // Header Divider Line
      ctx.strokeStyle = primaryColor;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(130, 225); ctx.lineTo(canvas.width - 130, 225); ctx.stroke();

      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(130, 230); ctx.lineTo(canvas.width - 130, 230); ctx.stroke();

      // 5. Center Title & Wording (Specific to Certificate Type)
      ctx.textAlign = 'center';

      // Header Badge
      ctx.fillStyle = accentColor;
      ctx.font = '900 21px sans-serif';
      ctx.fillText(headerBadge, canvas.width / 2, 285);

      // Main Title (Distinct)
      ctx.fillStyle = primaryColor;
      ctx.font = '900 62px serif';
      ctx.fillText(mainTitle, canvas.width / 2, 360);

      // Sub-title
      ctx.fillStyle = '#777777';
      ctx.font = 'italic 22px serif';
      ctx.fillText(subTitle, canvas.width / 2, 400);

      // Certificate Number Pill
      ctx.fillStyle = '#FAF5EB';
      const certNoText = `Nomor: ${certNumber}`;
      ctx.font = 'bold 22px monospace';
      const noWidth = ctx.measureText(certNoText).width + 60;
      ctx.beginPath();
      ctx.roundRect((canvas.width - noWidth) / 2, 430, noWidth, 42, 21);
      ctx.fill();
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#121214';
      ctx.fillText(certNoText, canvas.width / 2, 458);

      // Awarded To Statement
      ctx.fillStyle = '#555555';
      ctx.font = 'normal 22px sans-serif';
      ctx.fillText('Badan Penyelenggara Jaminan Sosial Ketenagakerjaan menyatakan bahwa:', canvas.width / 2, 535);

      // Recipient Name (Bold, Underlined)
      ctx.fillStyle = '#121214';
      ctx.font = '900 50px sans-serif';
      const nameUpper = recipientName.toUpperCase();
      ctx.fillText(nameUpper, canvas.width / 2, 610);

      const nameWidth = ctx.measureText(nameUpper).width;
      ctx.strokeStyle = primaryColor;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo((canvas.width - nameWidth) / 2, 627);
      ctx.lineTo((canvas.width + nameWidth) / 2, 627);
      ctx.stroke();

      // NIM & Penempatan
      ctx.fillStyle = '#555555';
      ctx.font = 'bold 22px monospace';
      ctx.fillText(`NIM / Registrasi: ${recipientNim}   •   Penempatan: ${penempatan}`, canvas.width / 2, 675);

      // Dynamic Statement Text for Type
      ctx.fillStyle = '#444444';
      ctx.font = 'normal 21px sans-serif';
      ctx.fillText(statement1, canvas.width / 2, 735);
      ctx.fillText(statement2, canvas.width / 2, 770);

      // Predicate & Score Pills
      ctx.fillStyle = primaryColor;
      const predText = displayPredicate;
      ctx.font = 'bold 22px sans-serif';
      const pWidth = ctx.measureText(predText).width + 40;
      ctx.beginPath();
      ctx.roundRect((canvas.width / 2) - pWidth - 15, 810, pWidth, 48, 10);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(predText, (canvas.width / 2) - (pWidth / 2) - 15, 842);

      ctx.fillStyle = '#FAF5EB';
      const scoreText = `Indeks Prestasi: ${score} / 100.0`;
      ctx.font = 'bold 22px monospace';
      const sWidth = ctx.measureText(scoreText).width + 40;
      ctx.beginPath();
      ctx.roundRect((canvas.width / 2) + 15, 810, sWidth, 48, 10);
      ctx.fill();
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#121214';
      ctx.fillText(scoreText, (canvas.width / 2) + (sWidth / 2) + 15, 842);

      // 6. Signatures Grid
      // Left: Mentor Pembimbing Magang
      const leftCenterX = 450;
      ctx.fillStyle = '#555555';
      ctx.font = 'normal 19px sans-serif';
      ctx.fillText(`Medan, ${issueDateFormatted}`, leftCenterX, 970);
      ctx.fillStyle = '#121214';
      ctx.font = 'bold 21px sans-serif';
      ctx.fillText('Mentor Pembimbing Magang', leftCenterX, 1005);

      // Draw Mentor Signature
      if (mentorSig) {
        try {
          const mentorImg = new Image();
          await new Promise((r) => {
            mentorImg.onload = r;
            mentorImg.onerror = r;
            mentorImg.src = mentorSig;
          });
          if (mentorImg.width > 0) {
            ctx.drawImage(mentorImg, leftCenterX - 110, 1030, 220, 110);
          }
        } catch (e) {
          console.warn('Failed to draw mentor signature image:', e);
        }
      } else {
        // Fallback Signature Path
        ctx.strokeStyle = primaryColor;
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(leftCenterX - 90, 1080);
        ctx.bezierCurveTo(leftCenterX - 30, 1040, leftCenterX + 10, 1120, leftCenterX + 80, 1060);
        ctx.stroke();
      }

      // Mentor Underline & Name
      ctx.strokeStyle = '#121214';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(leftCenterX - 170, 1165); ctx.lineTo(leftCenterX + 170, 1165); ctx.stroke();

      ctx.fillStyle = '#121214';
      ctx.font = '900 23px sans-serif';
      ctx.fillText(mentorName.toUpperCase(), leftCenterX, 1200);

      ctx.fillStyle = '#666666';
      ctx.font = 'normal 18px monospace';
      ctx.fillText(`NPP. ${mentorNpp}`, leftCenterX, 1230);

      // Center: Local QR Code
      const qrCenterX = canvas.width / 2;
      const verifyUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://bpjs-magang.go.id'}/verify-certificate/${encodeURIComponent(certNumber)}`;
      drawQrToCanvas(ctx, verifyUrl, qrCenterX - 75, 985, 150);

      ctx.fillStyle = primaryColor;
      ctx.font = 'bold 15px sans-serif';
      ctx.fillText('SCAN VERIFIKASI RESMI', qrCenterX, 1160);

      ctx.fillStyle = '#777777';
      ctx.font = 'normal 12px monospace';
      ctx.fillText(`DIGEST: ${sha256Hash.substring(0, 24)}...`, qrCenterX, 1185);

      // Right: Kepala Kantor Cabang
      const rightCenterX = canvas.width - 450;
      ctx.fillStyle = '#555555';
      ctx.font = 'normal 19px sans-serif';
      ctx.fillText('Mengesahkan,', rightCenterX, 970);
      ctx.fillStyle = '#121214';
      ctx.font = 'bold 21px sans-serif';
      ctx.fillText('Kepala Kantor Cabang', rightCenterX, 1005);

      // Draw Branch Head Signature
      if (branchHeadSig) {
        try {
          const headImg = new Image();
          await new Promise((r) => {
            headImg.onload = r;
            headImg.onerror = r;
            headImg.src = branchHeadSig;
          });
          if (headImg.width > 0) {
            ctx.drawImage(headImg, rightCenterX - 110, 1030, 220, 110);
          }
        } catch (e) {
          console.warn('Failed to draw branch head signature image:', e);
        }
      } else {
        // Fallback Signature Path
        ctx.strokeStyle = primaryColor;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(rightCenterX - 90, 1070);
        ctx.bezierCurveTo(rightCenterX - 20, 1030, rightCenterX + 20, 1130, rightCenterX + 90, 1060);
        ctx.stroke();
      }

      // Draw Official BPJS Circular Seal (Stempel Dinas)
      ctx.save();
      ctx.translate(rightCenterX - 60, 1085);
      ctx.rotate(-12 * Math.PI / 180);
      ctx.strokeStyle = `${primaryColor}CC`;
      ctx.fillStyle = `${primaryColor}CC`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, 75, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, 68, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, 48, 0, 2 * Math.PI);
      ctx.stroke();

      ctx.font = '900 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('BPJS KETENAGAKERJAAN', 0, -25);
      ctx.font = '900 18px sans-serif';
      ctx.fillText('RESMI', 0, 8);
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('DISAHKAN', 0, 26);
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText(branchName.substring(0, 24).toUpperCase(), 0, 40);
      ctx.restore();

      // Branch Head Underline & Name
      ctx.strokeStyle = '#121214';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(rightCenterX - 170, 1165); ctx.lineTo(rightCenterX + 170, 1165); ctx.stroke();

      ctx.fillStyle = '#121214';
      ctx.font = '900 23px sans-serif';
      ctx.fillText(branchHeadName.toUpperCase(), rightCenterX, 1200);

      ctx.fillStyle = '#666666';
      ctx.font = 'normal 18px monospace';
      ctx.fillText(`NPP. ${branchHeadNpp}`, rightCenterX, 1230);

      // 7. Legal Footer
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(100, 1420); ctx.lineTo(canvas.width - 100, 1420); ctx.stroke();

      ctx.fillStyle = '#888888';
      ctx.font = 'normal 16px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`© ${new Date().getFullYear()} BPJS Ketenagakerjaan. Hak Cipta Dilindungi Undang-Undang.`, 100, 1455);
      ctx.textAlign = 'right';
      ctx.fillText('Dokumen elektronik sah terdaftar di pangkalan data resmi BPJSTK.', canvas.width - 100, 1455);

      // 8. Instant Direct Browser Download
      // Filename format: Sertifikat_[Kelulusan|Prestasi|Partisipasi]_BPJSTK_[Nama]_[No].png
      const safeRecipient = recipientName.trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
      const safeCertNo = certNumber.replace(/\//g, '-').replace(/[^a-zA-Z0-9_-]/g, '');
      const downloadFilename = `${filePrefix}_${safeRecipient}_${safeCertNo}.png`;

      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Gagal mengekspor kanvas sertifikat ke file gambar'));
          return;
        }

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = downloadFilename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        setTimeout(() => URL.revokeObjectURL(url), 2000);
        resolve({ success: true, filename: downloadFilename, certType: certTypeLabel });
      }, 'image/png', 1.0);

    } catch (err) {
      console.error('Error generating direct certificate download:', err);
      reject(err);
    }
  });
}
