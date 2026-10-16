// src/components/Coordinator/Certificates.jsx
import React, { useState, useEffect } from 'react';
import Layout from '../Layout/Layout';
import reportService from '../../services/reportService';
import userService from '../../services/userService';
import { Award, Download, Plus, Search, Filter, CheckCircle, Clock, AlertCircle } from 'lucide-react';

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

      if (certRes.data.success) {
        setCertificates(certRes.data.data);
      }
      if (userRes.data?.success) {
        setParticipants(userRes.data.data);
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
        setSuccessMsg(res.data.message);
        setShowGenerateModal(false);
        loadData();
        setTimeout(() => setSuccessMsg(''), 4000);
      }
    } catch (err) {
      alert('Gagal menerbitkan sertifikat: ' + (err.response?.data?.message || err.message));
    }
  };

  const getStatusBadgeColor = (status) => {
    const colors = {
      issued: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      draft: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const filteredCertificates = certificates.filter((cert) => {
    const pName = cert.participant || cert.report_name || '';
    const matchesSearch = pName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || cert.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Manajemen Sertifikat</h1>
            <p className="mt-1 text-sm text-gray-600">Penerbitan dan kelola sertifikat kelulusan peserta magang BPJS</p>
          </div>
          <button
            onClick={() => setShowGenerateModal(true)}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2.5 rounded-xl shadow-sm transition-colors text-sm"
          >
            <Plus className="w-4 h-4" /> Terbitkan Sertifikat
          </button>
        </div>

        {/* Notification */}
        {successMsg && (
          <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-xl flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Filter & Search */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Cari nama peserta..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-auto"
            >
              <option value="all">Semua Status</option>
              <option value="issued">Telah Diterbitkan</option>
              <option value="pending">Menunggu</option>
              <option value="draft">Draft</option>
            </select>
          </div>
        </div>

        {/* Certificates Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-500">Memuat sertifikat...</div>
          ) : filteredCertificates.length === 0 ? (
            <div className="p-12 text-center text-gray-400">Belum ada riwayat sertifikat yang diterbitkan.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 text-sm">
                <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-semibold">
                  <tr>
                    <th className="px-6 py-3.5 text-left">Nama Peserta / Sertifikat</th>
                    <th className="px-6 py-3.5 text-left">Tipe</th>
                    <th className="px-6 py-3.5 text-left">Tanggal Terbit</th>
                    <th className="px-6 py-3.5 text-left">Status</th>
                    <th className="px-6 py-3.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredCertificates.map((cert) => (
                    <tr key={cert.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-6 py-4 font-semibold text-gray-900 flex items-center gap-2">
                        <Award className="w-4 h-4 text-yellow-500" />
                        {cert.participant || cert.report_name}
                      </td>
                      <td className="px-6 py-4 text-gray-600">{cert.type || 'Completion'}</td>
                      <td className="px-6 py-4 text-gray-500">
                        {cert.issueDate ? new Date(cert.issueDate).toLocaleDateString('id-ID') : '-'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusBadgeColor(cert.status)}`}>
                          {cert.status || 'issued'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => alert(`Mengunduh dokumen: ${cert.report_name || 'Sertifikat'}`)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-medium transition-colors"
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
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
              <h3 className="text-lg font-bold text-gray-900">Terbitkan Sertifikat Baru</h3>
              <form onSubmit={handleGenerateCertificate} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Pilih Peserta</label>
                  <select
                    required
                    value={formData.participant_id}
                    onChange={(e) => setFormData({ ...formData, participant_id: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Jenis Sertifikat</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="Completion">Sertifikat Kelulusan (Completion)</option>
                    <option value="Achievement">Sertifikat Prestasi (Achievement)</option>
                    <option value="Participation">Sertifikat Partisipasi (Participation)</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowGenerateModal(false)}
                    className="px-4 py-2 border rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium"
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