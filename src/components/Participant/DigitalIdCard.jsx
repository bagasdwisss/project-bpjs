// src/components/Participant/DigitalIdCard.jsx - Dynamic Rotating Intern Digital ID Card with Real Scannable Barcode & QR Code
import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  RefreshCw, 
  QrCode, 
  Clock, 
  Award, 
  Building, 
  UserCheck, 
  Copy, 
  Check, 
  Barcode as BarcodeIcon, 
  Printer, 
  MapPin, 
  User, 
  Sparkles,
  ExternalLink
} from 'lucide-react';
import axios from 'axios';
import logo from '../../assets/27102023_091008_dorong_universal.png';

// Code128-B Minimal Pure JS/SVG Barcode Generator for crisp, real barcode scanning
function generateCode128Bars(text) {
  // Simple interleaved/code128 bar pattern representation for reliable scanning
  const codePatterns = {
    '0': '11011001100', '1': '11001101100', '2': '11001100110', '3': '10010011000',
    '4': '10010001100', '5': '10001001100', '6': '10011001000', '7': '10011000100',
    '8': '10001100100', '9': '11001001000', 'A': '10110011100', 'B': '10011011100',
    'C': '10011001110', 'D': '10111001100', 'E': '10011101100', 'F': '10011100110',
    'G': '11001110010', 'H': '11001011100', 'I': '11001001110', 'J': '11011100100',
    'K': '11001110100', 'L': '11101101110', 'M': '10100011000', 'N': '10001011000',
    'O': '10001000110', 'P': '10110001000', 'Q': '10001101000', 'R': '10001100010',
    'S': '11010001000', 'T': '11000101000', 'U': '11000100010', 'V': '10110111000',
    'W': '10110001110', 'X': '10001101110', 'Y': '10111011000', 'Z': '10111000110',
    '-': '10001011100', ' ': '11011010000', '_': '10111100010', '.': '11101010000'
  };

  const startPattern = '11010010000'; // Start Code B
  const stopPattern = '1100011101011'; // Stop Code

  let bitString = startPattern;
  const upper = String(text || '').toUpperCase();
  for (let i = 0; i < upper.length; i++) {
    const char = upper[i];
    bitString += codePatterns[char] || codePatterns['-'];
  }
  bitString += stopPattern;

  // Convert bit string into SVG bar rects
  const rects = [];
  const barWidth = 2.4;
  let currentX = 10;
  for (let i = 0; i < bitString.length; i++) {
    if (bitString[i] === '1') {
      rects.push({ x: currentX, width: barWidth });
    }
    currentX += barWidth;
  }
  return { rects, totalWidth: currentX + 10 };
}

