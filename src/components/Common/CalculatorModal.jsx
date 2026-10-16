// src/components/Common/CalculatorModal.jsx
import React, { useState } from 'react';
import { X, Calculator, ShieldCheck, Copy, Check } from 'lucide-react';

const CalculatorModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const [wageTier, setWageTier] = useState(1500000); // Base wage for calculation
  const [wageInput, setWageInput] = useState('1500000');
  const [includeJHT, setIncludeJHT] = useState(false);
  const [copied, setCopied] = useState(false);

  // Dynamic calculations based on wage tier for BPJSTK BPU
  // JKK BPU: 1% of wage tier (minimum Rp 10.000)
  const jkkRate = Math.max(10000, Math.round(wageTier * 0.01));
  // JKM BPU: Flat Rp 6.800
  const jkmRate = 6800;
  // JHT BPU: 2% of wage tier (minimum Rp 20.000)
  const jhtRate = Math.max(20000, Math.round(wageTier * 0.02));

  const totalMonthlyFee = jkkRate + jkmRate + (includeJHT ? jhtRate : 0);

  // Santunan Calculations
  const santunanKematianJKM = 42000000;
  const beasiswaMaksimal = 174000000;
  const stmbBulan1sd6 = wageTier; // 100% upah
  const cacatTotalTetap = 56 * wageTier + 12000000; // 56x upah + santunan berkala 24 bln x Rp 500rb

  const formatIDR = (num) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
  };

  const handleCustomWageChange = (e) => {
    const rawVal = e.target.value.replace(/\D/g, '');
    setWageInput(rawVal);
    const parsed = parseInt(rawVal, 10);
    if (!isNaN(parsed) && parsed > 0) {
      setWageTier(parsed);
    } else {
      setWageTier(1000000);
    }
  };

  const handleSelectPreset = (tier) => {
    setWageTier(tier);
    setWageInput(String(tier));
  };

  const handleCopyPitch = () => {
    const pitchText = `Halo Bapak/Ibu! Lindungi diri dan keluarga dengan BPJSTK BPU (Bukan Penerima Upah):
- Iuran Hemat: Hanya ${formatIDR(totalMonthlyFee)}/bulan (${includeJHT ? 'JKK + JKM + JHT' : 'JKK + JKM'})!
- Manfaat Perlindungan Nyata:
1. Santunan Kematian (JKM): ${formatIDR(santunanKematianJKM)} Tunai ke Ahli Waris
2. Beasiswa 2 Anak: s.d. ${formatIDR(beasiswaMaksimal)} (Jenjang TK s.d. Sarjana S1)
3. Biaya Perawatan Kecelakaan Kerja (JKK): TANPA BATAS (Unlimited sesuai medis)
4. Pengganti Upah Sakit/STMB: 100% upah (${formatIDR(stmbBulan1sd6)}/bulan)
${includeJHT ? `5. Tabungan Hari Tua (JHT): Terakumulasi dan dapat dicairkan saat pensiun` : ''}

Daftar mudah sekarang melalui petugas binaan BPJSTK!`;

    navigator.clipboard.writeText(pitchText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#121214]/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-[#F5F4F0] border-2 border-[#121214] rounded-3xl shadow-[6px_6px_0px_#121214] w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b-2 border-[#121214] bg-[#FCE373]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-white border-2 border-[#121214] flex items-center justify-center shadow-[2px_2px_0px_#121214]">
              <Calculator className="w-5 h-5 text-[#121214]" />
            </div>
            <div>
              <h3 className="font-black text-lg text-[#121214] leading-tight">Kalkulator Simulasi Iuran & Manfaat BPJSTK</h3>
              <p className="text-xs font-bold text-[#121214]/80">Perlindungan Sektor BPU (Bukan Penerima Upah)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full border-2 border-[#121214] bg-white hover:bg-neutral-100 text-[#121214] transition-colors shadow-[2px_2px_0px_#121214]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
          
          {/* Custom Income / Wage Input Box */}
          <div className="bg-white border-2 border-[#121214] rounded-2xl p-4 sm:p-5 shadow-[4px_4px_0px_#121214] space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-black uppercase tracking-wider text-[#121214]">
                Penghasilan / Upah Acuan Mandiri (per Bulan)
              </label>
              <span className="text-[10px] font-black uppercase bg-[#BDD4F2] text-[#121214] px-2.5 py-0.5 rounded-full border border-[#121214]">
                Bisa Input Sendiri
              </span>
            </div>

            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-sm text-[#121214]">
                Rp
              </span>
              <input
                type="text"
                value={wageInput ? parseInt(wageInput, 10).toLocaleString('id-ID') : ''}
                onChange={handleCustomWageChange}
                placeholder="Masukkan nominal gaji/upah acuan..."
                className="w-full bg-[#FAF9F6] border-2 border-[#121214] rounded-2xl pl-12 pr-4 py-3 text-base font-black text-[#121214] shadow-[3px_3px_0px_#121214] focus:outline-none focus:bg-white transition-all"
              />
            </div>

            {/* Quick Presets */}
            <div>
              <span className="text-[11px] font-bold text-[#6E6D6A] block mb-1.5">
                Pilihan Cepat Upah Acuan:
              </span>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {[1000000, 1500000, 2500000, 3500000, 5000000, 8000000].map((tier) => (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => handleSelectPreset(tier)}
                    className={`py-1.5 px-3 rounded-full text-xs font-bold border-2 border-[#121214] transition-all ${
                      wageTier === tier
                        ? 'bg-[#121214] text-white shadow-[2px_2px_0px_#121214]'
                        : 'bg-[#FAF9F6] text-[#121214] hover:bg-[#FCE373]'
                    }`}
                  >
                    {formatIDR(tier)}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-[#121214] bg-[#FAF9F6] p-3 rounded-xl border border-[#121214]/15 gap-1">
              <span>Upah Terhitung: <strong className="font-black text-[#121214]">{formatIDR(wageTier)}</strong></span>
              <span className="text-[11px] text-[#6E6D6A] font-semibold">
                Menjadi dasar santunan pengganti upah sakit (STMB) & santunan cacat
              </span>
            </div>
          </div>

          {/* Program Toggle (JKK + JKM vs + JHT) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div 
              onClick={() => setIncludeJHT(false)}
              className={`cursor-pointer p-4 rounded-2xl border-2 border-[#121214] transition-all ${
                !includeJHT 
                  ? 'bg-[#B8C96E] shadow-[4px_4px_0px_#121214]' 
                  : 'bg-white opacity-80 hover:opacity-100 shadow-[2px_2px_0px_#121214]'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-black uppercase text-[#121214]">Paket 2 Program</span>
                <span className="text-[10px] font-black bg-[#121214] text-white px-2 py-0.5 rounded-full">Wajib BPU</span>
              </div>
              <p className="text-sm font-black text-[#121214]">JKK + JKM</p>
              <div className="mt-2 text-xl font-black text-[#121214]">
                {formatIDR(jkkRate + jkmRate)} <span className="text-xs font-bold">/bulan</span>
              </div>
              <p className="text-[11px] text-[#121214]/80 mt-1 font-medium">Perlindungan utama kecelakaan kerja dan santunan kematian.</p>
            </div>

            <div 
              onClick={() => setIncludeJHT(true)}
              className={`cursor-pointer p-4 rounded-2xl border-2 border-[#121214] transition-all ${
                includeJHT 
                  ? 'bg-[#F5C6EC] shadow-[4px_4px_0px_#121214]' 
                  : 'bg-white opacity-80 hover:opacity-100 shadow-[2px_2px_0px_#121214]'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-black uppercase text-[#121214]">Paket 3 Program</span>
                <span className="text-[10px] font-black bg-[#121214] text-white px-2 py-0.5 rounded-full">+ Tabungan</span>
              </div>
              <p className="text-sm font-black text-[#121214]">JKK + JKM + JHT</p>
              <div className="mt-2 text-xl font-black text-[#121214]">
                {formatIDR(jkkRate + jkmRate + jhtRate)} <span className="text-xs font-bold">/bulan</span>
              </div>
              <p className="text-[11px] text-[#121214]/80 mt-1 font-medium">Lengkap dengan tabungan jaminan hari tua resmi terjamin aman.</p>
            </div>
          </div>

          {/* Benefits Grid */}
          <div className="bg-white border-2 border-[#121214] rounded-2xl p-4 sm:p-5 shadow-[4px_4px_0px_#121214] space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-[#121214] flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-[#121214]" />
              <span>Rincian Hak & Manfaat Santunan BPJSTK BPU</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 bg-[#FAF9F6] rounded-xl border border-[#121214]/20 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold text-[#6E6D6A] uppercase">Santunan Kematian (JKM)</span>
                  <div className="text-base font-black text-[#121214] mt-0.5">{formatIDR(santunanKematianJKM)}</div>
                </div>
                <p className="text-[10px] text-[#6E6D6A] mt-1">Diberikan tunai langsung ke ahli waris tanpa syarat masa iur lama.</p>
              </div>

              <div className="p-3.5 bg-[#FAF9F6] rounded-xl border border-[#121214]/20 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold text-[#6E6D6A] uppercase">Beasiswa 2 Orang Anak</span>
                  <div className="text-base font-black text-[#121214] mt-0.5">s.d. {formatIDR(beasiswaMaksimal)}</div>
                </div>
                <p className="text-[10px] text-[#6E6D6A] mt-1">Dari jenjang TK sampai lulus Sarjana S1 perguruan tinggi.</p>
              </div>

              <div className="p-3.5 bg-[#FAF9F6] rounded-xl border border-[#121214]/20 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold text-[#6E6D6A] uppercase">Biaya Perawatan Medis JKK</span>
                  <div className="text-base font-black text-[#121214] mt-0.5">UNLIMITED (Tanpa Batas Biaya)</div>
                </div>
                <p className="text-[10px] text-[#6E6D6A] mt-1">Sesuai kebutuhan medis di Pusat Layanan Kecelakaan Kerja (PLKK).</p>
              </div>

              <div className="p-3.5 bg-[#FAF9F6] rounded-xl border border-[#121214]/20 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold text-[#6E6D6A] uppercase">Pengganti Upah Sakit (STMB)</span>
                  <div className="text-base font-black text-[#121214] mt-0.5">{formatIDR(stmbBulan1sd6)} /bulan</div>
                </div>
                <p className="text-[10px] text-[#6E6D6A] mt-1">100% upah selama masa pemulihan istirahat dokter.</p>
              </div>
            </div>
          </div>

        </div>

        {/* Footer with 1-Click WhatsApp Pitch Copy */}
        <div className="p-4 sm:p-5 border-t-2 border-[#121214] bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-center sm:text-left">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#6E6D6A]">Total Iuran per Bulan</span>
            <div className="text-xl sm:text-2xl font-black text-[#121214]">
              {formatIDR(totalMonthlyFee)} <span className="text-xs font-bold text-[#6E6D6A]">/bln</span>
            </div>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleCopyPitch}
              className="flex-1 sm:flex-none inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-full border-2 border-[#121214] bg-[#B8C96E] hover:bg-[#a6b85c] font-black text-xs text-[#121214] shadow-[3px_3px_0px_#121214] active:translate-x-[1px] active:translate-y-[1px] transition-all"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-[#121214]" />
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
              className="px-5 py-2.5 rounded-full border-2 border-[#121214] bg-[#FAF9F6] hover:bg-[#EAE9E4] font-bold text-xs text-[#121214] shadow-[2px_2px_0px_#121214] transition-all"
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
