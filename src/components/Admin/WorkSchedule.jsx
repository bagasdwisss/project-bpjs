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
  CalendarOff
} from 'lucide-react';
import NeoDatePicker from '../Common/NeoDatePicker';

const WorkSchedule = () => {
  const { toast, confirm } = useToast();
  const [activeTab, setActiveTab] = useState('jam-kerja'); // 'jam-kerja' | 'hari-libur'
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  // Settings State
  const [settings, setSettings] = useState({
    work_start_time: '07:00',
    work_ontime_limit: '08:00',
    work_end_time: '17:00',
    allow_weekend: false,
    late_tolerance_minutes: 0,
    weekend_message: 'Hari ini adalah hari libur akhir pekan (Sabtu/Minggu). Presensi dinonaktifkan.',
    before_start_message: 'Presensi belum dibuka. Jam masuk dimulai pukul {start_time}.',
    after_end_message: 'Presensi hari ini telah ditutup pada pukul {end_time}.'
  });

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
        weekend_message: settings.weekend_message.trim(),
        before_start_message: settings.before_start_message.trim(),
        after_end_message: settings.after_end_message.trim()
      };

      const res = await api.put('/admin/attendance-settings', payload);
      if (res.data?.success) {
        toast.success('Pengaturan jam kerja dan aturan presensi berhasil disimpan secara dinamis!');
      }
    } catch (err) {
      console.error('Error saving settings:', err);
      toast.error('Gagal menyimpan pengaturan: ' + (err.response?.data?.message || err.message));
    } finally {
      setSavingSettings(false);
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
        <div className="flex items-center gap-3 border-b-2 border-[#121214]/10 pb-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('jam-kerja')}
            className={`px-5 py-2.5 rounded-xl border-2 border-[#121214] text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'jam-kerja'
                ? 'bg-[#FCE373] text-[#121214] shadow-[3px_3px_0px_#121214]'
                : 'bg-white text-gray-600 hover:text-[#121214] hover:bg-gray-100 shadow-[1px_1px_0px_#121214]'
            }`}
          >
            <Clock className="w-4 h-4" />
            Pengaturan Jam Kerja & Keterlambatan
          </button>

          <button
            onClick={() => setActiveTab('hari-libur')}
            className={`px-5 py-2.5 rounded-xl border-2 border-[#121214] text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'hari-libur'
                ? 'bg-[#F5C6EC] text-[#121214] shadow-[3px_3px_0px_#121214]'
                : 'bg-white text-gray-600 hover:text-[#121214] hover:bg-gray-100 shadow-[1px_1px_0px_#121214]'
            }`}
          >
            <CalendarOff className="w-4 h-4" />
            Manajemen Hari Libur Nasional ({holidays.length})
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
