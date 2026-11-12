import React, { useState, useRef, useEffect } from 'react';
import { X, QrCode, Download, Copy, Check, Sparkles } from 'lucide-react';
import { drawQrToCanvas, generateQrDataUrl } from '../../utils/qrMatrix';

const QRCodeModal = ({ isOpen, onClose, user }) => {
  const [copied, setCopied] = useState(false);
  const qrCanvasRef = useRef(null);

  const participantName = user?.full_name || 'Peserta Magang';
  const participantNim = user?.unique_id || user?.nim || 'PESERTA';
  const referralCode = `BPJSTK-BPU-${participantNim}`;
  const referralUrl = `https://bpjsketenagakerjaan.go.id/bpu/daftar?ref=${referralCode}`;

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handleEsc);

    if (qrCanvasRef.current) {
      const ctx = qrCanvasRef.current.getContext('2d');
      if (ctx) {
        drawQrToCanvas(ctx, referralUrl, 0, 0, 220, { fgColor: '#121214', bgColor: '#F5F4F0' });
      }
    }
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, referralUrl, onClose]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadQR = async () => {
    try {
      const dataUrl = qrCanvasRef.current
        ? qrCanvasRef.current.toDataURL('image/png')
        : await generateQrDataUrl(referralUrl, { width: 320 });
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `QR_Referral_${referralCode}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('QR download failed:', err);
    }
  };

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overscroll-contain animate-in fade-in duration-150"
    >
      <div className="bg-[#F5F4F0] border-2 border-[#121214] rounded-2xl shadow-[6px_6px_0px_#121214] w-full max-w-md max-h-[92vh] overflow-y-auto overscroll-contain flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b-2 border-[#121214] bg-[#BDD4F2]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white border-2 border-[#121214] flex items-center justify-center shadow-[2px_2px_0px_#121214]">
              <QrCode className="w-5 h-5 text-[#121214]" />
            </div>
            <div>
              <h3 className="font-black text-lg text-[#121214] leading-tight">QR Code Referral BPU</h3>
              <p className="text-xs font-medium text-[#121214]/80">Pendaftaran Mandiri Pekerja Informal</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg border-2 border-[#121214] bg-white hover:bg-red-50 text-[#121214] transition-colors shadow-[2px_2px_0px_#121214]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col items-center text-center space-y-4">
          
          {/* Badge */}
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#FCE373] border-2 border-[#121214] text-xs font-black shadow-[2px_2px_0px_#121214]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Referral Resmi Peserta Lapangan</span>
          </div>

          {/* QR Card Container */}
          <div className="p-5 bg-white border-2 border-[#121214] rounded-2xl shadow-[4px_4px_0px_#121214] flex flex-col items-center">
            <canvas
              ref={qrCanvasRef}
              width={220}
              height={220}
              aria-label={`QR Code ${referralCode}`}
              className="w-48 h-48 rounded-lg border-2 border-[#121214] p-2 bg-[#F5F4F0]"
            />
            <div className="mt-3">
              <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Kode Unik Anda</span>
              <p className="font-mono font-black text-sm text-[#121214] bg-[#FCE373] px-2.5 py-1 rounded-md border border-[#121214] mt-0.5">
                {referralCode}
              </p>
            </div>
          </div>

          {/* Mentee info */}
          <div className="w-full bg-white p-3 rounded-xl border-2 border-[#121214] shadow-[2px_2px_0px_#121214] text-left text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-500">Nama Peserta:</span>
              <strong className="text-[#121214]">{participantName}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">NIM / ID Magang:</span>
              <span className="font-mono font-bold text-[#121214]">{participantNim}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-gray-100">
              <span className="text-gray-500">Tracking Otomatis:</span>
              <span className="text-emerald-700 font-black">Aktif (Live Terhubung ke Akuisisi)</span>
            </div>
          </div>

          <p className="text-[11px] text-gray-600 leading-relaxed px-2">
            Perlihatkan QR ini kepada calon peserta di pasar atau sentra UMKM. Setiap pekerja yang scan & mendaftar akan otomatis tercatat sebagai capaian akuisisi Anda.
          </p>

        </div>

        {/* Actions */}
        <div className="p-4 border-t-2 border-[#121214] bg-white grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleCopyLink}
            className="flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-xl border-2 border-[#121214] bg-[#F5F4F0] hover:bg-[#FCE373] font-black text-xs text-[#121214] shadow-[2px_2px_0px_#121214] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-700" />
                <span>Link Tersalin!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Salin Tautan</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleDownloadQR}
            className="flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-xl border-2 border-[#121214] bg-[#B8C96E] hover:bg-[#a6b85c] font-black text-xs text-[#121214] shadow-[2px_2px_0px_#121214] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Unduh QR (PNG)</span>
          </button>
        </div>

      </div>
    </div>
  );
};

export default QRCodeModal;
