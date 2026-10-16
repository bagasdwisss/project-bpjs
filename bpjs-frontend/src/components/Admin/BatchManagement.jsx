// src/components/Admin/BatchManagement.jsx
import React, { useState, useEffect } from 'react';
import Layout from '../Layout/Layout';
import batchService from '../../services/batchService';
import userService from '../../services/userService';
import { Calendar, Users, Plus, Edit2, Trash2, UserPlus, CheckCircle, Clock } from 'lucide-react';

function AdminBatchManagement() {
  const [batches, setBatches] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [selectedUsers, setSelectedUsers] = useState([]);

  // Form state
  const [formData, setFormData] = useState({
    batch_name: '',
    start_date: '',
    end_date: '',
    status: 'Aktif'
  });

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [batchRes, userRes] = await Promise.all([
        batchService.getAll(),
        userService.getUsers({ role_id: 1 })
      ]);

      if (batchRes.data.success) {
        setBatches(batchRes.data.data);
      }
      if (userRes.data && Array.isArray(userRes.data)) {
        setParticipants(userRes.data);
      } else if (userRes.data?.data) {
        setParticipants(userRes.data.data);
      }
    } catch (err) {
      console.error('Error loading batches:', err);
      setError('Gagal memuat data batch.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenCreate = () => {
    setSelectedBatch(null);
    setFormData({
      batch_name: '',
      start_date: '',
      end_date: '',
      status: 'Aktif'
    });
    setShowModal(true);
  };

  const handleOpenEdit = (batch) => {
    setSelectedBatch(batch);
    setFormData({
      batch_name: batch.batch_name,
      start_date: batch.start_date ? batch.start_date.split('T')[0] : '',
      end_date: batch.end_date ? batch.end_date.split('T')[0] : '',
      status: batch.status || 'Aktif'
    });
    setShowModal(true);
  };

  const handleSaveBatch = async (e) => {
    e.preventDefault();
    try {
      if (selectedBatch) {
        await batchService.update(selectedBatch.batch_id, formData);
        setSuccessMsg('Batch berhasil diperbarui!');
      } else {
        await batchService.create(formData);
        setSuccessMsg('Batch baru berhasil dibuat!');
      }
      setShowModal(false);
      loadData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      alert('Gagal menyimpan batch: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleDeleteBatch = async (id, name) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus "${name}"?`)) return;
    try {
      await batchService.delete(id);
      setSuccessMsg('Batch berhasil dihapus!');
      loadData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      alert('Gagal menghapus batch: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleOpenAssign = (batch) => {
    setSelectedBatch(batch);
    setSelectedUsers([]);
    setShowAssignModal(true);
  };

  const handleToggleUserSelect = (userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleSaveAssignment = async () => {
    if (selectedUsers.length === 0) {
      alert('Pilih setidaknya satu peserta untuk ditugaskan.');
      return;
    }
    try {
      await batchService.assignUsers(selectedBatch.batch_id, selectedUsers);
      setSuccessMsg(`${selectedUsers.length} peserta berhasil ditugaskan ke batch!`);
      setShowAssignModal(false);
      loadData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      alert('Gagal menugaskan peserta: ' + (err.response?.data?.message || err.message));
    }
  };

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Manajemen Batch & Gelombang</h1>
            <p className="text-sm text-gray-500 mt-1">Kelola jadwal pelatihan magang dan penugasan peserta ke dalam batch</p>
          </div>
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2.5 rounded-xl shadow-sm transition-colors text-sm"
          >
            <Plus className="w-4 h-4" /> Tambah Batch Baru
          </button>
        </div>

        {/* Notifications */}
        {successMsg && (
          <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-xl flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Batch</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">{batches.length}</h3>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Calendar className="w-6 h-6" />
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Batch Aktif</p>
              <h3 className="text-2xl font-bold text-green-600 mt-1">
                {batches.filter(b => b.status === 'Aktif').length}
              </h3>
            </div>
            <div className="p-3 bg-green-50 text-green-600 rounded-xl">
              <Clock className="w-6 h-6" />
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Peserta Terdaftar</p>
              <h3 className="text-2xl font-bold text-purple-600 mt-1">{participants.length}</h3>
            </div>
            <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
              <Users className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Batches Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">Daftar Gelombang Pelatihan</h2>
          </div>

          {loading ? (
            <div className="p-12 text-center text-gray-500">Memuat data batch...</div>
          ) : batches.length === 0 ? (
            <div className="p-12 text-center text-gray-400">Belum ada batch terdaftar. Silakan buat batch baru.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 text-sm">
                <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-semibold">
                  <tr>
                    <th className="px-6 py-3.5 text-left">Nama Batch</th>
                    <th className="px-6 py-3.5 text-left">Periode Pelaksanaan</th>
                    <th className="px-6 py-3.5 text-left">Status</th>
                    <th className="px-6 py-3.5 text-left">Peserta</th>
                    <th className="px-6 py-3.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {batches.map((batch) => (
                    <tr key={batch.batch_id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-6 py-4 font-semibold text-gray-900">{batch.batch_name}</td>
                      <td className="px-6 py-4 text-gray-600">
                        {batch.start_date ? new Date(batch.start_date).toLocaleDateString('id-ID') : '-'} s/d{' '}
                        {batch.end_date ? new Date(batch.end_date).toLocaleDateString('id-ID') : '-'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          batch.status === 'Aktif'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {batch.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg font-medium text-xs">
                          <Users className="w-3.5 h-3.5" />
                          {batch.participant_count || 0} Peserta
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button
                          onClick={() => handleOpenAssign(batch)}
                          title="Tugaskan Peserta"
                          className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                        >
                          <UserPlus className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(batch)}
                          title="Edit Batch"
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteBatch(batch.batch_id, batch.batch_name)}
                          title="Hapus Batch"
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Create/Edit Batch Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
              <h3 className="text-lg font-bold text-gray-900">
                {selectedBatch ? 'Edit Batch Pelatihan' : 'Tambah Batch Baru'}
              </h3>
              <form onSubmit={handleSaveBatch} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Nama Batch / Gelombang</label>
                  <input
                    type="text"
                    required
                    value={formData.batch_name}
                    onChange={(e) => setFormData({ ...formData, batch_name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="Contoh: Gelombang 1 2026"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Tanggal Mulai</label>
                    <input
                      type="date"
                      required
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Tanggal Selesai</label>
                    <input
                      type="date"
                      required
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Selesai">Selesai</option>
                    <option value="Mendatang">Mendatang</option>
                  </select>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 border rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium"
                  >
                    Simpan
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Assign Users Modal */}
        {showAssignModal && selectedBatch && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Tugaskan Peserta ke Batch</h3>
                <p className="text-xs text-gray-500 mt-0.5">Pilih peserta untuk: <span className="font-semibold text-gray-800">{selectedBatch.batch_name}</span></p>
              </div>

              <div className="max-h-60 overflow-y-auto divide-y divide-gray-100 border rounded-xl p-2">
                {participants.length === 0 ? (
                  <p className="p-4 text-center text-sm text-gray-500">Tidak ada peserta ditemukan.</p>
                ) : (
                  participants.map(p => (
                    <label key={p.user_id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(p.user_id)}
                        onChange={() => handleToggleUserSelect(p.user_id)}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-800">{p.full_name}</p>
                        <p className="text-xs text-gray-400">ID: {p.unique_id} • Penempatan: {p.penempatan || 'Belum diatur'}</p>
                      </div>
                    </label>
                  ))
                )}
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className="text-xs text-gray-500">{selectedUsers.length} peserta dipilih</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAssignModal(false)}
                    className="px-4 py-2 border rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveAssignment}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-medium"
                  >
                    Tugaskan Sekarang
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default AdminBatchManagement;