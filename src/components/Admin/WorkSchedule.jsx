// src/components/Admin/WorkSchedule.jsx
import React, { useState, useEffect } from 'react';
import Layout from '../Layout/Layout';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { 
  Clock, 
  Calendar, 
  ShieldCheck, 
  Plus, 
  Trash2, 
  Edit3, 
  CheckCircle, 
  AlertTriangle, 
  Info, 
  Save, 
  RefreshCw, 
  Sparkles, 
  X,
  Search,
  Check,
  CalendarOff,
  MapPin,
  Target,
  Calculator
} from 'lucide-react';
import NeoDatePicker from '../Common/NeoDatePicker';

const WorkSchedule = () => {
  const { toast, confirm } = useToast();
  const [activeTab, setActiveTab] = useState('jam-kerja'); // 'jam-kerja' | 'hari-libur' | 'geofence' | 'penilaian' | 'bpu-rates'
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  // Settings State
  const [settings, setSettings] = useState({
    work_start_time: '07:00',
    work_ontime_limit: '08:00',
    work_end_time: '17:00',
    allow_weekend: false,
    late_tolerance_minutes: 0,
    inactivity_timeout_minutes: 5,
    weekend_message: 'Hari ini adalah hari libur akhir pekan (Sabtu/Minggu). Presensi dinonaktifkan.',
    before_start_message: 'Presensi belum dibuka. Jam masuk dimulai pukul {start_time}.',
    after_end_message: 'Presensi hari ini telah ditutup pada pukul {end_time}.'
  });

  // Office Geofence State
  const [officeGeofence, setOfficeGeofence] = useState({
    name: 'Kantor Cabang BPJSTK Medan Kota',
    address: 'BPJSTK, Jl. Kapten Patimura No.334 Lantai 1, Darat, Kec. Medan Baru, Kota Medan, Sumatera Utara 20153',
    latitude: 3.575556,
    longitude: 98.665278,
    radius_meters: 150
  });
  const [savingGeofence, setSavingGeofence] = useState(false);

  // Grading Config State
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
  const [savingGrading, setSavingGrading] = useState(false);

  // BPU Rates State
  const [bpuRates, setBpuRates] = useState({
    jkk_percentage: 1,
    jkk_min_amount: 10000,
    jkm_flat_amount: 6800,
    jht_percentage: 2,
    jht_min_amount: 20000,
    death_benefit_amount: 42000000,
    max_scholarship_amount: 174000000
  });
  const [savingRates, setSavingRates] = useState(false);

  // Holidays State
  const [holidays, setHolidays] = useState([]);
  const [loadingHolidays, setLoadingHolidays] = useState(true);
  const [searchHoliday, setSearchHoliday] = useState('');
  const [yearFilter, setYearFilter] = useState('all');

  // Modal State for Holiday
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState(null);
  const [holidayForm, setHolidayForm] = useState({
    holiday_date: '',
    holiday_name: '',
    description: '',
    custom_message: ''
  });
  const [submittingHoliday, setSubmittingHoliday] = useState(false);

  // Fetch settings from API
  const fetchSettings = async () => {
    try {
      setLoadingSettings(true);
      const res = await api.get('/admin/attendance-settings');
      if (res.data?.success && res.data?.data) {
        const d = res.data.data;
        setSettings({
          work_start_time: (d.work_start_time || '07:00').substring(0, 5),
          work_ontime_limit: (d.work_ontime_limit || '08:00').substring(0, 5),
          work_end_time: (d.work_end_time || '17:00').substring(0, 5),
          allow_weekend: Boolean(d.allow_weekend),
          late_tolerance_minutes: parseInt(d.late_tolerance_minutes, 10) || 0,
          inactivity_timeout_minutes: parseInt(d.inactivity_timeout_minutes, 10) || 5,
          weekend_message: d.weekend_message || 'Hari ini adalah hari libur akhir pekan (Sabtu/Minggu). Presensi dinonaktifkan.',
          before_start_message: d.before_start_message || 'Presensi belum dibuka. Jam masuk dimulai pukul {start_time}.',
          after_end_message: d.after_end_message || 'Presensi hari ini telah ditutup pada pukul {end_time}.'
        });
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
      toast.error('Gagal memuat pengaturan jam kerja: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoadingSettings(false);
    }
  };

  // Fetch Office Geofence
  const fetchOfficeGeofence = async () => {
    try {
      const res = await api.get('/admin/geofence/office');
      if (res.data?.success && res.data.data) {
        setOfficeGeofence({
          name: res.data.data.name || 'Kantor Cabang BPJSTK Medan Kota',
          address: res.data.data.address || '',
          latitude: Number(res.data.data.latitude) || 3.575556,
          longitude: Number(res.data.data.longitude) || 98.665278,
          radius_meters: Number(res.data.data.radius_meters) || 150
        });
      }
    } catch (err) {
      console.warn('Could not fetch office geofence:', err);
    }
  };

  // Fetch Grading Config
  const fetchGradingConfig = async () => {
    try {
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
      console.warn('Could not fetch grading configuration:', err);
    }
  };

  // Fetch BPU Rates
  const fetchBpuRates = async () => {
    try {
      const res = await api.get('/bpu/rates');
      if (res.data?.success && res.data.data) {
        const d = res.data.data;
        setBpuRates({
          jkk_percentage: Math.round((Number(d.jkk_percentage) || 0.01) * 100),
          jkk_min_amount: Number(d.jkk_min_amount) || 10000,
          jkm_flat_amount: Number(d.jkm_flat_amount) || 6800,
          jht_percentage: Math.round((Number(d.jht_percentage) || 0.02) * 100),
          jht_min_amount: Number(d.jht_min_amount) || 20000,
          death_benefit_amount: Number(d.death_benefit_amount) || 42000000,
          max_scholarship_amount: Number(d.max_scholarship_amount) || 174000000
        });
      }
    } catch (err) {
      console.warn('Could not fetch BPU rates:', err);
    }
  };

  // Fetch holidays from API
  const fetchHolidays = async () => {
    try {
      setLoadingHolidays(true);
      const res = await api.get('/admin/holidays');
      if (res.data?.success) {
        setHolidays(res.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching holidays:', err);
      toast.error('Gagal memuat daftar hari libur: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoadingHolidays(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchHolidays();
    fetchOfficeGeofence();
    fetchGradingConfig();
    fetchBpuRates();
  }, []);

  // Save Settings
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      setSavingSettings(true);
      const payload = {
        work_start_time: settings.work_start_time + ':00',
        work_ontime_limit: settings.work_ontime_limit + ':00',
        work_end_time: settings.work_end_time + ':00',
        allow_weekend: settings.allow_weekend,
        late_tolerance_minutes: parseInt(settings.late_tolerance_minutes, 10) || 0,
        inactivity_timeout_minutes: parseInt(settings.inactivity_timeout_minutes, 10) || 5,
        weekend_message: settings.weekend_message.trim(),
        before_start_message: settings.before_start_message.trim(),
        after_end_message: settings.after_end_message.trim()
      };

      const res = await api.put('/admin/attendance-settings', payload);
      if (res.data?.success) {
        localStorage.setItem('sys_inactivity_minutes', (settings.inactivity_timeout_minutes || 5).toString());
        toast.success('Pengaturan jam kerja dan aturan presensi berhasil disimpan secara dinamis!');
      }
    } catch (err) {
      console.error('Error saving settings:', err);
      toast.error('Gagal menyimpan pengaturan: ' + (err.response?.data?.message || err.message));
    } finally {
      setSavingSettings(false);
    }
  };

  // Save Office Geofence
  const handleSaveGeofence = async (e) => {
    e.preventDefault();
    try {
      setSavingGeofence(true);
      const res = await api.put('/admin/geofence/office', officeGeofence);
      if (res.data?.success) {
        toast.success('Koordinat dan radius geofence kantor resmi berhasil diperbarui!');
        fetchOfficeGeofence();
      }
    } catch (err) {
      console.error('Error saving geofence:', err);
      toast.error('Gagal menyimpan geofence: ' + (err.response?.data?.message || err.message));
    } finally {
      setSavingGeofence(false);
    }
  };

  // Save Grading Config
  const handleSaveGradingConfig = async (e) => {
    e.preventDefault();
    try {
      setSavingGrading(true);
      const payload = {
        target_kunjungan_bpu: parseInt(gradingConfig.target_kunjungan_bpu, 10) || 30,
        target_akuisisi_bpu: parseInt(gradingConfig.target_akuisisi_bpu, 10) || 20,
        target_kunjungan_pu: parseInt(gradingConfig.target_kunjungan_pu, 10) || 7,
        target_video: parseInt(gradingConfig.target_video, 10) || 1,
        target_seminar: parseInt(gradingConfig.target_seminar, 10) || 2,
        target_sosialisasi: parseInt(gradingConfig.target_sosialisasi, 10) || 1,
        weight_akuisisi_bpu: (parseFloat(gradingConfig.weight_akuisisi_bpu) || 30) / 100,
        weight_kunjungan_bpu: (parseFloat(gradingConfig.weight_kunjungan_bpu) || 20) / 100,
        weight_kunjungan_pu: (parseFloat(gradingConfig.weight_kunjungan_pu) || 15) / 100,
        weight_video: (parseFloat(gradingConfig.weight_video) || 15) / 100,
        weight_seminar: (parseFloat(gradingConfig.weight_seminar) || 10) / 100,
        weight_sosialisasi: (parseFloat(gradingConfig.weight_sosialisasi) || 10) / 100,
        grade_a_cutoff: parseInt(gradingConfig.grade_a_cutoff, 10) || 85,
        grade_b_cutoff: parseInt(gradingConfig.grade_b_cutoff, 10) || 75,
        grade_c_cutoff: parseInt(gradingConfig.grade_c_cutoff, 10) || 65,
        grade_d_cutoff: parseInt(gradingConfig.grade_d_cutoff, 10) || 50
      };

      const res = await api.put('/grading/configuration', payload);
      if (res.data?.success) {
        toast.success('Target dan bobot penilaian kelulusan berhasil diperbarui!');
        fetchGradingConfig();
      }
    } catch (err) {
      console.error('Error saving grading config:', err);
      toast.error('Gagal menyimpan bobot penilaian: ' + (err.response?.data?.message || err.message));
    } finally {
      setSavingGrading(false);
    }
  };

  // Save BPU Rates
  const handleSaveBpuRates = async (e) => {
    e.preventDefault();
    try {
      setSavingRates(true);
      const payload = {
        jkk_percentage: (parseFloat(bpuRates.jkk_percentage) || 1) / 100,
        jkk_min_amount: parseInt(bpuRates.jkk_min_amount, 10) || 10000,
        jkm_flat_amount: parseInt(bpuRates.jkm_flat_amount, 10) || 6800,
        jht_percentage: (parseFloat(bpuRates.jht_percentage) || 2) / 100,
        jht_min_amount: parseInt(bpuRates.jht_min_amount, 10) || 20000,
        death_benefit_amount: parseInt(bpuRates.death_benefit_amount, 10) || 42000000,
        max_scholarship_amount: parseInt(bpuRates.max_scholarship_amount, 10) || 174000000
      };

      const res = await api.put('/bpu/rates', payload);
      if (res.data?.success) {
        toast.success('Konfigurasi tarif iuran dan santunan BPU berhasil diperbarui!');
        fetchBpuRates();
      }
    } catch (err) {
      console.error('Error saving BPU rates:', err);
      toast.error('Gagal menyimpan tarif BPU: ' + (err.response?.data?.message || err.message));
    } finally {
      setSavingRates(false);
    }
  };

  // Open Modal for Create or Edit Holiday
  const handleOpenModal = (holiday = null) => {
    if (holiday) {
      setEditingHoliday(holiday);
      // Format date to YYYY-MM-DD
      const dateStr = holiday.holiday_date ? new Date(holiday.holiday_date).toISOString().split('T')[0] : '';
      setHolidayForm({
        holiday_date: dateStr,
        holiday_name: holiday.holiday_name || '',
        description: holiday.description || '',
        custom_message: holiday.custom_message || ''
      });
    } else {
      setEditingHoliday(null);
      setHolidayForm({
        holiday_date: '',
        holiday_name: '',
        description: '',
        custom_message: ''
      });
    }
    setIsModalOpen(true);
  };

  // Submit Holiday Form
  const handleSubmitHoliday = async (e) => {
    e.preventDefault();
    if (!holidayForm.holiday_date || !holidayForm.holiday_name.trim()) {
      toast.warning('Tanggal libur dan nama hari libur wajib diisi!');
      return;
    }

    try {
      setSubmittingHoliday(true);
      if (editingHoliday) {
        const res = await api.put(`/admin/holidays/${editingHoliday.holiday_id}`, holidayForm);
        if (res.data?.success) {
          toast.success(`Hari libur "${holidayForm.holiday_name}" berhasil diperbarui!`);
          setIsModalOpen(false);
          fetchHolidays();
        }
      } else {
        const res = await api.post('/admin/holidays', holidayForm);
        if (res.data?.success) {
          toast.success(`Hari libur "${holidayForm.holiday_name}" berhasil ditambahkan!`);
          setIsModalOpen(false);
          fetchHolidays();
        }
      }
    } catch (err) {
      console.error('Error saving holiday:', err);
      toast.error('Gagal menyimpan hari libur: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmittingHoliday(false);
    }
  };

  // Delete Holiday
  const handleDeleteHoliday = async (holiday) => {
    const isConfirmed = await confirm({
      title: 'Hapus Hari Libur Nasional?',
      message: `Apakah Anda yakin ingin menghapus hari libur "${holiday.holiday_name}" (${new Date(holiday.holiday_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })})? Peserta akan diizinkan absen di tanggal tersebut.`,
      confirmText: 'Ya, Hapus Libur',
      cancelText: 'Batal',
      type: 'danger'
    });

    if (!isConfirmed) return;

    try {
      const res = await api.delete(`/admin/holidays/${holiday.holiday_id}`);
      if (res.data?.success) {
        toast.success(`Hari libur "${holiday.holiday_name}" berhasil dihapus.`);
        fetchHolidays();
      }
    } catch (err) {
      console.error('Error deleting holiday:', err);
      toast.error('Gagal menghapus hari libur: ' + (err.response?.data?.message || err.message));
    }
  };

  // Filtered Holidays
  const filteredHolidays = holidays.filter((h) => {
    const matchSearch = (h.holiday_name || '').toLowerCase().includes(searchHoliday.toLowerCase()) ||
                        (h.description || '').toLowerCase().includes(searchHoliday.toLowerCase());
    if (yearFilter === 'all') return matchSearch;
    const itemYear = new Date(h.holiday_date).getFullYear().toString();
    return matchSearch && itemYear === yearFilter;
  });

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header Banner */}
        <div className="bg-[#BDD4F2] border-2 border-[#121214] rounded-2xl p-6 shadow-[4px_4px_0px_#121214] relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#121214] text-white text-[11px] font-black uppercase tracking-wider mb-2 shadow-[2px_2px_0px_#121214]">
                <Clock className="w-3.5 h-3.5 text-[#FCE373]" />
                Panel Kendali Dinamis Administrator
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-[#121214] tracking-tight">
                Aturan Jam Kerja & Hari Libur Nasional
              </h1>
              <p className="text-xs sm:text-sm text-[#121214]/80 font-semibold mt-1 max-w-2xl">
                Atur jadwal buka dan tutup absensi, batas jam terlambat, toleransi menit, aturan libur akhir pekan (Senin–Jumat), serta daftar hari libur nasional secara dinamis tanpa perlu mengubah baris kode sistem.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  fetchSettings();
                  fetchHolidays();
                }}
                className="px-4 py-2.5 rounded-xl border-2 border-[#121214] bg-white hover:bg-gray-50 active:scale-95 text-xs font-black shadow-[2px_2px_0px_#121214] flex items-center gap-2 transition-all cursor-pointer"
              >
                <RefreshCw className="w-4 h-4 text-[#121214]" />
                Segarkan Data
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 sm:gap-3 border-b-2 border-[#121214]/10 pb-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('jam-kerja')}
            className={`px-4 py-2.5 rounded-xl border-2 border-[#121214] text-xs font-black transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'jam-kerja'
                ? 'bg-[#FCE373] text-[#121214] shadow-[3px_3px_0px_#121214]'
                : 'bg-white text-gray-600 hover:text-[#121214] hover:bg-gray-100 shadow-[1px_1px_0px_#121214]'
            }`}
          >
            <Clock className="w-4 h-4" />
            Jam Kerja & Presensi
          </button>

          <button
            onClick={() => setActiveTab('hari-libur')}
            className={`px-4 py-2.5 rounded-xl border-2 border-[#121214] text-xs font-black transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'hari-libur'
                ? 'bg-[#F5C6EC] text-[#121214] shadow-[3px_3px_0px_#121214]'
                : 'bg-white text-gray-600 hover:text-[#121214] hover:bg-gray-100 shadow-[1px_1px_0px_#121214]'
            }`}
          >
            <CalendarOff className="w-4 h-4" />
            Hari Libur Nasional ({holidays.length})
          </button>

          <button
            onClick={() => setActiveTab('geofence')}
            className={`px-4 py-2.5 rounded-xl border-2 border-[#121214] text-xs font-black transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'geofence'
                ? 'bg-[#B8C96E] text-[#121214] shadow-[3px_3px_0px_#121214]'
                : 'bg-white text-gray-600 hover:text-[#121214] hover:bg-gray-100 shadow-[1px_1px_0px_#121214]'
            }`}
          >
            <MapPin className="w-4 h-4" />
            Lokasi Kantor & Geofence GPS
          </button>

          <button
            onClick={() => setActiveTab('penilaian')}
            className={`px-4 py-2.5 rounded-xl border-2 border-[#121214] text-xs font-black transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'penilaian'
                ? 'bg-[#BDD4F2] text-[#121214] shadow-[3px_3px_0px_#121214]'
                : 'bg-white text-gray-600 hover:text-[#121214] hover:bg-gray-100 shadow-[1px_1px_0px_#121214]'
            }`}
          >
            <Target className="w-4 h-4" />
            Bobot & Target Nilai
          </button>

          <button
            onClick={() => setActiveTab('bpu-rates')}
            className={`px-4 py-2.5 rounded-xl border-2 border-[#121214] text-xs font-black transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'bpu-rates'
                ? 'bg-[#FCE373] text-[#121214] shadow-[3px_3px_0px_#121214]'
                : 'bg-white text-gray-600 hover:text-[#121214] hover:bg-gray-100 shadow-[1px_1px_0px_#121214]'
            }`}
          >
            <Calculator className="w-4 h-4" />
            Tarif Iuran BPU
          </button>
        </div>

        {/* ======================================================== */}
        {/* TAB 1: PENGATURAN JAM KERJA & ATURAN PRESENSI DINAMIS */}
        {/* ======================================================== */}
        {activeTab === 'jam-kerja' && (
          <form onSubmit={handleSaveSettings} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Kolom Kiri: Waktu & Jam Kerja */}
              <div className="lg:col-span-7 space-y-6">
                <div className="bg-white border-2 border-[#121214] rounded-2xl p-6 shadow-[4px_4px_0px_#121214] space-y-5">
                  <div className="flex items-center gap-2.5 border-b-2 border-gray-100 pb-3">
                    <div className="w-8 h-8 rounded-lg bg-[#FCE373] border border-[#121214] flex items-center justify-center text-[#121214] shadow-[2px_2px_0px_#121214]">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-black text-[#121214] uppercase tracking-wide">
                        Jadwal Jam Masuk, Batas Terlambat & Jam Pulang
                      </h2>
                      <p className="text-xs text-gray-500 font-medium">
                        Nilai ini langsung dievaluasi oleh server saat peserta menekan tombol absen.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Jam Buka Absen */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-[#121214] flex items-center gap-1.5">
                        Jam Buka Presensi Masuk
                        <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="time"
                        required
                        value={settings.work_start_time}
                        onChange={(e) => setSettings({ ...settings, work_start_time: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-gray-50 border-2 border-[#121214] rounded-xl text-sm font-black text-[#121214] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FCE373] shadow-[2px_2px_0px_#121214]"
                      />
                      <p className="text-[11px] text-gray-500 font-semibold">
                        Peserta tidak bisa absen sebelum jam ini.
                      </p>
                    </div>

                    {/* Jam Batas Tepat Waktu */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-[#121214] flex items-center gap-1.5">
                        Batas Jam Tepat Waktu (Hadir)
                        <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="time"
                        required
                        value={settings.work_ontime_limit}
                        onChange={(e) => setSettings({ ...settings, work_ontime_limit: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-gray-50 border-2 border-[#121214] rounded-xl text-sm font-black text-[#121214] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#B8C96E] shadow-[2px_2px_0px_#121214]"
                      />
                      <p className="text-[11px] text-gray-500 font-semibold">
                        Absen di atas jam ini otomatis berstatus <span className="text-amber-600 font-black">Terlambat</span>.
                      </p>
                    </div>

                    {/* Toleransi Keterlambatan */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-[#121214] flex items-center gap-1.5">
                        Toleransi Keterlambatan (Menit)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max="120"
                          value={settings.late_tolerance_minutes}
                          onChange={(e) => setSettings({ ...settings, late_tolerance_minutes: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                          className="w-full px-3.5 py-2.5 bg-gray-50 border-2 border-[#121214] rounded-xl text-sm font-black text-[#121214] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#BDD4F2] shadow-[2px_2px_0px_#121214]"
                        />
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-gray-400">
                          Menit
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 font-semibold">
                        Kompensasi toleransi sebelum dihitung Terlambat (Default: 0 menit).
                      </p>
                    </div>

                    {/* Jam Tutup Absen / Jam Pulang */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-[#121214] flex items-center gap-1.5">
                        Jam Batas Akhir Presensi (Tutup)
                        <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="time"
                        required
                        value={settings.work_end_time}
                        onChange={(e) => setSettings({ ...settings, work_end_time: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-gray-50 border-2 border-[#121214] rounded-xl text-sm font-black text-[#121214] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F5C6EC] shadow-[2px_2px_0px_#121214]"
                      />
                      <p className="text-[11px] text-gray-500 font-semibold">
                        Absensi ditutup setelah jam ini setiap harinya.
                      </p>
                    </div>

                    {/* Batas Waktu Inaktivitas Otomatis */}
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-xs font-black text-[#121214] flex items-center gap-1.5">
                        Batas Waktu Inaktivitas Sesi Akun (Auto-Logout)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="1"
                          max="60"
                          value={settings.inactivity_timeout_minutes || 5}
                          onChange={(e) => setSettings({ ...settings, inactivity_timeout_minutes: Math.max(1, parseInt(e.target.value, 10) || 5) })}
                          className="w-full px-3.5 py-2.5 bg-gray-50 border-2 border-[#121214] rounded-xl text-sm font-black text-[#121214] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FCE373] shadow-[2px_2px_0px_#121214]"
                        />
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-gray-400">
                          Menit
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 font-semibold">
                        Sesi akun otomatis dikeluarkan demi keamanan jika tidak ada interaksi pengguna selama batas waktu ini (Default: 5 menit).
                      </p>
                    </div>
                  </div>

                  {/* Dynamic Simulation Box */}
                  <div className="p-4 rounded-xl bg-[#F8F9FA] border-2 border-[#121214] shadow-[2px_2px_0px_#121214] space-y-2">
                    <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider block">
                      Preview Aturan Status Otomatis:
                    </span>
                    <div className="flex flex-wrap gap-2 text-xs font-bold text-[#121214]">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#B8C96E] border border-[#121214]">
                        ✓ Tepat Waktu: {settings.work_start_time} - {settings.work_ontime_limit} WIB
                      </span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#FCE373] border border-[#121214]">
                        ⚠ Terlambat: &gt; {settings.work_ontime_limit} s.d. {settings.work_end_time} WIB
                      </span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#F5C6EC] border border-[#121214]">
                        ✕ Ditutup: &lt; {settings.work_start_time} atau &gt; {settings.work_end_time} WIB
                      </span>
                    </div>
                  </div>
                </div>

                {/* Aturan Akhir Pekan (Sabtu & Minggu) */}
                <div className="bg-white border-2 border-[#121214] rounded-2xl p-6 shadow-[4px_4px_0px_#121214] space-y-4">
                  <div className="flex items-center justify-between gap-4 border-b-2 border-gray-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[#B8C96E] border border-[#121214] flex items-center justify-center text-[#121214] shadow-[2px_2px_0px_#121214]">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <h2 className="text-sm font-black text-[#121214] uppercase tracking-wide">
                          Aturan Hari Kerja: Senin s.d. Jumat
                        </h2>
                        <p className="text-xs text-gray-500 font-medium">
                          Secara baku jam kantor hanya dari hari Senin hingga Jumat.
                        </p>
                      </div>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.allow_weekend}
                        onChange={(e) => setSettings({ ...settings, allow_weekend: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#B8C96E] border-2 border-[#121214]"></div>
                    </label>
                  </div>

                  <div className={`p-4 rounded-xl border-2 border-[#121214] shadow-[2px_2px_0px_#121214] ${settings.allow_weekend ? 'bg-amber-50' : 'bg-[#B8C96E]/20'}`}>
                    <div className="flex items-start gap-3">
                      <Info className="w-5 h-5 text-[#121214] shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-black text-[#121214]">
                          Status Akhir Pekan: {settings.allow_weekend ? 'Diizinkan Absen (Mode Khusus / Lembur)' : 'Hari Libur Terkunci (Peserta Tidak Bisa Absen)'}
                        </p>
                        <p className="text-[11px] text-[#121214]/80 font-semibold mt-0.5">
                          {settings.allow_weekend
                            ? 'Peringatan: Peserta magang saat ini dapat melakukan presensi pada hari Sabtu dan Minggu.'
                            : 'Sesuai regulasi, pada hari Sabtu dan Minggu tombol absen peserta akan dikunci dan menampilkan pesan libur otomatis.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Pesan Kustom Libur Akhir Pekan */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-[#121214]">
                      Pesan Pop-up Saat Peserta Coba Absen di Akhir Pekan (Sabtu / Minggu)
                    </label>
                    <textarea
                      rows={2}
                      value={settings.weekend_message}
                      onChange={(e) => setSettings({ ...settings, weekend_message: e.target.value })}
                      placeholder="Masukkan kata-kata pesan kustom..."
                      className="w-full px-3.5 py-2.5 bg-gray-50 border-2 border-[#121214] rounded-xl text-xs font-bold text-[#121214] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FCE373] shadow-[2px_2px_0px_#121214]"
                    />
                  </div>
                </div>
              </div>

              {/* Kolom Kanan: Pesan Kustom Jam & Tombol Simpan */}
              <div className="lg:col-span-5 space-y-6">
                <div className="bg-white border-2 border-[#121214] rounded-2xl p-6 shadow-[4px_4px_0px_#121214] space-y-5">
                  <div className="flex items-center gap-2.5 border-b-2 border-gray-100 pb-3">
                    <div className="w-8 h-8 rounded-lg bg-[#F5C6EC] border border-[#121214] flex items-center justify-center text-[#121214] shadow-[2px_2px_0px_#121214]">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-black text-[#121214] uppercase tracking-wide">
                        Kustomisasi Pesan Notifikasi Waktu
                      </h2>
                      <p className="text-xs text-gray-500 font-medium">
                        Dinamis ditampilkan ke peserta bila absen di luar jendela kerja.
                      </p>
                    </div>
                  </div>

                  {/* Pesan Sebelum Jam Buka */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-[#121214] flex items-center justify-between">
                      <span>Pesan Bila Absen Sebelum Jam Masuk</span>
                      <span className="text-[10px] text-gray-400 font-bold">Gunakan {'{start_time}'}</span>
                    </label>
                    <textarea
                      rows={2}
                      value={settings.before_start_message}
                      onChange={(e) => setSettings({ ...settings, before_start_message: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border-2 border-[#121214] rounded-xl text-xs font-bold text-[#121214] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#BDD4F2] shadow-[2px_2px_0px_#121214]"
                    />
                    <p className="text-[10px] text-gray-500 font-medium">
                      Contoh hasil: {settings.before_start_message.replace('{start_time}', settings.work_start_time + ' WIB')}
                    </p>
                  </div>

                  {/* Pesan Setelah Jam Tutup */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-[#121214] flex items-center justify-between">
                      <span>Pesan Bila Absen Setelah Jam Tutup</span>
                      <span className="text-[10px] text-gray-400 font-bold">Gunakan {'{end_time}'}</span>
                    </label>
                    <textarea
                      rows={2}
                      value={settings.after_end_message}
                      onChange={(e) => setSettings({ ...settings, after_end_message: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border-2 border-[#121214] rounded-xl text-xs font-bold text-[#121214] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F5C6EC] shadow-[2px_2px_0px_#121214]"
                    />
                    <p className="text-[10px] text-gray-500 font-medium">
                      Contoh hasil: {settings.after_end_message.replace('{end_time}', settings.work_end_time + ' WIB')}
                    </p>
                  </div>

                  {/* Tombol Simpan */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={savingSettings || loadingSettings}
                      className="w-full py-3.5 px-4 rounded-xl border-2 border-[#121214] bg-[#B8C96E] hover:bg-[#a6b85c] active:scale-95 text-xs font-black text-[#121214] shadow-[4px_4px_0px_#121214] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {savingSettings ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin text-[#121214]" />
                          Menyimpan Pengaturan...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 text-[#121214]" />
                          Simpan Pengaturan Jam Kerja Dinamis
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Quick Info Box */}
                <div className="p-4 rounded-2xl bg-white border-2 border-[#121214] shadow-[4px_4px_0px_#121214] space-y-2">
                  <h3 className="text-xs font-black text-[#121214] uppercase tracking-wide flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                    Pemberitahuan Sistem
                  </h3>
                  <p className="text-[11px] text-gray-600 font-semibold leading-relaxed">
                    Perubahan pengaturan jam kerja langsung berlaku saat itu juga untuk seluruh peserta yang sedang mengakses laman presensi tanpa perlu restart server atau re-deploy kode.
                  </p>
                </div>
              </div>
            </div>
          </form>
        )}

        {/* ======================================================== */}
        {/* TAB 2: MANAJEMEN HARI LIBUR NASIONAL & TANGGAL MERAH */}
        {/* ======================================================== */}
        {activeTab === 'hari-libur' && (
          <div className="space-y-6">
            {/* Filter and Action Bar */}
            <div className="bg-white border-2 border-[#121214] rounded-2xl p-4 shadow-[4px_4px_0px_#121214] flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                {/* Search */}
                <div className="relative min-w-[240px]">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Cari hari libur..."
                    value={searchHoliday}
                    onChange={(e) => setSearchHoliday(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-gray-50 border-2 border-[#121214] rounded-xl text-xs font-bold text-[#121214] focus:bg-white focus:outline-none shadow-[2px_2px_0px_#121214]"
                  />
                </div>

                {/* Year Filter */}
                <select
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                  className="px-3 py-2 bg-gray-50 border-2 border-[#121214] rounded-xl text-xs font-bold text-[#121214] focus:outline-none shadow-[2px_2px_0px_#121214] cursor-pointer"
                >
                  <option value="all">Semua Tahun</option>
                  <option value="2025">Tahun 2025</option>
                  <option value="2026">Tahun 2026</option>
                  <option value="2027">Tahun 2027</option>
                </select>
              </div>

              {/* Add Button */}
              <button
                onClick={() => handleOpenModal()}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border-2 border-[#121214] bg-[#FCE373] hover:bg-[#e7ce5a] active:scale-95 text-xs font-black text-[#121214] shadow-[3px_3px_0px_#121214] flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Tambah Hari Libur Nasional
              </button>
            </div>

            {/* Holiday Table */}
            <div className="bg-white border-2 border-[#121214] rounded-2xl shadow-[4px_4px_0px_#121214] overflow-hidden">
              <div className="p-4 border-b-2 border-[#121214] bg-gray-50 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-black uppercase text-[#121214] tracking-wider">
                    Daftar Hari Libur Nasional & Cuti Bersama
                  </h3>
                  <p className="text-[11px] text-gray-500 font-medium">
                    Pada tanggal-tanggal ini, presensi dinonaktifkan otomatis dengan pesan kustom yang Anda tentukan.
                  </p>
                </div>
                <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-[#BDD4F2] border border-[#121214] shadow-[1px_1px_0px_#121214]">
                  {filteredHolidays.length} Hari Libur Terdaftar
                </span>
              </div>

              {loadingHolidays ? (
                <div className="p-12 text-center">
                  <RefreshCw className="w-6 h-6 animate-spin text-[#121214] mx-auto mb-2" />
                  <p className="text-xs font-bold text-gray-500">Memuat daftar hari libur...</p>
                </div>
              ) : filteredHolidays.length === 0 ? (
                <div className="p-12 text-center space-y-3">
                  <CalendarOff className="w-10 h-10 text-gray-400 mx-auto" />
                  <p className="text-sm font-black text-[#121214]">Tidak Ada Hari Libur Ditemukan</p>
                  <p className="text-xs text-gray-500 max-w-sm mx-auto">
                    Belum ada hari libur yang cocok dengan pencarian. Klik tombol "+ Tambah Hari Libur Nasional" di atas.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#121214] text-white uppercase text-[10px] tracking-wider font-black">
                      <tr>
                        <th className="py-3 px-4">Tanggal Libur</th>
                        <th className="py-3 px-4">Hari</th>
                        <th className="py-3 px-4">Nama Hari Libur</th>
                        <th className="py-3 px-4">Keterangan</th>
                        <th className="py-3 px-4">Pesan Pop-up Saat Absen</th>
                        <th className="py-3 px-4 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y-2 divide-gray-100 font-semibold text-[#121214]">
                      {filteredHolidays.map((holiday) => {
                        const hDate = new Date(holiday.holiday_date);
                        const isPast = hDate < new Date().setHours(0, 0, 0, 0);
                        const isToday = hDate.toDateString() === new Date().toDateString();

                        return (
                          <tr key={holiday.holiday_id} className="hover:bg-gray-50 transition-colors">
                            <td className="py-3.5 px-4 font-black whitespace-nowrap">
                              <span className="flex items-center gap-2">
                                <span className={`w-2.5 h-2.5 rounded-full border border-[#121214] ${isToday ? 'bg-red-500 animate-pulse' : isPast ? 'bg-gray-300' : 'bg-[#B8C96E]'}`}></span>
                                {hDate.toLocaleDateString('id-ID', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric'
                                })}
                                {isToday && (
                                  <span className="text-[10px] font-black bg-red-100 text-red-700 px-2 py-0.5 rounded-full border border-red-300">
                                    Hari Ini
                                  </span>
                                )}
                              </span>
                            </td>

                            <td className="py-3.5 px-4 font-bold text-gray-600 whitespace-nowrap">
                              {hDate.toLocaleDateString('id-ID', { weekday: 'long' })}
                            </td>

                            <td className="py-3.5 px-4 font-black">
                              <span className="text-[#121214] block">
                                {holiday.holiday_name}
                              </span>
                            </td>

                            <td className="py-3.5 px-4 text-gray-600 max-w-xs truncate">
                              {holiday.description || '-'}
                            </td>

                            <td className="py-3.5 px-4 text-gray-700 max-w-sm truncate italic">
                              "{holiday.custom_message || `Hari ini adalah hari libur: ${holiday.holiday_name}. Presensi tidak dapat dilakukan.`}"
                            </td>

                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => handleOpenModal(holiday)}
                                  className="p-1.5 rounded-lg border border-[#121214] bg-white hover:bg-gray-100 active:scale-95 text-[#121214] transition-all cursor-pointer"
                                  title="Edit Hari Libur"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteHoliday(holiday)}
                                  className="p-1.5 rounded-lg border border-[#121214] bg-[#F5C6EC] hover:bg-[#ebacd8] active:scale-95 text-[#121214] transition-all cursor-pointer"
                                  title="Hapus Hari Libur"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-red-700" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: LOKASI KANTOR RESMI & RADIUS GEOFENCE GPS */}
        {/* ======================================================== */}
        {activeTab === 'geofence' && (
          <form onSubmit={handleSaveGeofence} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Kolom Kiri: Form Koordinat & Radius (lg:col-span-7) */}
              <div className="lg:col-span-7 space-y-6">
                <div className="bg-white border-2 border-[#121214] rounded-2xl p-6 shadow-[4px_4px_0px_#121214] space-y-5">
                  <div className="flex items-center gap-2.5 border-b-2 border-gray-100 pb-3">
                    <div className="w-8 h-8 rounded-lg bg-[#B8C96E] border border-[#121214] flex items-center justify-center text-[#121214] shadow-[2px_2px_0px_#121214]">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-black text-[#121214] uppercase tracking-wide">
                        Koordinat Acuan Kantor BPJSTK & Geofence
                      </h2>
                      <p className="text-xs text-gray-500 font-medium">
                        Titik pusat GPS kantor yang menjadi acuan validasi presensi selfie peserta.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Nama Kantor */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-[#121214]">
                        Nama Titik Kantor Presensi
                      </label>
                      <input
                        type="text"
                        required
                        value={officeGeofence.name}
                        onChange={(e) => setOfficeGeofence({ ...officeGeofence, name: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-gray-50 border-2 border-[#121214] rounded-xl text-xs font-bold text-[#121214] focus:bg-white focus:outline-none shadow-[2px_2px_0px_#121214]"
                      />
                    </div>

                    {/* Alamat Lengkap */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-[#121214]">
                        Alamat Lengkap Kantor
                      </label>
                      <textarea
                        rows={2}
                        required
                        value={officeGeofence.address}
                        onChange={(e) => setOfficeGeofence({ ...officeGeofence, address: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-gray-50 border-2 border-[#121214] rounded-xl text-xs font-medium text-[#121214] focus:bg-white focus:outline-none shadow-[2px_2px_0px_#121214]"
                      />
                    </div>

                    {/* Lat, Lon, Radius */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-black text-[#121214]">
                          Latitude (Garis Lintang)
                        </label>
                        <input
                          type="number"
                          step="any"
                          required
                          value={officeGeofence.latitude}
                          onChange={(e) => setOfficeGeofence({ ...officeGeofence, latitude: parseFloat(e.target.value) || 0 })}
                          className="w-full px-3.5 py-2.5 bg-gray-50 border-2 border-[#121214] rounded-xl text-xs font-bold text-[#121214] focus:bg-white focus:outline-none shadow-[2px_2px_0px_#121214]"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-black text-[#121214]">
                          Longitude (Garis Bujur)
                        </label>
                        <input
                          type="number"
                          step="any"
                          required
                          value={officeGeofence.longitude}
                          onChange={(e) => setOfficeGeofence({ ...officeGeofence, longitude: parseFloat(e.target.value) || 0 })}
                          className="w-full px-3.5 py-2.5 bg-gray-50 border-2 border-[#121214] rounded-xl text-xs font-bold text-[#121214] focus:bg-white focus:outline-none shadow-[2px_2px_0px_#121214]"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-black text-[#121214]">
                          Radius Validasi (Meter)
                        </label>
                        <input
                          type="number"
                          min="10"
                          max="2000"
                          required
                          value={officeGeofence.radius_meters}
                          onChange={(e) => setOfficeGeofence({ ...officeGeofence, radius_meters: parseInt(e.target.value, 10) || 150 })}
                          className="w-full px-3.5 py-2.5 bg-gray-50 border-2 border-[#121214] rounded-xl text-xs font-bold text-[#121214] focus:bg-white focus:outline-none shadow-[2px_2px_0px_#121214]"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={savingGeofence}
                      className="w-full py-3 px-4 rounded-xl border-2 border-[#121214] bg-[#B8C96E] hover:bg-[#a5b65b] active:scale-95 text-xs font-black text-[#121214] shadow-[3px_3px_0px_#121214] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {savingGeofence ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Simpan Perubahan Koordinat & Radius Kantor
                    </button>
                  </div>
                </div>
              </div>

              {/* Kolom Kanan: Live Info Box (lg:col-span-5) */}
              <div className="lg:col-span-5 space-y-5">
                <div className="bg-[#FAF9F6] border-2 border-[#121214] rounded-2xl p-5 shadow-[4px_4px_0px_#121214] space-y-4">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-[#121214]" />
                    <h3 className="text-xs font-black text-[#121214] uppercase tracking-wide">
                      Petunjuk Validasi Geofence Dinamis
                    </h3>
                  </div>
                  <ul className="text-xs text-gray-700 font-medium space-y-2 list-disc list-inside">
                    <li>Peserta diwajibkan berada dalam lingkaran radius <strong className="font-black text-[#121214]">{officeGeofence.radius_meters} meter</strong> dari titik koordinat resmi ini.</li>
                    <li>Sistem secara otomatis menghitung jarak *Haversine* langsung dari perangkat peserta ke titik GPS ini.</li>
                    <li>Jika kantor berpindah lokasi atau ada toleransi sinyal GPS lemah (misal saat hujan/berada di dalam gedung), Anda cukup menaikkan radius menjadi 200m atau 300m langsung dari sini.</li>
                  </ul>
                  <div className="pt-2">
                    <a
                      href={`https://www.google.com/maps?q=${officeGeofence.latitude},${officeGeofence.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border-2 border-[#121214] text-xs font-black text-[#121214] shadow-[2px_2px_0px_#121214] hover:bg-[#FCE373] transition-all"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      Buka Koordinat di Google Maps
                    </a>
                  </div>
                </div>
              </div>

            </div>
          </form>
        )}

        {/* ======================================================== */}
        {/* TAB 4: TARGET & BOBOT PENILAIAN DINAMIS */}
        {/* ======================================================== */}
        {activeTab === 'penilaian' && (
          <form onSubmit={handleSaveGradingConfig} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Target Capaian (lg:col-span-6) */}
              <div className="lg:col-span-6 space-y-6">
                <div className="bg-white border-2 border-[#121214] rounded-2xl p-6 shadow-[4px_4px_0px_#121214] space-y-4">
                  <div className="flex items-center gap-2.5 border-b-2 border-gray-100 pb-3">
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

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-black text-[#121214]">Target Kunjungan BPU</label>
                      <input
                        type="number"
                        min="1"
                        value={gradingConfig.target_kunjungan_bpu}
                        onChange={(e) => setGradingConfig({ ...gradingConfig, target_kunjungan_bpu: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-50 border-2 border-[#121214] rounded-xl text-xs font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-black text-[#121214]">Target Akuisisi BPU</label>
                      <input
                        type="number"
                        min="1"
                        value={gradingConfig.target_akuisisi_bpu}
                        onChange={(e) => setGradingConfig({ ...gradingConfig, target_akuisisi_bpu: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-50 border-2 border-[#121214] rounded-xl text-xs font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-black text-[#121214]">Target Kunjungan PU</label>
                      <input
                        type="number"
                        min="1"
                        value={gradingConfig.target_kunjungan_pu}
                        onChange={(e) => setGradingConfig({ ...gradingConfig, target_kunjungan_pu: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-50 border-2 border-[#121214] rounded-xl text-xs font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-black text-[#121214]">Target Video Viralisasi</label>
                      <input
                        type="number"
                        min="1"
                        value={gradingConfig.target_video}
                        onChange={(e) => setGradingConfig({ ...gradingConfig, target_video: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-50 border-2 border-[#121214] rounded-xl text-xs font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-black text-[#121214]">Target Kehadiran Seminar</label>
                      <input
                        type="number"
                        min="1"
                        value={gradingConfig.target_seminar}
                        onChange={(e) => setGradingConfig({ ...gradingConfig, target_seminar: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-50 border-2 border-[#121214] rounded-xl text-xs font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-black text-[#121214]">Target Sosialisasi</label>
                      <input
                        type="number"
                        min="1"
                        value={gradingConfig.target_sosialisasi}
                        onChange={(e) => setGradingConfig({ ...gradingConfig, target_sosialisasi: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-50 border-2 border-[#121214] rounded-xl text-xs font-bold"
                      />
                    </div>
                  </div>
                </div>

                {/* Ambang Batas Nilai Huruf */}
                <div className="bg-white border-2 border-[#121214] rounded-2xl p-6 shadow-[4px_4px_0px_#121214] space-y-4">
                  <h3 className="text-xs font-black text-[#121214] uppercase tracking-wide">
                    Ambang Batas Nilai Huruf (Grade Cutoff)
                  </h3>
                  <div className="grid grid-cols-4 gap-2">
                    <div className="space-y-1">
                      <label className="text-[11px] font-black text-emerald-700">Grade A (Min)</label>
                      <input
                        type="number"
                        value={gradingConfig.grade_a_cutoff}
                        onChange={(e) => setGradingConfig({ ...gradingConfig, grade_a_cutoff: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-gray-50 border-2 border-[#121214] rounded-xl text-xs font-black text-center"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-black text-blue-700">Grade B (Min)</label>
                      <input
                        type="number"
                        value={gradingConfig.grade_b_cutoff}
                        onChange={(e) => setGradingConfig({ ...gradingConfig, grade_b_cutoff: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-gray-50 border-2 border-[#121214] rounded-xl text-xs font-black text-center"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-black text-amber-700">Grade C (Min)</label>
                      <input
                        type="number"
                        value={gradingConfig.grade_c_cutoff}
                        onChange={(e) => setGradingConfig({ ...gradingConfig, grade_c_cutoff: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-gray-50 border-2 border-[#121214] rounded-xl text-xs font-black text-center"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-black text-rose-700">Grade D (Min)</label>
                      <input
                        type="number"
                        value={gradingConfig.grade_d_cutoff}
                        onChange={(e) => setGradingConfig({ ...gradingConfig, grade_d_cutoff: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-gray-50 border-2 border-[#121214] rounded-xl text-xs font-black text-center"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Bobot Persentase Nilai (lg:col-span-6) */}
              <div className="lg:col-span-6 space-y-6">
                <div className="bg-white border-2 border-[#121214] rounded-2xl p-6 shadow-[4px_4px_0px_#121214] space-y-4">
                  <div className="flex items-center justify-between border-b-2 border-gray-100 pb-3">
                    <h2 className="text-sm font-black text-[#121214] uppercase tracking-wide">
                      Bobot Persentase Penilaian (%)
                    </h2>
                    <span className={`text-xs font-black px-2.5 py-0.5 rounded border border-[#121214] ${
                      (Number(gradingConfig.weight_akuisisi_bpu) + Number(gradingConfig.weight_kunjungan_bpu) + Number(gradingConfig.weight_kunjungan_pu) + Number(gradingConfig.weight_video) + Number(gradingConfig.weight_seminar) + Number(gradingConfig.weight_sosialisasi) === 100)
                        ? 'bg-[#B8C96E] text-[#121214]'
                        : 'bg-[#F5C6EC] text-[#121214]'
                    }`}>
                      Total: {Number(gradingConfig.weight_akuisisi_bpu) + Number(gradingConfig.weight_kunjungan_bpu) + Number(gradingConfig.weight_kunjungan_pu) + Number(gradingConfig.weight_video) + Number(gradingConfig.weight_seminar) + Number(gradingConfig.weight_sosialisasi)}%
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <label className="text-xs font-bold text-[#121214]">Hasil Akuisisi BPU</label>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={gradingConfig.weight_akuisisi_bpu}
                          onChange={(e) => setGradingConfig({ ...gradingConfig, weight_akuisisi_bpu: e.target.value })}
                          className="w-20 px-2 py-1 bg-gray-50 border-2 border-[#121214] rounded-lg text-xs font-bold text-center"
                        />
                        <span className="text-xs font-bold text-gray-500">%</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <label className="text-xs font-bold text-[#121214]">Kunjungan Lapangan BPU</label>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={gradingConfig.weight_kunjungan_bpu}
                          onChange={(e) => setGradingConfig({ ...gradingConfig, weight_kunjungan_bpu: e.target.value })}
                          className="w-20 px-2 py-1 bg-gray-50 border-2 border-[#121214] rounded-lg text-xs font-bold text-center"
                        />
                        <span className="text-xs font-bold text-gray-500">%</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <label className="text-xs font-bold text-[#121214]">Kunjungan Perusahaan PU</label>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={gradingConfig.weight_kunjungan_pu}
                          onChange={(e) => setGradingConfig({ ...gradingConfig, weight_kunjungan_pu: e.target.value })}
                          className="w-20 px-2 py-1 bg-gray-50 border-2 border-[#121214] rounded-lg text-xs font-bold text-center"
                        />
                        <span className="text-xs font-bold text-gray-500">%</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <label className="text-xs font-bold text-[#121214]">Video Viralisasi BPJSTK</label>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={gradingConfig.weight_video}
                          onChange={(e) => setGradingConfig({ ...gradingConfig, weight_video: e.target.value })}
                          className="w-20 px-2 py-1 bg-gray-50 border-2 border-[#121214] rounded-lg text-xs font-bold text-center"
                        />
                        <span className="text-xs font-bold text-gray-500">%</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <label className="text-xs font-bold text-[#121214]">Kehadiran Seminar Nasional</label>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={gradingConfig.weight_seminar}
                          onChange={(e) => setGradingConfig({ ...gradingConfig, weight_seminar: e.target.value })}
                          className="w-20 px-2 py-1 bg-gray-50 border-2 border-[#121214] rounded-lg text-xs font-bold text-center"
                        />
                        <span className="text-xs font-bold text-gray-500">%</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <label className="text-xs font-bold text-[#121214]">Kehadiran Sosialisasi BPU</label>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={gradingConfig.weight_sosialisasi}
                          onChange={(e) => setGradingConfig({ ...gradingConfig, weight_sosialisasi: e.target.value })}
                          className="w-20 px-2 py-1 bg-gray-50 border-2 border-[#121214] rounded-lg text-xs font-bold text-center"
                        />
                        <span className="text-xs font-bold text-gray-500">%</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3">
                    <button
                      type="submit"
                      disabled={savingGrading}
                      className="w-full py-3 px-4 rounded-xl border-2 border-[#121214] bg-[#BDD4F2] hover:bg-[#a9c5eb] active:scale-95 text-xs font-black text-[#121214] shadow-[3px_3px_0px_#121214] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {savingGrading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Simpan Pengaturan Bobot & Target Penilaian
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </form>
        )}

        {/* ======================================================== */}
        {/* TAB 5: TARIF IURAN & MANFAAT BPJSTK BPU DINAMIS */}
        {/* ======================================================== */}
        {activeTab === 'bpu-rates' && (
          <form onSubmit={handleSaveBpuRates} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              <div className="lg:col-span-7 space-y-6">
                <div className="bg-white border-2 border-[#121214] rounded-2xl p-6 shadow-[4px_4px_0px_#121214] space-y-4">
                  <div className="flex items-center gap-2.5 border-b-2 border-gray-100 pb-3">
                    <div className="w-8 h-8 rounded-lg bg-[#FCE373] border border-[#121214] flex items-center justify-center text-[#121214] shadow-[2px_2px_0px_#121214]">
                      <Calculator className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-black text-[#121214] uppercase tracking-wide">
                        Skema Iuran & Plafon Santunan BPU
                      </h2>
                      <p className="text-xs text-gray-500 font-medium">
                        Parameter simulasi pada Kalkulator BPU dan verifikasi pendaftaran iuran mandiri.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-black text-[#121214]">Persentase Iuran JKK (%)</label>
                      <input
                        type="number"
                        step="any"
                        value={bpuRates.jkk_percentage}
                        onChange={(e) => setBpuRates({ ...bpuRates, jkk_percentage: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-50 border-2 border-[#121214] rounded-xl text-xs font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-black text-[#121214]">Iuran Minimum JKK (Rp)</label>
                      <input
                        type="number"
                        value={bpuRates.jkk_min_amount}
                        onChange={(e) => setBpuRates({ ...bpuRates, jkk_min_amount: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-50 border-2 border-[#121214] rounded-xl text-xs font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-black text-[#121214]">Iuran Flat JKM (Rp)</label>
                      <input
                        type="number"
                        value={bpuRates.jkm_flat_amount}
                        onChange={(e) => setBpuRates({ ...bpuRates, jkm_flat_amount: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-50 border-2 border-[#121214] rounded-xl text-xs font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-black text-[#121214]">Persentase Iuran JHT (%)</label>
                      <input
                        type="number"
                        step="any"
                        value={bpuRates.jht_percentage}
                        onChange={(e) => setBpuRates({ ...bpuRates, jht_percentage: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-50 border-2 border-[#121214] rounded-xl text-xs font-bold"
                      />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-xs font-black text-[#121214]">Santunan Kematian JKM Tunai (Rp)</label>
                      <input
                        type="number"
                        value={bpuRates.death_benefit_amount}
                        onChange={(e) => setBpuRates({ ...bpuRates, death_benefit_amount: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-50 border-2 border-[#121214] rounded-xl text-xs font-bold"
                      />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-xs font-black text-[#121214]">Plafon Beasiswa Maksimal 2 Anak (Rp)</label>
                      <input
                        type="number"
                        value={bpuRates.max_scholarship_amount}
                        onChange={(e) => setBpuRates({ ...bpuRates, max_scholarship_amount: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-50 border-2 border-[#121214] rounded-xl text-xs font-bold"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={savingRates}
                      className="w-full py-3 px-4 rounded-xl border-2 border-[#121214] bg-[#FCE373] hover:bg-[#ebd056] active:scale-95 text-xs font-black text-[#121214] shadow-[3px_3px_0px_#121214] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {savingRates ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Simpan Konfigurasi Tarif Iuran & Manfaat BPU
                    </button>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5 space-y-4">
                <div className="bg-[#FAF9F6] border-2 border-[#121214] rounded-2xl p-5 shadow-[4px_4px_0px_#121214] space-y-3">
                  <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider block">
                    Kombinasi Paket Hemat BPU Aktif:
                  </span>
                  <div className="p-3 bg-white border-2 border-[#121214] rounded-xl space-y-1">
                    <p className="text-xs font-black text-[#121214]">2 Program (JKK + JKM)</p>
                    <p className="text-sm font-black text-emerald-700">Rp {Number(bpuRates.jkk_min_amount) + Number(bpuRates.jkm_flat_amount)} / bulan</p>
                    <p className="text-[10px] text-gray-500">Memberikan proteksi kecelakaan kerja unlimited + santunan Rp 42 juta.</p>
                  </div>
                  <div className="p-3 bg-white border-2 border-[#121214] rounded-xl space-y-1">
                    <p className="text-xs font-black text-[#121214]">3 Program (JKK + JKM + JHT)</p>
                    <p className="text-sm font-black text-blue-700">Mulai Rp {Number(bpuRates.jkk_min_amount) + Number(bpuRates.jkm_flat_amount) + Number(bpuRates.jht_min_amount)} / bulan</p>
                    <p className="text-[10px] text-gray-500">Termasuk tabungan pensiun hari tua.</p>
                  </div>
                </div>
              </div>

            </div>
          </form>
        )}

        {/* Modal Tambah / Edit Hari Libur */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white border-2 border-[#121214] rounded-2xl w-full max-w-lg shadow-[8px_8px_0px_#121214] overflow-hidden animate-in zoom-in-95 duration-150">
              <div className="p-4 bg-[#FCE373] border-b-2 border-[#121214] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#121214]" />
                  <h3 className="text-sm font-black text-[#121214] uppercase tracking-wide">
                    {editingHoliday ? 'Edit Hari Libur Nasional' : 'Tambah Hari Libur Nasional Baru'}
                  </h3>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 rounded-lg hover:bg-black/10 active:scale-95 transition-all text-[#121214] cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitHoliday} className="p-6 space-y-4">
                {/* Tanggal Libur */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-[#121214] flex items-center gap-1.5">
                    Tanggal Hari Libur
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={holidayForm.holiday_date}
                    onChange={(e) => setHolidayForm({ ...holidayForm, holiday_date: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border-2 border-[#121214] rounded-xl text-xs font-black text-[#121214] focus:bg-white focus:outline-none shadow-[2px_2px_0px_#121214]"
                  />
                </div>

                {/* Nama Libur */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-[#121214] flex items-center gap-1.5">
                    Nama Hari Libur / Peringatan
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Hari Kemerdekaan RI, Cuti Bersama Idul Fitri"
                    value={holidayForm.holiday_name}
                    onChange={(e) => {
                      const name = e.target.value;
                      setHolidayForm({
                        ...holidayForm,
                        holiday_name: name,
                        // Auto-fill custom message if empty or unchanged
                        custom_message: holidayForm.custom_message ? holidayForm.custom_message : `Hari ini kantor libur memperingati ${name}. Presensi tidak dapat dilakukan.`
                      });
                    }}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border-2 border-[#121214] rounded-xl text-xs font-bold text-[#121214] focus:bg-white focus:outline-none shadow-[2px_2px_0px_#121214]"
                  />
                </div>

                {/* Keterangan */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-[#121214]">
                    Keterangan Opsional
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Berdasarkan SKB 3 Menteri"
                    value={holidayForm.description}
                    onChange={(e) => setHolidayForm({ ...holidayForm, description: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border-2 border-[#121214] rounded-xl text-xs font-bold text-[#121214] focus:bg-white focus:outline-none shadow-[2px_2px_0px_#121214]"
                  />
                </div>

                {/* Pesan Kustom Saat Absen */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-[#121214] flex items-center justify-between">
                    <span>Pesan Pop-up Saat Peserta Mencoba Absen</span>
                    <span className="text-[10px] text-gray-400 font-bold">Kustom</span>
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Pesan yang akan tampil di layar peserta bila menekan tombol absen..."
                    value={holidayForm.custom_message}
                    onChange={(e) => setHolidayForm({ ...holidayForm, custom_message: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border-2 border-[#121214] rounded-xl text-xs font-bold text-[#121214] focus:bg-white focus:outline-none shadow-[2px_2px_0px_#121214]"
                  />
                </div>

                {/* Modal Buttons */}
                <div className="pt-3 flex items-center justify-end gap-2 border-t-2 border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl border-2 border-[#121214] bg-white hover:bg-gray-100 text-xs font-black text-[#121214] shadow-[2px_2px_0px_#121214] transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submittingHoliday}
                    className="px-5 py-2.5 rounded-xl border-2 border-[#121214] bg-[#B8C96E] hover:bg-[#a5b65b] active:scale-95 text-xs font-black text-[#121214] shadow-[2px_2px_0px_#121214] transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {submittingHoliday ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Menyimpan...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        {editingHoliday ? 'Simpan Perubahan' : 'Tambahkan Hari Libur'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default WorkSchedule;
