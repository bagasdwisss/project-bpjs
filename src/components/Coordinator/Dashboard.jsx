import React, { useState, useEffect, useContext, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../Layout/Layout';
import { AuthContext } from '../../context/AuthContext';
import userService from '../../services/userService';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

const LiveChatModal = lazy(() => import('../Common/LiveChatModal'));
import { DashboardSkeleton } from '../Common/Skeleton';
import { 
  Users, TrendingUp, Award, Clock, CheckCircle, 
  AlertCircle, RefreshCw, ChevronRight, Eye, Edit3, 
  FileText, Calendar, Plus, ExternalLink, MessageSquare,
  AlertTriangle, Sparkles, Check, X, ShieldAlert
} from 'lucide-react';

const CoordinatorDashboard = () => {
  const { user } = useContext(AuthContext);
  const { toast } = useToast();
  const [participants, setParticipants] = useState([]);
  const [progressData, setProgressData] = useState({});
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterType, setFilterType] = useState('all');

  // AI Early Warning & Leave Workflow States
  const [earlyWarnings, setEarlyWarnings] = useState([]);
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [chatModalOpen, setChatModalOpen] = useState(false);
  const [chatRecipientId, setChatRecipientId] = useState(null);
  const [reviewModal, setReviewModal] = useState({
    isOpen: false,
    leave: null,
    status: 'Disetujui',
    note: '',
    submitting: false,
  });

  const loadParticipants = async () => {
    try {
      setLoading(true);
      setError('');

      let participantsList = [];
      try {
        const response = await userService.getMyParticipants();
        const raw = response.data;
        participantsList = Array.isArray(raw?.data) ? raw.data : (Array.isArray(raw) ? raw : []);
      } catch (e) {
        // Fallback to all users filtered by role peserta
        const allUsersRes = await userService.getUsers();
        const raw = allUsersRes.data;
        const allList = Array.isArray(raw?.data) ? raw.data : (Array.isArray(raw) ? raw : []);
        participantsList = allList.filter(u => u.role_id === 1 || (u.role && u.role.toLowerCase().includes('peserta')));
      }

      setParticipants(participantsList);
      if (participantsList.length > 0) {
        setSelectedParticipant(participantsList[0]);
      }

      // Load progress data in a single batch request (optimasi hemat request)
      const progressMap = {};
      try {
        const pSummaryRes = await userService.getProgressSummary();
        const summaryData = pSummaryRes?.data?.data || {};
        for (const p of participantsList) {
          const d = summaryData[p.user_id] || {};
          const target = 20;
          const pct = Math.min(100, Math.round(((d.hasil_akuisisi_bpu || 0) / target) * 100));
          progressMap[p.user_id] = {
            progress: pct,
            hasilAkuisisiBPU: d.hasil_akuisisi_bpu || 0,
            kunjunganBPU: d.kunjungan_bpu || 0,
            kunjunganPU: d.kunjungan_pu || 0,
            videoVirialisasi: d.video_viralisasi || 0,
            kehadiranSeminar: d.kehadiran_seminar || 0,
            kehadiranSosialisasi: d.kehadiran_sosialisasi || 0,
            totalPoin: d.total_poin || 0,
            nilai: d.nilai || 0,
            grade: d.grade || '-'
          };
        }
      } catch (err) {
        console.error('Failed to load progress summary:', err);
      }
      setProgressData(progressMap);

    } catch (err) {
      console.error('Error loading coordinator dashboard:', err);
      setError('Gagal memuat data peserta.');
    } finally {
      setLoading(false);
    }
  };

  const loadEarlyWarnings = async () => {
    try {
      const res = await api.get('/coordinator/early-warning');
      if (res.data?.success) {
        setEarlyWarnings(res.data.data || []);
      }
    } catch (err) {
      console.error('Error loading early warnings:', err);
    }
  };

  const loadPendingLeaves = async () => {
    try {
      const res = await api.get('/leaves');
      if (res.data?.success) {
        const pending = (res.data.data || []).filter(l => l.status === 'Pending');
        setPendingLeaves(pending);
      }
    } catch (err) {
      console.error('Error loading pending leaves:', err);
    }
  };

  const openReviewModal = (leave, status) => {
    setReviewModal({
      isOpen: true,
      leave,
      status,
      note: status === 'Disetujui'
        ? 'Permohonan disetujui, jaga kesehatan dan istirahat yang cukup.'
        : 'Dokumen pendukung kurang lengkap / mohon perbaiki.',
      submitting: false,
    });
  };

  const handleConfirmReview = async (e) => {
    if (e) e.preventDefault();
    if (!reviewModal.leave) return;
    try {
      setReviewModal(prev => ({ ...prev, submitting: true }));
      const res = await api.put(`/leaves/${reviewModal.leave.id}/status`, {
        status: reviewModal.status,
        coordinator_notes: reviewModal.note
      });

      if (res.data?.success) {
        toast.success(`Pengajuan ${reviewModal.leave.participant_name} berhasil di-${reviewModal.status.toLowerCase()}`);
        setReviewModal({ isOpen: false, leave: null, status: 'Disetujui', note: '', submitting: false });
        loadPendingLeaves();
      }
    } catch (err) {
      toast.error('Gagal memverifikasi pengajuan: ' + (err.response?.data?.message || err.message));
      setReviewModal(prev => ({ ...prev, submitting: false }));
    }
  };

  const openChatWith = (participantId) => {
    setChatRecipientId(participantId);
    setChatModalOpen(true);
  };

  useEffect(() => {
    loadParticipants();
    loadEarlyWarnings();
    loadPendingLeaves();
  }, []);

  // Filtered participants list
  const filteredParticipants = participants.filter(p => {
    if (filterType === 'all') return true;
    if (filterType === 'kantor') return p.penempatan === 'kantor';
    if (filterType === 'lapangan') return p.penempatan === 'lapangan';
    return true;
  });

  // Calculate aggregates
  const totalCount = participants.length;
  const avgProgress = totalCount > 0 
    ? Math.round(participants.reduce((acc, p) => acc + (progressData[p.user_id]?.progress || 0), 0) / totalCount) 
    : 0;
  const totalAkuisisi = participants.reduce((acc, p) => acc + (progressData[p.user_id]?.hasilAkuisisiBPU || 0), 0);
  const gradeACount = participants.filter(p => progressData[p.user_id]?.grade === 'A').length;

  const currentSelectedProgress = selectedParticipant ? (progressData[selectedParticipant.user_id] || {}) : {};

  if (loading && participants.length === 0) {
    return (
      <Layout>
        <DashboardSkeleton />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Top Header & Greeting */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#121214] tracking-tight">
              Selamat Pagi, {user?.full_name?.split(' ')[0] || 'Koordinator'}
            </h1>
            <p className="text-xs sm:text-sm text-[#6E6D6A] mt-1">
              Membimbing <span className="font-bold text-[#121214]">{totalCount} Peserta Magang Aktif</span>. Evaluasi pencapaian tugas dan target akuisisi harian.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => {
                setChatRecipientId(null);
                setChatModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#FCE373] hover:bg-[#ebd056] border-2 border-[#121214] rounded-full text-xs font-black text-[#121214] shadow-[2px_2px_0px_#121214] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Live Chat Bimbingan</span>
            </button>
            <button
              onClick={() => {
                loadParticipants();
                loadEarlyWarnings();
                loadPendingLeaves();
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-[#EAE9E4] rounded-full text-xs font-bold text-[#121214] hover:bg-[#FAF9F6] shadow-sm transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Segarkan Data
            </button>
            <Link
              to="/coordinator/grading"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#121214] text-white rounded-full text-xs font-bold hover:bg-neutral-800 shadow-sm transition-all"
            >
              <Award className="w-3.5 h-3.5" />
              Kelola Penilaian
            </Link>
          </div>
        </div>

        {/* AI Early Warning System Alerts Banner (Drop-Off Detection) */}
        {earlyWarnings.some(w => w.riskLevel === 'Tinggi' || w.riskLevel === 'Sedang') && (
          <div className="bg-white border-2 border-[#121214] rounded-2xl p-4 sm:p-5 shadow-[4px_4px_0px_#121214] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-[#F5C6EC] border-2 border-[#121214] flex items-center justify-center shadow-[2px_2px_0px_#121214]">
                  <ShieldAlert className="w-4 h-4 text-[#121214]" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-[#121214] flex items-center space-x-2">
                    <span>Sistem Peringatan Dini AI (Early Warning Drop-off)</span>
                    <span className="text-[10px] font-black bg-[#121214] text-white px-2 py-0.5 rounded">Deteksi Cerdas</span>
                  </h3>
                  <p className="text-[11px] text-gray-500 font-medium">Algoritma otomatis mendeteksi anomali kehadiran & stagnasi target akuisisi BPU</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {earlyWarnings.filter(w => w.riskLevel === 'Tinggi' || w.riskLevel === 'Sedang').slice(0, 4).map((warn) => (
                <div key={warn.userId} className="p-3.5 rounded-xl border-2 border-[#121214] bg-[#F5F4F0] flex flex-col justify-between space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-black text-xs text-[#121214]">{warn.name}</span>
                      <p className="text-[10px] text-gray-500 font-mono">NIM: {warn.nim}</p>
                    </div>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded border border-[#121214] ${
                      warn.riskLevel === 'Tinggi' ? 'bg-[#F5C6EC] text-[#121214]' : 'bg-[#FCE373] text-[#121214]'
                    }`}>
                      Risiko {warn.riskLevel}
                    </span>
                  </div>

                  <div className="text-[11px] text-gray-700 bg-white p-2 rounded-lg border border-[#121214]/15">
                    <strong>Indikator:</strong> {warn.reasons.join(', ')}
                    <div className="text-emerald-800 font-medium mt-1">
                      <strong>Saran AI:</strong> {warn.intervention}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => openChatWith(warn.userId)}
                    className="w-full py-1.5 px-3 bg-[#B8C96E] hover:bg-[#a6b85c] rounded-lg border-2 border-[#121214] font-black text-[11px] text-[#121214] shadow-[2px_2px_0px_#121214] flex items-center justify-center space-x-1.5"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Konseling 1-on-1 via Live Chat</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Workflow Approval Cuti, Izin & Sakit (Pending) */}
        {pendingLeaves.length > 0 && (
          <div className="bg-white border-2 border-[#121214] rounded-2xl p-4 sm:p-5 shadow-[4px_4px_0px_#121214] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-[#BDD4F2] border-2 border-[#121214] flex items-center justify-center shadow-[2px_2px_0px_#121214]">
                  <FileText className="w-4 h-4 text-[#121214]" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-[#121214]">Pengajuan Izin & Sakit Menunggu Persetujuan</h3>
                  <p className="text-[11px] text-gray-500 font-medium">Verifikasi dokumen bukti dokter dalam 1 klik</p>
                </div>
              </div>
              <span className="text-xs font-black bg-[#F5C6EC] px-2.5 py-1 rounded-full border border-[#121214]">
                {pendingLeaves.length} Permohonan
              </span>
            </div>

            <div className="divide-y divide-gray-100">
              {pendingLeaves.map((leave) => (
                <div key={leave.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-black text-xs text-[#121214]">{leave.participant_name}</span>
                      <span className="text-[11px] bg-[#BDD4F2] px-2 py-0.2 rounded font-bold border border-[#121214]">
                        {leave.leave_type}
                      </span>
                      <span className="text-[10px] text-gray-500 font-mono">
                        {new Date(leave.start_date).toLocaleDateString('id-ID')} - {new Date(leave.end_date).toLocaleDateString('id-ID')}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1 italic">"{leave.reason}"</p>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => openReviewModal(leave, 'Disetujui')}
                      className="px-3 py-1.5 bg-[#B8C96E] hover:bg-[#a6b85c] rounded-xl border-2 border-[#121214] font-black text-xs text-[#121214] shadow-[2px_2px_0px_#121214] flex items-center space-x-1 cursor-pointer active:scale-95 transition-transform"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Setujui</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openReviewModal(leave, 'Ditolak')}
                      className="px-3 py-1.5 bg-[#F5C6EC] hover:bg-[#e4b3da] text-[#121214] rounded-xl border-2 border-[#121214] font-black text-xs shadow-[2px_2px_0px_#121214] flex items-center space-x-1 cursor-pointer active:scale-95 transition-transform"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Tolak</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4-Card Pastel Bento Grid (Intelly Signature) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 sm:gap-5">
          {/* Card 1: Participants (Pastel Butter Yellow - lg:col-span-5) */}
          <div className="lg:col-span-5 rounded-[22px] bg-[#FCE373] text-[#121214] p-5 sm:p-6 relative overflow-hidden flex flex-col justify-between shadow-sm">
            <div className="absolute right-2 -bottom-2 opacity-15 pointer-events-none font-extrabold text-8xl">
              ●
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#121214]/70">
                  Peserta Bimbingan
                </span>
                <span className="text-xs font-bold bg-[#121214] text-white px-2.5 py-0.5 rounded-full">
                  Total: {totalCount} Peserta
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 pb-4 border-b border-[#121214]/15">
                <div>
                  <p className="text-[10px] font-bold text-[#121214]/70 uppercase tracking-wider">Kantor</p>
                  <p className="text-xl sm:text-2xl font-black text-[#121214] mt-0.5">
                    {participants.filter(p => p.penempatan === 'kantor').length}
                  </p>
                  <p className="text-[10px] text-[#121214]/60 font-medium">Administrasi</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[#121214]/70 uppercase tracking-wider">Lapangan</p>
                  <p className="text-xl sm:text-2xl font-black text-[#121214] mt-0.5">
                    {participants.filter(p => p.penempatan === 'lapangan').length}
                  </p>
                  <p className="text-[10px] text-[#121214]/60 font-medium">Akuisisi Mitra</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[#121214]/70 uppercase tracking-wider">Progress</p>
                  <p className="text-xl sm:text-2xl font-black text-[#121214] mt-0.5">{avgProgress}%</p>
                  <p className="text-[10px] text-[#121214]/60 font-medium">Rata-rata</p>
                </div>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between text-xs font-bold">
              <span>Status Monitoring: Terpantau</span>
              <span className="bg-[#121214] text-white px-2.5 py-0.5 rounded-full text-[10px]">Aktif</span>
            </div>
          </div>

          {/* Card 2: Attendance & Sesi (Soft Bubblegum Pink - lg:col-span-7) */}
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
                  Kehadiran & Kunjungan
                </span>
                <span className="text-xs font-bold bg-[#121214] text-white px-2.5 py-0.5 rounded-full">
                  Target BPU: 20
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 pb-4 border-b border-[#121214]/15">
                <div>
                  <p className="text-[10px] font-bold text-[#121214]/70 uppercase tracking-wider">Total Akuisisi</p>
                  <p className="text-xl sm:text-2xl font-black text-[#121214] mt-0.5">{totalAkuisisi}</p>
                  <p className="text-[10px] text-[#121214]/60 font-medium">Peserta BPU</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[#121214]/70 uppercase tracking-wider">Kunjungan PU</p>
                  <p className="text-xl sm:text-2xl font-black text-[#121214] mt-0.5">14</p>
                  <p className="text-[10px] text-[#121214]/60 font-medium">Entitas Mitra</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[#121214]/70 uppercase tracking-wider">Kepatuhan Absen</p>
                  <p className="text-xl sm:text-2xl font-black text-[#121214] mt-0.5">96%</p>
                  <p className="text-[10px] text-[#121214]/60 font-medium">Bulan Berjalan</p>
                </div>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between text-xs font-bold">
              <span>Kunjungan Lapangan Terverifikasi</span>
              <span className="text-[#121214]/70">Laporan Lengkap</span>
            </div>
          </div>

          {/* Card 3: Grade Distribution (Muted Olive Green - lg:col-span-6) */}
          <div className="lg:col-span-6 rounded-[22px] bg-[#B8C96E] text-[#121214] p-5 sm:p-6 relative overflow-hidden flex flex-col justify-between shadow-sm">
            <div className="absolute right-3 -bottom-5 opacity-15 pointer-events-none font-black text-8xl">
              ▲
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#121214]/70">
                  Performa & Grade
                </span>
                <span className="text-xs font-bold bg-[#121214] text-white px-2.5 py-0.5 rounded-full">
                  Kompetensi
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 pb-3">
                <div>
                  <p className="text-[10px] font-bold text-[#121214]/70 uppercase tracking-wider">Grade A</p>
                  <p className="text-2xl font-black text-[#121214] mt-0.5">{gradeACount} Peserta</p>
                  <p className="text-[10px] text-[#121214]/60 font-medium">Sangat Memuaskan</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[#121214]/70 uppercase tracking-wider">Grade B</p>
                  <p className="text-2xl font-black text-[#121214] mt-0.5">
                    {participants.filter(p => progressData[p.user_id]?.grade === 'B').length} Peserta
                  </p>
                  <p className="text-[10px] text-[#121214]/60 font-medium">Baik</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[#121214]/70 uppercase tracking-wider">Perlu Review</p>
                  <p className="text-2xl font-black text-[#121214] mt-0.5">
                    {participants.filter(p => !progressData[p.user_id]?.grade || progressData[p.user_id]?.grade === '-').length} Peserta
                  </p>
                  <p className="text-[10px] text-[#121214]/60 font-medium">Belum Dinilai</p>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[#121214]/15 flex items-center justify-between text-xs font-bold">
              <span>Standar Kelulusan BPJSTK: Nilai &gt;= 75</span>
              <span className="text-[#121214]/80">92% Memenuhi</span>
            </div>
          </div>

          {/* Card 4: Sesi & Seminar (Pastel Sky Blue - lg:col-span-6) */}
          <div className="lg:col-span-6 rounded-[22px] bg-[#BDD4F2] text-[#121214] p-5 sm:p-6 relative overflow-hidden flex flex-col justify-between shadow-sm">
            <div className="absolute right-4 -bottom-4 opacity-15 pointer-events-none font-black text-8xl">
              ★
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#121214]/70">
                  Sosialisasi & Viralisasi
                </span>
                <span className="text-xs font-bold bg-[#121214] text-white px-2.5 py-0.5 rounded-full">
                  Batch 1
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 pb-3">
                <div>
                  <p className="text-[10px] font-bold text-[#121214]/70 uppercase tracking-wider">Seminar</p>
                  <p className="text-2xl font-black text-[#121214] mt-0.5">12 Sesi</p>
                  <p className="text-[10px] text-[#121214]/60 font-medium">Terlaksana</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[#121214]/70 uppercase tracking-wider">Sosialisasi</p>
                  <p className="text-2xl font-black text-[#121214] mt-0.5">8 Kegiatan</p>
                  <p className="text-[10px] text-[#121214]/60 font-medium">Masyarakat</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[#121214]/70 uppercase tracking-wider">Video Konten</p>
                  <p className="text-2xl font-black text-[#121214] mt-0.5">18 Video</p>
                  <p className="text-[10px] text-[#121214]/60 font-medium">Edukasi Program</p>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[#121214]/15 flex items-center justify-between text-xs font-bold">
              <span>Kanal Edukasi Digital</span>
              <span className="text-[#121214]/80">Tercapai 100%</span>
            </div>
          </div>
        </div>

        {/* Bottom Split Section (Section 5.B.4: Participant's List & Details in Pink) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Participant's List (lg:col-span-5) */}
          <div className="lg:col-span-5 bg-white rounded-[22px] border border-[#EAE9E4] p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#121214]">Daftar Peserta (List)</h3>
                <p className="text-xs text-[#6E6D6A]">Klik baris untuk melihat detail bimbingan</p>
              </div>

              {/* Filter pill */}
              <div className="flex items-center gap-1 bg-[#FAF9F6] border border-[#EAE9E4] rounded-full p-1 text-xs">
                <button
                  onClick={() => setFilterType('all')}
                  className={`px-3 py-1 rounded-full font-bold transition-all ${
                    filterType === 'all' ? 'bg-[#121214] text-white shadow-sm' : 'text-[#6E6D6A]'
                  }`}
                >
                  Semua
                </button>
                <button
                  onClick={() => setFilterType('kantor')}
                  className={`px-2.5 py-1 rounded-full font-semibold transition-all ${
                    filterType === 'kantor' ? 'bg-[#121214] text-white shadow-sm' : 'text-[#6E6D6A]'
                  }`}
                >
                  Kantor
                </button>
                <button
                  onClick={() => setFilterType('lapangan')}
                  className={`px-2.5 py-1 rounded-full font-semibold transition-all ${
                    filterType === 'lapangan' ? 'bg-[#121214] text-white shadow-sm' : 'text-[#6E6D6A]'
                  }`}
                >
                  Lapangan
                </button>
              </div>
            </div>

            {filteredParticipants.length === 0 ? (
              <div className="text-center py-12 text-[#6E6D6A] text-xs">
                Tidak ada data peserta ditemukan.
              </div>
            ) : (
              <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                {filteredParticipants.map((p) => {
                  const isSelected = selectedParticipant?.user_id === p.user_id;
                  const userProg = progressData[p.user_id] || {};

                  return (
                    <div
                      key={p.user_id}
                      onClick={() => setSelectedParticipant(p)}
                      className={`p-3.5 rounded-[16px] flex items-center justify-between transition-all cursor-pointer ${
                        isSelected 
                          ? 'bg-[#F5C6EC] border border-[#E59CD8] shadow-sm text-[#121214]' 
                          : 'bg-[#FAF9F6] hover:bg-[#F5F4F0] border border-[#EAE9E4] text-[#121214]'
                      }`}
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        {/* Squircle Icon */}
                        <div className={`w-10 h-10 rounded-[12px] flex items-center justify-center font-bold text-xs shrink-0 ${
                          isSelected ? 'bg-[#121214] text-white' : 'bg-[#FCE373] text-[#121214]'
                        }`}>
                          {p.full_name?.charAt(0) || 'P'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate">{p.full_name}</p>
                          <p className="text-[11px] opacity-70 capitalize mt-0.5">
                            {p.penempatan ? `Penempatan: ${p.penempatan}` : 'Peserta BPJSTK'}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 ml-3 text-right">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                          isSelected ? 'bg-white text-[#121214] shadow-sm' : 'bg-[#121214] text-white'
                        }`}>
                          {userProg.progress || 0}% Capaian
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Participant Details Card (Visit Details in Pink #F5C6EC) (lg:col-span-7) */}
          <div className="lg:col-span-7 rounded-[22px] bg-[#F5C6EC] text-[#121214] p-6 shadow-sm border border-[#E59CD8] space-y-6">
            {selectedParticipant ? (
              <>
                {/* Header: Name, Demographics, ID pill badge */}
                <div className="flex items-start justify-between border-b border-[#121214]/15 pb-4">
                  <div>
                    <h3 className="text-xl font-black underline decoration-2 decoration-[#121214] tracking-tight">
                      {selectedParticipant.full_name}
                    </h3>
                    <p className="text-xs text-[#121214]/70 mt-1 font-semibold">
                      {selectedParticipant.email || 'Email terdaftar'} • Penempatan: <span className="uppercase">{selectedParticipant.penempatan || 'Kantor'}</span>
                    </p>
                  </div>
                  <div className="shrink-0">
                    <span className="bg-white text-[#121214] font-black text-xs px-3.5 py-1.5 rounded-full shadow-sm tracking-wide">
                      {selectedParticipant.unique_id || 'ID-PES'}
                    </span>
                  </div>
                </div>

                {/* Tags Row */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-bold bg-[#E59CD8] text-[#121214] px-3 py-1 rounded-full">
                    Batch: Gelombang 1
                  </span>
                  <span className="text-[11px] font-bold bg-[#E59CD8] text-[#121214] px-3 py-1 rounded-full">
                    Role: Peserta Magang
                  </span>
                  <span className="text-[11px] font-bold bg-[#121214] text-white px-3 py-1 rounded-full">
                    Grade: {currentSelectedProgress.grade || '-'} ({currentSelectedProgress.nilai || 0})
                  </span>
                </div>

                {/* 2-Column Academic & Acquisition Data Grid */}
                <div className="space-y-3 bg-white/50 p-4 rounded-[18px] border border-[#121214]/10 text-xs">
                  <div className="flex items-center justify-between py-1.5 border-b border-[#121214]/10">
                    <span className="font-semibold text-[#121214]/70">Hasil Akuisisi BPU (Target 20):</span>
                    <span className="font-black text-[#121214] text-sm">{currentSelectedProgress.hasilAkuisisiBPU || 0} Terakuisisi</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-[#121214]/10">
                    <span className="font-semibold text-[#121214]/70">Kunjungan Mitra Pemberi Upah (PU):</span>
                    <span className="font-black text-[#121214] text-sm">{currentSelectedProgress.kunjunganPU || 0} Kunjungan</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-[#121214]/10">
                    <span className="font-semibold text-[#121214]/70">Kehadiran Seminar & Sosialisasi:</span>
                    <span className="font-black text-[#121214] text-sm">
                      {(currentSelectedProgress.kehadiranSeminar || 0) + (currentSelectedProgress.kehadiranSosialisasi || 0)} Sesi
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-[#121214]/10">
                    <span className="font-semibold text-[#121214]/70">Video Viralisasi Edukasi:</span>
                    <span className="font-black text-[#121214] text-sm">{currentSelectedProgress.videoVirialisasi || 0} Video</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <span className="font-semibold text-[#121214]/70">Total Akumulasi Poin:</span>
                    <span className="font-black text-[#121214] text-base">{currentSelectedProgress.totalPoin || 0} Poin</span>
                  </div>
                </div>

                {/* Action CTA Buttons */}
                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openChatWith(selectedParticipant.user_id)}
                    className="flex-1 bg-[#121214] hover:bg-neutral-800 text-white font-bold text-xs py-3 px-3 rounded-full text-center transition-all shadow-sm flex items-center justify-center space-x-1.5"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-[#FCE373]" />
                    <span>Chat Bimbingan</span>
                  </button>
                  <Link
                    to="/coordinator/grading"
                    className="flex-1 bg-white hover:bg-[#FAF9F6] text-[#121214] font-bold text-xs py-3 px-3 rounded-full text-center transition-all shadow-sm border border-[#121214] flex items-center justify-center space-x-1.5"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Ubah Nilai</span>
                  </Link>
                  <Link
                    to="/coordinator/participants"
                    className="bg-white/80 hover:bg-white text-[#121214] font-bold text-xs py-3 px-4 rounded-full text-center transition-all shadow-sm border border-[#E59CD8]"
                  >
                    Lihat Semua
                  </Link>
                </div>
              </>
            ) : (
              <div className="text-center py-16 text-[#121214]/60 text-xs font-semibold">
                Pilih peserta dari daftar di sisi kiri untuk memuat detail lengkap.
              </div>
            )}
          </div>
        </div>

        {/* Leave Workflow Review Modal (Branded Neo-Brutalist) */}
        {reviewModal.isOpen && reviewModal.leave && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white border-2 border-[#121214] rounded-2xl p-5 sm:p-6 shadow-[6px_6px_0px_#121214] max-w-lg w-full space-y-4 animate-in zoom-in-95 duration-150">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2.5">
                  <div
                    className={`w-9 h-9 rounded-xl border-2 border-[#121214] flex items-center justify-center shadow-[2px_2px_0px_#121214] ${
                      reviewModal.status === 'Disetujui' ? 'bg-[#B8C96E]' : 'bg-[#F5C6EC]'
                    }`}
                  >
                    {reviewModal.status === 'Disetujui' ? (
                      <Check className="w-5 h-5 text-[#121214]" />
                    ) : (
                      <X className="w-5 h-5 text-[#121214]" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-[#121214]">
                      {reviewModal.status === 'Disetujui' ? 'Setujui Pengajuan' : 'Tolak Pengajuan'}
                    </h3>
                    <p className="text-[11px] text-gray-500 font-medium">
                      Verifikasi permohonan {reviewModal.leave.leave_type?.toLowerCase() || 'izin'} peserta
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setReviewModal((prev) => ({ ...prev, isOpen: false }))}
                  className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-black transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 bg-[#FAF9F6] border-2 border-[#121214]/15 rounded-xl space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-black text-[#121214]">{reviewModal.leave.participant_name}</span>
                  <span className="font-bold bg-[#BDD4F2] border border-[#121214] px-2 py-0.5 rounded text-[10px]">
                    {reviewModal.leave.leave_type}
                  </span>
                </div>
                <p className="text-gray-500 text-[11px]">
                  Periode:{' '}
                  <strong className="text-[#121214]">
                    {new Date(reviewModal.leave.start_date).toLocaleDateString('id-ID')} -{' '}
                    {new Date(reviewModal.leave.end_date).toLocaleDateString('id-ID')}
                  </strong>
                </p>
                <p className="text-gray-600 italic text-[11px]">"{reviewModal.leave.reason}"</p>
                {reviewModal.leave.attachment_url && (
                  <a
                    href={reviewModal.leave.attachment_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-emerald-700 hover:underline font-bold text-[11px] pt-1"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Lihat Surat Dokter / Dokumen Bukti</span>
                  </a>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-[#121214] mb-1.5">
                  Catatan Verifikasi Koordinator
                </label>
                <textarea
                  rows={3}
                  value={reviewModal.note}
                  onChange={(e) => setReviewModal((prev) => ({ ...prev, note: e.target.value }))}
                  placeholder="Tuliskan catatan verifikasi atau alasan..."
                  className="w-full p-2.5 bg-[#FAF9F6] border-2 border-[#121214] rounded-xl text-xs font-bold text-[#121214] focus:outline-none focus:ring-2 focus:ring-[#121214]/20 resize-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReviewModal((prev) => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 bg-[#FAF9F6] hover:bg-gray-100 border-2 border-[#121214] rounded-xl font-bold text-xs text-[#121214]"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={reviewModal.submitting}
                  onClick={handleConfirmReview}
                  className={`px-4 py-2 border-2 border-[#121214] rounded-xl font-black text-xs shadow-[2px_2px_0px_#121214] flex items-center space-x-1.5 active:scale-95 transition-transform ${
                    reviewModal.status === 'Disetujui'
                      ? 'bg-[#B8C96E] hover:bg-[#a6b85c] text-[#121214]'
                      : 'bg-[#F5C6EC] hover:bg-[#e4b3da] text-[#121214]'
                  }`}
                >
                  {reviewModal.submitting ? (
                    <span>Memproses...</span>
                  ) : (
                    <>
                      {reviewModal.status === 'Disetujui' ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <X className="w-3.5 h-3.5" />
                      )}
                      <span>Konfirmasi {reviewModal.status}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Live Chat Modal Mount (Lazy Loaded on Demand) */}
        {chatModalOpen && (
          <Suspense fallback={null}>
            <LiveChatModal
              isOpen={chatModalOpen}
              onClose={() => setChatModalOpen(false)}
              defaultRecipientId={chatRecipientId}
            />
          </Suspense>
        )}
      </div>
    </Layout>
  );
};

export default CoordinatorDashboard;