// src/components/Admin/GradingSettings.jsx
import React, { useState, useEffect } from 'react';
import Layout from '../Layout/Layout';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { 
  Target, 
  Award, 
  Save, 
  RefreshCw, 
  Info, 
  CheckCircle, 
  AlertTriangle,
  Sliders,
  Percent,
  Sparkles
} from 'lucide-react';

const GradingSettings = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [gradingConfig, setGradingConfig] = useState({
    target_kunjungan_bpu: 30,
    target_akuisisi_bpu: 20,
    target_kunjungan_pu: 7,
    target_video: 1,
    target_seminar: 2,
    target_sosialisasi: 1,
    weight_akuisisi_bpu: 30,
    weight_kunjungan_bpu: 20,
    weight_kunjungan_pu: 15,
    weight_video: 15,
    weight_seminar: 10,
    weight_sosialisasi: 10,
    grade_a_cutoff: 85,
    grade_b_cutoff: 75,
    grade_c_cutoff: 65,
    grade_d_cutoff: 50
  });

  const fetchGradingConfig = async () => {
    try {
      setLoading(true);
      const res = await api.get('/grading/configuration');
      if (res.data?.success && res.data.data) {
        const d = res.data.data;
        setGradingConfig({
          target_kunjungan_bpu: d.targets.max_kunjungan_bpu || 30,
          target_akuisisi_bpu: d.targets.max_akuisisi_bpu || 20,
          target_kunjungan_pu: d.targets.max_kunjungan_pu || 7,
          target_video: d.targets.target_video || 1,
          target_seminar: d.targets.target_seminar || 2,
          target_sosialisasi: d.targets.target_sosialisasi || 1,
          weight_akuisisi_bpu: Math.round((d.weights.akuisisi_bpu || 0.3) * 100),
          weight_kunjungan_bpu: Math.round((d.weights.kunjungan_bpu || 0.2) * 100),
          weight_kunjungan_pu: Math.round((d.weights.kunjungan_pu || 0.15) * 100),
          weight_video: Math.round((d.weights.video || 0.15) * 100),
          weight_seminar: Math.round((d.weights.seminar || 0.1) * 100),
          weight_sosialisasi: Math.round((d.weights.sosialisasi || 0.1) * 100),
          grade_a_cutoff: d.cutoffs?.grade_a || 85,
          grade_b_cutoff: d.cutoffs?.grade_b || 75,
          grade_c_cutoff: d.cutoffs?.grade_c || 65,
          grade_d_cutoff: d.cutoffs?.grade_d || 50
        });
      }
    } catch (err) {
      console.warn('Gagal memuat konfigurasi penilaian:', err);
      toast.error('Gagal memuat konfigurasi penilaian: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGradingConfig();
  }, []);

  const totalBobot = (
    Number(gradingConfig.weight_akuisisi_bpu) +
    Number(gradingConfig.weight_kunjungan_bpu) +
    Number(gradingConfig.weight_kunjungan_pu) +
    Number(gradingConfig.weight_video) +
    Number(gradingConfig.weight_seminar) +
    Number(gradingConfig.weight_sosialisasi)
  );

  const handleSave = async (e) => {
    e.preventDefault();

    if (totalBobot !== 100) {
      toast.error(`Total akumulasi bobot harus tepat 100%! Saat ini bernilai: ${totalBobot}%`);
      return;
    }

    try {
      setSaving(true);
      const payload = {
        targets: {
          max_kunjungan_bpu: Number(gradingConfig.target_kunjungan_bpu),
          max_akuisisi_bpu: Number(gradingConfig.target_akuisisi_bpu),
          max_kunjungan_pu: Number(gradingConfig.target_kunjungan_pu),
          target_video: Number(gradingConfig.target_video),
          target_seminar: Number(gradingConfig.target_seminar),
          target_sosialisasi: Number(gradingConfig.target_sosialisasi)
        },
        weights: {
          akuisisi_bpu: Number(gradingConfig.weight_akuisisi_bpu) / 100,
          kunjungan_bpu: Number(gradingConfig.weight_kunjungan_bpu) / 100,
          kunjungan_pu: Number(gradingConfig.weight_kunjungan_pu) / 100,
          video: Number(gradingConfig.weight_video) / 100,
          seminar: Number(gradingConfig.weight_seminar) / 100,
          sosialisasi: Number(gradingConfig.weight_sosialisasi) / 100
        },
        cutoffs: {
          grade_a: Number(gradingConfig.grade_a_cutoff),
          grade_b: Number(gradingConfig.grade_b_cutoff),
          grade_c: Number(gradingConfig.grade_c_cutoff),
          grade_d: Number(gradingConfig.grade_d_cutoff)
        }
      };

      const res = await api.put('/grading/configuration', payload);
      if (res.data?.success) {
        toast.success('Konfigurasi bobot nilai & target capaian berhasil disimpan!');
        fetchGradingConfig();
      }
    } catch (err) {
      console.error('Error saving grading config:', err);
      toast.error('Gagal menyimpan konfigurasi bobot nilai: ' + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefault = () => {
    setGradingConfig({
      target_kunjungan_bpu: 30,
      target_akuisisi_bpu: 20,
      target_kunjungan_pu: 7,
      target_video: 1,
      target_seminar: 2,
      target_sosialisasi: 1,
      weight_akuisisi_bpu: 30,
      weight_kunjungan_bpu: 20,
      weight_kunjungan_pu: 15,
      weight_video: 15,
      weight_seminar: 10,
      weight_sosialisasi: 10,
      grade_a_cutoff: 85,
      grade_b_cutoff: 75,
      grade_c_cutoff: 65,
      grade_d_cutoff: 50
    });
    toast.info('Formulir direset ke bobot standar operasional.');
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header Banner */}
        <div className="bg-[#BDD4F2] border-2 border-[#121214] rounded-2xl p-6 shadow-[4px_4px_0px_#121214] relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#121214] text-white text-[11px] font-black uppercase tracking-wider mb-2 shadow-[2px_2px_0px_#121214]">
                <Target className="w-3.5 h-3.5 text-[#FCE373]" />
                Standar Penilaian Dinamis
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-[#121214] tracking-tight">
                Bobot Nilai, Target Capaian & Cutoff Grade
              </h1>
              <p className="text-xs sm:text-sm text-[#121214]/80 font-semibold mt-1 max-w-2xl">
                Atur persentase bobot tiap indikator nilai peserta magang (total wajib 100%), target kuantitas tugas mingguan, serta batas nilai kelulusan grade huruf A, B, C, dan D tanpa hardcode.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={fetchGradingConfig}
                disabled={loading}
                className="px-3.5 py-2 rounded-xl border-2 border-[#121214] bg-white hover:bg-gray-100 active:scale-95 text-xs font-black text-[#121214] shadow-[2px_2px_0px_#121214] transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Target Capaian (lg:col-span-6) */}
            <div className="lg:col-span-6 space-y-6">
              <div className="bg-white border-2 border-[#121214] rounded-2xl p-6 shadow-[4px_4px_0px_#121214] space-y-4">
                <div className="flex items-center justify-between border-b-2 border-gray-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#BDD4F2] border border-[#121214] flex items-center justify-center text-[#121214] shadow-[2px_2px_0px_#121214]">
                      <Target className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-black text-[#121214] uppercase tracking-wide">
                        Target Capaian Kegiatan (100% Poin)
                      </h2>
                      <p className="text-xs text-gray-500 font-medium">
                        Jumlah angka target untuk mencapai skor maksimal pada tiap indikator.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleResetDefault}
                    className="text-[11px] font-black text-[#121214] bg-white hover:bg-gray-100 border-2 border-[#121214] px-2.5 py-1.5 rounded-lg shadow-[2px_2px_0px_#121214] transition-all cursor-pointer active:scale-95 inline-flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    Default Bobot
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-black text-[#121214]">Target Kunjungan BPU</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={gradingConfig.target_kunjungan_bpu}
                      onChange={(e) => setGradingConfig({ ...gradingConfig, target_kunjungan_bpu: parseInt(e.target.value, 10) || 0 })}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border-2 border-[#121214] rounded-xl text-xs font-bold text-[#121214] focus:bg-white focus:outline-none shadow-[2px_2px_0px_#121214]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-black text-[#121214]">Target Akuisisi BPU</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={gradingConfig.target_akuisisi_bpu}
                      onChange={(e) => setGradingConfig({ ...gradingConfig, target_akuisisi_bpu: parseInt(e.target.value, 10) || 0 })}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border-2 border-[#121214] rounded-xl text-xs font-bold text-[#121214] focus:bg-white focus:outline-none shadow-[2px_2px_0px_#121214]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-black text-[#121214]">Target Kunjungan PU</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={gradingConfig.target_kunjungan_pu}
                      onChange={(e) => setGradingConfig({ ...gradingConfig, target_kunjungan_pu: parseInt(e.target.value, 10) || 0 })}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border-2 border-[#121214] rounded-xl text-xs font-bold text-[#121214] focus:bg-white focus:outline-none shadow-[2px_2px_0px_#121214]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-black text-[#121214]">Target Video Edukasi</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={gradingConfig.target_video}
                      onChange={(e) => setGradingConfig({ ...gradingConfig, target_video: parseInt(e.target.value, 10) || 0 })}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border-2 border-[#121214] rounded-xl text-xs font-bold text-[#121214] focus:bg-white focus:outline-none shadow-[2px_2px_0px_#121214]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-black text-[#121214]">Target Seminar</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={gradingConfig.target_seminar}
                      onChange={(e) => setGradingConfig({ ...gradingConfig, target_seminar: parseInt(e.target.value, 10) || 0 })}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border-2 border-[#121214] rounded-xl text-xs font-bold text-[#121214] focus:bg-white focus:outline-none shadow-[2px_2px_0px_#121214]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-black text-[#121214]">Target Sosialisasi</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={gradingConfig.target_sosialisasi}
                      onChange={(e) => setGradingConfig({ ...gradingConfig, target_sosialisasi: parseInt(e.target.value, 10) || 0 })}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border-2 border-[#121214] rounded-xl text-xs font-bold text-[#121214] focus:bg-white focus:outline-none shadow-[2px_2px_0px_#121214]"
                    />
                  </div>
                </div>
              </div>

              {/* Cutoff Grade Huruf */}
              <div className="bg-white border-2 border-[#121214] rounded-2xl p-6 shadow-[4px_4px_0px_#121214] space-y-4">
                <div className="flex items-center gap-2.5 border-b-2 border-gray-100 pb-3">
                  <div className="w-8 h-8 rounded-lg bg-[#FCE373] border border-[#121214] flex items-center justify-center text-[#121214] shadow-[2px_2px_0px_#121214]">
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-[#121214] uppercase tracking-wide">
                      Batas Minimal Grade Huruf (Cutoff)
                    </h2>
                    <p className="text-xs text-gray-500 font-medium">
                      Batas minimal skor kumulatif (0–100) untuk konversi ke grade sertifikat.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <span className="text-xs font-black text-emerald-700">Grade A (Istimewa)</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      required
                      value={gradingConfig.grade_a_cutoff}
                      onChange={(e) => setGradingConfig({ ...gradingConfig, grade_a_cutoff: parseInt(e.target.value, 10) || 0 })}
                      className="w-full px-3 py-2 bg-gray-50 border-2 border-[#121214] rounded-xl text-xs font-black text-center text-[#121214] focus:bg-white focus:outline-none shadow-[2px_2px_0px_#121214]"
                    />
                    <span className="text-[10px] text-gray-400 block text-center">&ge; {gradingConfig.grade_a_cutoff} poin</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-black text-blue-700">Grade B (Baik)</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      required
                      value={gradingConfig.grade_b_cutoff}
                      onChange={(e) => setGradingConfig({ ...gradingConfig, grade_b_cutoff: parseInt(e.target.value, 10) || 0 })}
                      className="w-full px-3 py-2 bg-gray-50 border-2 border-[#121214] rounded-xl text-xs font-black text-center text-[#121214] focus:bg-white focus:outline-none shadow-[2px_2px_0px_#121214]"
                    />
                    <span className="text-[10px] text-gray-400 block text-center">&ge; {gradingConfig.grade_b_cutoff} poin</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-black text-amber-700">Grade C (Cukup)</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      required
                      value={gradingConfig.grade_c_cutoff}
                      onChange={(e) => setGradingConfig({ ...gradingConfig, grade_c_cutoff: parseInt(e.target.value, 10) || 0 })}
                      className="w-full px-3 py-2 bg-gray-50 border-2 border-[#121214] rounded-xl text-xs font-black text-center text-[#121214] focus:bg-white focus:outline-none shadow-[2px_2px_0px_#121214]"
                    />
                    <span className="text-[10px] text-gray-400 block text-center">&ge; {gradingConfig.grade_c_cutoff} poin</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-black text-red-700">Grade D (Kurang)</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      required
                      value={gradingConfig.grade_d_cutoff}
                      onChange={(e) => setGradingConfig({ ...gradingConfig, grade_d_cutoff: parseInt(e.target.value, 10) || 0 })}
                      className="w-full px-3 py-2 bg-gray-50 border-2 border-[#121214] rounded-xl text-xs font-black text-center text-[#121214] focus:bg-white focus:outline-none shadow-[2px_2px_0px_#121214]"
                    />
                    <span className="text-[10px] text-gray-400 block text-center">&ge; {gradingConfig.grade_d_cutoff} poin</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Kolom Kanan: Bobot Persentase Penilaian (%) (lg:col-span-6) */}
            <div className="lg:col-span-6 space-y-6">
              <div className="bg-white border-2 border-[#121214] rounded-2xl p-6 shadow-[4px_4px_0px_#121214] space-y-4">
                <div className="flex items-center justify-between border-b-2 border-gray-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#F5C6EC] border border-[#121214] flex items-center justify-center text-[#121214] shadow-[2px_2px_0px_#121214]">
                      <Percent className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-black text-[#121214] uppercase tracking-wide">
                        Bobot Persentase Penilaian (%)
                      </h2>
                      <p className="text-xs text-gray-500 font-medium">
                        Total akumulasi seluruh indikator wajib tepat 100%.
                      </p>
                    </div>
                  </div>

                  <span className={`px-2.5 py-1 rounded-full text-xs font-black border-2 border-[#121214] ${
                    totalBobot === 100 ? 'bg-[#B8C96E] text-[#121214]' : 'bg-red-400 text-white'
                  }`}>
                    Total: {totalBobot}%
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl border border-gray-200">
                    <span className="text-xs font-bold text-[#121214]">Akuisisi Peserta BPU</span>
                    <div className="flex items-center gap-1.5 w-24">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        required
                        value={gradingConfig.weight_akuisisi_bpu}
                        onChange={(e) => setGradingConfig({ ...gradingConfig, weight_akuisisi_bpu: parseInt(e.target.value, 10) || 0 })}
                        className="w-full px-2 py-1 bg-white border border-[#121214] rounded-lg text-xs font-black text-right"
                      />
                      <span className="text-xs font-black text-[#121214]">%</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl border border-gray-200">
                    <span className="text-xs font-bold text-[#121214]">Kunjungan Calon Peserta BPU</span>
                    <div className="flex items-center gap-1.5 w-24">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        required
                        value={gradingConfig.weight_kunjungan_bpu}
                        onChange={(e) => setGradingConfig({ ...gradingConfig, weight_kunjungan_bpu: parseInt(e.target.value, 10) || 0 })}
                        className="w-full px-2 py-1 bg-white border border-[#121214] rounded-lg text-xs font-black text-right"
                      />
                      <span className="text-xs font-black text-[#121214]">%</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl border border-gray-200">
                    <span className="text-xs font-bold text-[#121214]">Kunjungan Perusahaan (PU)</span>
                    <div className="flex items-center gap-1.5 w-24">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        required
                        value={gradingConfig.weight_kunjungan_pu}
                        onChange={(e) => setGradingConfig({ ...gradingConfig, weight_kunjungan_pu: parseInt(e.target.value, 10) || 0 })}
                        className="w-full px-2 py-1 bg-white border border-[#121214] rounded-lg text-xs font-black text-right"
                      />
                      <span className="text-xs font-black text-[#121214]">%</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl border border-gray-200">
                    <span className="text-xs font-bold text-[#121214]">Produksi Video Edukasi BPJSTK</span>
                    <div className="flex items-center gap-1.5 w-24">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        required
                        value={gradingConfig.weight_video}
                        onChange={(e) => setGradingConfig({ ...gradingConfig, weight_video: parseInt(e.target.value, 10) || 0 })}
                        className="w-full px-2 py-1 bg-white border border-[#121214] rounded-lg text-xs font-black text-right"
                      />
                      <span className="text-xs font-black text-[#121214]">%</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl border border-gray-200">
                    <span className="text-xs font-bold text-[#121214]">Partisipasi Seminar / Pelatihan</span>
                    <div className="flex items-center gap-1.5 w-24">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        required
                        value={gradingConfig.weight_seminar}
                        onChange={(e) => setGradingConfig({ ...gradingConfig, weight_seminar: parseInt(e.target.value, 10) || 0 })}
                        className="w-full px-2 py-1 bg-white border border-[#121214] rounded-lg text-xs font-black text-right"
                      />
                      <span className="text-xs font-black text-[#121214]">%</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl border border-gray-200">
                    <span className="text-xs font-bold text-[#121214]">Sosialisasi Program Jaminan Sosial</span>
                    <div className="flex items-center gap-1.5 w-24">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        required
                        value={gradingConfig.weight_sosialisasi}
                        onChange={(e) => setGradingConfig({ ...gradingConfig, weight_sosialisasi: parseInt(e.target.value, 10) || 0 })}
                        className="w-full px-2 py-1 bg-white border border-[#121214] rounded-lg text-xs font-black text-right"
                      />
                      <span className="text-xs font-black text-[#121214]">%</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={saving || totalBobot !== 100}
                    className="w-full py-3 px-4 rounded-xl border-2 border-[#121214] bg-[#BDD4F2] hover:bg-[#a9c5eb] active:scale-95 text-xs font-black text-[#121214] shadow-[3px_3px_0px_#121214] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Simpan Konfigurasi Bobot & Target Penilaian
                  </button>
                </div>
              </div>

              {/* Info Guide */}
              <div className="bg-[#FAF9F6] border-2 border-[#121214] rounded-2xl p-5 shadow-[4px_4px_0px_#121214] space-y-2">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-[#121214]" />
                  <h3 className="text-xs font-black text-[#121214] uppercase tracking-wide">
                    Otomatisasi Penilaian & Sertifikat
                  </h3>
                </div>
                <p className="text-xs text-gray-700 font-medium leading-relaxed">
                  Perubahan bobot dan cutoff grade ini langsung disimpan ke tabel basis data <code className="bg-gray-200 px-1 py-0.5 rounded font-mono text-[11px]">grading_settings</code>. Setiap koordinator melakukan penilaian atau menerbitkan sertifikat, sistem secara otomatis menghitung nilai riil peserta berdasarkan rasio bobot terbaru ini.
                </p>
              </div>

            </div>

          </div>
        </form>
      </div>
    </Layout>
  );
};

export default GradingSettings;
