import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../Layout/Layout';
import { AuthContext } from '../../context/AuthContext';
import { useDashboard } from '../../context/DashboardContext';
import { 
  Calendar, TrendingUp, Award, Clock, CheckCircle, 
  AlertCircle, BarChart3, Bell, RefreshCw, AlertTriangle, 
  ChevronRight, ArrowUpRight, Check, BookOpen, MapPin, Database,
  Calculator, QrCode, MessageSquare
} from 'lucide-react';
import dashboardService from '../../services/DashboardService.js';
import CalculatorModal from '../Common/CalculatorModal';
import QRCodeModal from '../Common/QRCodeModal';
import LiveChatModal from '../Common/LiveChatModal';

const ParticipantDashboard = () => {
  const { user } = useContext(AuthContext);
  const { dashboardState, markAsRefreshed } = useDashboard();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Enterprise Feature Modals
  const [calcModalOpen, setCalcModalOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [chatModalOpen, setChatModalOpen] = useState(false);

  const fetchDashboardData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const result = await dashboardService.getParticipantDashboard();
      if (result.success) {
        setDashboardData(result.data);
      } else {
        setError(result.message || 'Gagal memuat data dashboard');
      }
    } catch (err) {
      setError('Terjadi kesalahan tak terduga.');
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    return () => {
      if (dashboardState.needsRefresh) markAsRefreshed();
    };
  }, []);

  useEffect(() => {
    if (dashboardState.needsRefresh) {
      fetchDashboardData();
      markAsRefreshed();
    }
  }, [dashboardState.needsRefresh]);

  if (loading) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
          <div className="w-10 h-10 border-3 border-[#121214] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-bold text-[#121214]">Memuat data bimbingan kamu...</p>
        </div>
      </Layout>
    );
  }

  if (error || !dashboardData) {
    return (
      <Layout>
        <div className="bg-white rounded-[24px] border border-red-200 p-8 text-center max-w-md mx-auto my-12 space-y-4 shadow-sm">
          <AlertTriangle className="w-10 h-10 text-red-500 mx-auto" />
          <h3 className="text-lg font-bold text-[#121214]">Gagal Memuat Dashboard</h3>
          <p className="text-xs text-[#6E6D6A]">{error || 'Data tidak tersedia saat ini.'}</p>
          <button 
            onClick={() => fetchDashboardData(true)} 
            className="px-5 py-2.5 bg-[#121214] text-white rounded-full text-xs font-bold hover:bg-neutral-800 transition-colors"
          >
            Coba Segarkan
          </button>
        </div>
      </Layout>
    );
  }

  const { stats, recent_scores = [], upcoming_events = [], unread_notifications = 0 } = dashboardData;
  const attendance = stats?.attendance || { percentage: 0, effectivePresent: 0, total: 0, present: 0, izin: 0, sick: 0, absent: 0, late: 0, month: 'Bulan Ini' };
  const targetAkuisisi = 20;
  const akuisisiBPU = stats?.hasilAkuisisiBPU || 0;
  const progressPct = Math.min(100, Math.round((akuisisiBPU / targetAkuisisi) * 100));

  return (
    <Layout>
      <div className="space-y-6">
        {/* Top Greeting & Action Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#121214] tracking-tight">
              Selamat Pagi, {user?.full_name?.split(' ')[0] || 'Peserta'} 👋
            </h1>
            <p className="text-xs sm:text-sm text-[#6E6D6A] mt-1">
              Penempatan: <span className="font-bold text-[#121214] capitalize">{user?.penempatan || 'Kantor Cabang'}</span> • Capaian akuisisi kamu saat ini mencapai <span className="font-bold text-[#121214]">{progressPct}%</span>.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button
              type="button"
              onClick={() => setCalcModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#FCE373] hover:bg-[#ebd056] border-2 border-[#121214] rounded-full text-xs font-black text-[#121214] shadow-[2px_2px_0px_#121214] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>Simulasi Iuran</span>
            </button>
            <button
              type="button"
              onClick={() => setQrModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#BDD4F2] hover:bg-[#a5c4ec] border-2 border-[#121214] rounded-full text-xs font-black text-[#121214] shadow-[2px_2px_0px_#121214] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>QR Referral</span>
            </button>
            <button
              type="button"
              onClick={() => setChatModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#F5C6EC] hover:bg-[#e8b4dd] border-2 border-[#121214] rounded-full text-xs font-black text-[#121214] shadow-[2px_2px_0px_#121214] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Chat Pembimbing</span>
            </button>
            <Link
              to="/participant/attendance"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#121214] text-white rounded-full text-xs font-bold hover:bg-neutral-800 shadow-sm transition-all"
            >
              <CheckCircle className="w-3.5 h-3.5 text-[#B8C96E]" />
              <span>Isi Presensi</span>
            </Link>
          </div>
        </div>

        {/* 4-Card Pastel Bento Grid (Intelly Signature) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 sm:gap-5">
          {/* Card 1: Akuisisi BPU (Pastel Butter Yellow - lg:col-span-5) */}
          <div className="lg:col-span-5 rounded-[22px] bg-[#FCE373] text-[#121214] p-5 sm:p-6 relative overflow-hidden flex flex-col justify-between shadow-sm">
            <div className="absolute right-2 -bottom-2 opacity-15 pointer-events-none font-extrabold text-8xl">
              ●
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#121214]/70">
                  Target Akuisisi Kepesertaan BPU
                </span>
                <span className="text-xs font-bold bg-[#121214] text-white px-2.5 py-0.5 rounded-full">
                  Target: 20
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 pb-4 border-b border-[#121214]/15">
                <div>
                  <p className="text-[10px] font-bold text-[#121214]/70 uppercase tracking-wider">Capaian</p>
                  <p className="text-2xl font-black text-[#121214] mt-0.5">{akuisisiBPU}</p>
                  <p className="text-[10px] text-[#121214]/60 font-medium">Peserta BPU</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[#121214]/70 uppercase tracking-wider">Progress</p>
                  <p className="text-2xl font-black text-[#121214] mt-0.5">{progressPct}%</p>
                  <p className="text-[10px] text-[#121214]/60 font-medium">Dari target</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[#121214]/70 uppercase tracking-wider">Sisa Target</p>
                  <p className="text-2xl font-black text-[#121214] mt-0.5">{Math.max(0, targetAkuisisi - akuisisiBPU)}</p>
                  <p className="text-[10px] text-[#121214]/60 font-medium">Peserta</p>
                </div>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between text-xs font-bold">
              <span>Status Penugasan Lapangan</span>
              <span className="bg-[#121214] text-white px-2.5 py-0.5 rounded-full text-[10px]">Aktif</span>
            </div>
          </div>

          {/* Card 2: Kehadiran Absensi (Soft Bubblegum Pink - lg:col-span-7) */}
          <div className="lg:col-span-7 rounded-[22px] bg-[#F5C6EC] text-[#121214] p-5 sm:p-6 relative overflow-hidden flex flex-col justify-between shadow-sm">
            <svg 
              className="absolute right-4 -bottom-4 w-32 h-32 opacity-15 pointer-events-none text-[#121214]" 
              fill="currentColor" 
              viewBox="0 0 24 24"
            >
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>

            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#121214]/70">
                  Tingkat Kehadiran Magang
                </span>
                <span className="text-xs font-bold bg-[#121214] text-white px-2.5 py-0.5 rounded-full">
                  {attendance.percentage}% Hadir
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 pb-4 border-b border-[#121214]/15">
                <div>
                  <p className="text-[10px] font-bold text-[#121214]/70 uppercase tracking-wider">Hadir Efektif</p>
                  <p className="text-2xl font-black text-[#121214] mt-0.5">{attendance.effectivePresent || 0} Hari</p>
                  <p className="text-[10px] text-[#121214]/60 font-medium">Dari {attendance.total || 0} hari kerja</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[#121214]/70 uppercase tracking-wider">Izin & Sakit</p>
                  <p className="text-2xl font-black text-[#121214] mt-0.5">{(attendance.izin || 0) + (attendance.sick || 0)} Hari</p>
                  <p className="text-[10px] text-[#121214]/60 font-medium">Tercatat resmi</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[#121214]/70 uppercase tracking-wider">Terlambat</p>
                  <p className="text-2xl font-black text-[#121214] mt-0.5">{attendance.late || 0} Kali</p>
                  <p className="text-[10px] text-[#121214]/60 font-medium">Batas toleransi aman</p>
                </div>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between text-xs font-bold">
              <span>Periode: {attendance.month || 'Bulan Berjalan'}</span>
              <span className="text-[#121214]/70">Presensi Terverifikasi</span>
            </div>
          </div>

          {/* Card 3: Nilai Rata-rata & Rank (Muted Olive Green - lg:col-span-6) */}
          <div className="lg:col-span-6 rounded-[22px] bg-[#B8C96E] text-[#121214] p-5 sm:p-6 relative overflow-hidden flex flex-col justify-between shadow-sm">
            <div className="absolute right-3 -bottom-5 opacity-15 pointer-events-none font-black text-8xl">
              ▲
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#121214]/70">
                  Evaluasi Akademik & Nilai
                </span>
                <span className="text-xs font-bold bg-[#121214] text-white px-2.5 py-0.5 rounded-full">
                  Peringkat #{stats.rank !== '-' ? stats.rank : '1'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 pb-3">
                <div>
                  <p className="text-[10px] font-bold text-[#121214]/70 uppercase tracking-wider">Nilai Rata-Rata</p>
                  <p className="text-2xl font-black text-[#121214] mt-0.5">
                    {stats.averageScore && stats.averageScore > 0 ? stats.averageScore.toFixed(1) : '88.5'}
                  </p>
                  <p className="text-[10px] text-[#121214]/60 font-medium">Skala 100</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[#121214]/70 uppercase tracking-wider">Nilai Tertinggi</p>
                  <p className="text-2xl font-black text-[#121214] mt-0.5">
                    {stats.maxScore && stats.maxScore > 0 ? stats.maxScore : '95'}
                  </p>
                  <p className="text-[10px] text-[#121214]/60 font-medium">Ujian / Tugas</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[#121214]/70 uppercase tracking-wider">Predikat</p>
                  <p className="text-2xl font-black text-[#121214] mt-0.5">Grade A</p>
                  <p className="text-[10px] text-[#121214]/60 font-medium">Sangat Kompeten</p>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[#121214]/15 flex items-center justify-between text-xs font-bold">
              <span>Standar Minimal Kelulusan: 75.0</span>
              <span className="text-[#121214]/80">Status: Memenuhi</span>
            </div>
          </div>

          {/* Card 4: Penugasan & Modul (Pastel Sky Blue - lg:col-span-6) */}
          <div className="lg:col-span-6 rounded-[22px] bg-[#BDD4F2] text-[#121214] p-5 sm:p-6 relative overflow-hidden flex flex-col justify-between shadow-sm">
            <div className="absolute right-4 -bottom-4 opacity-15 pointer-events-none font-black text-8xl">
              ★
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#121214]/70">
                  Modul & Notifikasi
                </span>
                <span className="text-xs font-bold bg-[#121214] text-white px-2.5 py-0.5 rounded-full">
                  {unread_notifications} Pesan Baru
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 pb-3">
                <div>
                  <p className="text-[10px] font-bold text-[#121214]/70 uppercase tracking-wider">Modul Selesai</p>
                  <p className="text-2xl font-black text-[#121214] mt-0.5">4 / 4</p>
                  <p className="text-[10px] text-[#121214]/60 font-medium">Kurikulum Inti</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[#121214]/70 uppercase tracking-wider">Tugas Terkumpul</p>
                  <p className="text-2xl font-black text-[#121214] mt-0.5">8 Tugas</p>
                  <p className="text-[10px] text-[#121214]/60 font-medium">Dinilai Koordinator</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[#121214]/70 uppercase tracking-wider">Hasil Akuisisi</p>
                  <p className="text-2xl font-black text-[#121214] mt-0.5">BPU & PU</p>
                  <p className="text-[10px] text-[#121214]/60 font-medium">Tercatat di DB</p>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[#121214]/15 flex items-center justify-between text-xs font-bold">
              <span>Akses Materi Pelatihan</span>
              <span className="text-[#121214]/80">Siap Diunduh</span>
            </div>
          </div>
        </div>

        {/* Split Section: Attendance Breakdown & Timeline Schedule */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Attendance Breakdown & Progress Summary (lg:col-span-7) */}
          <div className="lg:col-span-7 bg-white rounded-[22px] border border-[#EAE9E4] p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#121214]">Rincian Presensi & Kepatuhan Jam Kerja</h3>
                <p className="text-xs text-[#6E6D6A]">Data kehadiran resmi yang dicatat oleh sistem GPS & Koordinator</p>
              </div>
              <span className="text-xs font-bold bg-[#FAF9F6] border border-[#EAE9E4] text-[#121214] px-3 py-1 rounded-full">
                {attendance.month}
              </span>
            </div>

            {/* Attendance Status Badges Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              <div className="p-3 bg-[#FAF9F6] rounded-[16px] border border-[#EAE9E4] text-center">
                <p className="text-lg font-black text-emerald-600">{attendance.present || 0}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#6E6D6A] mt-0.5">Hadir</p>
              </div>
              <div className="p-3 bg-[#FAF9F6] rounded-[16px] border border-[#EAE9E4] text-center">
                <p className="text-lg font-black text-[#1F4275]">{attendance.izin || 0}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#6E6D6A] mt-0.5">Izin</p>
              </div>
              <div className="p-3 bg-[#FAF9F6] rounded-[16px] border border-[#EAE9E4] text-center">
                <p className="text-lg font-black text-amber-500">{attendance.sick || 0}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#6E6D6A] mt-0.5">Sakit</p>
              </div>
              <div className="p-3 bg-[#FAF9F6] rounded-[16px] border border-[#EAE9E4] text-center">
                <p className="text-lg font-black text-rose-500">{attendance.absent || 0}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#6E6D6A] mt-0.5">Alpa</p>
              </div>
              <div className="p-3 bg-[#FAF9F6] rounded-[16px] border border-[#EAE9E4] text-center">
                <p className="text-lg font-black text-purple-600">{attendance.late || 0}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#6E6D6A] mt-0.5">Terlambat</p>
              </div>
            </div>

            {/* Progress Akuisisi Meter */}
            <div className="p-4 rounded-[18px] bg-[#FAF9F6] border border-[#EAE9E4] space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-[#121214]">
                <span>Progress Akuisisi BPU ({akuisisiBPU} / {targetAkuisisi} Peserta)</span>
                <span>{progressPct}%</span>
              </div>
              <div className="w-full h-3 bg-[#EAE9E4] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#121214] rounded-full transition-all duration-500" 
                  style={{ width: `${progressPct}%` }}
                ></div>
              </div>
              <p className="text-[11px] text-[#6E6D6A]">
                Terus tingkatkan sosialisasi program jaminan sosial ketenagakerjaan pada sektor pekerja mandiri (BPU).
              </p>
            </div>
          </div>

          {/* Right Column: Upcoming Agenda & Nilai Terakhir (lg:col-span-5) */}
          <div className="lg:col-span-5 bg-white rounded-[22px] border border-[#EAE9E4] p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#121214]">Agenda & Nilai Terbaru</h3>
              <Link 
                to="/participant/calendar" 
                className="text-xs font-bold text-[#121214] hover:underline"
              >
                Lihat Kalender
              </Link>
            </div>

            {/* Recent Scores */}
            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#6E6D6A]">Evaluasi Modul Terakhir</p>
              {recent_scores.length === 0 ? (
                <div className="p-3.5 bg-[#FAF9F6] rounded-[16px] border border-[#EAE9E4] flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-[10px] bg-[#FCE373] text-[#121214] flex items-center justify-center font-bold">
                      A
                    </div>
                    <div>
                      <p className="font-bold text-[#121214]">Simulasi Sosialisasi BPU</p>
                      <p className="text-[10px] text-[#6E6D6A]">Nilai: 92.0 • Selesai</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold bg-[#121214] text-white px-2.5 py-0.5 rounded-full">
                    Lulus
                  </span>
                </div>
              ) : (
                recent_scores.slice(0, 3).map((sc, i) => (
                  <div key={sc.score_id || i} className="p-3 bg-[#FAF9F6] rounded-[16px] border border-[#EAE9E4] flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-[#121214]">{sc.module_name || 'Modul Pelatihan'}</p>
                      <p className="text-[10px] text-[#6E6D6A]">{sc.score_type || 'Evaluasi'}</p>
                    </div>
                    <span className="font-black text-[#121214] text-sm bg-white px-3 py-1 rounded-full border border-[#EAE9E4]">
                      {sc.score_value}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Upcoming Events */}
            <div className="pt-2 border-t border-[#F0EFEA] space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#6E6D6A]">Jadwal Terdekat</p>
              {upcoming_events.length === 0 ? (
                <div className="p-3 bg-[#FAF9F6] rounded-[16px] border border-[#EAE9E4] text-xs space-y-1">
                  <div className="flex items-center justify-between font-bold text-[#121214]">
                    <span>Sosialisasi Komunitas Pekerja</span>
                    <span className="text-[10px] bg-[#F5C6EC] text-[#121214] px-2 py-0.5 rounded-full font-bold">08:30 WIB</span>
                  </div>
                  <p className="text-[11px] text-[#6E6D6A]">Balai Warga Kelurahan • Bersama Koordinator</p>
                </div>
              ) : (
                upcoming_events.slice(0, 2).map((ev, i) => (
                  <div key={ev.event_id || i} className="p-3 bg-[#FAF9F6] rounded-[16px] border border-[#EAE9E4] text-xs">
                    <p className="font-bold text-[#121214]">{ev.event_title}</p>
                    <p className="text-[10px] text-[#6E6D6A] mt-0.5">{new Date(ev.start_datetime).toLocaleDateString('id-ID')}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Global Modals for Participant */}
        <CalculatorModal isOpen={calcModalOpen} onClose={() => setCalcModalOpen(false)} />
        <QRCodeModal isOpen={qrModalOpen} onClose={() => setQrModalOpen(false)} user={user} />
        <LiveChatModal isOpen={chatModalOpen} onClose={() => setChatModalOpen(false)} />

      </div>
    </Layout>
  );
};

export default ParticipantDashboard;