import React, { useState, useEffect } from 'react';
import Layout from '../Layout/Layout';
import batchService from '../../services/batchService';
import userService from '../../services/userService';
import { useToast } from '../../context/ToastContext';
import { Calendar, Users, Plus, Edit2, Trash2, UserPlus, CheckCircle, Clock, X, RotateCcw, AlertTriangle } from 'lucide-react';
import NeoDatePicker from '../Common/NeoDatePicker';
import NeoSelect from '../Common/NeoSelect';

function AdminBatchManagement() {
  const { toast, confirm } = useToast();
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
        toast.success('Batch berhasil diperbarui!');
      } else {
        await batchService.create(formData);
        toast.success('Batch baru berhasil dibuat!');
      }
      setShowModal(false);
      loadData();
    } catch (err) {
      toast.error('Gagal menyimpan batch: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleDeleteBatch = async (id, name) => {
    const ok = await confirm({
      title: 'Hapus Batch',
      message: `Apakah Anda yakin ingin menghapus "${name}"? Tindakan ini tidak dapat dibatalkan.`,
      confirmText: 'Ya, Hapus Batch',
      cancelText: 'Batal',
      type: 'danger'
    });
    if (!ok) return;
    try {
      await batchService.delete(id);
      toast.success(`Batch "${name}" berhasil dihapus.`);
      loadData();
    } catch (err) {
      toast.error('Gagal menghapus batch: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleStartFreshBatch = async (batch) => {
    const ok = await confirm({
      title: 'Mulai Batch Baru (Reset Akun)',
      message: `PERHATIAN: Memulai "${batch.batch_name}" akan menetapkannya sebagai Batch AKTIF dan mereset SELURUH akun peserta magang lama. Seluruh riwayat presensi, penilaian, progres bimbingan peserta sebelumnya akan dibersihkan untuk periode baru. Akun Administrator dan Koordinator tetap aman. Apakah Anda yakin ingin memulai periode baru sekarang?`,
      confirmText: 'Ya, Mulai Batch & Reset Akun',
      cancelText: 'Batal',
      type: 'danger'
    });
    if (!ok) return;

    try {
      const res = await batchService.startFresh(batch.batch_id);
      toast.success(res.data?.message || `Batch ${batch.batch_name} berhasil diaktifkan dan akun peserta telah direset.`);
      loadData();
    } catch (err) {
      toast.error('Gagal memulai batch: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleOpenAssign = async (batch) => {
    setSelectedBatch(batch);
    try {
      const res = await batchService.getParticipants(batch.batch_id);
      if (res.data.success) {
        const assignedIds = res.data.data.map(p => p.user_id);
        setSelectedUsers(assignedIds);
      }
    } catch (err) {
      console.error('Error getting batch participants:', err);
      setSelectedUsers([]);
    }
    setShowAssignModal(true);
  };

  const handleSaveAssignment = async () => {
    if (!selectedBatch) return;
    try {
      await batchService.assignParticipants(selectedBatch.batch_id, selectedUsers);
      toast.success(`Daftar peserta untuk "${selectedBatch.batch_name}" berhasil diperbarui.`);
      setShowAssignModal(false);
      loadData();
    } catch (err) {
      toast.error('Gagal menugaskan peserta: ' + (err.response?.data?.message || err.message));
    }
  };

  const toggleUserSelection = (userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#121214] tracking-tight">
              Kelola Batch & Gelombang
            </h1>
            <p className="text-xs sm:text-sm text-[#6E6D6A] mt-1">
              Atur periode pelaksanaan program magang dan penugasan peserta per gelombang.
            </p>
          </div>
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#121214] text-white rounded-full text-xs font-bold hover:bg-neutral-800 shadow-sm transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> Tambah Batch Baru
          </button>
        </div>

        {/* Notifications */}
        {successMsg && (
          <div className="p-3.5 bg-[#B8C96E]/30 border border-[#B8C96E] text-[#121214] rounded-full text-xs font-bold flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-[#121214]" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* 3 Pastel Bento Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-[22px] bg-[#FCE373] text-[#121214] shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-[#121214]/70 uppercase tracking-wider">Total Gelombang</p>
              <h3 className="text-3xl font-black mt-1 text-[#121214]">{batches.length}</h3>
              <p className="text-[10px] text-[#121214]/60 font-medium">Terjadwal di sistem</p>
            </div>
            <div className="w-12 h-12 bg-[#121214] text-[#FCE373] rounded-[14px] flex items-center justify-center font-bold">
              <Calendar className="w-6 h-6" />
            </div>
          </div>

          <div className="p-5 rounded-[22px] bg-[#B8C96E] text-[#121214] shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-[#121214]/70 uppercase tracking-wider">Batch Aktif</p>
              <h3 className="text-3xl font-black mt-1 text-[#121214]">
                {batches.filter(b => b.status === 'Aktif').length}
              </h3>
              <p className="text-[10px] text-[#121214]/60 font-medium">Sedang berjalan</p>
            </div>
            <div className="w-12 h-12 bg-[#121214] text-[#B8C96E] rounded-[14px] flex items-center justify-center font-bold">
              <Clock className="w-6 h-6" />
            </div>
          </div>

          <div className="p-5 rounded-[22px] bg-[#F5C6EC] text-[#121214] shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-[#121214]/70 uppercase tracking-wider">Peserta Terdaftar</p>
              <h3 className="text-3xl font-black mt-1 text-[#121214]">{participants.length}</h3>
              <p className="text-[10px] text-[#121214]/60 font-medium">Akun peserta magang</p>
            </div>
            <div className="w-12 h-12 bg-[#121214] text-[#F5C6EC] rounded-[14px] flex items-center justify-center font-bold">
              <Users className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Batches Table Card */}
        <div className="bg-white rounded-[22px] border border-[#EAE9E4] shadow-sm overflow-hidden">
          <div className="p-5 border-b border-[#EAE9E4]">
            <h2 className="text-sm font-bold text-[#121214]">Daftar Gelombang Pelatihan</h2>
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs text-[#6E6D6A]">Memuat data batch...</div>
          ) : batches.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#6E6D6A]">Belum ada batch terdaftar. Silakan buat batch baru.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[#EAE9E4] text-xs">
                <thead className="bg-[#FAF9F6] text-[#6E6D6A] uppercase text-[10px] font-bold tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5 text-left">Nama Batch</th>
                    <th className="px-5 py-3.5 text-left">Periode Pelaksanaan</th>
                    <th className="px-5 py-3.5 text-left">Status</th>
                    <th className="px-5 py-3.5 text-left">Peserta</th>
                    <th className="px-5 py-3.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0EFEA] bg-white">
                  {batches.map((batch) => (
                    <tr key={batch.batch_id} className="hover:bg-[#FAF9F6] transition-colors">
                      <td className="px-5 py-4 font-bold text-[#121214]">{batch.batch_name}</td>
                      <td className="px-5 py-4 text-[#6E6D6A] font-medium">
                        {batch.start_date ? new Date(batch.start_date).toLocaleDateString('id-ID') : '-'} s/d{' '}
                        {batch.end_date ? new Date(batch.end_date).toLocaleDateString('id-ID') : '-'}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          batch.status === 'Aktif'
                            ? 'bg-[#B8C96E] text-[#121214]'
                            : 'bg-[#EAE9E4] text-[#6E6D6A]'
                        }`}>
                          {batch.status}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#FAF9F6] border border-[#EAE9E4] text-[#121214] rounded-full font-bold text-[10px]">
                          <Users className="w-3 h-3" />
                          {batch.participant_count || 0} Peserta
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right space-x-1.5">
                        <button
                          onClick={() => handleStartFreshBatch(batch)}
                          title="Mulai Batch Ini & Reset Akun Peserta Magang"
                          className="p-1.5 rounded-full bg-[#FAF9F6] hover:bg-[#F5C6EC] text-[#121214] border border-[#121214] shadow-xs transition-colors inline-flex items-center justify-center"
                        >
                          <RotateCcw className="w-4 h-4 text-[#D84594]" />
                        </button>
                        <button
                          onClick={() => handleOpenAssign(batch)}
                          title="Tugaskan Peserta"
                          className="p-1.5 rounded-full hover:bg-[#F5F4F0] text-[#121214] transition-colors"
                        >
                          <UserPlus className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(batch)}
                          title="Edit Batch"
                          className="p-1.5 rounded-full hover:bg-[#F5F4F0] text-[#121214] transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteBatch(batch.batch_id, batch.batch_name)}
                          title="Hapus Batch"
                          className="p-1.5 rounded-full hover:bg-rose-50 text-rose-600 transition-colors"
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
          <div className="fixed inset-0 bg-[#121214]/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[28px] border-2 border-[#121214] max-w-lg w-full p-6 shadow-[8px_8px_0px_#121214] space-y-4 animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-[#EAE9E4] pb-3">
                <div>
                  <h3 className="text-base font-extrabold text-[#121214]">
                    {selectedBatch ? 'Edit Batch Pelatihan' : 'Tambah Batch Baru'}
                  </h3>
                  <p className="text-xs text-[#6E6D6A]">Konfigurasi gelombang dan tanggal periode magang</p>
                </div>
                <button 
                  onClick={() => setShowModal(false)} 
                  className="w-8 h-8 rounded-full bg-[#FAF9F6] border border-[#121214] flex items-center justify-center hover:bg-[#EAE9E4]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveBatch} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-extrabold text-[#121214] uppercase tracking-wider mb-1.5">
                    Nama Gelombang
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.batch_name}
                    onChange={(e) => setFormData({ ...formData, batch_name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#FAF9F6] border-2 border-[#121214] rounded-2xl text-xs font-bold text-[#121214] shadow-[3px_3px_0px_#121214] focus:bg-white focus:outline-none"
                    placeholder="Contoh: Gelombang 1 2026"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <NeoDatePicker
                    label="Tanggal Mulai"
                    required
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    quickChips={true}
                  />
                  <NeoDatePicker
                    label="Tanggal Selesai"
                    required
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    quickChips={true}
                  />
                </div>

                <NeoSelect
                  label="Status Batch"
                  required
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  options={[
                    { value: 'Aktif', label: '🟢 Aktif' },
                    { value: 'Selesai', label: '⚪ Selesai' },
                    { value: 'Direncanakan', label: '🟡 Direncanakan' }
                  ]}
                />
                <div className="flex justify-end gap-2.5 pt-3 border-t border-[#EAE9E4]">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-5 py-2.5 rounded-full border border-[#EAE9E4] text-xs font-bold hover:bg-[#FAF9F6]"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-full bg-[#121214] text-white text-xs font-bold hover:bg-neutral-800 shadow-sm"
                  >
                    Simpan Batch
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Assign Participants Modal */}
        {showAssignModal && selectedBatch && (
          <div className="fixed inset-0 bg-[#121214]/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[28px] border border-[#EAE9E4] max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-[#EAE9E4] pb-3">
                <div>
                  <h3 className="text-base font-extrabold text-[#121214]">Tugaskan Peserta</h3>
                  <p className="text-xs text-[#6E6D6A]">Batch: {selectedBatch.batch_name}</p>
                </div>
                <button onClick={() => setShowAssignModal(false)} className="p-1 rounded-full hover:bg-[#FAF9F6]">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                {participants.length === 0 ? (
                  <p className="text-xs text-[#6E6D6A] text-center py-6">Tidak ada peserta ditemukan.</p>
                ) : (
                  participants.map(p => {
                    const isChecked = selectedUsers.includes(p.user_id);
                    return (
                      <div 
                        key={p.user_id} 
                        onClick={() => toggleUserSelection(p.user_id)}
                        className={`p-3 rounded-[16px] border flex items-center justify-between cursor-pointer transition-colors ${
                          isChecked ? 'bg-[#F5C6EC]/40 border-[#F5C6EC]' : 'bg-[#FAF9F6] border-[#EAE9E4] hover:bg-[#F5F4F0]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="w-4 h-4 rounded text-[#121214] focus:ring-[#121214]"
                          />
                          <div>
                            <p className="text-xs font-bold text-[#121214]">{p.full_name}</p>
                            <p className="text-[10px] text-[#6E6D6A]">{p.unique_id} • {p.email || '-'}</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold bg-white border border-[#EAE9E4] px-2 py-0.5 rounded-full capitalize">
                          {p.penempatan || 'Kantor'}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[#EAE9E4]">
                <span className="text-xs font-bold text-[#121214]">{selectedUsers.length} Peserta Terpilih</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowAssignModal(false)}
                    className="px-4 py-2 rounded-full border border-[#EAE9E4] text-xs font-bold hover:bg-[#FAF9F6]"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleSaveAssignment}
                    className="px-5 py-2 rounded-full bg-[#121214] text-white text-xs font-bold hover:bg-neutral-800 shadow-sm"
                  >
                    Tugaskan
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