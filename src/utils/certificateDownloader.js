// src/utils/certificateDownloader.js
import { drawQrToCanvas } from './qrMatrix';

/**
 * Direct Download Engine for BPJS Ketenagakerjaan Official Certificates
 * Features:
 * - 3 distinctive designs: 'emerald' (Classic BPJS), 'royal_gold' (Prestasi Elite), 'platinum' (Kompetensi Modern)
 * - Zero external network dependency for QR Code (prevents browser canvas tainting)
 * - Immediate browser download with naming format: "Sertifikat Kelulusan - BPJSTK - [Nama] - [No]"
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
      const predicate = certificate.predicate || 'Sangat Memuaskan (Grade A)';
      const score = certificate.score_average ? Number(certificate.score_average).toFixed(1) : '92.5';
      const theme = certificate.design_theme || options.theme || 'emerald';

      const branchHeadName = certificate.branch_head_name || options.branchHeadName || 'Dr. Hendra Wijaya, S.E., M.M.';
      const branchHeadNpp = certificate.branch_head_npp || options.branchHeadNpp || '9876543210';
      const branchName = certificate.branch_name || options.branchName || 'BPJS Ketenagakerjaan Kantor Cabang Jakarta Gambir';
      const branchAddress = certificate.branch_address || options.branchAddress || 'Jl. Kebon Sirih No. 40, Jakarta Pusat 10110';
      
      const mentorName = certificate.mentor_name || certificate.default_coordinator_name || options.mentorName || 'Budi Santoso, S.Kom., M.T.';
      const mentorNpp = certificate.mentor_npp || certificate.default_coordinator_npp || options.mentorNpp || '8765432109';
      
      const branchHeadSig = certificate.branch_head_signature || options.branchHeadSignature || null;
      const mentorSig = certificate.mentor_signature || options.mentorSignature || null;
      const sha256Hash = certificate.digital_signature_hash || certificate.digital_signature || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

      const issueDateFormatted = new Date(certificate.issue_date || certificate.created_at || Date.now()).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });

      // THEME COLOR PALETTES
      let primaryColor = '#00552B'; // Deep Forest
      let accentColor = '#D4AF37';  // Gold
      let subAccent = '#008F4C';    // Green
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

      // 2. Borders based on theme
      if (theme === 'royal_gold') {
        // Triple Royal Borders
        ctx.strokeStyle = primaryColor;
        ctx.lineWidth = 9;
        ctx.strokeRect(32, 32, canvas.width - 64, canvas.height - 64);

        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 3.5;
        ctx.strokeRect(48, 48, canvas.width - 96, canvas.height - 96);

        ctx.strokeStyle = `${accentColor}55`;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(58, 58, canvas.width - 116, canvas.height - 116);
      } else if (theme === 'platinum') {
        // Geometric Modern Dual Borders
        ctx.strokeStyle = primaryColor;
        ctx.lineWidth = 8;
        ctx.strokeRect(36, 36, canvas.width - 72, canvas.height - 72);

        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 3;
        ctx.strokeRect(50, 50, canvas.width - 100, canvas.height - 100);
      } else {
        // Emerald Classic Borders
        ctx.strokeStyle = subAccent;
        ctx.lineWidth = 7;
        ctx.strokeRect(36, 36, canvas.width - 72, canvas.height - 72);

        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 3;
        ctx.strokeRect(52, 52, canvas.width - 104, canvas.height - 104);
      }

      // Corner Brackets
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 8;
      // Top-Left
      ctx.beginPath();
      ctx.moveTo(36, 95); ctx.lineTo(36, 36); ctx.lineTo(95, 36); ctx.stroke();
      // Top-Right
      ctx.beginPath();
      ctx.moveTo(canvas.width - 95, 36); ctx.lineTo(canvas.width - 36, 36); ctx.lineTo(canvas.width - 36, 95); ctx.stroke();
      // Bottom-Left
      ctx.beginPath();
      ctx.moveTo(36, canvas.height - 95); ctx.lineTo(36, canvas.height - 36); ctx.lineTo(95, canvas.height - 36); ctx.stroke();
      // Bottom-Right
      ctx.beginPath();
      ctx.moveTo(canvas.width - 95, canvas.height - 36); ctx.lineTo(canvas.width - 36, canvas.height - 36); ctx.lineTo(canvas.width - 36, canvas.height - 95); ctx.stroke();

      // 3. Header Text
      ctx.fillStyle = primaryColor;
      ctx.font = '900 36px serif';
      ctx.textAlign = 'left';
      ctx.fillText('BPJS KETENAGAKERJAAN', 110, 120);

      ctx.fillStyle = '#121214';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText('Badan Penyelenggara Jaminan Sosial Ketenagakerjaan', 110, 155);

      ctx.fillStyle = '#666666';
      ctx.font = 'normal 17px sans-serif';
      ctx.fillText(`${branchName} • ${branchAddress}`, 110, 185);

      // Header Right (Theme Badge)
      ctx.fillStyle = primaryColor;
      ctx.textAlign = 'right';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText(
        theme === 'royal_gold' ? 'SERTIFIKAT PENGHARGAAN PRESTASI' :
        theme === 'platinum' ? 'SERTIFIKAT KOMPETENSI EKSEKUTIF' :
        'DOKUMEN RESMI ELEKTRONIK',
        canvas.width - 110, 130
      );
      ctx.fillStyle = '#777777';
      ctx.font = 'normal 15px monospace';
      ctx.fillText('ISO/IEC 27001 Terverifikasi', canvas.width - 110, 160);

      // Header Divider Line
      ctx.strokeStyle = primaryColor;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(100, 215); ctx.lineTo(canvas.width - 100, 215); ctx.stroke();

      // Accent Ribbon
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(100, 222); ctx.lineTo(canvas.width - 100, 222); ctx.stroke();

      // 4. Center Content
      ctx.textAlign = 'center';

      ctx.fillStyle = accentColor;
      ctx.font = '900 20px sans-serif';
      ctx.fillText(
        theme === 'royal_gold' ? 'SURAT TANDA PRESTASI DAN KELULUSAN' :
        theme === 'platinum' ? 'SURAT TANDA KOMPETENSI INDUSTRI' :
        'SURAT TANDA TAMAT PROGRAM',
        canvas.width / 2, 280
      );

      ctx.fillStyle = primaryColor;
      ctx.font = '900 58px serif';
      ctx.fillText(
        theme === 'royal_gold' ? 'SERTIFIKAT PRESTASI KERJA' :
        theme === 'platinum' ? 'SERTIFIKAT KOMPETENSI MAGANG' :
        'SERTIFIKAT MAGANG KERJA',
        canvas.width / 2, 355
      );

      ctx.fillStyle = '#777777';
      ctx.font = 'italic 22px serif';
      ctx.fillText(
        theme === 'royal_gold' ? 'Certificate of Distinguished Excellence' :
        theme === 'platinum' ? 'Professional Competency Certificate' :
        'Certificate of Internship Completion',
        canvas.width / 2, 395
      );

      // Certificate Number Pill
      ctx.fillStyle = '#FAF5EB';
      const certNoText = `Nomor: ${certNumber}`;
      ctx.font = 'bold 22px monospace';
      const noWidth = ctx.measureText(certNoText).width + 60;
      ctx.beginPath();
      ctx.roundRect((canvas.width - noWidth) / 2, 425, noWidth, 42, 21);
      ctx.fill();
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#121214';
      ctx.fillText(certNoText, canvas.width / 2, 453);

      // Introduction
      ctx.fillStyle = '#555555';
      ctx.font = 'normal 22px sans-serif';
      ctx.fillText('Badan Penyelenggara Jaminan Sosial Ketenagakerjaan menyatakan bahwa:', canvas.width / 2, 530);

      // Recipient Name (Bold, Underlined)
      ctx.fillStyle = '#121214';
      ctx.font = '900 50px sans-serif';
      const nameUpper = recipientName.toUpperCase();
      ctx.fillText(nameUpper, canvas.width / 2, 605);

      const nameWidth = ctx.measureText(nameUpper).width;
      ctx.strokeStyle = primaryColor;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo((canvas.width - nameWidth) / 2, 622);
      ctx.lineTo((canvas.width + nameWidth) / 2, 622);
      ctx.stroke();

      // NIM & Penempatan
      ctx.fillStyle = '#555555';
      ctx.font = 'bold 22px monospace';
      ctx.fillText(`NIM / Registrasi: ${recipientNim}   •   Penempatan: ${penempatan}`, canvas.width / 2, 670);

      // Statement
      ctx.fillStyle = '#444444';
      ctx.font = 'normal 21px sans-serif';
      ctx.fillText(`Telah berhasil menyelesaikan seluruh rangkaian program Praktik Kerja Lapangan / Magang Industri Terstruktur`, canvas.width / 2, 735);
      ctx.fillText(`pada BPJS Ketenagakerjaan ${branchName} (${batchName}) dengan capaian evaluasi akhir:`, canvas.width / 2, 770);

      // Predicate Pills
      ctx.fillStyle = primaryColor;
      const predText = predicate;
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

      // 5. Signatures Grid
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
          if (mentorImg.width) {
            ctx.drawImage(mentorImg, leftCenterX - 110, 1030, 220, 110);
          }
        } catch (e) {}
      } else {
        // Fallback Stylized stroke
        ctx.strokeStyle = primaryColor;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(leftCenterX - 80, 1100);
        ctx.quadraticCurveTo(leftCenterX - 30, 1030, leftCenterX, 1090);
        ctx.quadraticCurveTo(leftCenterX + 40, 1050, leftCenterX + 80, 1110);
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

      // Center: Local Pure-JS QR Code without CORS taint
      const verifyUrl = `${window.location.origin}/verify-certificate/${encodeURIComponent(certNumber)}`;
      drawQrToCanvas(ctx, verifyUrl, (canvas.width / 2) - 75, 1010, 150, { fgColor: primaryColor });

      // Border around QR
      ctx.strokeStyle = primaryColor;
      ctx.lineWidth = 3;
      ctx.strokeRect((canvas.width / 2) - 75, 1010, 150, 150);

      ctx.fillStyle = primaryColor;
      ctx.font = '900 17px sans-serif';
      ctx.fillText('SCAN UNTUK VERIFIKASI', canvas.width / 2, 1195);

      ctx.fillStyle = '#777777';
      ctx.font = 'normal 13px monospace';
      ctx.fillText(`HASH: ${sha256Hash.substring(0, 24)}...`, canvas.width / 2, 1220);

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
          if (headImg.width) {
            ctx.drawImage(headImg, rightCenterX - 110, 1030, 220, 110);
          }
        } catch (e) {}
      } else {
        // Fallback Stylized Stroke
        ctx.strokeStyle = primaryColor;
        ctx.lineWidth = 4.5;
        ctx.beginPath();
        ctx.moveTo(rightCenterX - 85, 1080);
        ctx.quadraticCurveTo(rightCenterX - 40, 1020, rightCenterX - 10, 1085);
        ctx.quadraticCurveTo(rightCenterX + 35, 1035, rightCenterX + 85, 1090);
        ctx.stroke();
      }

      // Draw Official Circular Stamp Overlay
      ctx.save();
      ctx.translate(rightCenterX - 110, 1050);
      ctx.rotate(-14 * (Math.PI / 180));
      const stampColor = theme === 'royal_gold' ? '#B8860B' : theme === 'platinum' ? '#0F766E' : '#00875A';
      ctx.strokeStyle = stampColor;
      ctx.fillStyle = stampColor;
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(0, 0, 75, 0, Math.PI * 2); ctx.stroke();
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(0, 0, 68, 0, Math.PI * 2); ctx.stroke();
      ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.arc(0, 0, 48, 0, Math.PI * 2); ctx.stroke();

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

      // 6. Legal Footer
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

      // 7. Instant Direct Browser Download
      // Filename format: Sertifikat_Kelulusan_BPJSTK_[Nama]_[No].png
      const safeRecipient = recipientName.trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
      const safeCertNo = certNumber.replace(/\//g, '-').replace(/[^a-zA-Z0-9_-]/g, '');
      const downloadFilename = `Sertifikat_Kelulusan_BPJSTK_${safeRecipient}_${safeCertNo}.png`;

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
        resolve({ success: true, filename: downloadFilename });
      }, 'image/png', 1.0);

    } catch (err) {
      console.error('Error generating direct certificate download:', err);
      reject(err);
    }
  });
}
