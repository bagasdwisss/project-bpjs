// src/components/Common/SecurityPinModal.jsx - Two-Person Rule & Master Security PIN Modal
import React, { useState } from 'react';
import { ShieldAlert, X, Lock, CheckCircle, AlertTriangle } from 'lucide-react';
import api from '../../services/api';

const SecurityPinModal = ({ isOpen, onClose, onSuccess, title = 'Otorisasi Tindakan Berisiko Tinggi', actionDescription }) => {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (pin.length < 4) {
      setErrorMsg('Masukkan minimal 6-digit PIN Keamanan Master.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await api.post('/admin/security/verify-pin', { pin });
      if (res.data?.success) {
        onSuccess();
        onClose();
      } else {
        setErrorMsg(res.data?.message || 'PIN Keamanan Master salah.');
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'PIN Keamanan Master tidak valid.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-2xl border-2 border-[#121214] shadow-[8px_8px_0px_#121214] overflow-hidden">
        
        {/* Header */}
        <div className="bg-[#F5C6EC] border-b-2 border-[#121214] p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#121214] text-white flex items-center justify-center shrink-0">
              <ShieldAlert className="w-4 h-4 text-[#F5C6EC]" />
            </div>
            <div>
              <h3 className="font-black text-sm text-[#121214]">{title}</h3>
              <p className="text-[10px] text-[#121214]/80 font-bold uppercase tracking-wider">Aturan Kontrol Ganda (Two-Person Rule)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-black/10 text-[#121214] transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-[#F5F4F0] p-3 rounded-xl border border-[#121214] text-xs text-gray-700 leading-relaxed font-medium">
            <span className="font-black text-[#121214] block mb-1">Peringatan Keamanan:</span>
            {actionDescription || 'Tindakan ini memiliki dampak tinggi pada integritas data BPJSTK. Wajib memasukkan PIN Keamanan Master administratif untuk melanjutkan.'}
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-black text-[#121214]">
              PIN Keamanan Master (6 Digit)
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                maxLength={10}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="••••••"
                autoFocus
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border-2 border-[#121214] text-center font-mono font-black tracking-widest text-lg focus:outline-none focus:ring-2 focus:ring-[#F5C6EC]"
              />
            </div>
            <p className="text-[10px] text-gray-500 font-medium">
              Default master development: <span className="font-mono font-bold text-[#121214]">123456</span>
            </p>
          </div>

          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-rose-100 border border-rose-300 text-rose-800 text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 py-2.5 rounded-xl border-2 border-[#121214] font-black text-xs text-[#121214] bg-white hover:bg-gray-100 transition-all"
            >
              Batalkan
            </button>
            <button
              type="submit"
              disabled={loading || pin.length < 4}
              className="w-1/2 py-2.5 rounded-xl border-2 border-[#121214] font-black text-xs text-[#121214] bg-[#F5C6EC] hover:bg-[#e7b4dc] shadow-[2px_2px_0px_#121214] active:translate-x-[1px] active:translate-y-[1px] disabled:opacity-50 transition-all"
            >
              {loading ? 'Memverifikasi...' : 'Otorisasi Tindakan'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

export default SecurityPinModal;
