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
              Kelola kredensial dan hak akses akun BPJSTK
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
            <label className="block text-[11px] font-extrabold text-[#121214] uppercase tracking-wider mb-1.5">
              ID Pengguna
            </label>
            <input
              type="text"
              name="unique_id"
              value={formData.unique_id}
              onChange={handleChange}
              required
              placeholder="e.g. PES001 / KO001 / ADM001"
              className="w-full px-4 py-2.5 bg-[#FAF9F6] border-2 border-[#121214] rounded-2xl text-xs font-bold text-[#121214] shadow-[3px_3px_0px_#121214] focus:outline-none focus:bg-white transition-all"
            />
          </div>

          <div>
            <label className="block text-[11px] font-extrabold text-[#121214] uppercase tracking-wider mb-1.5">
              Nama Lengkap
            </label>
            <input
              type="text"
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              required
              placeholder="Nama lengkap pengguna"
              className="w-full px-4 py-2.5 bg-[#FAF9F6] border-2 border-[#121214] rounded-2xl text-xs font-bold text-[#121214] shadow-[3px_3px_0px_#121214] focus:outline-none focus:bg-white transition-all"
            />
          </div>

          {/* Role Akses Segmented Selector */}
          <div>
            <label className="block text-[11px] font-extrabold text-[#121214] uppercase tracking-wider mb-1.5">
              Role Akses Akun
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: '1', label: 'Peserta', badge: 'PES' },
                { id: '2', label: 'Koordinator', badge: 'KO' },
                { id: '3', label: 'Admin', badge: 'ADM' }
              ].map(r => {
                const isActive = formData.role_id === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, role_id: r.id }))}
                    className={`py-2 px-3 rounded-2xl border-2 border-[#121214] text-xs font-bold flex flex-col items-center justify-center gap-0.5 transition-all ${
                      isActive
                        ? 'bg-[#121214] text-white shadow-[3px_3px_0px_#B8C96E]'
                        : 'bg-[#FAF9F6] text-[#121214] shadow-[2px_2px_0px_#121214] hover:bg-[#EAE9E4]'
                    }`}
                  >
                    <span>{r.label}</span>
                    <span className={`text-[9px] uppercase font-mono px-1.5 py-0.2 rounded ${
                      isActive ? 'bg-[#FAF9F6] text-[#121214]' : 'bg-[#EAE9E4] text-[#6E6D6A]'
                    }`}>
                      {r.badge}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Penempatan Segmented Selector */}
          <div>
            <label className="block text-[11px] font-extrabold text-[#121214] uppercase tracking-wider mb-1.5">
              Penempatan Kerja
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'kantor', label: 'Kantor (WFO)', desc: 'Penugasan di Kantor Cabang' },
                { value: 'lapangan', label: 'Lapangan (Survey)', desc: 'Penugasan Luar / Lapangan' }
              ].map(p => {
                const isSelected = formData.penempatan === p.value;
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, penempatan: p.value }))}
                    className={`p-3 rounded-2xl border-2 border-[#121214] text-left transition-all ${
                      isSelected
                        ? 'bg-[#FCE373] text-[#121214] shadow-[3px_3px_0px_#121214] font-black'
                        : 'bg-[#FAF9F6] text-[#121214] shadow-[2px_2px_0px_#121214] hover:bg-white'
                    }`}
                  >
                    <div className="text-xs font-black">{p.label}</div>
                    <div className="text-[10px] text-[#121214]/70 mt-0.5 font-medium">{p.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {formData.role_id === '1' && (
            <div>
              <label className="block text-[11px] font-extrabold text-[#121214] uppercase tracking-wider mb-1.5">
                Koordinator Pembimbing
              </label>
              <select
                value={formData.coordinator_id || ''}
                onChange={(e) => setFormData({...formData, coordinator_id: e.target.value})}
                className="w-full px-4 py-2.5 bg-[#FAF9F6] border-2 border-[#121214] rounded-2xl text-xs font-bold text-[#121214] shadow-[3px_3px_0px_#121214] focus:outline-none focus:bg-white cursor-pointer"
              >
                <option value="">-- Pilih Koordinator Pembimbing --</option>
                {coordinators.map(c => (
                  <option key={c.user_id} value={c.user_id}>
                    {c.full_name} ({c.unique_id})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-extrabold text-[#121214] uppercase tracking-wider mb-1.5">
              Kata Sandi {user ? '(Opsional)' : ''}
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder={user ? "Kosongkan jika tidak ingin mengubah sandi" : "Default: password123"}
              className="w-full px-4 py-2.5 bg-[#FAF9F6] border-2 border-[#121214] rounded-2xl text-xs font-bold text-[#121214] shadow-[3px_3px_0px_#121214] focus:outline-none focus:bg-white transition-all"
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