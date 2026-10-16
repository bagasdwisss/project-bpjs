import React, { useState } from 'react';
import { X, Calculator, ShieldCheck, HeartPulse, PiggyBank, Copy, Check, ChevronRight, Sparkles } from 'lucide-react';

const CalculatorModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const [wageTier, setWageTier] = useState(1000000); // Base wage for calculation
  const [includeJHT, setIncludeJHT] = useState(false);
  const [jhtAmount, setJhtAmount] = useState(20000);
  const [copied, setCopied] = useState(false);

  // Constants for BPU
  const jkkRate = 10000; // Flat base Rp 10.000 for standard informal worker
  const jkmRate = 6800;  // Flat base Rp 6.800
  const totalMonthlyFee = jkkRate + jkmRate + (includeJHT ? jhtAmount : 0);

  // Santunan Calculations
  const santunanKematianJKM = 42000000;
  const beasiswaMaksimal = 174000000;
  const stmbBulan1sd6 = wageTier; // 100% upah
  const stmbBulan7sd12 = wageTier; // 100% upah
  const cacatTotalTetap = 56 * wageTier + 12000000; // 56x upah + santunan berkala 24 bln x Rp 500rb

  const formatIDR = (num) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
  };

  const handleCopyPitch = () => {
    const pitchText = `Halo Bapak/Ibu! Lindungi diri dan keluarga dengan BPJS Ketenagakerjaan BPU:
💰 Iuran Hemat: Hanya ${formatIDR(totalMonthlyFee)}/bulan (${includeJHT ? 'JKK + JKM + JHT' : 'JKK + JKM'})!
🛡️ Manfaat Perlindungan Nyata:
1. Santunan Kematian (JKM): ${formatIDR(santunanKematianJKM)}
2. Beasiswa 2 Anak: s.d. ${formatIDR(beasiswaMaksimal)} (TK s.d. Sarjana S1)
3. Biaya Pengobatan Kecelakaan Kerja (JKK): TANPA BATAS (Unlimited sesuai medis)
4. Pengganti Upah Sakit/STMB: 100% upah (${formatIDR(stmbBulan1sd6)}/bulan)
${includeJHT ? `5. Tabungan Hari Tua (JHT): Terakumulasi dan dapat dicairkan saat pensiun` : ''}

Daftar mudah sekarang tanpa ribet, hubungi kami via WhatsApp ini!`;

    navigator.clipboard.writeText(pitchText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-[#F5F4F0] border-2 border-[#121214] rounded-2xl shadow-[6px_6px_0px_#121214] w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b-2 border-[#121214] bg-[#FCE373]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white border-2 border-[#121214] flex items-center justify-center shadow-[2px_2px_0px_#121214]">
              <Calculator className="w-5 h-5 text-[#121214]" />
            </div>
            <div>
              <h3 className="font-black text-lg text-[#121214] leading-tight">Kalkulator Simulasi Iuran & Manfaat</h3>
              <p className="text-xs font-medium text-[#121214]/80">Program BPJS Ketenagakerjaan Sektor BPU (Bukan Penerima Upah)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg border-2 border-[#121214] bg-white hover:bg-red-50 text-[#121214] transition-colors shadow-[2px_2px_0px_#121214]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
          
          {/* Preset Income Selector */}
          <div className="bg-white border-2 border-[#121214] rounded-xl p-4 shadow-[3px_3px_0px_#121214]">
            <label className="block text-xs font-black uppercase tracking-wider text-[#121214] mb-2">
              Estimasi Penghasilan / Upah Acuan per Bulan
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
              {[1000000, 2000000, 3000000, 5000000].map((tier) => (
                <button
                  key={tier}
                  type="button"
                  onClick={() => setWageTier(tier)}
                  className={`py-2 px-3 rounded-lg text-xs font-bold border-2 border-[#121214] transition-all ${
                    wageTier === tier
                      ? 'bg-[#121214] text-white shadow-[2px_2px_0px_#FCE373]'
                      : 'bg-[#F5F4F0] text-[#121214] hover:bg-[#FCE373]'
                  }`}
                >
                  {formatIDR(tier)}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between text-xs text-gray-600 bg-[#F5F4F0] p-2.5 rounded-lg border border-[#121214]/20">
              <span>Upah Terpilih: <strong className="text-[#121214]">{formatIDR(wageTier)}</strong></span>
              <span className="text-[11px] bg-[#BDD4F2] px-2 py-0.5 rounded border border-[#121214] font-bold text-[#121214]">
                Dasar Acuan STMB & Cacat
              </span>
            </div>
          </div>

          {/* Program Toggle (JKK + JKM vs + JHT) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div 
              onClick={() => setIncludeJHT(false)}
              className={`cursor-pointer p-4 rounded-xl border-2 border-[#121214] transition-all ${
                !includeJHT 
                  ? 'bg-[#B8C96E] shadow-[3px_3px_0px_#121214]' 
                  : 'bg-white opacity-80 hover:opacity-100'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-black uppercase text-[#121214]">Paket 2 Program</span>
                <span className="text-xs font-black bg-[#121214] text-white px-2 py-0.5 rounded">Populer</span>
              </div>
              <p className="text-sm font-bold text-[#121214]">JKK + JKM</p>
              <div className="mt-2 text-xl font-black text-[#121214]">Rp 16.800 <span className="text-xs font-semibold">/bln</span></div>
              <p className="text-[11px] text-[#121214]/80 mt-1">Perlindungan utama kecelakaan kerja dan kematian.</p>
            </div>

            <div 
              onClick={() => setIncludeJHT(true)}
              className={`cursor-pointer p-4 rounded-xl border-2 border-[#121214] transition-all ${
                includeJHT 
                  ? 'bg-[#F5C6EC] shadow-[3px_3px_0px_#121214]' 
                  : 'bg-white opacity-80 hover:opacity-100'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-black uppercase text-[#121214]">Paket 3 Program</span>
                <span className="text-xs font-black bg-[#121214] text-white px-2 py-0.5 rounded">+ Tabungan</span>
              </div>
              <p className="text-sm font-bold text-[#121214]">JKK + JKM + JHT</p>
              <div className="mt-2 text-xl font-black text-[#121214]">Rp 36.800 <span className="text-xs font-semibold">/bln</span></div>
              <p className="text-[11px] text-[#121214]/80 mt-1">Lengkap dengan tabungan hari tua terjamin aman.</p>
            </div>
          </div>

          {/* Benefits Grid */}
          <div className="bg-white border-2 border-[#121214] rounded-xl p-4 shadow-[3px_3px_0px_#121214] space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-[#121214] flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Rincian Manfaat Santunan Yang Diperoleh</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div className="p-3 bg-[#F5F4F0] rounded-lg border border-[#121214]/20 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Santunan Kematian (JKM)</span>
                  <div className="text-base font-black text-emerald-700 mt-0.5">{formatIDR(santunanKematianJKM)}</div>
                </div>
                <p className="text-[10px] text-gray-600 mt-1">Diberikan tunai ke ahli waris tanpa syarat masa iur lama.</p>
              </div>

              <div className="p-3 bg-[#F5F4F0] rounded-lg border border-[#121214]/20 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Beasiswa 2 Orang Anak</span>
                  <div className="text-base font-black text-blue-700 mt-0.5">s.d. {formatIDR(beasiswaMaksimal)}</div>
                </div>
                <p className="text-[10px] text-gray-600 mt-1">Dari jenjang TK sampai lulus Sarjana S1 perguruan tinggi.</p>
              </div>

              <div className="p-3 bg-[#F5F4F0] rounded-lg border border-[#121214]/20 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Biaya Perawatan Medis JKK</span>
                  <div className="text-base font-black text-purple-700 mt-0.5">UNLIMITED (Tanpa Batas)</div>
                </div>
                <p className="text-[10px] text-gray-600 mt-1">Sesuai kebutuhan medis di RS Pusat Layanan Kecelakaan Kerja.</p>
              </div>

              <div className="p-3 bg-[#F5F4F0] rounded-lg border border-[#121214]/20 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Pengganti Upah Sakit (STMB)</span>
                  <div className="text-base font-black text-amber-700 mt-0.5">{formatIDR(stmbBulan1sd6)} /bln</div>
                </div>
                <p className="text-[10px] text-gray-600 mt-1">100% upah selama 6 bulan pertama istirahat dokter.</p>
              </div>
            </div>
          </div>

        </div>

        {/* Footer with 1-Click WhatsApp Pitch Copy */}
        <div className="p-4 border-t-2 border-[#121214] bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-center sm:text-left">
            <span className="text-[11px] font-bold text-gray-500 uppercase">Total Iuran Peserta</span>
            <div className="text-xl font-black text-[#121214]">{formatIDR(totalMonthlyFee)} <span className="text-xs font-normal">/bulan</span></div>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleCopyPitch}
              className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl border-2 border-[#121214] bg-[#B8C96E] hover:bg-[#a6b85c] font-black text-xs text-[#121214] shadow-[3px_3px_0px_#121214] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-800" />
                  <span>Tersalin untuk WhatsApp!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Salin Ringkasan Prospek</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border-2 border-[#121214] bg-[#F5F4F0] hover:bg-gray-200 font-bold text-xs text-[#121214]"
            >
              Tutup
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default CalculatorModal;
