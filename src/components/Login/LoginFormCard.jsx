import React, { useState } from 'react';
import { 
  User, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  ShieldCheck, 
  AlertTriangle, 
  Clock, 
  ShieldAlert,
  HelpCircle
} from 'lucide-react';

export const LoginFormCard = ({
  uniqueId,
  setUniqueId,
  password,
  setPassword,
  roleDetected,
  loading,
  formError,
  reason,
  handleSubmit,
  handleUniqueIdChange
}) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="w-full max-w-[420px] mx-auto">
      {/* Sleek, Modern, Compact Login Card */}
      <div className="bg-white/95 backdrop-blur-xl rounded-[28px] p-6 sm:p-7 shadow-[0_20px_50px_rgba(0,0,0,0.25)] border border-white/60 relative overflow-hidden transition-all duration-300">
        
        {/* Soft Decorative Ambient Accents */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-[#008F4C]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-[#367C52]/20 rounded-full blur-3xl pointer-events-none" />

        {/* Security Alert Notices */}
        {reason === 'concurrent_session' && (
          <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-3 flex items-start gap-2.5 text-left animate-in fade-in duration-200">
            <div className="w-7 h-7 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 mt-0.5">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold">Login Ganda Terdeteksi</p>
              <p className="text-[11px] text-amber-800 leading-snug mt-0.5">
                Akun Anda terdeteksi aktif di perangkat lain. Sesi pada perangkat ini telah ditutup demi keamanan.
              </p>
            </div>
          </div>
        )}

        {reason === 'idle_timeout' && (
          <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-3 flex items-start gap-2.5 text-left animate-in fade-in duration-200">
            <div className="w-7 h-7 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 mt-0.5">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold">Sesi Berakhir (Inaktivitas)</p>
              <p className="text-[11px] text-amber-800 leading-snug mt-0.5">
                Tidak ada aktivitas selama lebih dari 15 menit. Silakan masuk kembali untuk melanjutkan.
              </p>
            </div>
          </div>
        )}

        {reason === 'session_expired' && (
          <div className="mb-4 bg-neutral-100 border border-neutral-300 text-neutral-800 rounded-2xl p-3 flex items-start gap-2.5 text-left animate-in fade-in duration-200">
            <div className="w-7 h-7 rounded-xl bg-neutral-700 text-white flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold">Masa Sesi Habis</p>
              <p className="text-[11px] text-neutral-600 leading-snug mt-0.5">
                Silakan masukkan kredensial Anda kembali untuk memperbarui sesi.
              </p>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {formError && (
          <div className="mb-4 bg-rose-50 border border-rose-300 text-rose-800 px-3.5 py-2.5 rounded-2xl text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-left relative z-10">
          {/* Email / NIK / Nomor Kepesertaan (KPJ) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label 
                htmlFor="identifier"
                className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wider font-heading"
              >
                Email / NIK / Nomor Kepesertaan (KPJ)
              </label>

              {/* Dynamic Role Badge Indicator */}
              {roleDetected && (
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-[#008F4C] border border-emerald-300 shadow-sm animate-in fade-in">
                  {roleDetected}
                </span>
              )}
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                <User className="h-4 w-4" />
              </div>
              <input
                type="text"
                id="identifier"
                name="identifier"
                required
                value={uniqueId}
                onChange={handleUniqueIdChange}
                className="block w-full pl-10 pr-3.5 py-2.5 bg-neutral-50 hover:bg-neutral-50/80 focus:bg-white border border-neutral-200 focus:border-[#008F4C] rounded-2xl text-xs sm:text-sm font-semibold text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/15 transition-all"
                placeholder="Nomor KPJ / NIK / ID Pengguna"
                autoComplete="username"
                disabled={loading}
              />
            </div>
          </div>

          {/* Kata Sandi */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label 
                htmlFor="password"
                className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wider font-heading"
              >
                Kata Sandi
              </label>
              <a 
                href="#forgot-password"
                onClick={(e) => {
                  e.preventDefault();
                  alert('Untuk pemulihan kata sandi atau reset akun, silakan hubungi Layanan Resmi BPJS Ketenagakerjaan di 175 atau Administrator Instansi Anda.');
                }}
                className="text-[11px] font-medium text-[#008F4C] hover:text-emerald-800 transition-colors"
              >
                Lupa Kata Sandi?
              </a>
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                <Lock className="h-4 w-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-10 pr-10 py-2.5 bg-neutral-50 hover:bg-neutral-50/80 focus:bg-white border border-neutral-200 focus:border-[#008F4C] rounded-2xl text-xs sm:text-sm font-semibold text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/15 transition-all"
                placeholder="Masukkan kata sandi akun Anda"
                autoComplete="current-password"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-400 hover:text-neutral-700 transition-colors cursor-pointer"
                disabled={loading}
                aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Primary Submit Button: Black / Dark Forest Pill CTA (#080B09) */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-[#080B09] hover:bg-neutral-900 active:scale-[0.99] disabled:opacity-60 text-white font-bold py-3 px-5 rounded-full shadow-lg shadow-black/20 hover:shadow-xl transition-all duration-200 flex items-center justify-between group cursor-pointer"
          >
            <span className="text-xs sm:text-sm tracking-wide font-heading font-extrabold pl-2">
              {loading ? 'Memverifikasi Akun...' : 'Masuk Sekarang'}
            </span>

            <div className="w-8 h-8 rounded-full bg-white/15 group-hover:bg-white/25 flex items-center justify-center transition-all duration-200 shrink-0">
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-0.5 transition-transform" />
              )}
            </div>
          </button>
        </form>

        {/* Card Footer Security Indicator */}
        <div className="mt-5 pt-4 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-500 font-medium">
          <span className="flex items-center gap-1.5 text-neutral-600">
            <ShieldCheck className="w-3.5 h-3.5 text-[#008F4C]" />
            Terkoneksi Jaringan Aman SSL
          </span>
          <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
            BPJSTK PROTECTED
          </span>
        </div>
      </div>
    </div>
  );
};

export default LoginFormCard;
