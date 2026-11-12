import React, { useRef, useState, useEffect } from 'react';
import { 
  X, 
  Printer, 
  Download, 
  ShieldCheck, 
  Award, 
  CheckCircle2, 
  Lock, 
  Maximize2, 
  Minimize2, 
  Check,
  Sparkles
} from 'lucide-react';
import { downloadCertificateDirectly } from '../../utils/certificateDownloader';
import { generateQrDataUrl } from '../../utils/qrMatrix';

/**
 * CompanyCertificateModal
 * Official BPJS Ketenagakerjaan Certificate Component
 * 
 * Automatically applies the distinct visual design, title, and legal wording 
 * based on Certificate Type:
 * 1. Sertifikat Kelulusan: Emerald Classic BPJSTK
 * 2. Sertifikat Prestasi: Royal Gold & Navy Elite
 * 3. Sertifikat Partisipasi: Modern Geometric Platinum
 */
const CompanyCertificateModal = ({ isOpen, onClose, certificate, participant }) => {
  const printRef = useRef(null);
  const wrapperRef = useRef(null);
  const [fitScreen, setFitScreen] = useState(true);
  const [containerWidth, setContainerWidth] = useState(() =>
    typeof window !== 'undefined' ? Math.min(1050, Math.max(280, window.innerWidth - 32)) : 1050
  );
  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');

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

  const certNumberForQr = certificate?.certificate_number || `BPJSTK/MAGANG/${new Date().getFullYear()}/001`;
  const verifyUrlForQr = `${typeof window !== 'undefined' ? window.location.origin : ''}/verify-certificate/${encodeURIComponent(certNumberForQr)}`;

  useEffect(() => {
    if (!isOpen || !certificate) return;
    let active = true;
    generateQrDataUrl(verifyUrlForQr, { width: 240, colorDark: '#00552B', colorLight: '#FFFFFF' })
      .then((url) => { if (active) setQrCodeUrl(url); })
      .catch(() => {});
    return () => { active = false; };
  }, [isOpen, certificate, verifyUrlForQr]);

  if (!isOpen || !certificate) return null;

  const certNumber = certificate.certificate_number || `BPJSTK/MAGANG/${new Date().getFullYear()}/001`;
  const recipientName = certificate.participant_name || participant?.full_name || 'Peserta Magang';
  const recipientNim = certificate.participant_nim || participant?.unique_id || participant?.nim || '-';
  const penempatan = certificate.penempatan || participant?.penempatan || 'Bidang Kepesertaan & Pelayanan';
  const batchName = certificate.batch_name || 'Program Magang Industri';
  const score = certificate.score_average !== undefined && certificate.score_average !== null ? Number(certificate.score_average).toFixed(1) : '-';
  
  // Format Date (ID - WIB)
  const issueDateFormatted = new Date(certificate.issue_date || certificate.created_at || Date.now()).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta'
  });

  // Dynamic Mentor & Institutional Leadership
  const mentorName = certificate.mentor_name || certificate.coordinator_name || participant?.coordinator_name || certificate.default_coordinator_name || 'Mentor Pembimbing';
  const mentorNpp = certificate.mentor_npp || certificate.coordinator_npp || participant?.coordinator_npp || certificate.default_coordinator_npp || '-';
  const mentorSig = certificate.mentor_signature || null;
  
  const branchHeadName = certificate.branch_head_name || 'Kepala Kantor Cabang';
  const branchHeadNpp = certificate.branch_head_npp || '-';
  const branchHeadSig = certificate.branch_head_signature || null;

  const branchName = certificate.branch_name || 'BPJS Ketenagakerjaan Kantor Cabang';
  const branchAddress = certificate.branch_address || '';

  const sha256Hash = certificate.digital_signature_hash || certificate.digital_signature || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

  const verifyUrl = verifyUrlForQr;

  // =========================================================================
  // DEDICATED DESIGN & WORDING BY CERTIFICATE TYPE
  // =========================================================================
  const rawType = (
    certificate.certificate_type ||
    certificate.type ||
    'Kelulusan'
  ).toLowerCase();

  let certTypeLabel = 'Kelulusan';
  let theme = 'emerald';
  let headerBadge = 'SURAT TANDA TAMAT PROGRAM';
  let mainTitle = 'SERTIFIKAT KELULUSAN';
  let subTitle = 'Certificate of Internship Completion';
  let statementText1 = 'Telah berhasil menyelesaikan seluruh rangkaian program Praktik Kerja Lapangan / Magang Industri Terstruktur';
  let statementText2 = `pada BPJS Ketenagakerjaan ${branchName} (${batchName}) dengan predikat kelulusan:`;
  let displayPredicate = certificate.predicate || 'Sangat Memuaskan (Grade A)';

  if (rawType.includes('prestasi') || rawType.includes('achievement')) {
    certTypeLabel = 'Prestasi';
    theme = 'royal_gold';
    headerBadge = 'PENGHARGAAN ATAS CAPAIAN KINERJA TERBAIK';
    mainTitle = 'SERTIFIKAT PRESTASI';
    subTitle = 'Certificate of Excellence & Outstanding Achievement';
    statementText1 = 'Diberikan sebagai bentuk penghargaan istimewa atas dedikasi luar biasa, kedisiplinan prima, dan prestasi kerja tertinggi';
    statementText2 = `selama program magang industri pada BPJS Ketenagakerjaan ${branchName} (${batchName}) dengan capaian:`;
    displayPredicate = certificate.predicate || 'Pencapaian Khusus / Prestasi Terbaik (Grade A+)';
  } else if (rawType.includes('partisipasi') || rawType.includes('participation')) {
    certTypeLabel = 'Partisipasi';
    theme = 'platinum';
    headerBadge = 'SURAT TANDA KEPESERTAAN & DEDIKASI';
    mainTitle = 'SERTIFIKAT PARTISIPASI';
    subTitle = 'Certificate of Active Internship Participation';
    statementText1 = 'Diberikan atas kontribusi aktif, dedikasi penuh, dan partisipasi loyal dalam kegiatan operasional serta pelayanan lapangan';
    statementText2 = `pada BPJS Ketenagakerjaan ${branchName} (${batchName}) dengan status partisipasi:`;
    displayPredicate = certificate.predicate || 'Partisipasi Aktif & Berdedikasi';
  }

  // Visual Palette variables based on Type
  const isRoyal = theme === 'royal_gold';
  const isPlatinum = theme === 'platinum';

  const primaryColor = isRoyal ? '#0A192F' : isPlatinum ? '#1E293B' : '#00552B';
  const accentColor = isRoyal ? '#C5A059' : isPlatinum ? '#0D9488' : '#D4AF37';
  const borderColorPrimary = isRoyal ? '#0A192F' : isPlatinum ? '#1E293B' : '#008F4C';
  const borderColorSecondary = isRoyal ? '#C5A059' : isPlatinum ? '#0D9488' : '#D4AF37';

  const handlePrint = () => {
    window.print();
  };

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
        mentorSignature: mentorSig,
        certificateType: certTypeLabel,
        predicate: displayPredicate
      });
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to download certificate directly:', err);
      window.open(`/api/certificates/download/${encodeURIComponent(certNumber)}`, '_blank');
    } finally {
      setDownloading(false);
    }
  };

  const isMobile = containerWidth < 1030;
  const scale = isMobile && fitScreen ? Math.max(0.32, (containerWidth - 20) / 1000) : 1;

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static"
      role="dialog"
      aria-modal="true"
      aria-label="Pratinjau Sertifikat Resmi BPJSTK"
    >
      {/* Floating Top-Right Close Button */}
      <button
        type="button"
        onClick={onClose}
        className="fixed top-3 right-3 sm:top-5 sm:right-5 z-60 w-10 h-10 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-2xl border-2 border-white cursor-pointer active:scale-90 transition-all print:hidden"
        title="Tutup Sertifikat (ESC)"
        aria-label="Tutup Sertifikat"
      >
        <X className="w-5 h-5 stroke-[2.5]" />
      </button>

      {/* Print Specific CSS */}
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
        
        {/* Modal Action Bar */}
        <div className="no-print bg-[#121214] text-white px-3 sm:px-6 py-3 sm:py-4 flex flex-wrap items-center justify-between gap-2.5 border-b border-[#2C2C30]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div 
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-sm shrink-0 font-bold"
              style={{ backgroundColor: primaryColor }}
            >
              <Award className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="font-extrabold text-xs sm:text-sm text-white flex items-center gap-1.5 truncate">
                <span>{mainTitle}</span>
                <span 
                  className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black border"
                  style={{ backgroundColor: `${accentColor}25`, borderColor: accentColor, color: accentColor }}
                >
                  {certTypeLabel}
                </span>
              </h3>
              <p className="text-[10px] sm:text-[11px] text-gray-400 font-mono truncate">No: {certNumber}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end">
            {/* Mobile View Toggle */}
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
              title="Unduh langsung file sertifikat asli format resmi"
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

        {/* Certificate Viewport */}
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
              className="w-[1000px] h-[680px] shrink-0 text-[#121214] p-8 relative shadow-2xl flex flex-col justify-between select-none print:shadow-none print:w-full print:h-full print:transform-none"
              style={{
                backgroundColor: isPlatinum ? '#F8FAFC' : isRoyal ? '#FAFAF7' : '#FFFDF9',
                transform: scale < 1 ? `scale(${scale})` : 'none',
                transformOrigin: 'top left',
                backgroundImage: isRoyal 
                  ? 'radial-gradient(circle at 50% 50%, rgba(197, 160, 89, 0.05) 0%, rgba(10, 25, 47, 0.04) 100%)' 
                  : isPlatinum 
                  ? 'radial-gradient(circle at 50% 50%, rgba(13, 148, 136, 0.04) 0%, rgba(30, 41, 59, 0.05) 100%)'
                  : 'radial-gradient(circle at 50% 50%, rgba(0, 143, 76, 0.02) 0%, rgba(212, 175, 55, 0.04) 100%)'
              }}
            >
              {/* Type-Specific Decorative Borders */}
              <div 
                className="absolute inset-4 rounded-xl pointer-events-none" 
                style={{ border: `3.5px solid ${borderColorPrimary}` }}
              />
              <div 
                className="absolute inset-6 rounded-lg pointer-events-none" 
                style={{ border: `1.5px solid ${borderColorSecondary}` }}
              />
              
              {/* Corner Ornaments */}
              <div className="absolute top-4 left-4 w-10 h-10 border-t-4 border-l-4 pointer-events-none" style={{ borderColor: borderColorPrimary }} />
              <div className="absolute top-4 right-4 w-10 h-10 border-t-4 border-r-4 pointer-events-none" style={{ borderColor: borderColorPrimary }} />
              <div className="absolute bottom-4 left-4 w-10 h-10 border-b-4 border-l-4 pointer-events-none" style={{ borderColor: borderColorPrimary }} />
              <div className="absolute bottom-4 right-4 w-10 h-10 border-b-4 border-r-4 pointer-events-none" style={{ borderColor: borderColorPrimary }} />

              {/* Watermark in Center */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.035] overflow-hidden">
                <div className="text-center transform -rotate-12 select-none">
                  <span className="text-8xl font-black tracking-widest block" style={{ color: primaryColor }}>BPJS</span>
                  <span className="text-5xl font-black tracking-widest block" style={{ color: primaryColor }}>KETENAGAKERJAAN</span>
                  <span className="text-2xl font-bold tracking-widest text-[#121214] block mt-2 uppercase">{mainTitle}</span>
                </div>
              </div>

              {/* 1. HEADER (Kop Surat Resmi BPJS Ketenagakerjaan) */}
              <div className="relative z-10 pt-2 px-6">
                <div className="flex items-center justify-between pb-3" style={{ borderBottom: `2px solid ${borderColorPrimary}` }}>
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
                    <div className="pl-3 text-left" style={{ borderLeft: `2px solid ${accentColor}` }}>
                      <h2 className="text-base font-black tracking-wider leading-tight uppercase font-serif" style={{ color: primaryColor }}>
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

                  {/* Right: Security Credentials */}
                  <div className="text-right">
                    <div 
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider"
                      style={{ 
                        backgroundColor: `${primaryColor}15`, 
                        border: `1px solid ${primaryColor}40`,
                        color: primaryColor 
                      }}
                    >
                      <Lock className="w-3 h-3" />
                      <span>Dokumen Elektronik Resmi</span>
                    </div>
                    <p className="text-[9px] font-mono font-bold text-gray-500 mt-1">
                      Kategori: {certTypeLabel.toUpperCase()}
                    </p>
                  </div>
                </div>

                {/* Ribbon Underline */}
                <div 
                  className="w-full h-[2px] mt-1" 
                  style={{ background: `linear-gradient(to right, transparent, ${accentColor}, transparent)` }}
                />
              </div>

              {/* 2. CERTIFICATE TITLE & STATEMENT (CLEARLY STATES CERTIFICATE TYPE) */}
              <div className="relative z-10 text-center my-auto py-1">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] block" style={{ color: accentColor }}>
                  {headerBadge}
                </span>
                <h1 className="text-3xl sm:text-4xl font-black tracking-wide font-serif uppercase mt-1" style={{ color: primaryColor }}>
                  {mainTitle}
                </h1>
                <p className="text-[11px] font-serif italic text-gray-500 -mt-0.5 tracking-wider">
                  {subTitle}
                </p>
                <div 
                  className="inline-block mt-2 px-4 py-0.5 rounded-full"
                  style={{ backgroundColor: `${accentColor}15`, border: `1px solid ${accentColor}60` }}
                >
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
                  <h3 
                    className="text-2xl font-black text-[#121214] tracking-tight uppercase underline decoration-2 underline-offset-4"
                    style={{ textDecorationColor: primaryColor }}
                  >
                    {recipientName}
                  </h3>
                  <p className="text-xs font-mono text-gray-600 font-bold mt-1">
                    NIM / Registrasi: <span className="font-black" style={{ color: primaryColor }}>{recipientNim}</span> • Penempatan: <span className="font-bold text-[#121214]">{penempatan}</span>
                  </p>
                </div>

                {/* Dynamic Program Statement Text */}
                <p className="text-[11.5px] leading-relaxed text-gray-700 max-w-2xl mx-auto mt-2 font-normal">
                  {statementText1} <strong style={{ color: primaryColor }}>{branchName}</strong> ({batchName}) dengan capaian:
                </p>

                {/* Predicate & Final Score Pill */}
                <div className="flex items-center justify-center gap-3 mt-2">
                  <div 
                    className="px-4 py-1 rounded-lg text-white text-xs font-extrabold shadow-sm tracking-wide"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {displayPredicate}
                  </div>
                  <div 
                    className="px-3 py-1 rounded-lg text-xs font-mono font-black text-[#121214]"
                    style={{ backgroundColor: `${accentColor}15`, border: `1px solid ${accentColor}` }}
                  >
                    Indeks Prestasi: {score} / 100.0
                  </div>
                </div>
              </div>

              {/* 3. SIGNATURES & OFFICIAL COMPANY SEAL */}
              <div className="relative z-10 px-6 pb-2">
                <div className="grid grid-cols-3 items-end">
                  
                  {/* Left Signature: Mentor Pembimbing Magang */}
                  <div className="text-center relative">
                    <p className="text-[11px] font-bold text-gray-600">
                      Diterbitkan {issueDateFormatted}
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
                        <svg className="w-36 h-14" style={{ color: primaryColor }} viewBox="0 0 200 80" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M 20 50 Q 50 10 70 45 T 120 40 Q 140 20 160 55 T 185 30" />
                          <path d="M 40 40 Q 80 60 150 45" strokeWidth="1.5" />
                        </svg>
                      )}
                      <div 
                        className="absolute right-2 bottom-0 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold flex items-center gap-0.5"
                        style={{ backgroundColor: `${primaryColor}20`, border: `1px solid ${primaryColor}50`, color: primaryColor }}
                      >
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
                    <div 
                      className="p-1.5 bg-white rounded-lg shadow-sm"
                      style={{ border: `1px solid ${primaryColor}` }}
                    >
                      {qrCodeUrl ? (
                        <img 
                          src={qrCodeUrl} 
                          alt="QR Code Verifikasi Sertifikat" 
                          className="w-16 h-16 object-contain"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-slate-50 flex items-center justify-center text-[8px] font-mono text-gray-500">QR</div>
                      )}
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-wider mt-1" style={{ color: primaryColor }}>
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

                    {/* Digital Signature Specimen */}
                    <div className="h-16 flex items-center justify-center relative my-0.5">
                      {branchHeadSig ? (
                        <img 
                          src={branchHeadSig} 
                          alt="Tanda Tangan Kepala Cabang" 
                          className="max-h-14 max-w-[160px] object-contain drop-shadow-sm select-none relative z-10"
                        />
                      ) : (
                        <svg className="w-40 h-14 relative z-10" style={{ color: primaryColor }} viewBox="0 0 200 80" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M 15 35 Q 40 5 65 35 T 100 45 Q 130 15 160 50 T 190 25" />
                          <path d="M 30 55 Q 90 70 175 35" strokeWidth="1.8" />
                        </svg>
                      )}

                      {/* OFFICIAL BPJS KETENAGAKERJAAN CIRCULAR STAMP */}
                      <div 
                        className="absolute -top-3 left-4 w-24 h-24 pointer-events-none select-none z-20 opacity-85 transform -rotate-12"
                        style={{ filter: `drop-shadow(0 0 1px ${primaryColor}80)` }}
                      >
                        <svg viewBox="0 0 200 200" className="w-full h-full" style={{ color: primaryColor }}>
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

                      <div 
                        className="absolute right-2 bottom-0 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold flex items-center gap-0.5 z-10"
                        style={{ backgroundColor: `${primaryColor}20`, border: `1px solid ${primaryColor}50`, color: primaryColor }}
                      >
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
              <div 
                className="relative z-10 pt-2 px-6 flex items-center justify-between text-[8px] font-mono text-gray-500"
                style={{ borderTop: `1px solid ${accentColor}60` }}
              >
                <span>&copy; {new Date().getFullYear()} BPJS Ketenagakerjaan. Hak Cipta Dilindungi Undang-Undang.</span>
                <span>Dokumen sah terdaftar secara elektronik. Sah tanpa stempel basah konvensional.</span>
              </div>

            </div>
          </div>

          {/* Close button at bottom */}
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
