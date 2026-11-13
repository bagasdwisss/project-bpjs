// src/components/Coordinator/Certificates.jsx
import React, { useState, useEffect } from 'react';
import Layout from '../Layout/Layout';
import reportService from '../../services/reportService';
import userService from '../../services/userService';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import CompanyCertificateModal from '../Common/CompanyCertificateModal';
import { downloadCertificateDirectly } from '../../utils/certificateDownloader';
import { 
  Award, 
  Download, 
  Plus, 
  Search, 
  Filter, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  FileText,
  Users,
  X,
  Sparkles,
  Eye,
  Lock,
  RefreshCw,
  AlertTriangle,
  Layers,
  Check,
  ShieldCheck,
  FileEdit
} from 'lucide-react';

const Certificates = () => {
  const { toast } = useToast();
  const [certificates, setCertificates] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showReissueModal, setShowReissueModal] = useState(false);
  const [selectedCertificate, setSelectedCertificate] = useState(null);
  const [reissueTargetCert, setReissueTargetCert] = useState(null);
  const [reissueReason, setReissueReason] = useState('');
  const [downloadingCertId, setDownloadingCertId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittingReissue, setSubmittingReissue] = useState(false);

  // Form states - Type determines the design automatically!
  const [formData, setFormData] = useState({
    participant_id: '',
    type: 'Kelulusan',
    password: ''
  });

  // Bulk form states
  const [bulkType, setBulkType] = useState('Kelulusan');
  const [bulkPassword, setBulkPassword] = useState('');
  const [bulkSelectedIds, setBulkSelectedIds] = useState([]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [certRes, userRes] = await Promise.all([
        api.get('/certificates/list'),
        userService.getMyParticipants()
      ]);

      if (certRes.data?.success) {
        setCertificates(certRes.data.data || []);
      } else {
        const fallback = await reportService.certificateHistory();
        setCertificates(fallback.data?.data || []);
      }

      if (userRes.data) {
        const userList = Array.isArray(userRes.data.data) ? userRes.data.data : (Array.isArray(userRes.data) ? userRes.data : []);
        setParticipants(userList);
      }
    } catch (err) {
      console.error('Error loading certificates:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setShowGenerateModal(false);
        setShowBulkModal(false);
        setShowReissueModal(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Set of participant user_ids who ALREADY have a certificate issued
  const issuedUserIds = new Set(
    certificates
      .map(c => c.user_id || c.participant_id)
      .filter(Boolean)
  );

  // Filter unissued mentees for bulk issuance
  const unissuedParticipants = participants.filter(p => !issuedUserIds.has(p.user_id));

  // Handle single certificate generation
  const handleGenerateCertificate = async (e) => {
    e.preventDefault();
    if (!formData.participant_id) {
      toast.warning('Silakan pilih peserta terlebih dahulu.');
      return;
    }

    if (issuedUserIds.has(Number(formData.participant_id)) || issuedUserIds.has(formData.participant_id)) {
      toast.error('Peserta ini sudah pernah diterbitkan sertifikat! Aturan anti-fraud membatasi 1 sertifikat per peserta. Gunakan fitur "Ajukan Koreksi" jika ingin merevisi data.');
      return;
    }

    if (!formData.password) {
      toast.warning('Masukkan kata sandi otorisasi akun Koordinator Anda.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.post('/certificates/generate', {
        user_id: formData.participant_id,
        certificate_type: formData.type,
        password: formData.password
      });

      if (res.data.success) {
        toast.success(res.data.message || 'E-Sertifikat terverifikasi berhasil diterbitkan!');
        setShowGenerateModal(false);
        setFormData({ participant_id: '', type: 'Kelulusan', password: '' });
        loadData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menerbitkan sertifikat: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle bulk certificate generation
  const handleBulkGenerate = async (e) => {
    e.preventDefault();
    if (bulkSelectedIds.length === 0) {
      toast.warning('Pilih minimal satu peserta yang belum memiliki sertifikat.');
      return;
    }
    if (!bulkPassword) {
      toast.warning('Kata sandi otorisasi akun Koordinator wajib dimasukkan.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.post('/certificates/bulk-generate', {
        user_ids: bulkSelectedIds,
        certificate_type: bulkType,
        password: bulkPassword
      });

      if (res.data.success) {
        toast.success(res.data.message || 'Penerbitan massal sertifikat berhasil diproses!');
        setShowBulkModal(false);
        setBulkSelectedIds([]);
        setBulkPassword('');
        loadData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menerbitkan sertifikat massal: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Re-issue request submission to Admin
  const handleRequestReissue = async (e) => {
    e.preventDefault();
    if (!reissueTargetCert || !reissueReason.trim()) {
      toast.warning('Silakan berikan alasan koreksi / pembatalan sertifikat.');
      return;
    }

    try {
      setSubmittingReissue(true);
      const res = await api.post('/certificates/request-reissue', {
        certificate_id: reissueTargetCert.certificate_id || reissueTargetCert.id,
        reason: reissueReason.trim()
      });

      if (res.data.success) {
        toast.success(res.data.message || 'Permohonan koreksi sertifikat berhasil diajukan ke Admin!');
        setShowReissueModal(false);
        setReissueTargetCert(null);
        setReissueReason('');
        loadData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal mengajukan koreksi: ' + err.message);
    } finally {
      setSubmittingReissue(false);
    }
  };

  // Direct table download handler
  const handleDirectDownload = async (cert) => {
    try {
      const cId = cert.certificate_id || cert.id;
      setDownloadingCertId(cId);
      const rawType = (cert.certificate_type || cert.type || '').toLowerCase();
      const certType = rawType.includes('prestasi') ? 'Prestasi' : rawType.includes('partisipasi') ? 'Partisipasi' : 'Kelulusan';

      await downloadCertificateDirectly(cert, {
        recipientName: cert.participant_name || cert.participant || cert.report_name,
        recipientNim: cert.participant_nim || cert.nim || cert.unique_id,
        penempatan: cert.penempatan,
        branchName: cert.branch_name,
        branchAddress: cert.branch_address,
        branchHeadName: cert.branch_head_name,
        branchHeadNpp: cert.branch_head_npp,
        branchHeadSignature: cert.branch_head_signature,
        mentorName: cert.mentor_name || cert.coordinator_name,
        mentorNpp: cert.mentor_npp || cert.coordinator_npp,
        mentorSignature: cert.mentor_signature,
        certificateType: certType
      });
      toast.success(`Sertifikat ${cert.certificate_number || ''} berhasil didownload langsung!`);
    } catch (err) {
      console.error('Download error:', err);
      toast.error('Gagal mengunduh sertifikat: ' + err.message);
    } finally {
      setDownloadingCertId(null);
    }
  };

  const filteredCertificates = (Array.isArray(certificates) ? certificates : []).filter((cert) => {
    const pName = cert?.participant_name || cert?.participant || cert?.report_name || '';
    const certNum = cert?.certificate_number || '';
    const matchesSearch = pName.toLowerCase().includes(searchQuery.toLowerCase()) || certNum.toLowerCase().includes(searchQuery.toLowerCase());
    const statusNorm = (cert?.status || 'Terbit').toLowerCase();
    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'issued' && !cert?.reissue_requested && (statusNorm.includes('terbit') || statusNorm.includes('issued'))) ||
      (filterStatus === 'pending' && !!cert?.reissue_requested) ||
      statusNorm === filterStatus.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  const totalIssued = certificates.length;
  const totalCompletion = certificates.filter(c => {
    const t = (c.certificate_type || c.type || '').toLowerCase();
    return !t.includes('prestasi') && !t.includes('partisipasi');
  }).length;
  const totalAchievement = certificates.filter(c => {
    const t = (c.certificate_type || c.type || '').toLowerCase();
    return t.includes('prestasi') || t.includes('achievement');
  }).length;
  const totalParticipation = certificates.filter(c => {
    const t = (c.certificate_type || c.type || '').toLowerCase();
    return t.includes('partisipasi') || t.includes('participation');
  }).length;
  const pendingReissues = certificates.filter(c => c.reissue_requested).length;

  return (
    <Layout>
      <div className="space-y-6 w-full">
        
        {/* Header Bento Box */}
        <div className="bg-white rounded-[22px] border border-[#EAE9E4] p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#FCE373]/50 text-[#856B12] shrink-0">
                <Award className="w-4 h-4" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-[#121214]/60">Sertifikasi & Kelulusan Resmi BPJSTK</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#121214] tracking-tight">Manajemen Sertifikat</h1>
            <p className="text-sm text-[#121214]/60 mt-1 max-w-2xl leading-relaxed">
              Penerbitan 3 jenis sertifikat resmi (Kelulusan, Prestasi, Partisipasi) dengan desain unik masing-masing, proteksi anti-fraud 1 peserta 1 sertifikat, dan otorisasi kata sandi.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto shrink-0">
            {/* Bulk Issuance Button */}
            <button
              type="button"
              onClick={() => {
                setBulkSelectedIds(unissuedParticipants.map(p => p.user_id));
                setShowBulkModal(true);
              }}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-[#FAF9F6] border-2 border-[#121214] text-[#121214] text-xs font-extrabold hover:bg-white shadow-[2px_2px_0px_#121214] active:translate-x-0.5 active:translate-y-0.5 transition cursor-pointer whitespace-nowrap shrink-0"
            >
              <Layers className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>Terbitkan Massal ({unissuedParticipants.length})</span>
            </button>

            {/* Single Issuance Button */}
            <button
              type="button"
              onClick={() => setShowGenerateModal(true)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-[#121214] text-white text-xs font-bold hover:bg-black transition shadow-sm active:scale-95 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4 text-[#FCE373] shrink-0" />
              <span>Terbitkan Sertifikat</span>
            </button>
          </div>
        </div>

        {/* Anti-Fraud Notice Banner */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 text-xs text-amber-900">
          <ShieldCheck className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-extrabold">Ketentuan Anti-Fraud Sertifikat:</span> Setiap peserta magang hanya dapat diterbitkan sertifikat <span className="font-extrabold underline">tepat satu kali</span>. Jika terdapat kesalahan penulisan nama atau data diri, Koordinator wajib mengajukan permohonan ke Administrator untuk diverifikasi dan <span className="font-bold">dihapus bersih dari basis data</span> sebelum dapat diterbitkan kembali.
          </div>
        </div>

        {/* 4 Pastel Bento Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-[#B8C96E]/30 rounded-[22px] border border-[#B8C96E] p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-[#121214]/70">Sertifikat Kelulusan</span>
              <div className="w-7 h-7 rounded-xl bg-white/80 flex items-center justify-center text-[#121214]">
                <FileText className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-900">{totalCompletion}</div>
            <p className="text-xs text-[#121214]/60 mt-1">Desain Emerald Classic</p>
          </div>

          <div className="bg-[#FCE373]/30 rounded-[22px] border border-[#FCE373] p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-[#121214]/70">Sertifikat Prestasi</span>
              <div className="w-7 h-7 rounded-xl bg-white/80 flex items-center justify-center text-[#121214]">
                <Sparkles className="w-3.5 h-3.5 text-amber-700" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-amber-900">{totalAchievement}</div>
            <p className="text-xs text-[#121214]/60 mt-1">Desain Royal Gold & Navy</p>
          </div>

          <div className="bg-[#BDD4F2]/30 rounded-[22px] border border-[#BDD4F2] p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-[#121214]/70">Sertifikat Partisipasi</span>
              <div className="w-7 h-7 rounded-xl bg-white/80 flex items-center justify-center text-[#121214]">
                <Award className="w-3.5 h-3.5 text-blue-700" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-blue-900">{totalParticipation}</div>
            <p className="text-xs text-[#121214]/60 mt-1">Desain Geometric Platinum</p>
          </div>

          <div className="bg-[#F5C6EC]/30 rounded-[22px] border border-[#F5C6EC] p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-[#121214]/70">Permohonan Revisi</span>
              <div className="w-7 h-7 rounded-xl bg-white/80 flex items-center justify-center text-[#121214]">
                <AlertTriangle className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[#121214]">{pendingReissues}</div>
            <p className="text-xs text-[#121214]/60 mt-1">Menunggu persetujuan Admin</p>
          </div>
        </div>

        {/* Filter & Search Bento */}
        <div className="bg-white p-4 sm:p-5 rounded-[22px] border border-[#EAE9E4] shadow-sm flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#121214]/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama peserta atau nomor sertifikat BPJSTK..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#FAF9F6] border border-[#EAE9E4] rounded-xl text-xs sm:text-sm font-medium text-[#121214] placeholder-[#121214]/40 focus:outline-none focus:bg-white focus:border-[#121214] transition"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#121214]" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2.5 bg-[#FAF9F6] border-2 border-[#121214] rounded-2xl text-xs font-bold text-[#121214] shadow-[2px_2px_0px_#121214] focus:outline-none focus:bg-white transition cursor-pointer"
            >
              <option value="all">Semua Status</option>
              <option value="issued">Telah Terbit</option>
              <option value="pending">Menunggu</option>
              <option value="draft">Draft</option>
            </select>
          </div>
        </div>

        {/* Certificates Table Bento Card */}
        <div className="bg-white rounded-[22px] border border-[#EAE9E4] shadow-sm overflow-hidden">
          <div className="p-5 border-b border-[#EAE9E4] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#121214]"></span>
              <h3 className="text-sm sm:text-base font-bold text-[#121214]">Daftar E-Sertifikat Terdaftar</h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FAF9F6] border border-[#EAE9E4] text-[#121214]/70">
                {filteredCertificates.length}
              </span>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="w-8 h-8 border-2 border-[#121214] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-xs font-bold text-[#121214]/60">Memuat basis data sertifikat...</p>
            </div>
          ) : filteredCertificates.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 rounded-full bg-[#FAF9F6] border border-[#EAE9E4] flex items-center justify-center mx-auto mb-3 text-[#121214]/40">
                <Award className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-[#121214]">Belum ada sertifikat yang diterbitkan</h4>
              <p className="text-xs text-[#121214]/50 mt-1">Gunakan tombol "Terbitkan Sertifikat" atau "Terbitkan Massal" di atas.</p>
            </div>
          ) : (
            <div className="overflow-x-auto focus:outline-none focus:ring-2 focus:ring-[#121214]" tabIndex={0} role="region" aria-label="Daftar E-Sertifikat Terdaftar">
              <table className="w-full text-left text-xs sm:text-sm min-w-[760px]">
                <thead>
                  <tr className="border-b border-[#EAE9E4] bg-[#FAF9F6] text-[#121214]/60 font-bold uppercase text-[11px] tracking-wider">
                    <th className="px-5 py-3.5">Penerima & Nomor Sertifikat</th>
                    <th className="px-5 py-3.5">Jenis Sertifikat</th>
                    <th className="px-5 py-3.5">Predikat & Nilai</th>
                    <th className="px-5 py-3.5">Tanggal Terbit</th>
                    <th className="px-5 py-3.5">Status Validasi</th>
                    <th className="px-5 py-3.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAE9E4]">
                  {filteredCertificates.map((cert) => {
                    const certNum = cert.certificate_number || `BPJSTK/MAGANG/${new Date().getFullYear()}/${String(cert.id || 1).padStart(3, '0')}`;
                    const certName = cert.participant_name || cert.participant || cert.report_name;
                    const rawType = (cert.certificate_type || cert.type || '').toLowerCase();
                    const isPrestasi = rawType.includes('prestasi') || rawType.includes('achievement');
                    const isPartisipasi = rawType.includes('partisipasi') || rawType.includes('participation');

                    const isDownloading = downloadingCertId === (cert.certificate_id || cert.id);
                    const isReissuePending = !!cert.reissue_requested;

                    return (
                      <tr key={cert.certificate_id || cert.id} className="hover:bg-[#FAF9F6]/60 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 font-extrabold text-sm ${
                              isPrestasi 
                                ? 'bg-amber-100 border-amber-300 text-amber-800' 
                                : isPartisipasi 
                                ? 'bg-slate-100 border-slate-300 text-slate-800' 
                                : 'bg-emerald-100 border-emerald-300 text-emerald-800'
                            }`}>
                              {isPrestasi ? '👑' : isPartisipasi ? '💎' : '🌿'}
                            </div>
                            <div>
                              <p className="font-bold text-[#121214] text-xs sm:text-sm">
                                {certName}
                              </p>
                              <span className="text-[11px] font-mono text-gray-500 font-bold">
                                {certNum}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Distinct Certificate Type Badge */}
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border ${
                            isPrestasi 
                              ? 'bg-amber-50 text-amber-900 border-amber-300'
                              : isPartisipasi 
                              ? 'bg-slate-50 text-slate-900 border-slate-300'
                              : 'bg-emerald-50 text-emerald-900 border-emerald-300'
                          }`}>
                            <span>{isPrestasi ? '👑' : isPartisipasi ? '💎' : '🌿'}</span>
                            <span>{isPrestasi ? 'Sertifikat Prestasi' : isPartisipasi ? 'Sertifikat Partisipasi' : 'Sertifikat Kelulusan'}</span>
                          </span>
                        </td>

                        <td className="px-5 py-4 font-medium text-[#121214]/80">
                          <span className="font-bold text-emerald-800">{cert.predicate || 'Sangat Memuaskan'}</span>
                          {cert.score_average && <span className="text-xs text-gray-500 ml-1">({cert.score_average})</span>}
                        </td>

                        <td className="px-5 py-4 font-medium text-[#121214]/60">
                          {cert.issue_date || cert.issueDate ? new Date(cert.issue_date || cert.issueDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                        </td>

                        <td className="px-5 py-4">
                          {isReissuePending ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              <Clock className="w-3 h-3 text-amber-600 animate-pulse" />
                              Menunggu Koreksi Admin
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-[#B8C96E] text-[#121214] border border-[#121214]">
                              <CheckCircle className="w-3 h-3 text-[#121214]" />
                              Terverifikasi SHA-256
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-4 text-right">
                          <div className="flex flex-wrap items-center justify-end gap-1.5">
                            {/* Preview Modal Button */}
                            <button
                              onClick={() => setSelectedCertificate(cert)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-white hover:bg-gray-100 text-gray-800 border border-gray-300 text-xs font-bold transition shadow-xs cursor-pointer active:scale-95 whitespace-nowrap shrink-0"
                              title="Lihat Pratinjau Sertifikat Resmi"
                            >
                              <Eye className="w-3.5 h-3.5 text-gray-600" />
                              <span className="hidden sm:inline">Lihat</span>
                            </button>

                            {/* Direct Download Button */}
                            <button
                              onClick={() => handleDirectDownload(cert)}
                              disabled={isDownloading}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#008F4C] hover:bg-[#00753e] text-white text-xs font-bold transition shadow-xs cursor-pointer active:scale-95 disabled:opacity-50 whitespace-nowrap shrink-0"
                              title={`Download langsung file ${isPrestasi ? 'Sertifikat Prestasi' : isPartisipasi ? 'Sertifikat Partisipasi' : 'Sertifikat Kelulusan'} milik ${certName}`}
                            >
                              {isDownloading ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Download className="w-3.5 h-3.5" />
                              )}
                              <span>{isDownloading ? 'Menyimpan...' : 'Download'}</span>
                            </button>

                            {/* Request Re-issue / Correction Button */}
                            {!isReissuePending ? (
                              <button
                                onClick={() => {
                                  setReissueTargetCert(cert);
                                  setReissueReason('');
                                  setShowReissueModal(true);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold transition cursor-pointer active:scale-95 whitespace-nowrap shrink-0"
                                title="Ajukan revisi/koreksi kesalahan nama ke Admin untuk dihapus bersih dan diterbitkan ulang"
                              >
                                <FileEdit className="w-3 h-3 text-amber-700" />
                                <span className="hidden md:inline">Koreksi</span>
                              </button>
                            ) : null}
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

        {/* =========================================================================
            MODAL 1: SINGLE GENERATE CERTIFICATE (With Password & Dedicated Type Design)
        ========================================================================== */}
        {showGenerateModal && (
          <div
            className="fixed inset-0 bg-[#121214]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto overscroll-contain"
            role="dialog"
            aria-modal="true"
            aria-label="Terbitkan Sertifikat Resmi"
            onClick={(e) => { if (e.target === e.currentTarget) setShowGenerateModal(false); }}
          >
            <div className="bg-white rounded-[26px] max-w-lg w-full max-h-[90vh] overflow-y-auto overscroll-contain p-6 sm:p-7 shadow-2xl border border-[#EAE9E4] space-y-5 animate-in fade-in zoom-in-95 duration-200 my-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#EAE9E4]">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-[#FCE373]/40 border border-[#FCE373] flex items-center justify-center text-[#856B12]">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-[#121214]">Terbitkan Sertifikat Resmi</h3>
                    <p className="text-xs text-[#121214]/50">Pilih jenis sertifikat dan lakukan otorisasi kata sandi</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowGenerateModal(false)}
                  className="w-8 h-8 rounded-full border border-[#EAE9E4] flex items-center justify-center text-[#121214]/50 hover:text-[#121214] hover:bg-[#FAF9F6] transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleGenerateCertificate} className="space-y-4">
                
                {/* Mentee Select */}
                <div>
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#121214] mb-1.5">
                    Pilih Peserta Magang (Anti-Fraud: 1 Peserta = 1 Sertifikat)
                  </label>
                  <select
                    required
                    value={formData.participant_id}
                    onChange={(e) => setFormData({ ...formData, participant_id: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#FAF9F6] border-2 border-[#121214] rounded-2xl text-xs font-bold text-[#121214] shadow-[3px_3px_0px_#121214] focus:outline-none focus:bg-white transition cursor-pointer"
                  >
                    <option value="">-- Pilih Peserta Bimbingan --</option>
                    {participants.map(p => {
                      const alreadyIssued = issuedUserIds.has(p.user_id);
                      return (
                        <option 
                          key={p.user_id} 
                          value={p.user_id}
                          disabled={alreadyIssued}
                        >
                          {p.full_name} ({p.unique_id}) {alreadyIssued ? '— [SUDAH TERBIT]' : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Certificate Type Selection (Auto Determines Visual Design & Wording) */}
                <div>
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#121214] mb-1.5">
                    Pilih Jenis Sertifikat
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#FAF9F6] border-2 border-[#121214] rounded-2xl text-xs font-bold text-[#121214] shadow-[3px_3px_0px_#121214] focus:outline-none focus:bg-white transition cursor-pointer"
                  >
                    <option value="Kelulusan">🌿 Sertifikat Kelulusan (Completion)</option>
                    <option value="Prestasi">👑 Sertifikat Prestasi (Achievement)</option>
                    <option value="Partisipasi">💎 Sertifikat Partisipasi (Participation)</option>
                  </select>

                  {/* Informative Preview Card for the Type */}
                  <div className={`mt-2.5 p-3 rounded-2xl border text-xs leading-relaxed transition ${
                    formData.type === 'Prestasi'
                      ? 'bg-amber-50 border-amber-300 text-amber-950'
                      : formData.type === 'Partisipasi'
                      ? 'bg-slate-50 border-slate-300 text-slate-900'
                      : 'bg-emerald-50 border-emerald-300 text-emerald-950'
                  }`}>
                    <div className="font-extrabold flex items-center gap-1.5 mb-1">
                      <span>{formData.type === 'Prestasi' ? '👑 Desain Khusus Prestasi Unggul:' : formData.type === 'Partisipasi' ? '💎 Desain Partisipasi Aktif:' : '🌿 Desain Resmi Kelulusan Magang:'}</span>
                    </div>
                    <p className="text-[11px]">
                      {formData.type === 'Prestasi'
                        ? 'Judul: SERTIFIKAT PRESTASI. Menggunakan ornamen Royal Gold & Navy Elite dengan stempel dinas emas prestisius untuk peserta dengan capaian kinerja terbaik.'
                        : formData.type === 'Partisipasi'
                        ? 'Judul: SERTIFIKAT PARTISIPASI. Menggunakan desain Modern Geometric Platinum (Slate & Sian Teal) untuk tanda dedikasi dan kepesertaan aktif di lapangan.'
                        : 'Judul: SERTIFIKAT KELULUSAN. Menggunakan desain Emerald Classic BPJSTK (Hijau Zamrud & Emas Klasik) sebagai surat tanda tamat resmi magang industri.'}
                    </p>
                  </div>
                </div>

                {/* Coordinator Password Authorization */}
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-extrabold uppercase tracking-wider text-[#121214] flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-rose-600" />
                      <span>Kata Sandi Otorisasi Koordinator</span>
                    </label>
                    <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                      Wajib
                    </span>
                  </div>
                  <input
                    type="password"
                    required
                    placeholder="Masukkan kata sandi login akun Anda untuk otorisasi..."
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#FAF9F6] border-2 border-[#121214] rounded-2xl text-xs font-bold text-[#121214] shadow-[3px_3px_0px_#121214] focus:outline-none focus:bg-white transition"
                  />
                  <p className="text-[10px] text-gray-500 mt-1">
                    Verifikasi sandi mencegah penerbitan tanpa izin dan menjamin akuntabilitas audit forensik.
                  </p>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2.5 pt-4 border-t border-[#EAE9E4]">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => setShowGenerateModal(false)}
                    className="px-5 py-2.5 rounded-full border border-[#EAE9E4] text-xs font-bold text-[#121214] hover:bg-[#FAF9F6] transition cursor-pointer"
                  >
                    Batal
                  </button>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#121214] hover:bg-black text-white text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-60 active:scale-95"
                  >
                    {submitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-[#FCE373]" />
                        <span>Sedang Menerbitkan...</span>
                      </>
                    ) : (
                      <>
                        <Award className="w-4 h-4 text-[#FCE373]" />
                        <span>Terbitkan Sekarang</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* =========================================================================
            MODAL 2: BULK ISSUE CERTIFICATES (Batch Penerbitan Massal)
        ========================================================================== */}
        {showBulkModal && (
          <div
            className="fixed inset-0 bg-[#121214]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto overscroll-contain"
            role="dialog"
            aria-modal="true"
            aria-label="Penerbitan Sertifikat Massal"
            onClick={(e) => { if (e.target === e.currentTarget) setShowBulkModal(false); }}
          >
            <div className="bg-white rounded-[26px] max-w-lg w-full max-h-[90vh] overflow-y-auto overscroll-contain p-6 sm:p-7 shadow-2xl border border-[#EAE9E4] space-y-5 animate-in fade-in zoom-in-95 duration-200 my-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#EAE9E4]">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-800">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-[#121214]">Penerbitan Sertifikat Massal</h3>
                    <p className="text-xs text-[#121214]/50">Terbitkan sertifikat bagi seluruh anak didik sekaligus</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowBulkModal(false)}
                  className="w-8 h-8 rounded-full border border-[#EAE9E4] flex items-center justify-center text-[#121214]/50 hover:text-[#121214] hover:bg-[#FAF9F6] transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleBulkGenerate} className="space-y-4">
                {/* List Mentees with Checkboxes */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[11px] font-extrabold uppercase tracking-wider text-[#121214]">
                      Pilih Peserta yang Belum Bersertifikat ({bulkSelectedIds.length}/{unissuedParticipants.length})
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        if (bulkSelectedIds.length === unissuedParticipants.length) {
                          setBulkSelectedIds([]);
                        } else {
                          setBulkSelectedIds(unissuedParticipants.map(p => p.user_id));
                        }
                      }}
                      className="text-xs font-bold text-emerald-700 hover:underline cursor-pointer"
                    >
                      {bulkSelectedIds.length === unissuedParticipants.length ? 'Batal Pilih Semua' : 'Pilih Semua'}
                    </button>
                  </div>

                  {unissuedParticipants.length === 0 ? (
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl text-center text-xs text-gray-500 font-medium">
                      Semua peserta bimbingan Anda sudah memiliki sertifikat.
                    </div>
                  ) : (
                    <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 bg-[#FAF9F6] border-2 border-[#121214] rounded-2xl shadow-[2px_2px_0px_#121214]">
                      {unissuedParticipants.map(p => {
                        const isChecked = bulkSelectedIds.includes(p.user_id);
                        return (
                          <label
                            key={p.user_id}
                            className={`flex items-center justify-between p-2 rounded-xl border text-xs font-bold cursor-pointer transition ${
                              isChecked ? 'bg-white border-emerald-600 text-[#121214]' : 'bg-transparent border-transparent text-gray-600'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setBulkSelectedIds(prev => [...prev, p.user_id]);
                                  } else {
                                    setBulkSelectedIds(prev => prev.filter(id => id !== p.user_id));
                                  }
                                }}
                                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                              />
                              <span>{p.full_name}</span>
                            </div>
                            <span className="text-[10px] font-mono text-gray-400 font-normal">{p.unique_id}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Bulk Certificate Type Selection */}
                <div>
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#121214] mb-1.5">
                    Jenis Sertifikat untuk Penerbitan Massal
                  </label>
                  <select
                    value={bulkType}
                    onChange={(e) => setBulkType(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#FAF9F6] border-2 border-[#121214] rounded-2xl text-xs font-bold text-[#121214] shadow-[3px_3px_0px_#121214] focus:outline-none focus:bg-white transition cursor-pointer"
                  >
                    <option value="Kelulusan">🌿 Sertifikat Kelulusan (Desain Emerald Classic BPJSTK)</option>
                    <option value="Prestasi">👑 Sertifikat Prestasi (Desain Royal Gold & Navy Elite)</option>
                    <option value="Partisipasi">💎 Sertifikat Partisipasi (Desain Modern Geometric Platinum)</option>
                  </select>
                </div>

                {/* Password Authorization */}
                <div>
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#121214] mb-1.5">
                    Kata Sandi Otorisasi Koordinator
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Masukkan kata sandi login Anda..."
                    value={bulkPassword}
                    onChange={(e) => setBulkPassword(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#FAF9F6] border-2 border-[#121214] rounded-2xl text-xs font-bold text-[#121214] shadow-[3px_3px_0px_#121214] focus:outline-none focus:bg-white transition"
                  />
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2.5 pt-4 border-t border-[#EAE9E4]">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => setShowBulkModal(false)}
                    className="px-5 py-2.5 rounded-full border border-[#EAE9E4] text-xs font-bold text-[#121214] hover:bg-[#FAF9F6] transition cursor-pointer"
                  >
                    Batal
                  </button>

                  <button
                    type="submit"
                    disabled={submitting || bulkSelectedIds.length === 0}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#121214] hover:bg-black text-white text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50 active:scale-95"
                  >
                    {submitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-[#FCE373]" />
                        <span>Sedang Memproses Massal...</span>
                      </>
                    ) : (
                      <>
                        <Layers className="w-4 h-4 text-[#FCE373]" />
                        <span>Terbitkan {bulkSelectedIds.length} Sertifikat</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* =========================================================================
            MODAL 3: REQUEST RE-ISSUE / CORRECTION TO ADMIN (HAPUS BERSIH PROTOCOL)
        ========================================================================== */}
        {showReissueModal && reissueTargetCert && (
          <div
            className="fixed inset-0 bg-[#121214]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto overscroll-contain"
            role="dialog"
            aria-modal="true"
            aria-label="Ajukan Koreksi Sertifikat"
            onClick={(e) => { if (e.target === e.currentTarget) setShowReissueModal(false); }}
          >
            <div className="bg-white rounded-[26px] max-w-md w-full max-h-[90vh] overflow-y-auto overscroll-contain p-6 sm:p-7 shadow-2xl border border-[#EAE9E4] space-y-5 animate-in fade-in zoom-in-95 duration-200 my-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#EAE9E4]">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800">
                    <FileEdit className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-[#121214]">Ajukan Koreksi Sertifikat</h3>
                    <p className="text-xs text-[#121214]/50">Permohonan penghapusan bersih & terbit ulang</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowReissueModal(false)}
                  className="w-8 h-8 rounded-full border border-[#EAE9E4] flex items-center justify-center text-[#121214]/50 hover:text-[#121214] hover:bg-[#FAF9F6] transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleRequestReissue} className="space-y-4">
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-1 text-xs">
                  <div className="font-bold text-[#121214]">
                    Peserta: {reissueTargetCert.participant_name || reissueTargetCert.participant}
                  </div>
                  <div className="font-mono text-gray-500">
                    No: {reissueTargetCert.certificate_number}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#121214] mb-1.5">
                    Alasan Koreksi / Revisi Data
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Contoh: Kesalahan penulisan nama lengkap (salah ketik huruf) atau penyesuaian gelar..."
                    value={reissueReason}
                    onChange={(e) => setReissueReason(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#FAF9F6] border-2 border-[#121214] rounded-2xl text-xs font-bold text-[#121214] shadow-[3px_3px_0px_#121214] focus:outline-none focus:bg-white transition"
                  />
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 leading-relaxed">
                  <span className="font-bold">Protokol Keamanan:</span> Administrator akan memeriksa alasan ini. Jika disetujui, sertifikat lama akan <span className="font-bold underline">dihapus bersih dari sistem & basis data</span> sehingga slot peserta terbuka kembali untuk Anda terbitkan dengan data yang benar.
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2.5 pt-4 border-t border-[#EAE9E4]">
                  <button
                    type="button"
                    disabled={submittingReissue}
                    onClick={() => setShowReissueModal(false)}
                    className="px-5 py-2.5 rounded-full border border-[#EAE9E4] text-xs font-bold text-[#121214] hover:bg-[#FAF9F6] transition cursor-pointer"
                  >
                    Batal
                  </button>

                  <button
                    type="submit"
                    disabled={submittingReissue || !reissueReason.trim()}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50 active:scale-95"
                  >
                    {submittingReissue ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Mengirim Permohonan...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Kirim ke Administrator</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Format Resmi E-Sertifikat BPJS Ketenagakerjaan */}
        {selectedCertificate && (
          <CompanyCertificateModal
            isOpen={!!selectedCertificate}
            onClose={() => setSelectedCertificate(null)}
            certificate={selectedCertificate}
          />
        )}

      </div>
    </Layout>
  );
};

export default Certificates;
