import React, { useState, useEffect, useContext } from 'react';
import Layout from '../Layout/Layout';
import { AuthContext } from '../../context/AuthContext';
import dashboardService from '../../services/DashboardService';
import api from '../../services/api';
import SecurityPinModal from '../Common/SecurityPinModal';
import { getTimeGreeting } from '../../utils/trueTime';
import { 
  Users, TrendingUp, Database, Server, 
  Download, Upload, BarChart3, Shield,
  Calendar as CalendarIcon, FileText, Bell, RefreshCw, 
  CheckCircle, ArrowUpRight, Clock, ChevronLeft, ChevronRight, Plus,
  ShieldCheck, ShieldAlert, Wrench, Archive, Check, AlertTriangle, Key
} from 'lucide-react';

const AdminDashboard = () => {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [selectedActivity, setSelectedActivity] = useState(null);

  // Enterprise System Hardening & Maintenance State
  const [maintenance, setMaintenance] = useState({ is_active: false, message: '', estimated_end: null });
  const [updatingMaintenance, setUpdatingMaintenance] = useState(false);
  const [merkleStatus, setMerkleStatus] = useState(null);
  const [verifyingMerkle, setVerifyingMerkle] = useState(false);
  const [securityPinOpen, setSecurityPinOpen] = useState(false);
  const [pendingDangerousAction, setPendingDangerousAction] = useState(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState(null);

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

  const fetchMaintenance = async () => {
    try {
      const res = await api.get('/admin/system/maintenance');
      if (res.data?.success) {
        setMaintenance(res.data.data);
      }
    } catch (e) {
      console.warn('Could not load maintenance settings:', e);
    }
  };

  useEffect(() => {
    fetchDashboard();
    fetchMaintenance();
  }, []);

  const handleToggleMaintenance = async () => {
    const nextState = !maintenance.is_active;
    setUpdatingMaintenance(true);
    try {
      const res = await api.put('/admin/system/maintenance', {
        is_active: nextState,
        message: maintenance.message || 'Sistem Absensi & Nilai BPJSTK sedang dalam pemeliharaan berkala untuk peningkatan infrastruktur.',
        estimated_end: maintenance.estimated_end
      });
      if (res.data?.success) {
        setMaintenance(res.data.data);
        setActionSuccessMsg(`Mode Pemeliharaan berhasil ${nextState ? 'diaktifkan' : 'dinonaktifkan'}.`);
        setTimeout(() => setActionSuccessMsg(null), 4000);
      }
    } catch (err) {
      console.error('Failed to toggle maintenance mode:', err);
    } finally {
      setUpdatingMaintenance(false);
    }
  };

  const handleVerifyMerkle = async () => {
    setVerifyingMerkle(true);
    try {
      const res = await api.get('/admin/audit-trail/verify');
      if (res.data?.success) {
        setMerkleStatus(res.data.data);
      }
    } catch (err) {
      console.error('Failed to verify Merkle chain:', err);
    } finally {
      setVerifyingMerkle(false);
    }
  };

  const executeDangerousAction = async (actionType) => {
    if (actionType === 'VACUUM') {
      try {
        const res = await api.post('/admin/maintenance/vacuum');
        if (res.data?.success) {
          setActionSuccessMsg(res.data.message);
          setTimeout(() => setActionSuccessMsg(null), 5000);
        }
      } catch (e) {
        console.error('Vacuum error:', e);
      }
    } else if (actionType === 'ARCHIVE') {
      try {
        const res = await api.post('/admin/maintenance/archive', { chatRetentionDays: 90, logRetentionDays: 180 });
        if (res.data?.success) {
          setActionSuccessMsg(res.data.message);
          setTimeout(() => setActionSuccessMsg(null), 5000);
        }
      } catch (e) {
        console.error('Archive error:', e);
      }
    }
  };

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
              {getTimeGreeting()}, {user?.full_name?.split(' ')[0] || 'Admin'}
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

        {/* 4-Card Pastel Bento Grid (Intelly Signature - Perfectly Symmetrical 2x2) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 items-stretch">
          {/* Card 1: Users & Demographics (Pastel Butter Yellow) */}
          <div className="h-full rounded-2xl bg-[#FCE373] text-[#121214] p-5 sm:p-6 border-2 border-[#121214] shadow-[4px_4px_0px_#121214] relative overflow-hidden flex flex-col justify-between">
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

          {/* Card 2: Attendance & Visits Summary (Soft Bubblegum Pink) */}
          <div className="h-full rounded-2xl bg-[#F5C6EC] text-[#121214] p-5 sm:p-6 border-2 border-[#121214] shadow-[4px_4px_0px_#121214] relative overflow-hidden flex flex-col justify-between">
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

          {/* Card 3: Performance & Condition (Muted Olive Green) */}
          <div className="h-full rounded-2xl bg-[#B8C96E] text-[#121214] p-5 sm:p-6 border-2 border-[#121214] shadow-[4px_4px_0px_#121214] relative overflow-hidden flex flex-col justify-between">
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

          {/* Card 4: Sessions & Batches (Pastel Sky Blue) */}
          <div className="h-full rounded-2xl bg-[#BDD4F2] text-[#121214] p-5 sm:p-6 border-2 border-[#121214] shadow-[4px_4px_0px_#121214] relative overflow-hidden flex flex-col justify-between">
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

        {/* Enterprise System Controls & Security Hardening (Features 10, 11, 17, 19, 22) */}
        <div className="bg-white rounded-[22px] border-2 border-[#121214] p-5 sm:p-6 shadow-[5px_5px_0px_#121214] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-gray-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#BDD4F2] border-2 border-[#121214] flex items-center justify-center shadow-[2px_2px_0px_#121214]">
                <ShieldCheck className="w-5 h-5 text-[#121214]" />
              </div>
              <div>
                <h3 className="font-black text-sm sm:text-base text-[#121214]">
                  Pusat Kendali Keamanan & Pemeliharaan Sistem
                </h3>
                <p className="text-xs text-gray-500 font-medium">
                  Mode pemeliharaan dinamis, verifikasi rantai audit Merkle, dan pembersihan basis data
                </p>
              </div>
            </div>

            {/* Maintenance Mode Toggle Switch */}
            <div className="flex items-center gap-3 bg-[#F5F4F0] px-4 py-2 rounded-xl border border-[#121214]">
              <div className="text-right">
                <span className="text-[11px] font-black text-[#121214] block">Mode Pemeliharaan</span>
                <span className={`text-[10px] font-bold ${maintenance.is_active ? 'text-amber-700' : 'text-emerald-700'}`}>
                  {maintenance.is_active ? 'AKTIF (Bypass Admin)' : 'NONAKTIF (Publik Normal)'}
                </span>
              </div>
              <button
                type="button"
                onClick={handleToggleMaintenance}
                disabled={updatingMaintenance}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-[#121214] transition-colors duration-200 ease-in-out focus:outline-none ${
                  maintenance.is_active ? 'bg-amber-400' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-[#121214] shadow ring-0 transition duration-200 ease-in-out mt-0.5 ml-0.5 ${
                    maintenance.is_active ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {actionSuccessMsg && (
            <div className="p-3 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <Check className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>{actionSuccessMsg}</span>
            </div>
          )}

          {/* Action Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            {/* Action 1: Merkle Audit Trail Verification */}
            <div className="p-4 rounded-xl border-2 border-[#121214] bg-[#F5F4F0] flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-black bg-[#121214] text-white px-2 py-0.5 rounded">
                    Anti-Tampering
                  </span>
                  {merkleStatus && (
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded border border-[#121214] flex items-center gap-1 ${
                      merkleStatus.isValid ? 'bg-[#B8C96E] text-[#121214]' : 'bg-rose-500 text-white animate-pulse'
                    }`}>
                      {merkleStatus.isValid ? 'RANTAI VALID ✓' : 'MANIPULASI TERDETEKSI ✗'}
                    </span>
                  )}
                </div>
                <h4 className="font-black text-xs text-[#121214]">Verifikasi Integritas Merkle Audit</h4>
                <p className="text-[11px] text-gray-600 mt-1">
                  Mendeteksi secara matematis bila terdapat baris log audit yang diedit atau dihapus oleh oknum.
                </p>
                {merkleStatus && (
                  <div className={`mt-2 p-2 rounded-lg border text-[11px] leading-relaxed ${
                    merkleStatus.isValid
                      ? 'bg-white text-emerald-800 border-emerald-300 font-medium'
                      : 'bg-rose-50 text-rose-900 border-rose-300 font-bold'
                  }`}>
                    {merkleStatus.message}
                  </div>
                )}
              </div>
              <button
                onClick={handleVerifyMerkle}
                disabled={verifyingMerkle}
                className="w-full py-2 bg-[#BDD4F2] hover:bg-[#a5c4ec] font-black text-xs text-[#121214] rounded-xl border-2 border-[#121214] shadow-[2px_2px_0px_#121214] flex items-center justify-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${verifyingMerkle ? 'animate-spin' : ''}`} />
                <span>{verifyingMerkle ? 'Memeriksa Hash...' : 'Periksa Integritas Hash'}</span>
              </button>
            </div>

            {/* Action 2: Database Vacuum Maintenance */}
            <div className="p-4 rounded-xl border-2 border-[#121214] bg-[#F5F4F0] flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-black bg-[#121214] text-white px-2 py-0.5 rounded">
                    Optimasi Database
                  </span>
                </div>
                <h4 className="font-black text-xs text-[#121214]">VACUUM & Pembersihan Sampah</h4>
                <p className="text-[11px] text-gray-600 mt-1">
                  Membersihkan notifikasi kadaluwarsa & merefresh statistik PostgreSQL ANALYZE.
                </p>
              </div>
              <button
                onClick={() => {
                  setPendingDangerousAction('VACUUM');
                  setSecurityPinOpen(true);
                }}
                className="w-full py-2 bg-[#FCE373] hover:bg-[#ebd056] font-black text-xs text-[#121214] rounded-xl border-2 border-[#121214] shadow-[2px_2px_0px_#121214] flex items-center justify-center gap-1.5"
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>Jalankan VACUUM</span>
              </button>
            </div>

            {/* Action 3: Cold Storage Archival */}
            <div className="p-4 rounded-xl border-2 border-[#121214] bg-[#F5F4F0] flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-black bg-[#121214] text-white px-2 py-0.5 rounded">
                    Cold Storage
                  </span>
                </div>
                <h4 className="font-black text-xs text-[#121214]">Arsip Chat & Log Kadaluwarsa</h4>
                <p className="text-[11px] text-gray-600 mt-1">
                  Memindahkan riwayat chat (&gt;90 hari) & log (&gt;180 hari) ke tabel penyimpanan dingin.
                </p>
              </div>
              <button
                onClick={() => {
                  setPendingDangerousAction('ARCHIVE');
                  setSecurityPinOpen(true);
                }}
                className="w-full py-2 bg-[#F5C6EC] hover:bg-[#e7b4dc] font-black text-xs text-[#121214] rounded-xl border-2 border-[#121214] shadow-[2px_2px_0px_#121214] flex items-center justify-center gap-1.5"
              >
                <Archive className="w-3.5 h-3.5" />
                <span>Arsipkan Data Kadaluwarsa</span>
              </button>
            </div>
          </div>
        </div>

        {/* Security PIN Authorization Modal for Two-Person Approval (Feature 19) */}
        <SecurityPinModal
          isOpen={securityPinOpen}
          onClose={() => setSecurityPinOpen(false)}
          onSuccess={() => {
            if (pendingDangerousAction) {
              executeDangerousAction(pendingDangerousAction);
              setPendingDangerousAction(null);
            }
          }}
          title={pendingDangerousAction === 'VACUUM' ? 'Otorisasi Pemeliharaan VACUUM' : 'Otorisasi Arsip Cold Storage'}
          actionDescription={
            pendingDangerousAction === 'VACUUM'
              ? 'Tindakan ini akan mengunci sementara tabel untuk memperbarui query planner dan membersihkan baris kadaluwarsa.'
              : 'Tindakan ini akan memindahkan pesan chat lama (>90 hari) dan log (>180 hari) ke tabel arsip dingin.'
          }
        />

        {/* Bottom Split Section: 2 Columns (Activities List & Right Detail / Calendar Widget) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 items-start">
          {/* Left Column: Recent Audit Activities (50%) */}
          <div className="bg-white rounded-2xl border-2 border-[#121214] p-5 sm:p-6 shadow-[4px_4px_0px_#121214]">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base font-black text-[#121214]">Aktivitas Sistem & Audit Log Terakhir</h3>
                <p className="text-xs text-[#6E6D6A]">Pencatatan real-time perubahan data, absensi, dan penilaian</p>
              </div>
              <span className="text-[11px] font-black bg-[#121214] text-white px-3 py-1 rounded-full border border-[#121214]">
                Real-Time
              </span>
            </div>

            {activities.length === 0 ? (
              <div className="text-center py-12 text-[#6E6D6A] text-xs font-bold">
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
                      className={`p-3.5 rounded-xl border-2 border-[#121214] flex items-center justify-between transition-all cursor-pointer shadow-[2px_2px_0px_#121214] active:translate-x-[1px] active:translate-y-[1px] ${
                        isFirst 
                          ? 'bg-[#F5C6EC]/40 hover:bg-[#F5C6EC]/60' 
                          : 'bg-[#FAF9F6] hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        {/* Squircle Icon */}
                        <div className={`w-10 h-10 rounded-xl border-2 border-[#121214] flex items-center justify-center shrink-0 shadow-[1px_1px_0px_#121214] ${
                          isFirst ? 'bg-[#F5C6EC] text-[#121214]' : 'bg-white text-[#121214]'
                        }`}>
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-black text-[#121214] truncate">
                            {act.activity_type} - {act.details}
                          </p>
                          <p className="text-[11px] text-[#6E6D6A] mt-0.5 truncate font-medium">
                            Oleh: <span className="font-bold text-[#121214]">{act.full_name || 'System'}</span> {act.unique_id && `(${act.unique_id})`}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 ml-3 text-right">
                        <span className={`text-[11px] font-black px-2.5 py-1 rounded-full border border-[#121214] ${
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

          {/* Right Column: Mini Calendar & Action Panel (50%) */}
          <div className="space-y-5">
            {/* Mini Calendar Widget (Intelly Style) */}
            <div className="bg-white rounded-2xl border-2 border-[#121214] p-5 shadow-[4px_4px_0px_#121214]">
              <div className="flex items-center justify-between mb-4">
                <button className="p-1 rounded-lg border border-[#121214] hover:bg-[#F5F4F0] text-[#121214]">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="bg-[#F5C6EC] text-[#121214] border border-[#121214] px-3.5 py-1 rounded-full text-xs font-black tracking-tight shadow-[1px_1px_0px_#121214]">
                  {currentMonthStr}
                </div>
                <button className="p-1 rounded-lg border border-[#121214] hover:bg-[#F5F4F0] text-[#121214]">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Weekday headers */}
              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black text-[#121214] mb-2">
                <span>SE</span>
                <span>SL</span>
                <span>RB</span>
                <span>KM</span>
                <span>JM</span>
                <span>SB</span>
                <span>MG</span>
              </div>

              {/* Day numbers grid */}
              <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-[#121214]">
                {[...Array(31)].map((_, i) => {
                  const dayNum = i + 1;
                  const isCurrent = dayNum === currentDay;
                  return (
                    <div 
                      key={dayNum} 
                      className={`h-8 flex items-center justify-center rounded-xl text-[11px] transition-colors ${
                        isCurrent 
                          ? 'bg-[#121214] text-white font-black border border-[#121214] shadow-[1px_1px_0px_#121214]' 
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
                className="w-full mt-4 bg-[#121214] hover:bg-neutral-800 text-white font-black text-xs py-2.5 rounded-xl border-2 border-[#121214] flex items-center justify-center space-x-2 transition-all shadow-[2px_2px_0px_#8A8985] active:translate-x-[1px] active:translate-y-[1px]"
              >
                <Plus className="w-3.5 h-3.5 text-[#B8C96E]" />
                <span>Kelola Agenda & Jadwal</span>
              </button>
            </div>

            {/* Distribusi Penempatan Magang */}
            <div className="bg-[#FAF9F6] rounded-2xl border-2 border-[#121214] p-5 shadow-[4px_4px_0px_#121214]">
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