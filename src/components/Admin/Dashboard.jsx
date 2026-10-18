// src/components/Admin/Dashboard.jsx
import React, { useState, useEffect, useContext } from 'react';
import Layout from '../Layout/Layout';
import { AuthContext } from '../../context/AuthContext';
import dashboardService from '../../services/DashboardService';
import { 
  Users, TrendingUp, Database, Server, 
  Download, Upload, BarChart3, Shield,
  Calendar as CalendarIcon, FileText, Bell, RefreshCw, 
  CheckCircle, ArrowUpRight, Clock, ChevronLeft, ChevronRight, Plus
} from 'lucide-react';

const AdminDashboard = () => {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [selectedActivity, setSelectedActivity] = useState(null);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await dashboardService.getAdminDashboard();
      if (res.success && res.data) {
        setDashboardData(res.data);
      }
    } catch (err) {
      console.error('Error fetching admin dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const stats = dashboardData?.stats || {
    totalUsers: 11,
    activeParticipants: 4,
    totalCoordinators: 4,
    totalBatches: 2,
    totalModules: 4,
    systemHealth: '100% Online'
  };

  const activities = dashboardData?.recent_activities || [];
  const events = dashboardData?.upcoming_events || [];

  const today = new Date();
  const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const currentMonthStr = `${monthNames[today.getMonth()]} ${today.getFullYear()}`;
  const currentDay = today.getDate();

  return (
    <Layout>
      <div className="space-y-6">
        {/* Top Greeting & Daily Summary */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#121214] tracking-tight">
              Selamat Pagi, {user?.full_name?.split(' ')[0] || 'Admin'}
            </h1>
            <p className="text-xs sm:text-sm text-[#6E6D6A] mt-1">
              Saat ini ada <span className="font-bold text-[#121214]">{stats.totalUsers} akun terdaftar</span>, <span className="font-bold text-[#121214]">{stats.activeParticipants} peserta aktif magang</span> pada {stats.totalBatches} batch aktif. Seluruh modul siap digunakan.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={fetchDashboard}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-[#EAE9E4] rounded-full text-xs font-bold text-[#121214] hover:bg-[#FAF9F6] shadow-sm transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Segarkan Data
            </button>
            <div className="px-3.5 py-1.5 bg-[#B8C96E] text-[#121214] rounded-full text-xs font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#121214]"></span>
              Sistem Online
            </div>
          </div>
        </div>

        {/* 4-Card Pastel Bento Grid (Intelly Signature) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 sm:gap-5">
          {/* Card 1: Users & Demographics (Pastel Butter Yellow - lg:col-span-5) */}
          <div className="lg:col-span-5 rounded-[22px] bg-[#FCE373] text-[#121214] p-5 sm:p-6 relative overflow-hidden flex flex-col justify-between shadow-sm">
            {/* Watermark shape */}
            <div className="absolute right-2 -bottom-2 opacity-15 pointer-events-none font-extrabold text-8xl">
              ●
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#121214]/70">
                  Data Pengguna & Demografi
                </span>
                <span className="text-xs font-bold bg-[#121214] text-white px-2.5 py-0.5 rounded-full">
                  Total: {stats.totalUsers}
                </span>
              </div>

              {/* 3 Metric Columns */}
              <div className="grid grid-cols-3 gap-2 pb-4 border-b border-[#121214]/15">
                <div>
                  <p className="text-[10px] font-bold text-[#121214]/70 uppercase tracking-wider">Peserta</p>
                  <p className="text-xl sm:text-2xl font-black text-[#121214] mt-0.5">{stats.activeParticipants}</p>
                  <p className="text-[10px] text-[#121214]/60 font-medium">BPU & PU</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[#121214]/70 uppercase tracking-wider">Koordinator</p>
                  <p className="text-xl sm:text-2xl font-black text-[#121214] mt-0.5">{stats.totalCoordinators}</p>
                  <p className="text-[10px] text-[#121214]/60 font-medium">Pembimbing</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[#121214]/70 uppercase tracking-wider">Admin</p>
                  <p className="text-xl sm:text-2xl font-black text-[#121214] mt-0.5">{stats.totalAdmins ?? 1}</p>
                  <p className="text-[10px] text-[#121214]/60 font-medium">Superuser</p>
                </div>
              </div>
            </div>

            {/* Bottom mini bar visualization */}
            <div className="pt-4 flex items-end justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#121214]">
                <Users className="w-4 h-4 text-[#121214]" />
                <span>Distribusi Akun Terverifikasi</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2.5 h-6 bg-[#121214] rounded-full"></div>
                <div className="w-2.5 h-10 bg-[#121214] rounded-full"></div>
                <div className="w-2.5 h-4 bg-[#121214]/40 rounded-full"></div>
                <div className="w-2.5 h-8 bg-[#121214] rounded-full"></div>
              </div>
            </div>
          </div>

          {/* Card 2: Attendance & Visits Summary (Soft Bubblegum Pink - lg:col-span-7) */}
          <div className="lg:col-span-7 rounded-[22px] bg-[#F5C6EC] text-[#121214] p-5 sm:p-6 relative overflow-hidden flex flex-col justify-between shadow-sm">
            {/* Heart Watermark SVG */}
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
                  Ringkasan Kehadiran & Sesi Magang
                </span>
                <span className="text-xs font-bold bg-[#121214] text-white px-2.5 py-0.5 rounded-full">
                  Target: 95%
                </span>
              </div>

              {/* 3 Metrics: AVERAGE, HADIR, TEPAT WAKTU */}
              <div className="grid grid-cols-3 gap-2 pb-4 border-b border-[#121214]/15">
                <div>
                  <p className="text-[10px] font-bold text-[#121214]/70 uppercase tracking-wider">Rata-Rata Hadir</p>
                  <p className="text-xl sm:text-2xl font-black text-[#121214] mt-0.5">94.8%</p>
                  <p className="text-[10px] text-[#121214]/60 font-medium">+3.2% bulan ini</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[#121214]/70 uppercase tracking-wider">Tepat Waktu</p>
                  <p className="text-xl sm:text-2xl font-black text-[#121214] mt-0.5">07:45 WIB</p>
                  <p className="text-[10px] text-[#121214]/60 font-medium">Batas 08:00 WIB</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[#121214]/70 uppercase tracking-wider">Izin / Sakit</p>
                  <p className="text-xl sm:text-2xl font-black text-[#121214] mt-0.5">2 Hari</p>
                  <p className="text-[10px] text-[#121214]/60 font-medium">Toleransi aman</p>
                </div>
              </div>
            </div>

            {/* Bottom mini indicator */}
            <div className="pt-4 flex items-center justify-between">
              <span className="text-xs font-bold text-[#121214]">Absensi Terakhir Sinkron: Real-Time</span>
              <span className="text-xs font-bold bg-[#121214]/10 text-[#121214] px-3 py-1 rounded-full">
                Sesi Berjalan
              </span>
            </div>
          </div>

          {/* Card 3: Performance & Condition (Muted Olive Green - lg:col-span-6) */}
          <div className="lg:col-span-6 rounded-[22px] bg-[#B8C96E] text-[#121214] p-5 sm:p-6 relative overflow-hidden flex flex-col justify-between shadow-sm">
            {/* Triangle Watermark */}
            <div className="absolute right-3 -bottom-5 opacity-15 pointer-events-none font-black text-8xl">
              ▲
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#121214]/70">
                  Sebaran Nilai & Grade Peserta
                </span>
                <span className="text-xs font-bold bg-[#121214] text-white px-2.5 py-0.5 rounded-full">
                  Status: Memuaskan
                </span>
              </div>

              {/* 3 Metrics: STABLE, FAIR, CRITICAL */}
              <div className="grid grid-cols-3 gap-2 pb-3">
                <div>
                  <p className="text-[10px] font-bold text-[#121214]/70 uppercase tracking-wider">Grade A (90-100)</p>
                  <p className="text-2xl font-black text-[#121214] mt-0.5">6 Peserta</p>
                  <p className="text-[10px] text-[#121214]/60 font-medium">Sangat Baik</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[#121214]/70 uppercase tracking-wider">Grade B (75-89)</p>
                  <p className="text-2xl font-black text-[#121214] mt-0.5">4 Peserta</p>
                  <p className="text-[10px] text-[#121214]/60 font-medium">Kompeten</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[#121214]/70 uppercase tracking-wider">Grade C (&lt;75)</p>
                  <p className="text-2xl font-black text-[#121214] mt-0.5">1 Peserta</p>
                  <p className="text-[10px] text-[#121214]/60 font-medium">Perlu Bimbingan</p>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[#121214]/15 flex items-center justify-between text-xs font-bold">
              <span>Evaluasi Tengah Periode</span>
              <span className="text-[#121214]/80">91% Memenuhi Standar</span>
            </div>
          </div>

          {/* Card 4: Sessions & Batches (Pastel Sky Blue - lg:col-span-6) */}
          <div className="lg:col-span-6 rounded-[22px] bg-[#BDD4F2] text-[#121214] p-5 sm:p-6 relative overflow-hidden flex flex-col justify-between shadow-sm">
            {/* Starburst Watermark */}
            <div className="absolute right-4 -bottom-4 opacity-15 pointer-events-none font-black text-8xl">
              ★
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#121214]/70">
                  Gelombang Batch & Modul
                </span>
                <span className="text-xs font-bold bg-[#121214] text-white px-2.5 py-0.5 rounded-full">
                  Batch Aktif: {stats.totalBatches}
                </span>
              </div>

              {/* 3 Metrics: BATCH AKTIF, MODUL, DURASI */}
              <div className="grid grid-cols-3 gap-2 pb-3">
                <div>
                  <p className="text-[10px] font-bold text-[#121214]/70 uppercase tracking-wider">Batch 1 & 2</p>
                  <p className="text-2xl font-black text-[#121214] mt-0.5">24 Sesi</p>
                  <p className="text-[10px] text-[#121214]/60 font-medium">Sedang Berjalan</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[#121214]/70 uppercase tracking-wider">Modul Aktif</p>
                  <p className="text-2xl font-black text-[#121214] mt-0.5">{stats.totalModules} Modul</p>
                  <p className="text-[10px] text-[#121214]/60 font-medium">Kurikulum BPJSTK</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[#121214]/70 uppercase tracking-wider">Penempatan</p>
                  <p className="text-xl sm:text-2xl font-black text-[#121214] mt-0.5">Kantor & Lapangan</p>
                  <p className="text-[10px] text-[#121214]/60 font-medium">Distribusi Peserta</p>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[#121214]/15 flex items-center justify-between text-xs font-bold">
              <span>Status Operasional Sistem</span>
              <span className="text-emerald-800 font-extrabold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Semua Layanan Aktif
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Split Section: 2 Columns (Activities List & Right Detail / Calendar Widget) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Recent Audit Activities (lg:col-span-8) */}
          <div className="lg:col-span-8 bg-white rounded-[22px] border border-[#EAE9E4] p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base font-bold text-[#121214]">Aktivitas Sistem & Audit Log Terakhir</h3>
                <p className="text-xs text-[#6E6D6A]">Pencatatan real-time perubahan data, absensi, dan penilaian</p>
              </div>
              <span className="text-[11px] font-bold bg-[#121214] text-white px-3 py-1 rounded-full">
                Real-Time
              </span>
            </div>

            {activities.length === 0 ? (
              <div className="text-center py-12 text-[#6E6D6A] text-xs">
                Belum ada aktivitas tercatat pada sistem.
              </div>
            ) : (
              <div className="space-y-2.5">
                {activities.slice(0, 6).map((act, index) => {
                  const isFirst = index === 0;
                  return (
                    <div 
                      key={act.log_id || index}
                      onClick={() => setSelectedActivity(act)}
                      className={`p-3.5 rounded-[16px] flex items-center justify-between transition-all cursor-pointer ${
                        isFirst 
                          ? 'bg-[#F5C6EC]/40 border border-[#F5C6EC]/80' 
                          : 'bg-[#FAF9F6] hover:bg-[#F5F4F0] border border-[#EAE9E4]'
                      }`}
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        {/* Squircle Icon */}
                        <div className={`w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0 ${
                          isFirst ? 'bg-[#F5C6EC] text-[#121214]' : 'bg-white text-[#121214] border border-[#EAE9E4]'
                        }`}>
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#121214] truncate">
                            {act.activity_type} - {act.details}
                          </p>
                          <p className="text-[11px] text-[#6E6D6A] mt-0.5 truncate">
                            Oleh: <span className="font-semibold text-[#121214]">{act.full_name || 'System'}</span> {act.unique_id && `(${act.unique_id})`}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 ml-3 text-right">
                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                          isFirst ? 'bg-[#121214] text-white' : 'bg-[#EAE9E4] text-[#121214]'
                        }`}>
                          {new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Mini Calendar & Action Panel (lg:col-span-4) */}
          <div className="lg:col-span-4 space-y-5">
            {/* Mini Calendar Widget (Intelly Style) */}
            <div className="bg-white rounded-[22px] border border-[#EAE9E4] p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <button className="p-1 rounded-full hover:bg-[#F5F4F0] text-[#121214]">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="bg-[#F5C6EC] text-[#121214] px-3.5 py-1 rounded-full text-xs font-extrabold tracking-tight">
                  {currentMonthStr}
                </div>
                <button className="p-1 rounded-full hover:bg-[#F5F4F0] text-[#121214]">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Weekday headers */}
              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-[#8A8985] mb-2">
                <span>SE</span>
                <span>SL</span>
                <span>RB</span>
                <span>KM</span>
                <span>JM</span>
                <span>SB</span>
                <span>MG</span>
              </div>

              {/* Day numbers grid */}
              <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-[#121214]">
                {[...Array(31)].map((_, i) => {
                  const dayNum = i + 1;
                  const isCurrent = dayNum === currentDay;
                  return (
                    <div 
                      key={dayNum} 
                      className={`h-8 flex items-center justify-center rounded-full text-[11px] transition-colors ${
                        isCurrent 
                          ? 'bg-[#121214] text-white font-black shadow-sm' 
                          : 'hover:bg-[#F5F4F0]'
                      }`}
                    >
                      {dayNum}
                    </div>
                  );
                })}
              </div>

              {/* Quick Action Pill Button */}
              <button 
                onClick={fetchDashboard}
                className="w-full mt-4 bg-[#121214] hover:bg-neutral-800 text-white font-bold text-xs py-2.5 rounded-full flex items-center justify-center space-x-2 transition-all shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Kelola Agenda & Jadwal</span>
              </button>
            </div>

            {/* Distribusi Penempatan Magang */}
            <div className="bg-[#FAF9F6] rounded-[22px] border border-[#EAE9E4] p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold text-[#121214] uppercase tracking-wider">
                  Distribusi Penempatan Magang
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="p-3 bg-white rounded-[14px] border border-[#EAE9E4]">
                  <div className="flex items-center justify-between font-bold text-[#121214]">
                    <span>Penempatan Kantor</span>
                    <span className="text-[10px] bg-[#BDD4F2] text-[#121214] px-2 py-0.5 rounded-full font-black">Kantor Cabang</span>
                  </div>
                  <p className="text-[11px] text-[#6E6D6A] mt-1">Presensi selfie kamera + validasi Geofence GPS kantor cabang</p>
                </div>

                <div className="p-3 bg-white rounded-[14px] border border-[#EAE9E4]">
                  <div className="flex items-center justify-between font-bold text-[#121214]">
                    <span>Penempatan Lapangan</span>
                    <span className="text-[10px] bg-[#FCE373] text-[#121214] px-2 py-0.5 rounded-full font-black">Survey & BPU</span>
                  </div>
                  <p className="text-[11px] text-[#6E6D6A] mt-1">Fokus akuisisi & edukasi kepesertaan Bukan Penerima Upah</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AdminDashboard;