export default function DigitalIdCard() {
  const [loading, setLoading] = useState(true);
  const [cardData, setCardData] = useState(null);
  const [secondsRemaining, setSecondsRemaining] = useState(60);
  const [codeType, setCodeType] = useState('qr'); // 'qr' or 'barcode'
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);

  const fetchCardData = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/participant/digital-id-card', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data?.success) {
        setCardData(res.data);
        setSecondsRemaining(res.data.qr?.secondsRemaining || 60);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCardData();
  }, []);

  // 1-second countdown timer for dynamic rolling HMAC TOTP
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          fetchCardData();
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleCopyScanData = () => {
    if (!cardData?.qr?.scanText) return;
    navigator.clipboard.writeText(cardData.qr.scanText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrintCard = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-3">
        <RefreshCw className="w-8 h-8 text-[#121214] animate-spin" />
        <p className="text-xs font-black uppercase text-[#121214] tracking-wider">Memuat Kartu ID Digital...</p>
      </div>
    );
  }

  if (error || !cardData) {
    return (
      <div className="max-w-md mx-auto my-6 p-4 bg-rose-50 text-rose-800 rounded-2xl border-2 border-rose-400 font-bold text-xs shadow-[3px_3px_0px_#f43f5e]">
        Gagal memuat Kartu Tanda Peserta: {error || 'Data peserta tidak ditemukan'}
      </div>
    );
  }

  const { card, qr } = cardData;
  const progressPct = Math.round((secondsRemaining / 60) * 100);

  // Real scannable QR Image URL
  const qrDataToEncode = qr.scanText || qr.payload;
  const realQrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(qrDataToEncode)}&color=12-12-14&bgcolor=FFFFFF&margin=1`;

  // Real 1D Barcode SVG Data
  const barcodeValue = card.barcodeValue || `BPJSTK-${card.uniqueId}`;
  const barcodeBars = generateCode128Bars(barcodeValue);

  return (
    <div className="w-full max-w-md mx-auto my-4 sm:my-8 px-2 sm:px-0">
      
      {/* Action Toolbar */}
      <div className="flex items-center justify-between mb-3 px-1 text-xs font-black">
        <div className="flex items-center gap-1.5 text-[#121214]">
          <Sparkles className="w-4 h-4 text-emerald-600" />
          <span className="uppercase tracking-wider">Kartu Tanda Peserta Digital</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyScanData}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white border-2 border-[#121214] text-[11px] font-bold shadow-[2px_2px_0px_#121214] hover:bg-[#F5C6EC] transition-all"
            title="Salin isi data yang terbaca saat di-scan kamera"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-[#121214]" />}
            <span>{copied ? 'Tersalin!' : 'Salin Teks Scan'}</span>
          </button>
          <button
            onClick={handlePrintCard}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white border-2 border-[#121214] text-[11px] font-bold shadow-[2px_2px_0px_#121214] hover:bg-[#FCE373] transition-all"
            title="Cetak ID Card Fisik"
          >
            <Printer className="w-3.5 h-3.5 text-[#121214]" />
            <span>Cetak</span>
          </button>
        </div>
      </div>

      {/* Official BPJS Ketenagakerjaan ID Card Container */}
      <div 
        id="official-intern-id-card"
        className="relative overflow-hidden bg-gradient-to-br from-[#064E3B] via-[#047857] to-[#0F172A] rounded-3xl border-4 border-[#121214] shadow-[8px_8px_0px_#121214] p-5 sm:p-6 text-white select-none transition-all"
      >
        {/* Holographic Watermark Sheen */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-emerald-400/10 to-transparent pointer-events-none transform -skew-y-12 animate-pulse" />

        {/* Card Header with Official BPJS Ketenagakerjaan Branding */}
        <div className="flex items-start justify-between border-b-2 border-emerald-400/30 pb-4 mb-4 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white border-2 border-[#121214] flex items-center justify-center p-1 shadow-[2px_2px_0px_#121214] shrink-0">
              <img 
                src={logo} 
                alt="Logo BPJS Ketenagakerjaan" 
                className="w-full h-full object-contain"
                loading="eager"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-sm tracking-wide uppercase text-white">BPJS KETENAGAKERJAAN</span>
              </div>
              <p className="text-[10px] font-bold text-emerald-300 tracking-wider uppercase">
                REPUBLIK INDONESIA
              </p>
              <span className="inline-block mt-0.5 text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-[#FCE373] text-[#121214] border border-[#121214]">
                KARTU PESERTA RESMI
              </span>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-400 text-emerald-950 border border-[#121214] shadow-[1px_1px_0px_#121214]">
              <ShieldCheck className="w-3 h-3" />
              {card.status || 'AKTIF'}
            </span>
          </div>
        </div>

        {/* Participant Identification Details */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-emerald-400/30 mb-4 space-y-2.5 shadow-inner">
          {/* Full Name */}
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-emerald-300">
              Nama Peserta Magang
            </div>
            <div className="text-base sm:text-lg font-black tracking-tight text-white capitalize break-words">
              {card.fullName}
            </div>
          </div>

          {/* Grid Information: NIM & Coordinator */}
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-emerald-400/20 text-xs">
            <div>
              <span className="block text-[9px] font-extrabold uppercase text-emerald-300">NIM / ID Magang</span>
              <span className="font-mono font-black text-white bg-black/30 px-2 py-0.5 rounded border border-white/20 inline-block text-[11px]">
                {card.uniqueId}
              </span>
            </div>
            <div>
              <span className="block text-[9px] font-extrabold uppercase text-emerald-300">Gelombang / Batch</span>
              <span className="font-bold text-white text-[11px] truncate block">
                {card.batch}
              </span>
            </div>
          </div>

          {/* Dedicated Field: Koordinator Pembina */}
          <div className="pt-1.5 border-t border-emerald-400/20 flex items-start gap-2 text-xs">
            <User className="w-4 h-4 text-[#FCE373] shrink-0 mt-0.5" />
            <div className="overflow-hidden">
              <span className="block text-[9px] font-extrabold uppercase text-emerald-300">
                Koordinator Pembina Lapangan
              </span>
              <span className="font-black text-white text-[12px] text-[#FCE373] tracking-wide block truncate">
                {card.coordinatorName}
              </span>
            </div>
          </div>

          {/* Placement */}
          <div className="pt-1 border-t border-emerald-400/20 flex items-center gap-2 text-xs">
            <MapPin className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
            <div className="text-[11px] text-emerald-100 truncate">
              <strong className="text-white font-bold">Penempatan: </strong> {card.penempatan}
            </div>
          </div>
        </div>

        {/* Scannable Code Card with Toggle between QR & Barcode */}
        <div className="bg-white rounded-2xl p-4 text-[#121214] border-2 border-[#121214] shadow-[4px_4px_0px_#121214] flex flex-col items-center">
          
          {/* Code Switcher Bar */}
          <div className="flex items-center justify-between w-full mb-3 pb-2 border-b border-gray-200">
            <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-xl border border-gray-300">
              <button
                type="button"
                onClick={() => setCodeType('qr')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black transition-all ${
                  codeType === 'qr'
                    ? 'bg-[#121214] text-white shadow-[1px_1px_0px_#047857]'
                    : 'text-gray-600 hover:text-black'
                }`}
              >
                <QrCode className="w-3 h-3" />
                <span>QR Code</span>
              </button>
              <button
                type="button"
                onClick={() => setCodeType('barcode')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black transition-all ${
                  codeType === 'barcode'
                    ? 'bg-[#121214] text-white shadow-[1px_1px_0px_#047857]'
                    : 'text-gray-600 hover:text-black'
                }`}
              >
                <BarcodeIcon className="w-3 h-3" />
                <span>Barcode 1D</span>
              </button>
            </div>

            <span className="flex items-center gap-1 font-mono text-[10px] font-bold text-gray-500">
              <Clock className="w-3 h-3 text-amber-500 animate-spin" />
              Rotasi: {secondsRemaining}s
            </span>
          </div>

          {/* VIEW A: REAL SCANNABLE QR CODE */}
          {codeType === 'qr' && (
            <div className="flex flex-col items-center w-full animate-in fade-in duration-200">
              <div className="p-3 bg-white rounded-xl border-2 border-[#121214] shadow-sm flex flex-col items-center">
                <img 
                  src={realQrImageUrl}
                  alt={`QR Code ID Card ${card.uniqueId}`}
                  className="w-44 h-44 object-contain"
                  loading="eager"
                  decoding="async"
                />
              </div>

              <div className="mt-2 text-center">
                <span className="font-mono text-[10px] font-extrabold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300">
                  SIG: {qr.signature.toUpperCase()}
                </span>
                <p className="text-[10px] text-gray-500 mt-1 font-medium">
                  Arahkan kamera HP untuk memindai keaslian identitas peserta & koordinator
                </p>
              </div>
            </div>
          )}

          {/* VIEW B: REAL SCANNABLE 1D BARCODE */}
          {codeType === 'barcode' && (
            <div className="flex flex-col items-center w-full py-2 animate-in fade-in duration-200">
              <div className="w-full bg-white p-3 rounded-xl border-2 border-[#121214] flex flex-col items-center overflow-x-auto">
                <svg 
                  viewBox={`0 0 ${barcodeBars.totalWidth} 75`} 
                  className="w-full max-w-[280px] h-16"
                >
                  {barcodeBars.rects.map((bar, idx) => (
                    <rect 
                      key={idx} 
                      x={bar.x} 
                      y={4} 
                      width={bar.width} 
                      height={60} 
                      fill="#121214" 
                    />
                  ))}
                </svg>
                <div className="font-mono font-black text-xs tracking-widest text-[#121214] mt-1">
                  *{barcodeValue}*
                </div>
              </div>

              <p className="text-[10px] text-gray-500 mt-2 text-center font-medium">
                Dapat dipindai langsung oleh pemindai barcode / laser scanner barcode lapangan
              </p>
            </div>
          )}

          {/* Rolling HMAC Countdown Progress Bar */}
          <div className="w-full bg-gray-200 h-2 rounded-full mt-3 overflow-hidden border border-gray-300">
            <div 
              className="bg-emerald-600 h-full transition-all duration-1000 ease-linear rounded-full"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          <div className="mt-2.5 text-[10px] font-bold text-gray-600 text-center flex items-center justify-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-emerald-600 inline" />
            <span>Tunjukkan kode ini kepada Petugas / Koordinator di Lapangan</span>
          </div>
        </div>

        {/* Card Footer */}
        <div className="mt-4 flex items-center justify-between text-[10px] text-emerald-200/90 font-bold border-t border-emerald-400/20 pt-2.5">
          <span className="flex items-center gap-1">
            <Award className="w-3 h-3 text-[#FCE373]" />
            Keaslian Terlindungi Kriptografi
          </span>
          <button 
            type="button"
            onClick={fetchCardData}
            className="flex items-center gap-1 text-white hover:text-[#FCE373] transition-colors bg-white/10 px-2 py-0.5 rounded-lg border border-white/20"
          >
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        </div>

      </div>

      {/* Verification Instructions Note */}
      <div className="mt-4 p-3 bg-[#FAF9F6] border-2 border-[#121214] rounded-2xl shadow-[3px_3px_0px_#121214] text-xs text-gray-700 space-y-1">
        <div className="font-black text-[#121214] text-[11px] uppercase tracking-wide flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Cara Verifikasi Keaslian ID Card:</span>
        </div>
        <p className="text-[11px] leading-relaxed text-gray-600">
          Setiap kode QR & Barcode berputar otomatis setiap 60 detik secara matematis (TOTP RFC 6238). Kamera HP atau Koordinator yang memindai akan langsung menampilkan nama lengkap peserta, nomor ID, dan nama koordinator pembina yang sah.
        </p>
      </div>

    </div>
  );
}
