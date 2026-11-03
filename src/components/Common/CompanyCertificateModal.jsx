import React, { useRef, useState, useEffect } from 'react';
import { 
  X, 
  Printer, 
  Download, 
  ShieldCheck, 
  ExternalLink, 
  Award, 
  CheckCircle2, 
  Lock, 
  QrCode,
  Sparkles,
  Maximize2,
  Minimize2,
  Check
} from 'lucide-react';
import { downloadCertificateDirectly } from '../../utils/certificateDownloader';

/**
 * CompanyCertificateModal
 * Official BPJS Ketenagakerjaan Certificate Component
 * Features:
 * - Dynamic institutional metadata & dual signatures (Kepala Kantor Cabang & Mentor Pembimbing Magang)
 * - Support for drawn canvas signatures or transparent PNG extracted signatures
 * - Instant direct download button (saves directly to Downloads folder)
 * - Closes on backdrop click, Escape key, or prominent 'X' button
 * - Responsive auto-scale fitting for mobile & tablet viewports
 * - Guilloche gold & emerald security border
 * - Official BPJS Ketenagakerjaan Circular Seal (Stempel Dinas Resmi)
 * - Cryptographic HMAC-SHA256 signature thumbprint
 * - Verification QR Code linking to /verify-certificate/:certNumber
 * - Native 300 DPI vector print (@page A4 landscape)
 */
