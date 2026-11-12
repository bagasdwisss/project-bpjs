// src/components/Admin/GradingSettings.jsx
import React, { useState, useEffect } from 'react';
import Layout from '../Layout/Layout';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import SignatureCaptureInput from './SignatureCaptureInput';
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
  Sparkles,
  Building2,
  UserCheck,
  Phone,
  MapPin,
  ShieldCheck,
  FileCheck,
  PenTool
} from 'lucide-react';

const GradingSettings = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('grading'); // 'grading' | 'institution'
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 1. Grading Configuration State
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

  // 2. Dynamic Institutional & Signatory Configuration State (Kepala Cabang & Mentor)
  const [instConfig, setInstConfig] = useState({
    branch_head_name: 'Dr. Hendra Wijaya, S.E., M.M.',
    branch_head_npp: '9876543210',
    branch_head_signature: '',
    branch_name: 'BPJS Ketenagakerjaan Kantor Cabang Jakarta Gambir',
    branch_address: 'Jl. Kebon Sirih No. 40, Jakarta Pusat 10110',
    branch_phone: '(021) 3456789',
    mentor_name: 'Budi Santoso, S.Kom., M.T.',
    mentor_npp: '8765432109',
    mentor_signature: '',
    default_coordinator_name: 'Budi Santoso, S.Kom., M.T.',
    default_coordinator_npp: '8765432109'
  });
  const [loadingInst, setLoadingInst] = useState(false);
  const [savingInst, setSavingInst] = useState(false);

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

  const fetchInstitutionalConfig = async () => {
    try {
      setLoadingInst(true);
      const res = await api.get('/admin/system/institution');
      if (res.data?.success && res.data.data) {
        const d = res.data.data;
        setInstConfig({
          ...d,
          mentor_name: d.mentor_name || d.default_coordinator_name || 'Budi Santoso, S.Kom., M.T.',
          mentor_npp: d.mentor_npp || d.default_coordinator_npp || '8765432109',
          branch_head_signature: d.branch_head_signature || '',
          mentor_signature: d.mentor_signature || ''
        });
      }
    } catch (err) {
      console.warn('Gagal memuat profil instansi:', err);
    } finally {
      setLoadingInst(false);
    }
  };

  useEffect(() => {
    fetchGradingConfig();
    fetchInstitutionalConfig();
  }, []);

  const totalBobot = (
    Number(gradingConfig.weight_akuisisi_bpu) +
    Number(gradingConfig.weight_kunjungan_bpu) +
    Number(gradingConfig.weight_kunjungan_pu) +
    Number(gradingConfig.weight_video) +
    Number(gradingConfig.weight_seminar) +
    Number(gradingConfig.weight_sosialisasi)
  );

  const handleSaveGrading = async (e) => {
    e.preventDefault();

    if (totalBobot !== 100) {
      toast.error(`Total akumulasi bobot harus tepat 100%! Saat ini bernilai: ${totalBobot}%`);
      return;
    }

    try {
      setSaving(true);
      const payload = {
        target_kunjungan_bpu: Number(gradingConfig.target_kunjungan_bpu),
        target_akuisisi_bpu: Number(gradingConfig.target_akuisisi_bpu),
        target_kunjungan_pu: Number(gradingConfig.target_kunjungan_pu),
        target_video: Number(gradingConfig.target_video),
        target_seminar: Number(gradingConfig.target_seminar),
        target_sosialisasi: Number(gradingConfig.target_sosialisasi),
        weight_akuisisi_bpu: Number(gradingConfig.weight_akuisisi_bpu),
        weight_kunjungan_bpu: Number(gradingConfig.weight_kunjungan_bpu),
        weight_kunjungan_pu: Number(gradingConfig.weight_kunjungan_pu),
        weight_video: Number(gradingConfig.weight_video),
        weight_seminar: Number(gradingConfig.weight_seminar),
        weight_sosialisasi: Number(gradingConfig.weight_sosialisasi),
        grade_a_cutoff: Number(gradingConfig.grade_a_cutoff),
        grade_b_cutoff: Number(gradingConfig.grade_b_cutoff),
        grade_c_cutoff: Number(gradingConfig.grade_c_cutoff),
        grade_d_cutoff: Number(gradingConfig.grade_d_cutoff)
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

  const handleSaveInstitution = async (e) => {
    e.preventDefault();
    try {
      setSavingInst(true);
      const payload = {
        ...instConfig,
        default_coordinator_name: instConfig.mentor_name,
        default_coordinator_npp: instConfig.mentor_npp
      };
      const res = await api.put('/admin/system/institution', payload);
      if (res.data?.success) {
        toast.success('Profil instansi, mentor & tanda tangan sertifikat berhasil disimpan!');
        if (res.data.data) {
          setInstConfig(res.data.data);
        }
      }
    } catch (err) {
      console.error('Error saving institutional config:', err);
      toast.error('Gagal menyimpan profil instansi: ' + (err.response?.data?.message || err.message));
    } finally {
      setSavingInst(false);
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
                Standar Penilaian & Sertifikat Dinamis
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-[#121214] tracking-tight">
                Bobot Nilai, Target & Penandatangan Sertifikat
              </h1>
              <p className="text-xs sm:text-sm text-[#121214]/80 font-semibold mt-1 max-w-2xl">
                Atur bobot kelulusan, batas cutoff grade, serta profil penandatangan resmi (Kepala Kantor Cabang & Mentor Pembimbing Magang) lengkap dengan goresan tanda tangan digital asli.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  fetchGradingConfig();
                  fetchInstitutionalConfig();
                }}
                disabled={loading || loadingInst}
                className="px-3.5 py-2 rounded-xl border-2 border-[#121214] bg-white hover:bg-gray-100 active:scale-95 text-xs font-black text-[#121214] shadow-[2px_2px_0px_#121214] transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading || loadingInst ? 'animate-spin' : ''}`} />
                <span>Refresh Data</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tab Switching Pill Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setActiveTab('grading')}
            className={`px-4 py-2.5 rounded-xl border-2 border-[#121214] font-black text-xs transition-all flex items-center gap-2 cursor-pointer shadow-[2px_2px_0px_#121214] active:scale-95 ${
              activeTab === 'grading'
                ? 'bg-[#BDD4F2] text-[#121214]'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Target className="w-4 h-4" />
            <span>1. Bobot Nilai, Target & Cutoff Grade</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('institution')}
            className={`px-4 py-2.5 rounded-xl border-2 border-[#121214] font-black text-xs transition-all flex items-center gap-2 cursor-pointer shadow-[2px_2px_0px_#121214] active:scale-95 ${
              activeTab === 'institution'
                ? 'bg-[#B8C96E] text-[#121214]'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>2. Profil Kantor & Penandatangan Sertifikat (Mentor & Pimpinan)</span>
          </button>
        </div>

        {/* TAB 1: BOBOT NILAI & TARGET CAPAIAN */}
        {activeTab === 'grading' && (
          <form onSubmit={handleSaveGrading} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 items-start">
              
              {/* Target Capaian (50%) */}
              <div className="space-y-6">
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
                      Default
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

              {/* Kolom Kanan: Bobot Persentase Penilaian (%) (50%) */}
              <div className="space-y-6">
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
        )}

        {/* TAB 2: PROFIL INSTANSI & PENANDATANGAN SERTIFIKAT (KEPALA CABANG & MENTOR) */}
        {activeTab === 'institution' && (
          <form onSubmit={handleSaveInstitution} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 items-start">
              
              {/* Kolom Kiri: Formulir Data Instansi & Pejabat */}
              <div className="space-y-6">
                
                {/* 1. Kantor Cabang Profil */}
                <div className="bg-white border-2 border-[#121214] rounded-2xl p-6 shadow-[4px_4px_0px_#121214] space-y-4">
                  <div className="flex items-center gap-2.5 border-b-2 border-gray-100 pb-3">
                    <div className="w-8 h-8 rounded-lg bg-[#BDD4F2] border border-[#121214] flex items-center justify-center text-[#121214] shadow-[2px_2px_0px_#121214]">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-black text-[#121214] uppercase tracking-wide">
                        Kantor Cabang Penyelenggara
                      </h2>
                      <p className="text-xs text-gray-500 font-medium">
                        Kop surat dan header resmi yang tertera pada sertifikat magang.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs font-black text-[#121214] flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-gray-600" />
                        Nama Kantor Cabang
                      </label>
                      <input
                        type="text"
                        required
                        value={instConfig.branch_name}
                        onChange={(e) => setInstConfig({ ...instConfig, branch_name: e.target.value })}
                        placeholder="Contoh: BPJS Ketenagakerjaan Kantor Cabang Jakarta Gambir"
                        className="w-full px-3.5 py-2.5 bg-gray-50 border-2 border-[#121214] rounded-xl text-xs font-bold text-[#121214] focus:bg-white focus:outline-none shadow-[2px_2px_0px_#121214]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-black text-[#121214] flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-gray-600" />
                        Alamat Lengkap Kantor
                      </label>
                      <input
                        type="text"
                        required
                        value={instConfig.branch_address}
                        onChange={(e) => setInstConfig({ ...instConfig, branch_address: e.target.value })}
                        placeholder="Contoh: Jl. Kebon Sirih No. 40, Jakarta Pusat 10110"
                        className="w-full px-3.5 py-2.5 bg-gray-50 border-2 border-[#121214] rounded-xl text-xs font-bold text-[#121214] focus:bg-white focus:outline-none shadow-[2px_2px_0px_#121214]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-black text-[#121214] flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-gray-600" />
                        Nomor Telepon Kantor
                      </label>
                      <input
                        type="text"
                        value={instConfig.branch_phone}
                        onChange={(e) => setInstConfig({ ...instConfig, branch_phone: e.target.value })}
                        placeholder="Contoh: (021) 3456789 / 175"
                        className="w-full px-3.5 py-2.5 bg-gray-50 border-2 border-[#121214] rounded-xl text-xs font-bold text-[#121214] focus:bg-white focus:outline-none shadow-[2px_2px_0px_#121214]"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Pimpinan & Mentor Resmi */}
                <div className="bg-white border-2 border-[#121214] rounded-2xl p-6 shadow-[4px_4px_0px_#121214] space-y-5">
                  <div className="flex items-center gap-2.5 border-b-2 border-gray-100 pb-3">
                    <div className="w-8 h-8 rounded-lg bg-[#B8C96E] border border-[#121214] flex items-center justify-center text-[#121214] shadow-[2px_2px_0px_#121214]">
                      <UserCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-black text-[#121214] uppercase tracking-wide">
                        Penandatangan Resmi Sertifikat (Kepala Cabang & Mentor)
                      </h2>
                      <p className="text-xs text-gray-500 font-medium">
                        Koordinator bertugas merilis sertifikat, sedangkan penandatanganan dilakukan oleh Kepala Cabang & Mentor.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {/* Kepala Cabang */}
                    <div className="p-4 bg-gray-50 border-2 border-[#121214]/30 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black uppercase text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-400">
                          Pihak 1: Kepala Kantor Cabang
                        </span>
                        <span className="text-[10px] font-bold text-gray-500">Mengesahkan Sertifikat</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-[#121214]">Nama Lengkap & Gelar</label>
                          <input
                            type="text"
                            required
                            value={instConfig.branch_head_name}
                            onChange={(e) => setInstConfig({ ...instConfig, branch_head_name: e.target.value })}
                            placeholder="Dr. Hendra Wijaya, S.E., M.M."
                            className="w-full px-3 py-2 bg-white border border-[#121214] rounded-lg text-xs font-bold text-[#121214] focus:outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-[#121214]">NPP Kepala Cabang</label>
                          <input
                            type="text"
                            required
                            value={instConfig.branch_head_npp}
                            onChange={(e) => setInstConfig({ ...instConfig, branch_head_npp: e.target.value })}
                            placeholder="9876543210"
                            className="w-full px-3 py-2 bg-white border border-[#121214] rounded-lg text-xs font-mono font-bold text-[#121214] focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Signature Capture Input for Kepala Cabang */}
                      <SignatureCaptureInput
                        label="Tanda Tangan Kepala Cabang"
                        roleTitle="Kepala Kantor Cabang"
                        signerName={instConfig.branch_head_name}
                        value={instConfig.branch_head_signature}
                        onChange={(sig) => setInstConfig({ ...instConfig, branch_head_signature: sig })}
                      />
                    </div>

                    {/* Mentor Pembimbing Magang (Changed from Koordinator) */}
                    <div className="p-4 bg-gray-50 border-2 border-[#121214]/30 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black uppercase text-blue-800 bg-blue-100 px-2 py-0.5 rounded border border-blue-400">
                          Pihak 2: Mentor Pembimbing Magang
                        </span>
                        <span className="text-[10px] font-bold text-gray-500">Pembimbing Lapangan</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-[#121214]">Nama Lengkap & Gelar Mentor</label>
                          <input
                            type="text"
                            required
                            value={instConfig.mentor_name}
                            onChange={(e) => setInstConfig({ ...instConfig, mentor_name: e.target.value })}
                            placeholder="Budi Santoso, S.Kom., M.T."
                            className="w-full px-3 py-2 bg-white border border-[#121214] rounded-lg text-xs font-bold text-[#121214] focus:outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-[#121214]">NPP Mentor</label>
                          <input
                            type="text"
                            required
                            value={instConfig.mentor_npp}
                            onChange={(e) => setInstConfig({ ...instConfig, mentor_npp: e.target.value })}
                            placeholder="8765432109"
                            className="w-full px-3 py-2 bg-white border border-[#121214] rounded-lg text-xs font-mono font-bold text-[#121214] focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Signature Capture Input for Mentor */}
                      <SignatureCaptureInput
                        label="Tanda Tangan Mentor"
                        roleTitle="Mentor Pembimbing Magang"
                        signerName={instConfig.mentor_name}
                        value={instConfig.mentor_signature}
                        onChange={(sig) => setInstConfig({ ...instConfig, mentor_signature: sig })}
                      />
                    </div>

                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={savingInst}
                      className="w-full py-3 px-4 rounded-xl border-2 border-[#121214] bg-[#B8C96E] hover:bg-[#a5b85a] active:scale-95 text-xs font-black text-[#121214] shadow-[3px_3px_0px_#121214] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {savingInst ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Simpan Profil Instansi, Mentor & Tanda Tangan
                    </button>
                  </div>
                </div>

              </div>

              {/* Kolom Kanan: Live Preview Tanda Tangan Sertifikat */}
              <div className="space-y-6">
                <div className="bg-white border-2 border-[#121214] rounded-2xl p-6 shadow-[4px_4px_0px_#121214] space-y-4">
                  <div className="flex items-center justify-between border-b-2 border-gray-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[#FCE373] border border-[#121214] flex items-center justify-center text-[#121214] shadow-[2px_2px_0px_#121214]">
                        <FileCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <h2 className="text-sm font-black text-[#121214] uppercase tracking-wide">
                          Live Preview Blok Sertifikat
                        </h2>
                        <p className="text-xs text-gray-500 font-medium">
                          Tampilan kop, stempel dinas, dan tanda tangan digital riil.
                        </p>
                      </div>
                    </div>

                    <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded bg-emerald-100 text-emerald-800 border border-emerald-400">
                      Live Synced
                    </span>
                  </div>

                  {/* Simulated Certificate Preview Box */}
                  <div className="bg-[#FAF9F6] border-2 border-[#121214] rounded-xl p-5 space-y-5 shadow-inner">
                    {/* Header */}
                    <div className="text-center pb-3 border-b border-gray-300">
                      <p className="text-[11px] font-extrabold uppercase tracking-wider text-gray-500">
                        BADAN PENYELENGGARA JAMINAN SOSIAL KETENAGAKERJAAN
                      </p>
                      <h3 className="font-black text-sm text-[#121214] mt-0.5">
                        {instConfig.branch_name || 'BPJS Ketenagakerjaan Kantor Cabang'}
                      </h3>
                      <p className="text-[10px] text-gray-600 font-medium mt-0.5">
                        {instConfig.branch_address} {instConfig.branch_phone ? `• Telp: ${instConfig.branch_phone}` : ''}
                      </p>
                    </div>

                    <div className="text-center py-2">
                      <span className="text-[10px] font-black uppercase bg-[#BDD4F2] px-3 py-1 rounded-full border border-[#121214] text-[#121214]">
                        SERTIFIKAT KELULUSAN PROGRAM MAGANG
                      </span>
                      <p className="text-xs font-black text-gray-800 mt-2">Diberikan Kepada: [NAMA LENGKAP PESERTA MAGANG]</p>
                      <p className="text-[10px] text-gray-500 font-mono">NIM / ID Magang: 2026-BPJS-001</p>
                    </div>

                    {/* Signature Columns Preview (Mentor & Kepala Cabang) */}
                    <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-300">
                      {/* Mentor Stamp */}
                      <div className="text-center space-y-1">
                        <span className="text-[10px] font-bold text-gray-600 block">Mengetahui,</span>
                        <span className="text-[10px] font-black text-[#121214] block">Mentor Pembimbing Magang</span>
                        
                        <div className="my-1.5 p-1.5 bg-white border border-dashed border-[#121214]/40 rounded-lg inline-block min-w-[140px] min-h-[55px] flex items-center justify-center">
                          {instConfig.mentor_signature ? (
                            <img 
                              src={instConfig.mentor_signature} 
                              alt="Tanda Tangan Mentor" 
                              className="max-h-12 max-w-[130px] object-contain mx-auto"
                            />
                          ) : (
                            <div className="flex flex-col items-center">
                              <PenTool className="w-4 h-4 text-gray-400" />
                              <span className="text-[8px] font-bold text-gray-400">Spesimen Belum Diinput</span>
                            </div>
                          )}
                        </div>

                        <p className="text-[11px] font-black text-[#121214] underline">
                          {instConfig.mentor_name || 'Budi Santoso, S.Kom., M.T.'}
                        </p>
                        <p className="text-[9px] font-mono text-gray-600">
                          NPP: {instConfig.mentor_npp || '8765432109'}
                        </p>
                      </div>

                      {/* Branch Head Stamp */}
                      <div className="text-center space-y-1">
                        <span className="text-[10px] font-bold text-gray-600 block">Menyetujui,</span>
                        <span className="text-[10px] font-black text-[#121214] block">Kepala Kantor Cabang</span>

                        <div className="my-1.5 p-1.5 bg-white border border-dashed border-[#121214]/40 rounded-lg inline-block min-w-[140px] min-h-[55px] flex items-center justify-center relative">
                          {instConfig.branch_head_signature ? (
                            <img 
                              src={instConfig.branch_head_signature} 
                              alt="Tanda Tangan Kepala Cabang" 
                              className="max-h-12 max-w-[130px] object-contain mx-auto"
                            />
                          ) : (
                            <div className="flex flex-col items-center">
                              <PenTool className="w-4 h-4 text-gray-400" />
                              <span className="text-[8px] font-bold text-gray-400">Spesimen Belum Diinput</span>
                            </div>
                          )}
                        </div>

                        <p className="text-[11px] font-black text-[#121214] underline">
                          {instConfig.branch_head_name || 'Dr. Hendra Wijaya, S.E., M.M.'}
                        </p>
                        <p className="text-[9px] font-mono text-gray-600">
                          NPP: {instConfig.branch_head_npp || '9876543210'}
                        </p>
                      </div>
                    </div>

                    <div className="p-3 bg-white border border-[#121214]/20 rounded-xl text-[10px] text-gray-600 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-[#121214]">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Tanda Tangan & Kriptografi Terintegrasi</span>
                      </div>
                      <p>
                        Goresan tanda tangan di atas akan langsung tercetak pada sertifikat resmi yang diunduh (PNG/PDF) peserta magang dan koordinator.
                      </p>
                    </div>

                  </div>
                </div>

                {/* System Settings Table Info */}
                <div className="bg-[#FAF9F6] border-2 border-[#121214] rounded-2xl p-5 shadow-[4px_4px_0px_#121214] space-y-2">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-[#121214]" />
                    <h3 className="text-xs font-black text-[#121214] uppercase tracking-wide">
                      Pemisahan Peran Koordinator vs Mentor
                    </h3>
                  </div>
                  <p className="text-xs text-gray-700 font-medium leading-relaxed">
                    Koordinator bertugas mengelola nilai dan merilis sertifikat di portal koordinator. Tanda tangan yang dicantumkan pada sertifikat adalah milik <strong>Kepala Kantor Cabang</strong> dan <strong>Mentor Pembimbing Magang</strong> yang tersimpan di tabel <code className="bg-gray-200 px-1 py-0.5 rounded font-mono text-[11px]">system_settings</code>.
                  </p>
                </div>

              </div>

            </div>
          </form>
        )}

      </div>
    </Layout>
  );
};

export default GradingSettings;
