// src/components/Admin/BpuCalculatorSettings.jsx
import React, { useState, useEffect } from 'react';
import Layout from '../Layout/Layout';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { 
  Calculator, 
  Shield, 
  Save, 
  RefreshCw, 
  Sparkles, 
  CheckCircle2, 
  HelpCircle,
  Coins,
  ArrowRight,
  TrendingUp,
  HeartHandshake
} from 'lucide-react';

const BpuCalculatorSettings = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Database Rates State
  const [bpuRates, setBpuRates] = useState({
    jkk_percentage: 1,
    jkk_min_amount: 10000,
    jkm_flat_amount: 6800,
    jht_percentage: 2,
    jht_min_amount: 20000,
    death_benefit_amount: 42000000,
    max_scholarship_amount: 174000000
  });

  // Simulator Calculator State
  const [simIncome, setSimIncome] = useState(1000000);
  const [simProgram, setSimProgram] = useState('3-program'); // '2-program' | '3-program'

  const fetchBpuRates = async () => {
    try {
      setLoading(true);
      const res = await api.get('/bpu/rates');
      if (res.data?.success && res.data.data) {
        const d = res.data.data;
        setBpuRates({
          jkk_percentage: Number(d.jkk_percentage) || 1,
          jkk_min_amount: Number(d.jkk_min_amount) || 10000,
          jkm_flat_amount: Number(d.jkm_flat_amount) || 6800,
          jht_percentage: Number(d.jht_percentage) || 2,
          jht_min_amount: Number(d.jht_min_amount) || 20000,
          death_benefit_amount: Number(d.death_benefit_amount) || 42000000,
          max_scholarship_amount: Number(d.max_scholarship_amount) || 174000000
        });
      }
    } catch (err) {
      console.warn('Gagal memuat tarif BPU:', err);
      toast.error('Gagal memuat tarif BPU: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBpuRates();
  }, []);

  const handleSaveRates = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await api.put('/bpu/rates', bpuRates);
      if (res.data?.success) {
        toast.success('Konfigurasi tarif iuran & manfaat BPU berhasil diperbarui!');
        fetchBpuRates();
      }
    } catch (err) {
      console.error('Error saving rates:', err);
      toast.error('Gagal menyimpan konfigurasi tarif BPU: ' + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaultRates = () => {
    setBpuRates({
      jkk_percentage: 1,
      jkk_min_amount: 10000,
      jkm_flat_amount: 6800,
      jht_percentage: 2,
      jht_min_amount: 20000,
      death_benefit_amount: 42000000,
      max_scholarship_amount: 174000000
    });
    toast.info('Formulir tarif direset ke ketentuan PP No. 82/2019.');
  };

  // Calculation simulation based on current rates
  const calcJkk = Math.max((simIncome * (bpuRates.jkk_percentage / 100)), bpuRates.jkk_min_amount);
  const calcJkm = Number(bpuRates.jkm_flat_amount);
  const calcJht = simProgram === '3-program' 
    ? Math.max((simIncome * (bpuRates.jht_percentage / 100)), bpuRates.jht_min_amount)
    : 0;
  const totalIuran = calcJkk + calcJkm + calcJht;

  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header Banner */}
        <div className="bg-[#FCE373] border-2 border-[#121214] rounded-2xl p-6 shadow-[4px_4px_0px_#121214] relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#121214] text-white text-[11px] font-black uppercase tracking-wider mb-2 shadow-[2px_2px_0px_#121214]">
                <Calculator className="w-3.5 h-3.5 text-[#FCE373]" />
                Regulasi Iuran BPU Dinamis BPJSTK
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-[#121214] tracking-tight">
                Kalkulator & Konfigurasi Tarif Iuran BPU
              </h1>
              <p className="text-xs sm:text-sm text-[#121214]/80 font-semibold mt-1 max-w-2xl">
                Kelola persentase dan nominal batas minimum iuran program Bukan Penerima Upah (JKK, JKM, JHT), santunan kematian, serta uji coba simulasi perhitungan langsung secara interaktif.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={fetchBpuRates}
                disabled={loading}
                className="px-3.5 py-2 rounded-xl border-2 border-[#121214] bg-white hover:bg-gray-100 active:scale-95 text-xs font-black text-[#121214] shadow-[2px_2px_0px_#121214] transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>

        {/* 2 Main Columns: Left = Rate Configuration Form | Right = Live Interactive Simulator */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 items-start">
          
          {/* ======================================================== */}
          {/* KOLOM KIRI: FORM PENGATURAN TARIF (50%) */}
          {/* ======================================================== */}
          <div className="space-y-6">
            <form onSubmit={handleSaveRates} className="bg-white border-2 border-[#121214] rounded-2xl p-6 shadow-[4px_4px_0px_#121214] space-y-5">
              <div className="flex items-center justify-between border-b-2 border-gray-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#FCE373] border border-[#121214] flex items-center justify-center text-[#121214] shadow-[2px_2px_0px_#121214]">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-[#121214] uppercase tracking-wide">
                      Ketentuan Tarif Iuran & Santunan
                    </h2>
                    <p className="text-xs text-gray-500 font-medium">
                      Mengatur nilai parameter dasar kalkulasi BPU di database.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleResetDefaultRates}
                  className="text-[11px] font-black text-[#121214] bg-white hover:bg-gray-100 border-2 border-[#121214] px-2.5 py-1.5 rounded-lg shadow-[2px_2px_0px_#121214] transition-all cursor-pointer active:scale-95 inline-flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" />
                  Reset Regulasi
                </button>
              </div>

              <div className="space-y-4">
                {/* Jaminan Kecelakaan Kerja (JKK) */}
                <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl space-y-2.5">
                  <span className="text-xs font-black text-[#121214] uppercase flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    Jaminan Kecelakaan Kerja (JKK)
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-600">Persentase (%)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        value={bpuRates.jkk_percentage}
                        onChange={(e) => setBpuRates({ ...bpuRates, jkk_percentage: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 bg-white border border-[#121214] rounded-lg text-xs font-black"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-600">Tarif Minimum (Rp)</label>
                      <input
                        type="number"
                        min="0"
                        step="1000"
                        required
                        value={bpuRates.jkk_min_amount}
                        onChange={(e) => setBpuRates({ ...bpuRates, jkk_min_amount: parseInt(e.target.value, 10) || 0 })}
                        className="w-full px-3 py-2 bg-white border border-[#121214] rounded-lg text-xs font-black"
                      />
                    </div>
                  </div>
                </div>

                {/* Jaminan Kematian (JKM) */}
                <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl space-y-2.5">
                  <span className="text-xs font-black text-[#121214] uppercase flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    Jaminan Kematian (JKM)
                  </span>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-600">Tarif Flat per Bulan (Rp)</label>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      required
                      value={bpuRates.jkm_flat_amount}
                      onChange={(e) => setBpuRates({ ...bpuRates, jkm_flat_amount: parseInt(e.target.value, 10) || 0 })}
                      className="w-full px-3 py-2 bg-white border border-[#121214] rounded-lg text-xs font-black"
                    />
                  </div>
                </div>

                {/* Jaminan Hari Tua (JHT) */}
                <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl space-y-2.5">
                  <span className="text-xs font-black text-[#121214] uppercase flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    Jaminan Hari Tua (JHT)
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-600">Persentase (%)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        value={bpuRates.jht_percentage}
                        onChange={(e) => setBpuRates({ ...bpuRates, jht_percentage: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 bg-white border border-[#121214] rounded-lg text-xs font-black"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-600">Tarif Minimum (Rp)</label>
                      <input
                        type="number"
                        min="0"
                        step="1000"
                        required
                        value={bpuRates.jht_min_amount}
                        onChange={(e) => setBpuRates({ ...bpuRates, jht_min_amount: parseInt(e.target.value, 10) || 0 })}
                        className="w-full px-3 py-2 bg-white border border-[#121214] rounded-lg text-xs font-black"
                      />
                    </div>
                  </div>
                </div>

                {/* Santunan Kematian & Beasiswa */}
                <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl space-y-2.5">
                  <span className="text-xs font-black text-[#121214] uppercase flex items-center gap-1.5">
                    <HeartHandshake className="w-3.5 h-3.5 text-rose-600" />
                    Santunan Kematian & Beasiswa Anak
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-600">Santunan Kematian (Rp)</label>
                      <input
                        type="number"
                        min="0"
                        step="1000000"
                        required
                        value={bpuRates.death_benefit_amount}
                        onChange={(e) => setBpuRates({ ...bpuRates, death_benefit_amount: parseInt(e.target.value, 10) || 0 })}
                        className="w-full px-3 py-2 bg-white border border-[#121214] rounded-lg text-xs font-black"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-600">Maks. Beasiswa (Rp)</label>
                      <input
                        type="number"
                        min="0"
                        step="1000000"
                        required
                        value={bpuRates.max_scholarship_amount}
                        onChange={(e) => setBpuRates({ ...bpuRates, max_scholarship_amount: parseInt(e.target.value, 10) || 0 })}
                        className="w-full px-3 py-2 bg-white border border-[#121214] rounded-lg text-xs font-black"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-3 px-4 rounded-xl border-2 border-[#121214] bg-[#FCE373] hover:bg-[#ebd056] active:scale-95 text-xs font-black text-[#121214] shadow-[3px_3px_0px_#121214] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Simpan Konfigurasi Tarif Iuran & Manfaat BPU
                </button>
              </div>
            </form>
          </div>

          {/* ======================================================== */}
          {/* KOLOM KANAN: LIVE SIMULATOR / KALKULATOR BPU (50%) */}
          {/* ======================================================== */}
          <div className="space-y-6">
            <div className="bg-white border-2 border-[#121214] rounded-2xl p-6 shadow-[4px_4px_0px_#121214] space-y-5">
              <div className="flex items-center justify-between border-b-2 border-gray-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#B8C96E] border border-[#121214] flex items-center justify-center text-[#121214] shadow-[2px_2px_0px_#121214]">
                    <Coins className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-[#121214] uppercase tracking-wide">
                      Live Simulator Perhitungan Iuran
                    </h2>
                    <p className="text-xs text-gray-500 font-medium">
                      Simulasi instan menghitung iuran sesuai tarif aktif di atas.
                    </p>
                  </div>
                </div>

                <span className="text-[11px] font-black px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Live Sync
                </span>
              </div>

              {/* Input Penghasilan Simulator */}
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-[#121214] flex justify-between">
                    <span>Penghasilan Dasar yang Dilaporkan</span>
                    <span className="text-emerald-700 font-black">{formatRupiah(simIncome)}</span>
                  </label>
                  <input
                    type="number"
                    min="1000000"
                    step="500000"
                    value={simIncome}
                    onChange={(e) => setSimIncome(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border-2 border-[#121214] rounded-xl text-sm font-black text-[#121214] focus:bg-white focus:outline-none shadow-[2px_2px_0px_#121214]"
                  />
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap gap-2">
                  {[1000000, 2000000, 3000000, 5000000, 10000000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setSimIncome(amt)}
                      className={`px-2.5 py-1 text-xs rounded-lg border-2 border-[#121214] font-bold transition-all cursor-pointer ${
                        simIncome === amt 
                          ? 'bg-[#121214] text-white shadow-[1px_1px_0px_#121214]' 
                          : 'bg-white text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {amt >= 1000000 ? `${amt / 1000000} Juta` : formatRupiah(amt)}
                    </button>
                  ))}
                </div>

                {/* Pilih Skema Program */}
                <div className="space-y-1.5 pt-2">
                  <label className="text-xs font-black text-[#121214]">Pilihan Paket Program</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                    <button
                      type="button"
                      onClick={() => setSimProgram('2-program')}
                      className={`p-3 rounded-xl border-2 border-[#121214] text-left transition-all cursor-pointer ${
                        simProgram === '2-program'
                          ? 'bg-[#FCE373] text-[#121214] shadow-[3px_3px_0px_#121214]'
                          : 'bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <p className="text-xs font-black">2 Program</p>
                      <p className="text-[11px] font-semibold text-gray-700">JKK + JKM</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSimProgram('3-program')}
                      className={`p-3 rounded-xl border-2 border-[#121214] text-left transition-all cursor-pointer ${
                        simProgram === '3-program'
                          ? 'bg-[#B8C96E] text-[#121214] shadow-[3px_3px_0px_#121214]'
                          : 'bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <p className="text-xs font-black">3 Program</p>
                      <p className="text-[11px] font-semibold text-gray-700">JKK + JKM + JHT</p>
                    </button>
                  </div>
                </div>

                {/* Hasil Kalkulasi Iuran */}
                <div className="mt-4 p-4 bg-[#FAF9F6] border-2 border-[#121214] rounded-xl space-y-3 shadow-[2px_2px_0px_#121214]">
                  <div className="flex justify-between items-center text-xs pb-2 border-b border-gray-200">
                    <span className="font-bold text-gray-600">Iuran JKK ({bpuRates.jkk_percentage}%):</span>
                    <span className="font-black text-[#121214]">{formatRupiah(calcJkk)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs pb-2 border-b border-gray-200">
                    <span className="font-bold text-gray-600">Iuran JKM (Flat):</span>
                    <span className="font-black text-[#121214]">{formatRupiah(calcJkm)}</span>
                  </div>
                  {simProgram === '3-program' && (
                    <div className="flex justify-between items-center text-xs pb-2 border-b border-gray-200">
                      <span className="font-bold text-gray-600">Iuran JHT Tabungan ({bpuRates.jht_percentage}%):</span>
                      <span className="font-black text-[#121214]">{formatRupiah(calcJht)}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-1 text-sm">
                    <span className="font-black text-[#121214]">Total Iuran per Bulan:</span>
                    <span className="text-base font-black text-emerald-800 bg-emerald-200/60 px-3 py-1 rounded-lg border border-emerald-400">
                      {formatRupiah(totalIuran)}
                    </span>
                  </div>
                </div>

                {/* Manfaat Proteksi Ringkas */}
                <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl space-y-2 text-xs">
                  <span className="font-black text-emerald-950 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                    Manfaat Proteksi yang Diperoleh Peserta:
                  </span>
                  <ul className="space-y-1 text-emerald-900 font-medium list-disc list-inside text-[11px]">
                    <li>Perawatan dan pengobatan kecelakaan kerja tanpa batas plafon biaya (sesuai indikasi medis).</li>
                    <li>Santunan kematian akibat kecelakaan kerja atau meninggal dunia biasa sebesar <strong className="font-black text-emerald-950">{formatRupiah(bpuRates.death_benefit_amount)}</strong>.</li>
                    <li>Beasiswa pendidikan untuk 2 orang anak hingga perguruan tinggi dengan total mencapai <strong className="font-black text-emerald-950">{formatRupiah(bpuRates.max_scholarship_amount)}</strong>.</li>
                    {simProgram === '3-program' && (
                      <li>Akumulasi saldo tabungan Jaminan Hari Tua (JHT) ditambah hasil pengembangan return tahunan.</li>
                    )}
                  </ul>
                </div>

              </div>
            </div>
          </div>

        </div>
      </div>
    </Layout>
  );
};

export default BpuCalculatorSettings;
