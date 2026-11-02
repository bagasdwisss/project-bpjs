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
  Info
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
  const [showForgotTip, setShowForgotTip] = useState(false);
  const [isClicked, setIsClicked] = useState(false);

  const handleButtonClick = () => {
    setIsClicked(true);
    setTimeout(() => setIsClicked(false), 850);
  };

  return (
    <div className="w-full max-w-[400px] mx-auto">
      {/* Sleek, Modern, High-Contrast Glassmorphic Login Card */}
      <div className="bg-white/95 backdrop-blur-xl rounded-[24px] sm:rounded-[28px] p-5 sm:p-6 lg:p-7 shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-white/70 relative overflow-hidden transition-all duration-300">
        
        {/* Soft Decorative Ambient Accents */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-[#008F4C]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-[#367C52]/20 rounded-full blur-3xl pointer-events-none" />

        {/* Card Header (Tanpa tulisan portal masuk resmi) */}
        <div className="mb-4 text-left">
          <h2 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight font-heading leading-tight">
            Selamat Datang
          </h2>
          <p className="text-xs text-neutral-500 mt-1">
            Masukkan akun terdaftar Anda untuk melanjutkan
          </p>
        </div>

        {/* Security Alert Notices */}
        {reason === 'concurrent_session' && (
          <div className="mb-3.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-2.5 sm:p-3 flex items-start gap-2.5 text-left animate-in fade-in duration-200">
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 mt-0.5">
              <ShieldAlert className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <div>
              <p className="text-xs font-bold">Login Ganda Terdeteksi</p>
              <p className="text-[11px] text-amber-800 leading-snug mt-0.5">
                Akun aktif di peramban lain. Sesi ini telah ditutup demi keamanan.
              </p>
            </div>
          </div>
        )}

        {reason === 'idle_timeout' && (
          <div className="mb-3.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-2.5 sm:p-3 flex items-start gap-2.5 text-left animate-in fade-in duration-200">
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 mt-0.5">
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <div>
              <p className="text-xs font-bold">Sesi Berakhir (Inaktivitas)</p>
              <p className="text-[11px] text-amber-800 leading-snug mt-0.5">
                Tidak ada aktivitas selama &gt;15 menit. Silakan login kembali.
              </p>
            </div>
          </div>
        )}

        {reason === 'session_expired' && (
          <div className="mb-3.5 bg-neutral-100 border border-neutral-300 text-neutral-800 rounded-2xl p-2.5 sm:p-3 flex items-start gap-2.5 text-left animate-in fade-in duration-200">
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-xl bg-neutral-700 text-white flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <div>
              <p className="text-xs font-bold">Masa Sesi Habis</p>
              <p className="text-[11px] text-neutral-600 leading-snug mt-0.5">
                Silakan masukkan kredensial kembali untuk memperbarui sesi.
              </p>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {formError && (
          <div className="mb-3.5 bg-rose-50 border border-rose-300 text-rose-800 px-3 py-2 rounded-2xl text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150 text-left">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="leading-tight">{formError}</span>
          </div>
        )}

        <form 
          onSubmit={(e) => {
            handleButtonClick();
            handleSubmit(e);
          }} 
          className="space-y-3.5 text-left relative z-10"
        >
          {/* Email / NIK / Nomor Kepesertaan (KPJ) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label 
                htmlFor="identifier"
                className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wider font-heading"
              >
                ID Pengguna / NIK / KPJ
              </label>

              {/* Dynamic Role Badge Indicator */}
              {roleDetected && (
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-[#008F4C] border border-emerald-300 shadow-xs animate-in fade-in">
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
                className="block w-full pl-10 pr-3.5 py-2.5 sm:py-3 bg-neutral-50/90 hover:bg-neutral-50 focus:bg-white border border-neutral-300 focus:border-[#008F4C] rounded-2xl text-base sm:text-sm font-semibold text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/15 transition-all shadow-xs"
                placeholder="Nomor KPJ / NIK / ID Akun"
                autoComplete="username"
                disabled={loading}
              />
            </div>
          </div>

          {/* Kata Sandi */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label 
                htmlFor="password"
                className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wider font-heading"
              >
                Kata Sandi
              </label>
              <button 
                type="button"
                onClick={() => setShowForgotTip(!showForgotTip)}
                className="text-[11px] font-semibold text-[#008F4C] hover:text-emerald-800 transition-colors cursor-pointer"
              >
                Lupa Sandi?
              </button>
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
                className="block w-full pl-10 pr-10 py-2.5 sm:py-3 bg-neutral-50/90 hover:bg-neutral-50 focus:bg-white border border-neutral-300 focus:border-[#008F4C] rounded-2xl text-base sm:text-sm font-semibold text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/15 transition-all shadow-xs"
                placeholder="Masukkan kata sandi"
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

            {/* Collapsible Forgot Password Tip */}
            {showForgotTip && (
              <div className="mt-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-900 flex items-start gap-2 animate-in fade-in duration-150">
                <Info className="w-4 h-4 text-[#008F4C] shrink-0 mt-0.5" />
                <p className="leading-snug">
                  Untuk reset kata sandi, silakan hubungi <strong>Layanan Resmi 175</strong> atau Administrator instansi Anda.
                </p>
              </div>
            )}
          </div>

          {/* Primary Submit Button: Signature Dark Forest Pill CTA (#080B09) */}
          <button
            type="submit"
            disabled={loading}
            onClick={handleButtonClick}
            className={`w-full mt-2 bg-[#080B09] hover:bg-neutral-900 active:scale-[0.98] disabled:opacity-85 text-white font-bold py-3 sm:py-3.5 px-5 rounded-full shadow-lg shadow-black/20 hover:shadow-xl transition-all duration-300 flex items-center justify-between group cursor-pointer relative overflow-hidden select-none ${
              isClicked || loading ? 'ring-2 ring-emerald-500/50 shadow-emerald-950/20' : ''
            }`}
          >
            {/* Subtle glow / light sweep when clicked */}
            {(isClicked || loading) && (
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
            )}

            <span className="text-xs sm:text-sm tracking-wide font-heading font-extrabold pl-1 transition-all duration-300 relative z-10">
              {loading ? 'Memverifikasi Akun...' : 'Masuk Sekarang'}
            </span>

            <div 
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all duration-300 shrink-0 relative overflow-hidden z-10 ${
                isClicked || loading
                  ? 'bg-[#FCE373] text-[#121214] translate-x-1 shadow-sm'
                  : 'bg-white/15 text-white'
              }`}
            >
              <ArrowRight
                className={`w-4 h-4 transition-transform duration-300 ${
                  loading
                    ? 'animate-arrow-loading text-[#121214]'
                    : isClicked
                      ? 'animate-arrow-click-right text-[#121214]'
                      : 'text-white'
                }`}
              />
            </div>
          </button>
        </form>

        {/* Card Footer Security Indicator */}
        <div className="mt-4 pt-3.5 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-500 font-medium">
          <span className="flex items-center gap-1.5 text-neutral-600">
            <ShieldCheck className="w-3.5 h-3.5 text-[#008F4C]" />
            Jaringan Aman SSL 256-Bit
          </span>
          <span className="text-[10px] font-bold text-[#008F4C] uppercase tracking-wider">
            BPJSTK RESMI
          </span>
        </div>
      </div>
    </div>
  );
};

export default LoginFormCard;