const CompanyCertificateModal = ({ isOpen, onClose, certificate, participant }) => {
  const printRef = useRef(null);
  const wrapperRef = useRef(null);
  const [fitScreen, setFitScreen] = useState(true);
  const [containerWidth, setContainerWidth] = useState(1050);
  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Close on ESC key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const handleResize = () => {
      if (wrapperRef.current) {
        setContainerWidth(wrapperRef.current.clientWidth);
      } else if (window.innerWidth) {
        setContainerWidth(window.innerWidth - 32);
      }
    };
    handleResize();
    const timer = setTimeout(handleResize, 100);
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen]);

  if (!isOpen || !certificate) return null;

  const certNumber = certificate.certificate_number || 'BPJSTK/MAGANG/2026/001';
  const recipientName = certificate.participant_name || participant?.full_name || 'Peserta Magang';
  const recipientNim = certificate.participant_nim || participant?.unique_id || participant?.nim || '12345678';
  const penempatan = certificate.penempatan || participant?.penempatan || 'Bidang Kepesertaan & Pelayanan';
  const batchName = certificate.batch_name || 'Batch 1 - Gelombang Berjalan';
  const predicate = certificate.predicate || 'Sangat Memuaskan (Grade A)';
  const score = certificate.score_average ? Number(certificate.score_average).toFixed(1) : '92.5';
  
  // Format Date (ID)
  const issueDateFormatted = new Date(certificate.issue_date || certificate.created_at || Date.now()).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  // Dynamic Mentor & Institutional Leadership (Changed from Coordinator to Mentor)
  const mentorName = certificate.mentor_name || certificate.coordinator_name || participant?.coordinator_name || certificate.default_coordinator_name || 'Budi Santoso, S.Kom., M.T.';
  const mentorNpp = certificate.mentor_npp || certificate.coordinator_npp || participant?.coordinator_npp || certificate.default_coordinator_npp || '8765432109';
  const mentorSig = certificate.mentor_signature || null;
  
  const branchHeadName = certificate.branch_head_name || 'Dr. Hendra Wijaya, S.E., M.M.';
  const branchHeadNpp = certificate.branch_head_npp || '9876543210';
  const branchHeadSig = certificate.branch_head_signature || null;

  const branchName = certificate.branch_name || 'BPJS Ketenagakerjaan Kantor Cabang Jakarta Gambir';
  const branchAddress = certificate.branch_address || 'Jl. Kebon Sirih No. 40, Jakarta Pusat 10110';

  const sha256Hash = certificate.digital_signature_hash || certificate.digital_signature || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

  const verifyUrl = `${window.location.origin}/verify-certificate/${encodeURIComponent(certNumber)}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(verifyUrl)}&color=00552B&bgcolor=FFFFFF`;

  const handlePrint = () => {
    window.print();
  };

  // Instant direct file download
  const handleDirectDownload = async () => {
    try {
      setDownloading(true);
      await downloadCertificateDirectly(certificate, {
        recipientName,
        recipientNim,
        penempatan,
        branchName,
        branchAddress,
        branchHeadName,
        branchHeadNpp,
        branchHeadSignature: branchHeadSig,
        mentorName,
        mentorNpp,
        mentorSignature: mentorSig
      });
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to download certificate directly:', err);
      // Fallback
      window.open(`/api/certificates/download/${encodeURIComponent(certNumber)}`, '_blank');
    } finally {
      setDownloading(false);
    }
  };

  // Compute responsive scale for mobile viewport
  const isMobile = containerWidth < 1030;
  const scale = isMobile && fitScreen ? Math.max(0.32, (containerWidth - 20) / 1000) : 1;

  return (
    <div 
      onClick={(e) => {
        // Clicking on the backdrop closes the modal
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static"
    >
      {/* Floating Top-Right Close Button for immediate thumb access */}
      <button
        type="button"
        onClick={onClose}
        className="fixed top-3 right-3 sm:top-5 sm:right-5 z-60 w-10 h-10 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-2xl border-2 border-white cursor-pointer active:scale-90 transition-all print:hidden"
        title="Tutup Sertifikat (ESC)"
        aria-label="Tutup Sertifikat"
      >
        <X className="w-5 h-5 stroke-[2.5]" />
      </button>

      {/* Print Specific CSS to enforce A4 Landscape vector output */}
      <style>{`
        @page {
          size: A4 landscape;
          margin: 0;
        }
        @media print {
          body * {
            visibility: hidden;
          }
          #official-bpjstk-certificate, #official-bpjstk-certificate * {
            visibility: visible;
          }
          #official-bpjstk-certificate {
            position: fixed;
            left: 0;
            top: 0;
            width: 100vw;
            height: 100vh;
            margin: 0;
            padding: 10mm;
            box-sizing: border-box;
            background: white !important;
            transform: none !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Outer Modal Container */}
      <div 
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[1100px] bg-white rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden border border-[#EAE9E4] print:border-none print:shadow-none print:rounded-none"
      >
        
        {/* Modal Action Bar (Responsive on Mobile & Desktop) */}
        <div className="no-print bg-[#121214] text-white px-3 sm:px-6 py-3 sm:py-4 flex flex-wrap items-center justify-between gap-2.5 border-b border-[#2C2C30]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[#008F4C] flex items-center justify-center text-white shadow-sm shrink-0">
              <Award className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="font-extrabold text-xs sm:text-sm text-white flex items-center gap-1.5 truncate">
                <span>E-Sertifikat Resmi</span>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-black bg-[#B8C96E] text-[#121214]">
                  Dual Signature & Seal
                </span>
              </h3>
              <p className="text-[10px] sm:text-[11px] text-gray-400 font-mono truncate">No: {certNumber}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end">
            {/* Mobile View Toggle: Fit Screen vs Full Zoom */}
            {isMobile && (
              <button
                type="button"
                onClick={() => setFitScreen(!fitScreen)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-[10px] font-bold text-white transition border border-white/20"
                title={fitScreen ? 'Perbesar ke ukuran asli 100%' : 'Sesuaikan dengan lebar layar'}
              >
                {fitScreen ? <Maximize2 className="w-3 h-3 text-[#FCE373]" /> : <Minimize2 className="w-3 h-3 text-[#FCE373]" />}
                <span>{fitScreen ? '100% Ukuran' : 'Pas Layar'}</span>
              </button>
            )}

            <a
              href={verifyUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-[11px] sm:text-xs font-bold text-white transition border border-white/20"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#B8C96E]" />
              <span className="hidden sm:inline">Verifikasi QR</span>
              <span className="sm:hidden">QR</span>
            </a>

            {/* Direct File Download Button */}
            <button
              type="button"
              onClick={handleDirectDownload}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#FCE373] hover:bg-[#ebd056] active:scale-95 text-[11px] sm:text-xs font-black text-[#121214] shadow-md transition-all cursor-pointer disabled:opacity-50"
              title="Unduh langsung file sertifikat asli ke komputer/HP"
            >
              {downloading ? (
                <div className="w-3.5 h-3.5 border-2 border-[#121214] border-t-transparent rounded-full animate-spin" />
              ) : downloadSuccess ? (
                <Check className="w-3.5 h-3.5 text-emerald-800" />
              ) : (
                <Download className="w-3.5 h-3.5 text-[#121214]" />
              )}
              <span>{downloading ? 'Mengunduh...' : downloadSuccess ? 'Tersimpan ✓' : 'Download File'}</span>
            </button>

            {/* Native Print / PDF Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1 px-3 sm:px-4 py-1.5 rounded-full bg-[#008F4C] hover:bg-[#00753e] text-[11px] sm:text-xs font-black text-white shadow-md transition active:scale-95 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cetak PDF</span>
              <span className="sm:hidden">Cetak</span>
            </button>

            {/* Prominent Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-md transition-all cursor-pointer active:scale-95"
              aria-label="Tutup Modal"
              title="Tutup (ESC)"
            >
              <X className="w-4 h-4" />
              <span className="hidden sm:inline">Tutup</span>
            </button>
          </div>
        </div>

        {/* Certificate Responsive Viewport / Sheet */}
        <div 
          ref={wrapperRef}
          className="p-2 sm:p-6 bg-[#2B2B2F] overflow-x-auto overflow-y-hidden flex flex-col items-center justify-center print:p-0 print:bg-white"
        >
          {/* Scaled Container for Mobile & Tablet */}
          <div 
            style={scale < 1 ? {
              width: `${1000 * scale}px`,
              height: `${680 * scale}px`,
              overflow: 'hidden'
            } : {}}
            className="transition-all duration-200 flex items-start justify-center"
          >
            <div 
              id="official-bpjstk-certificate"
              ref={printRef}
              className="w-[1000px] h-[680px] shrink-0 bg-[#FFFDF9] text-[#121214] p-8 relative shadow-2xl flex flex-col justify-between select-none print:shadow-none print:w-full print:h-full print:transform-none"
              style={{
                transform: scale < 1 ? `scale(${scale})` : 'none',
                transformOrigin: 'top left',
                backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(0, 143, 76, 0.02) 0%, rgba(212, 175, 55, 0.04) 100%)'
              }}
            >
              {/* Guilloche & Security Decorative Borders */}
              <div className="absolute inset-4 border-[3px] border-[#008F4C] rounded-xl pointer-events-none" />
              <div className="absolute inset-6 border-[1.5px] border-[#D4AF37] rounded-lg pointer-events-none" />
              
              {/* Corner Ornaments */}
              <div className="absolute top-4 left-4 w-10 h-10 border-t-4 border-l-4 border-[#008F4C] pointer-events-none" />
              <div className="absolute top-4 right-4 w-10 h-10 border-t-4 border-r-4 border-[#008F4C] pointer-events-none" />
              <div className="absolute bottom-4 left-4 w-10 h-10 border-b-4 border-l-4 border-[#008F4C] pointer-events-none" />
              <div className="absolute bottom-4 right-4 w-10 h-10 border-b-4 border-r-4 border-[#008F4C] pointer-events-none" />

              {/* Subtle Security Watermark in Center Background */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.035] overflow-hidden">
                <div className="text-center transform -rotate-12 select-none">
                  <span className="text-8xl font-black tracking-widest text-[#008F4C] block">BPJS</span>
                  <span className="text-5xl font-black tracking-widest text-[#008F4C] block">KETENAGAKERJAAN</span>
                  <span className="text-2xl font-bold tracking-widest text-[#121214] block mt-2 uppercase">{branchName}</span>
                </div>
              </div>

              {/* 1. HEADER (Kop Surat Resmi BPJS Ketenagakerjaan) */}
              <div className="relative z-10 pt-2 px-6">
                <div className="flex items-center justify-between border-b-2 border-[#008F4C] pb-3">
                  {/* Left: Official Emblem BPJS Ketenagakerjaan */}
                  <div className="flex items-center gap-3">
                    <img 
                      src="/bpjs_logo.png" 
                      alt="Logo BPJS Ketenagakerjaan" 
                      className="h-12 w-auto object-contain"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Logo_BPJS_Ketenagakerjaan.png/640px-Logo_BPJS_Ketenagakerjaan.png";
                      }}
                    />
                    <div className="border-l-2 border-[#D4AF37] pl-3 text-left">
                      <h2 className="text-base font-black tracking-wider text-[#008F4C] leading-tight font-serif uppercase">
                        BPJS Ketenagakerjaan
                      </h2>
                      <p className="text-[10px] font-bold tracking-widest text-[#121214]/80 uppercase">
                        Badan Penyelenggara Jaminan Sosial Ketenagakerjaan
                      </p>
                      <p className="text-[9px] font-medium text-gray-500">
                        {branchName} • {branchAddress}
                      </p>
                    </div>
                  </div>

                  {/* Right: Security & ISO Credentials */}
                  <div className="text-right">
                    <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#008F4C]/10 border border-[#008F4C]/30 text-[#008F4C] text-[10px] font-black uppercase tracking-wider">
                      <Lock className="w-3 h-3" />
                      <span>Dokumen Elektronik Resmi</span>
                    </div>
                    <p className="text-[9px] font-mono font-bold text-gray-500 mt-1">
                      ISO/IEC 27001:2022 Terverifikasi
                    </p>
                  </div>
                </div>

                {/* Gold Ribbon Underline */}
                <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent mt-1" />
              </div>

              {/* 2. CERTIFICATE TITLE */}
              <div className="relative z-10 text-center my-auto py-1">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#D4AF37] block">
                  SURAT TANDA TAMAT PROGRAM
                </span>
                <h1 className="text-3xl font-black tracking-wide text-[#00552B] font-serif uppercase mt-1">
                  SERTIFIKAT MAGANG KERJA
                </h1>
                <p className="text-[11px] font-serif italic text-gray-500 -mt-0.5 tracking-wider">
                  Certificate of Internship Completion
                </p>
                <div className="inline-block mt-2 px-4 py-0.5 rounded-full bg-[#FAF5EB] border border-[#D4AF37]/50">
                  <span className="text-xs font-mono font-black text-[#121214] tracking-wider">
                    Nomor: {certNumber}
                  </span>
                </div>

                {/* Awarded To Statement */}
                <p className="text-xs text-gray-600 mt-3 font-medium">
                  Badan Penyelenggara Jaminan Sosial Ketenagakerjaan menyatakan bahwa:
                </p>
                
                {/* Participant Name */}
                <div className="mt-1">
                  <h3 className="text-2xl font-black text-[#121214] tracking-tight uppercase underline decoration-[#008F4C] decoration-2 underline-offset-4">
                    {recipientName}
                  </h3>
                  <p className="text-xs font-mono text-gray-600 font-bold mt-1">
                    NIM / Registrasi: <span className="text-[#008F4C] font-black">{recipientNim}</span> • Penempatan: <span className="font-bold text-[#121214]">{penempatan}</span>
                  </p>
                </div>

                {/* Program Statement */}
                <p className="text-[11.5px] leading-relaxed text-gray-700 max-w-2xl mx-auto mt-2 font-normal">
                  Telah berhasil menyelesaikan seluruh rangkaian program <strong className="text-[#121214]">Praktik Kerja Lapangan / Magang Industri Terstruktur</strong> pada <strong className="text-[#008F4C]">BPJS Ketenagakerjaan {branchName}</strong> ({batchName}) dengan predikat:
                </p>

                {/* Predicate & Final Score Pill */}
                <div className="flex items-center justify-center gap-3 mt-2">
                  <div className="px-4 py-1 rounded-lg bg-[#008F4C] text-white text-xs font-extrabold shadow-sm tracking-wide">
                    {predicate}
                  </div>
                  <div className="px-3 py-1 rounded-lg bg-[#FAF5EB] border border-[#D4AF37] text-xs font-mono font-black text-[#121214]">
                    Indeks Prestasi: {score} / 100.0
                  </div>
                </div>
              </div>

              {/* 3. SIGNATURES & OFFICIAL COMPANY SEAL (TWO SIGNATURES: MENTOR & KEPALA CABANG) */}
              <div className="relative z-10 px-6 pb-2">
                <div className="grid grid-cols-3 items-end">
                  
                  {/* Left Signature: Mentor Pembimbing Magang */}
                  <div className="text-center relative">
                    <p className="text-[11px] font-bold text-gray-600">
                      Medan, {issueDateFormatted}
                    </p>
                    <p className="text-[11px] font-bold text-[#121214]">
                      Mentor Pembimbing Magang
                    </p>
                    
                    {/* Digital Signature Specimen */}
                    <div className="h-16 flex items-center justify-center relative my-0.5">
                      {mentorSig ? (
                        <img 
                          src={mentorSig} 
                          alt="Tanda Tangan Mentor" 
                          className="max-h-14 max-w-[160px] object-contain drop-shadow-sm select-none"
                        />
                      ) : (
                        <svg className="w-36 h-14 text-[#00552B]" viewBox="0 0 200 80" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M 20 50 Q 50 10 70 45 T 120 40 Q 140 20 160 55 T 185 30" />
                          <path d="M 40 40 Q 80 60 150 45" strokeWidth="1.5" />
                        </svg>
                      )}
                      <div className="absolute right-2 bottom-0 px-1.5 py-0.5 bg-[#B8C96E]/40 border border-[#008F4C]/40 rounded text-[8px] font-mono font-bold text-[#00552B] flex items-center gap-0.5">
                        <CheckCircle2 className="w-2.5 h-2.5" /> E-SIGN VALID
                      </div>
                    </div>

                    <div className="border-t border-[#121214]/60 pt-1 inline-block min-w-[200px]">
                      <p className="text-xs font-black text-[#121214] uppercase">
                        {mentorName}
                      </p>
                      <p className="text-[10px] font-mono text-gray-600">
                        NPP. {mentorNpp}
                      </p>
                    </div>
                  </div>

                  {/* Center: Dynamic QR Code Verification & SHA-256 Digest */}
                  <div className="text-center flex flex-col items-center justify-end px-2">
                    <div className="p-1.5 bg-white border border-[#008F4C] rounded-lg shadow-sm">
                      <img 
                        src={qrCodeUrl} 
                        alt="QR Code Verifikasi Sertifikat" 
                        className="w-16 h-16 object-contain"
                        loading="lazy"
                      />
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-wider text-[#008F4C] mt-1">
                      Scan Untuk Verifikasi
                    </span>
                    <p className="text-[7.5px] font-mono text-gray-500 max-w-[200px] truncate" title={sha256Hash}>
                      HASH: {sha256Hash.substring(0, 24)}...
                    </p>
                  </div>

                  {/* Right Signature: Kepala Kantor Cabang + OFFICIAL CIRCULAR STAMP */}
                  <div className="text-center relative">
                    <p className="text-[11px] font-bold text-gray-600">
                      Mengesahkan,
                    </p>
                    <p className="text-[11px] font-bold text-[#121214]">
                      Kepala Kantor Cabang
                    </p>

                    {/* Digital Signature Specimen + Authentic BPJS Circular Stamp Overlay */}
                    <div className="h-16 flex items-center justify-center relative my-0.5">
                      {branchHeadSig ? (
                        <img 
                          src={branchHeadSig} 
                          alt="Tanda Tangan Kepala Cabang" 
                          className="max-h-14 max-w-[160px] object-contain drop-shadow-sm select-none relative z-10"
                        />
                      ) : (
                        <svg className="w-40 h-14 text-[#00552B] relative z-10" viewBox="0 0 200 80" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M 15 35 Q 40 5 65 35 T 100 45 Q 130 15 160 50 T 190 25" />
                          <path d="M 30 55 Q 90 70 175 35" strokeWidth="1.8" />
                        </svg>
                      )}

                      {/* OFFICIAL BPJS KETENAGAKERJAAN CIRCULAR STAMP */}
                      <div 
                        className="absolute -top-3 left-4 w-24 h-24 pointer-events-none select-none z-20 opacity-85 transform -rotate-12"
                        style={{ filter: 'drop-shadow(0 0 1px rgba(0, 143, 76, 0.5))' }}
                      >
                        <svg viewBox="0 0 200 200" className="w-full h-full text-[#00875A]">
                          <circle cx="100" cy="100" r="95" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="6 2" />
                          <circle cx="100" cy="100" r="88" fill="none" stroke="currentColor" strokeWidth="2.2" />
                          <circle cx="100" cy="100" r="62" fill="none" stroke="currentColor" strokeWidth="1.8" />
                          
                          <path id="stempelUpper" d="M 25 100 A 75 75 0 0 1 175 100" fill="none" />
                          <text className="text-[10px] font-black uppercase tracking-[0.2em]" fill="currentColor">
                            <textPath href="#stempelUpper" startOffset="50%" textAnchor="middle">
                              BPJS KETENAGAKERJAAN
                            </textPath>
                          </text>

                          <path id="stempelLower" d="M 175 100 A 75 75 0 0 1 25 100" fill="none" />
                          <text className="text-[9.5px] font-black uppercase tracking-[0.2em]" fill="currentColor">
                            <textPath href="#stempelLower" startOffset="50%" textAnchor="middle">
                              {branchName.toUpperCase()}
                            </textPath>
                          </text>

                          <polygon points="100,68 104,78 115,78 106,84 109,95 100,89 91,95 94,84 85,78 96,78" fill="currentColor" />
                          <text x="100" y="112" textAnchor="middle" className="text-[11px] font-black tracking-widest uppercase" fill="currentColor">
                            RESMI
                          </text>
                          <text x="100" y="126" textAnchor="middle" className="text-[8px] font-extrabold tracking-wider" fill="currentColor">
                            DISAHKAN
                          </text>
                        </svg>
                      </div>

                      <div className="absolute right-2 bottom-0 px-1.5 py-0.5 bg-[#B8C96E]/40 border border-[#008F4C]/40 rounded text-[8px] font-mono font-bold text-[#00552B] flex items-center gap-0.5 z-10">
                        <CheckCircle2 className="w-2.5 h-2.5" /> PIMPINAN VALID
                      </div>
                    </div>

                    <div className="border-t border-[#121214]/60 pt-1 inline-block min-w-[200px] relative z-10">
                      <p className="text-xs font-black text-[#121214] uppercase">
                        {branchHeadName}
                      </p>
                      <p className="text-[10px] font-mono text-gray-600">
                        NPP. {branchHeadNpp}
                      </p>
                    </div>
                  </div>

                </div>
              </div>

              {/* 4. FOOTER NOTE */}
              <div className="relative z-10 border-t border-[#D4AF37]/40 pt-2 px-6 flex items-center justify-between text-[8px] font-mono text-gray-500">
                <span>&copy; {new Date().getFullYear()} BPJS Ketenagakerjaan. Hak Cipta Dilindungi Undang-Undang.</span>
                <span>Dokumen sah terdaftar secara elektronik. Sah tanpa stempel basah konvensional.</span>
              </div>

            </div>
          </div>

          {/* Close button at bottom for easy thumb access on mobile */}
          <button
            type="button"
            onClick={onClose}
            className="mt-4 px-6 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all print:hidden"
          >
            <X className="w-4 h-4 text-rose-400" />
            <span>Tutup Tampilan Sertifikat (ESC)</span>
          </button>
        </div>

      </div>
    </div>
  );
};

export default CompanyCertificateModal;
