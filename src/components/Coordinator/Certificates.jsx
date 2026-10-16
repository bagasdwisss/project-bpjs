// src/components/Coordinator/Certificates.jsx
import React, { useState, useEffect } from 'react';
import Layout from '../Layout/Layout';
import reportService from '../../services/reportService';
import userService from '../../services/userService';
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
  Sparkles
} from 'lucide-react';

const Certificates = () => {
  const [certificates, setCertificates] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const [formData, setFormData] = useState({
    participant_id: '',
    type: 'Completion'
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [certRes, userRes] = await Promise.all([
        reportService.certificateHistory(),
        userService.getMyParticipants()
      ]);

      if (certRes.data) {
        setCertificates(Array.isArray(certRes.data.data) ? certRes.data.data : (Array.isArray(certRes.data) ? certRes.data : []));
      }
      if (userRes.data) {
        setParticipants(Array.isArray(userRes.data.data) ? userRes.data.data : (Array.isArray(userRes.data) ? userRes.data : []));
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

  const handleGenerateCertificate = async (e) => {
    e.preventDefault();
    if (!formData.participant_id) {
      alert('Silakan pilih peserta terlebih dahulu.');
      return;
    }
    try {
      const res = await reportService.generateCertificate(formData);
      if (res.data.success) {
        setSuccessMsg(res.data.message || 'Sertifikat berhasil diterbitkan');
        setShowGenerateModal(false);
        setFormData({ participant_id: '', type: 'Completion' });
        loadData();
        setTimeout(() => setSuccessMsg(''), 4000);
      }
    } catch (err) {
      alert('Gagal menerbitkan sertifikat: ' + (err.response?.data?.message || err.message));
    }
  };

  const getStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'issued' || s === 'completed') {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-[#B8C96E]/30 text-[#3C4A11] border border-[#B8C96E]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#627514]"></span>
          Telah Terbit
        </span>
      );
    }
    if (s === 'pending') {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-[#FCE373]/40 text-[#856B12] border border-[#FCE373]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#D4A600]"></span>
          Menunggu
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-[#121214]/5 text-[#121214]/70 border border-[#EAE9E4]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#121214]/40"></span>
        Draft
      </span>
    );
  };

  const filteredCertificates = (Array.isArray(certificates) ? certificates : []).filter((cert) => {
    const pName = cert?.participant || cert?.report_name || '';
    const matchesSearch = pName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || cert?.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const totalIssued = certificates.filter(c => (c.status || '').toLowerCase() === 'issued').length;
  const totalCompletion = certificates.filter(c => (c.type || 'Completion') === 'Completion').length;
  const totalAchievement = certificates.filter(c => c.type === 'Achievement').length;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        
        {/* Header Bento Box */}
        <div className="bg-white rounded-[22px] border border-[#EAE9E4] p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#FCE373]/50 text-[#856B12]">
                <Award className="w-4 h-4" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-[#121214]/60">Sertifikasi & Kelulusan</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#121214] tracking-tight">Manajemen Sertifikat</h1>
            <p className="text-sm text-[#121214]/60 mt-1">Penerbitan, verifikasi, dan manajemen sertifikat kelulusan peserta magang BPJS</p>
          </div>
          
          <button
            onClick={() => setShowGenerateModal(true)}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-[#121214] text-white text-xs font-bold hover:bg-black transition shadow-sm self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Terbitkan Sertifikat
          </button>
        </div>

        {/* Success Alert */}
        {successMsg && (
          <div className="p-4 bg-[#B8C96E]/20 border border-[#B8C96E] rounded-2xl flex items-center gap-3 text-xs sm:text-sm font-bold text-[#3C4A11]">
            <CheckCircle className="w-5 h-5 text-[#627514] flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* 4 Pastel Bento Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-[#FCE373]/30 rounded-[22px] border border-[#FCE373] p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-[#121214]/70">Total Sertifikat</span>
              <div className="w-7 h-7 rounded-xl bg-white/80 flex items-center justify-center text-[#121214]">
                <Award className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[#121214]">{certificates.length}</div>
            <p className="text-xs text-[#121214]/60 mt-1">Dibuat di sistem</p>
          </div>

          <div className="bg-[#B8C96E]/30 rounded-[22px] border border-[#B8C96E] p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-[#121214]/70">Sertifikat Kelulusan</span>
              <div className="w-7 h-7 rounded-xl bg-white/80 flex items-center justify-center text-[#121214]">
                <FileText className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[#121214]">{totalCompletion}</div>
            <p className="text-xs text-[#121214]/60 mt-1">Program Selesai</p>
          </div>

          <div className="bg-[#F5C6EC]/30 rounded-[22px] border border-[#F5C6EC] p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-[#121214]/70">Sertifikat Prestasi</span>
              <div className="w-7 h-7 rounded-xl bg-white/80 flex items-center justify-center text-[#121214]">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[#121214]">{totalAchievement}</div>
            <p className="text-xs text-[#121214]/60 mt-1">Kinerja Terbaik</p>
          </div>

          <div className="bg-[#BDD4F2]/30 rounded-[22px] border border-[#BDD4F2] p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-[#121214]/70">Peserta Bimbingan</span>
              <div className="w-7 h-7 rounded-xl bg-white/80 flex items-center justify-center text-[#121214]">
                <Users className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[#121214]">{participants.length}</div>
            <p className="text-xs text-[#121214]/60 mt-1">Siap disertifikasi</p>
          </div>
        </div>

        {/* Filter & Search Bento */}
        <div className="bg-white p-4 sm:p-5 rounded-[22px] border border-[#EAE9E4] shadow-sm flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#121214]/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama peserta atau nomor sertifikat..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#FAF9F6] border border-[#EAE9E4] rounded-xl text-xs sm:text-sm font-medium text-[#121214] placeholder-[#121214]/40 focus:outline-none focus:bg-white focus:border-[#121214] transition"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#121214]/40" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2.5 bg-[#FAF9F6] border border-[#EAE9E4] rounded-xl text-xs sm:text-sm font-medium text-[#121214] focus:outline-none focus:bg-white focus:border-[#121214] transition cursor-pointer"
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
              <h3 className="text-sm sm:text-base font-bold text-[#121214]">Daftar Sertifikat Terbit</h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FAF9F6] border border-[#EAE9E4] text-[#121214]/70">
                {filteredCertificates.length}
              </span>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="w-8 h-8 border-2 border-[#121214] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-xs font-bold text-[#121214]/60">Memuat sertifikat...</p>
            </div>
          ) : filteredCertificates.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 rounded-full bg-[#FAF9F6] border border-[#EAE9E4] flex items-center justify-center mx-auto mb-3 text-[#121214]/40">
                <Award className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-[#121214]">Belum ada sertifikat</h4>
              <p className="text-xs text-[#121214]/50 mt-1">Terbitkan sertifikat baru dengan menekan tombol di atas.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm min-w-[680px]">
                <thead>
                  <tr className="border-b border-[#EAE9E4] bg-[#FAF9F6] text-[#121214]/60 font-bold uppercase text-[11px] tracking-wider">
                    <th className="px-5 py-3.5">Nama Peserta / Sertifikat</th>
                    <th className="px-5 py-3.5">Jenis</th>
                    <th className="px-5 py-3.5">Tanggal Terbit</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAE9E4]">
                  {filteredCertificates.map((cert) => (
                    <tr key={cert.id} className="hover:bg-[#FAF9F6]/60 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-[#FCE373]/40 border border-[#FCE373] flex items-center justify-center text-[#856B12] flex-shrink-0">
                            <Award className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-bold text-[#121214] text-xs sm:text-sm">
                              {cert.participant || cert.report_name}
                            </p>
                            <span className="text-[11px] text-[#121214]/50 font-medium">
                              ID: #{cert.id || 'N/A'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-medium text-[#121214]/80">
                        {cert.type === 'Completion' ? 'Kelulusan' : cert.type === 'Achievement' ? 'Prestasi' : cert.type || 'Umum'}
                      </td>
                      <td className="px-5 py-4 font-medium text-[#121214]/60">
                        {cert.issueDate ? new Date(cert.issueDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                      </td>
                      <td className="px-5 py-4">
                        {getStatusBadge(cert.status)}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => alert(`Mengunduh dokumen sertifikat: ${cert.participant || cert.report_name}`)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#121214] text-white hover:bg-black text-xs font-bold transition shadow-sm"
                        >
                          <Download className="w-3.5 h-3.5" /> Unduh
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Generate Certificate Modal */}
        {showGenerateModal && (
          <div className="fixed inset-0 bg-[#121214]/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[26px] max-w-md w-full p-6 sm:p-7 shadow-2xl border border-[#EAE9E4] space-y-5 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-[#EAE9E4]">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-[#FCE373]/40 border border-[#FCE373] flex items-center justify-center text-[#856B12]">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#121214]">Terbitkan Sertifikat Baru</h3>
                    <p className="text-xs text-[#121214]/50">Pilih peserta dan tipe sertifikat</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowGenerateModal(false)}
                  className="w-8 h-8 rounded-full border border-[#EAE9E4] flex items-center justify-center text-[#121214]/50 hover:text-[#121214] hover:bg-[#FAF9F6] transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleGenerateCertificate} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#121214] mb-1.5">Pilih Peserta Magang</label>
                  <select
                    required
                    value={formData.participant_id}
                    onChange={(e) => setFormData({ ...formData, participant_id: e.target.value })}
                    className="w-full px-4 py-3 bg-[#FAF9F6] border border-[#EAE9E4] rounded-xl text-xs sm:text-sm font-medium text-[#121214] focus:outline-none focus:bg-white focus:border-[#121214] transition cursor-pointer"
                  >
                    <option value="">-- Pilih Peserta --</option>
                    {participants.map(p => (
                      <option key={p.user_id} value={p.user_id}>
                        {p.full_name} ({p.unique_id})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#121214] mb-1.5">Jenis Sertifikat</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-4 py-3 bg-[#FAF9F6] border border-[#EAE9E4] rounded-xl text-xs sm:text-sm font-medium text-[#121214] focus:outline-none focus:bg-white focus:border-[#121214] transition cursor-pointer"
                  >
                    <option value="Completion">Sertifikat Kelulusan (Completion)</option>
                    <option value="Achievement">Sertifikat Prestasi (Achievement)</option>
                    <option value="Participation">Sertifikat Partisipasi (Participation)</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2.5 pt-3 border-t border-[#EAE9E4]">
                  <button
                    type="button"
                    onClick={() => setShowGenerateModal(false)}
                    className="px-5 py-2.5 rounded-full border border-[#EAE9E4] text-xs font-bold text-[#121214] hover:bg-[#FAF9F6] transition"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-full bg-[#121214] hover:bg-black text-white text-xs font-bold transition shadow-sm"
                  >
                    Terbitkan Sekarang
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

export default Certificates;