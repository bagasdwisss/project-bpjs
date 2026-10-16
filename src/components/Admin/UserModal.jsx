import React, { useState, useEffect } from 'react';
import { X, User, Lock, Briefcase, Shield, Sparkles } from 'lucide-react';

const UserModal = ({ user, onClose, onSave, coordinators, loading = false }) => {
  const [formData, setFormData] = useState({
    unique_id: '',
    full_name: '',
    role_id: '1',
    coordinator_id: '',
    penempatan: '',
    password: ''
  });

  useEffect(() => {
    if (user) {
      setFormData({
        unique_id: user.unique_id || '',
        full_name: user.full_name || '',
        role_id: user.role_id?.toString() || '1',
        coordinator_id: user.coordinator_id?.toString() || '',
        penempatan: user.penempatan || '',
        password: ''
      });
    } else {
      setFormData({
        unique_id: '',
        full_name: '',
        role_id: '1',
        coordinator_id: '',
        penempatan: '',
        password: ''
      });
    }
  }, [user]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const submitData = { ...formData };
    if (user && !submitData.password) {
      delete submitData.password;
    }
    if (!submitData.penempatan) {
      submitData.penempatan = null;
    }
    onSave(submitData);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="fixed inset-0 bg-[#121214]/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[28px] border border-[#EAE9E4] shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#EAE9E4] flex items-center justify-between">
          <div>
            <h3 className="text-base font-extrabold text-[#121214]">
              {user ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}
            </h3>
            <p className="text-xs text-[#6E6D6A] mt-0.5">
              Kelola kredensial dan hak akses akun BPJS
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#FAF9F6] text-[#121214] hover:bg-[#EAE9E4] flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#121214] uppercase tracking-wider mb-1">
              ID Pengguna
            </label>
            <input
              type="text"
              name="unique_id"
              value={formData.unique_id}
              onChange={handleChange}
              required
              placeholder="e.g. PES001 / KO001 / ADM001"
              className="w-full px-4 py-2.5 bg-[#FAF9F6] border border-[#EAE9E4] rounded-xl text-xs font-semibold text-[#121214] focus:outline-none focus:ring-2 focus:ring-[#121214] focus:bg-white transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#121214] uppercase tracking-wider mb-1">
              Nama Lengkap
            </label>
            <input
              type="text"
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              required
              placeholder="Nama lengkap pengguna"
              className="w-full px-4 py-2.5 bg-[#FAF9F6] border border-[#EAE9E4] rounded-xl text-xs font-semibold text-[#121214] focus:outline-none focus:ring-2 focus:ring-[#121214] focus:bg-white transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#121214] uppercase tracking-wider mb-1">
                Role Akses
              </label>
              <select
                name="role_id"
                value={formData.role_id}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 bg-[#FAF9F6] border border-[#EAE9E4] rounded-xl text-xs font-semibold text-[#121214] focus:outline-none focus:ring-2 focus:ring-[#121214]"
              >
                <option value="1">Peserta</option>
                <option value="2">Koordinator</option>
                <option value="3">Administrator</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#121214] uppercase tracking-wider mb-1">
                Penempatan
              </label>
              <select
                name="penempatan"
                value={formData.penempatan}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 bg-[#FAF9F6] border border-[#EAE9E4] rounded-xl text-xs font-semibold text-[#121214] focus:outline-none focus:ring-2 focus:ring-[#121214]"
              >
                <option value="">Pilih Penempatan</option>
                <option value="kantor">Kantor</option>
                <option value="lapangan">Lapangan</option>
              </select>
            </div>
          </div>

          {formData.role_id === '1' && (
            <div>
              <label className="block text-xs font-bold text-[#121214] uppercase tracking-wider mb-1">
                Koordinator Pembimbing
              </label>
              <select
                value={formData.coordinator_id || ''}
                onChange={(e) => setFormData({...formData, coordinator_id: e.target.value})}
                className="w-full px-4 py-2.5 bg-[#FAF9F6] border border-[#EAE9E4] rounded-xl text-xs font-semibold text-[#121214] focus:outline-none focus:ring-2 focus:ring-[#121214]"
              >
                <option value="">Tidak ada koordinator</option>
                {coordinators.map(c => (
                  <option key={c.user_id} value={c.user_id}>
                    {c.full_name} ({c.unique_id})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-[#121214] uppercase tracking-wider mb-1">
              Kata Sandi {user ? '(Opsional)' : ''}
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder={user ? "Kosongkan jika tidak diubah" : "Default: password123"}
              className="w-full px-4 py-2.5 bg-[#FAF9F6] border border-[#EAE9E4] rounded-xl text-xs font-semibold text-[#121214] focus:outline-none focus:ring-2 focus:ring-[#121214] focus:bg-white transition-all"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-4 flex items-center justify-end gap-2.5 border-t border-[#F0EFEA]">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-full border border-[#EAE9E4] text-xs font-bold text-[#121214] hover:bg-[#F5F4F0] transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-full bg-[#121214] text-white text-xs font-bold hover:bg-neutral-800 transition-colors shadow-sm"
            >
              {user ? 'Simpan Perubahan' : 'Buat Akun'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserModal;