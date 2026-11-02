import React, { useState } from 'react';
import { 
  X, 
  User, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  ShieldCheck, 
  ShieldAlert, 
  Clock, 
  AlertTriangle,
  Sparkles
} from 'lucide-react';
import logo from '../../assets/27102023_091008_dorong_universal.png';

/**
 * LoginModal - Production-grade authentication modal dialog
 * Integrated with BPJS Ketenagakerjaan Multi-Role Authentication
 */
export default function LoginModal({
  isOpen,
  onClose,
  uniqueId,
  setUniqueId,
  password,
  setPassword,
  roleDetected,
  setRoleDetected,
  formError,
  setFormError,
  loading,
  onSubmit,
  reason
}) {
  const [showPassword, setShowPassword] = useState(false);

  if (!isOpen) return null;

  const detectRole = (id) => {
    if (id.startsWith('PES')) return 'Peserta';
    if (id.startsWith('KO')) return 'Koordinator';
    if (id.startsWith('ADM')) return 'Administrator';
    return '';
  };

  const handleIdChange = (e) => {
    const val = e.target.value.toUpperCase();
    setUniqueId(val);
    setRoleDetected(detectRole(val));
    if (formError) setFormError('');
  };

  const handleQuickFill = (id, pass) => {
    setUniqueId(id);
    setPassword(pass);
    setRoleDetected(detectRole(id));
    if (formError) setFormError('');
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="w-full max-w-md bg-white rounded-[26px] border-2 border-[#121214] shadow-[8px_8px_0px_#121214] p-6 sm:p-7 relative overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle Pastel Accents */}
        <div className="absolute -top-10 -right-10 w-28 h-28 bg-[#B8C96E]/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-28 h-28 bg-[#FCE373]/25 rounded-full blur-2xl pointer-events-none" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#FAF9F6] border border-[#EAE9E4] hover:bg-neutral-200 flex items-center justify-center text-[#121214] transition-colors cursor-pointer"
          aria-label="Tutup Modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Brand Header */}
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-xl bg-[#397C50] flex items-center justify-center p-1.5 shadow-sm">
            <img src={logo} alt="BPJSTK Logo" className="w-full h-full object-contain brightness-0 invert" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm text-[#121214]" style={{ fontFamily: "var(--font-heading)" }}>
                KINORA
              </span>
              <span className="text-[9px] font-bold uppercase tracking-wider bg-[#121214] text-white px-2 py-0.5 rounded-full">
                BPJSTK
              </span>
            </div>
            <p className="text-[11px] text-[#6E6D6A]">Portal Sistem Absensi & Penilaian</p>
          </div>
        </div>

        {/* Reason Alerts */}
        {reason === 'concurrent_session' && (
          <div className="mb-4 bg-[#F5C6EC]/40 border-2 border-[#121214] rounded-2xl p-3 flex items-start gap-2.5 shadow-[2px_2px_0px_#121214]">
            <ShieldAlert className="w-4 h-4 text-[#121214] shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] font-black text-[#121214]">Login Ganda Terdeteksi</p>
              <p className="text-[10px] text-[#121214]/80">Akun terdeteksi masuk di perangkat lain. Sesi ini telah ditutup demi keamanan.</p>
            </div>
          </div>
        )}

        {reason === 'idle_timeout' && (
          <div className="mb-4 bg-[#FCE373]/40 border-2 border-[#121214] rounded-2xl p-3 flex items-start gap-2.5 shadow-[2px_2px_0px_#121214]">
            <Clock className="w-4 h-4 text-[#121214] shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] font-black text-[#121214]">Sesi Berakhir (Inaktivitas)</p>
              <p className="text-[10px] text-[#121214]/80">Tidak ada interaksi selama &gt;15 menit. Silakan masuk kembali.</p>
            </div>
          </div>
        )}

        {reason === 'session_expired' && (
          <div className="mb-4 bg-amber-50 border-2 border-[#121214] rounded-2xl p-3 flex items-start gap-2.5 shadow-[2px_2px_0px_#121214]">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] font-black text-[#121214]">Masa Sesi Habis</p>
              <p className="text-[10px] text-[#121214]/80">Silakan masukkan kembali kredensial Anda.</p>
            </div>
          </div>
        )}

        {/* Error Notification */}
        {formError && (
          <div className="mb-4 bg-rose-50 border-2 border-rose-500 text-rose-700 px-3.5 py-2.5 rounded-xl text-[11px] font-bold shadow-[2px_2px_0px_#e11d48]">
            {formError}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={onSubmit} className="space-y-3.5">
          {/* Unique ID */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-extrabold text-[#121214] uppercase tracking-wider">
                ID Pengguna
              </label>
              {roleDetected && (
                <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border border-[#121214] ${
                  roleDetected === 'Administrator' ? 'bg-[#F5C6EC] text-[#121214]' :
                  roleDetected === 'Koordinator' ? 'bg-[#FCE373] text-[#121214]' :
                  'bg-[#BDD4F2] text-[#121214]'
                }`}>
                  {roleDetected}
                </span>
              )}
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#121214]">
                <User className="h-4 w-4" />
              </div>
              <input
                type="text"
                required
                value={uniqueId}
                onChange={handleIdChange}
                placeholder="Contoh: PES001 / KO001 / ADM001"
                disabled={loading}
                className="w-full pl-9 pr-3 py-2 bg-[#FAF9F6] border-2 border-[#121214] rounded-xl text-xs font-bold text-[#121214] placeholder-[#A09F9B] shadow-[2px_2px_0px_#121214] focus:outline-none focus:bg-white focus:shadow-[3px_3px_0px_#121214] transition-all"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-[10px] font-extrabold text-[#121214] uppercase tracking-wider mb-1">
              Kata Sandi
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#121214]">
                <Lock className="h-4 w-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan kata sandi akun"
                disabled={loading}
                className="w-full pl-9 pr-9 py-2 bg-[#FAF9F6] border-2 border-[#121214] rounded-xl text-xs font-bold text-[#121214] placeholder-[#A09F9B] shadow-[2px_2px_0px_#121214] focus:outline-none focus:bg-white focus:shadow-[3px_3px_0px_#121214] transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#121214] hover:opacity-75 cursor-pointer"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Quick Demo Credentials */}
          <div className="pt-1">
            <span className="text-[10px] font-bold text-[#6E6D6A] block mb-1.5">
              Akses Cepat Pengujian (1-Klik):
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => handleQuickFill('PES001', 'password123')}
                className="text-[10px] font-bold bg-[#BDD4F2]/50 hover:bg-[#BDD4F2] border border-[#121214] text-[#121214] px-2 py-0.5 rounded-lg cursor-pointer transition-colors"
              >
                PES001 (Arthur)
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('KO001', 'password123')}
                className="text-[10px] font-bold bg-[#FCE373]/60 hover:bg-[#FCE373] border border-[#121214] text-[#121214] px-2 py-0.5 rounded-lg cursor-pointer transition-colors"
              >
                KO001 (Fedro)
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('ADM001', 'password123')}
                className="text-[10px] font-bold bg-[#F5C6EC]/60 hover:bg-[#F5C6EC] border border-[#121214] text-[#121214] px-2 py-0.5 rounded-lg cursor-pointer transition-colors"
              >
                ADM001 (Admin)
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-[#121214] hover:bg-neutral-800 active:translate-y-0.5 disabled:opacity-50 text-white font-extrabold py-2.5 px-4 rounded-xl border-2 border-[#121214] shadow-[3px_3px_0px_#121214] hover:shadow-[4px_4px_0px_#121214] transition-all flex items-center justify-center gap-2 text-xs cursor-pointer"
          >
            {loading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Memverifikasi Akun...</span>
              </>
            ) : (
              <>
                <span>Masuk ke Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        {/* Footer info */}
        <div className="mt-4 pt-3 border-t border-[#F0EFEA] flex items-center justify-between text-[10px] text-[#6E6D6A]">
          <span className="flex items-center gap-1 font-medium">
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            Terotentikasi & Aman
          </span>
          <span>© {new Date().getFullYear()} BPJSTK</span>
        </div>
      </div>
    </div>
  );
}
