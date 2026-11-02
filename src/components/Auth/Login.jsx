import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { 
  HardHat,
  HeartHandshake,
  Wallet,
  ShieldCheck,
  Briefcase,
  ArrowRight, 
  User, 
  Lock, 
  Eye, 
  EyeOff, 
  ShieldAlert, 
  Clock, 
  AlertTriangle
} from 'lucide-react';
import logo from '../../assets/27102023_091008_dorong_universal.png';
import workersHeroHd from '../../assets/bpjs_workers_hd.jpg';
import PageLoader from '../Common/PageLoader';

const Login = () => {
  const [searchParams] = useSearchParams();
  const reason = searchParams.get('reason');

  const [uniqueId, setUniqueId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [roleDetected, setRoleDetected] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');

  const { user, login, error, clearError, isAuthenticated } = useContext(AuthContext);
  const navigate = useNavigate();

  // Redirect pengguna setelah autentikasi berhasil sesuai role
  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role_id === 1 || user.role === 'Peserta') {
        navigate('/participant/dashboard', { replace: true });
      } else if (user.role_id === 2 || user.role === 'Koordinator') {
        navigate('/coordinator/dashboard', { replace: true });
      } else if (user.role_id === 3 || user.role === 'Administrator') {
        navigate('/admin/dashboard', { replace: true });
      } else {
        navigate('/participant/dashboard', { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate]);

  const detectRole = (id) => {
    if (id.startsWith('PES')) return 'Peserta';
    if (id.startsWith('KO')) return 'Koordinator';
    if (id.startsWith('ADM')) return 'Administrator';
    return '';
  };

  const handleUniqueIdChange = (e) => {
    const value = e.target.value.toUpperCase();
    setUniqueId(value);
    setRoleDetected(detectRole(value));
    setFormError('');
    clearError();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    clearError();

    if (!uniqueId.trim()) {
      setFormError('ID Pengguna wajib diisi.');
      return;
    }

    if (!password) {
      setFormError('Kata Sandi wajib diisi.');
      return;
    }

    setLoading(true);

    try {
      const result = await login(uniqueId.trim(), password);
      if (!result.success) {
        setFormError(result.message || 'ID Pengguna atau Kata Sandi salah.');
      }
    } catch (err) {
      setFormError(err.message || 'Koneksi ke server terputus.');
    } finally {
      setLoading(false);
    }
  };

  if (isAuthenticated) {
    return <PageLoader text="Memuat Halaman Portal..." />;
  }

  return (
    <div 
      className="relative min-h-[100svh] w-full bg-[#397C50] text-white overflow-x-hidden md:overflow-hidden flex flex-col justify-between select-none"
      style={{ fontFamily: "var(--font-body, Inter, sans-serif)" }}
    >
      {/* ============================================================== */}
      {/* 04. BACKGROUND WORKER ANIMATION — EXTRA SUPER HD & ADULTS ONLY */}
      {/* ============================================================== */}
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none select-none z-0">
        <img
          src={workersHeroHd}
          alt="Barisan Pekerja Dewasa BPJS Ketenagakerjaan Extra Super HD"
          className="absolute inset-0 w-full h-full object-cover object-bottom animate-worker-hd"
          style={{ 
            objectPosition: 'center bottom',
            backfaceVisibility: 'hidden',
            transform: 'translateZ(0)',
            filter: 'contrast(1.04) saturate(1.05)'
          }}
        />

        {/* Subtle Green Contrast Overlay */}
        <div 
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(180deg, rgba(15, 65, 37, 0.40) 0%, rgba(25, 95, 52, 0.15) 48%, rgba(15, 65, 37, 0.10) 100%)'
          }}
        />

        {/* Subtle radial lighting for readability */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[720px] h-[340px] bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* ============================================================== */}
      {/* 05. NAVBAR (TOP HEADER WITH OFFICIAL LOGO)                     */}
      {/* ============================================================== */}
      <header className="relative z-20 w-full px-5 py-4 sm:px-8 sm:py-5 lg:px-12 flex items-center justify-between animate-hero-nav">
        {/* Left: Official BPJS Ketenagakerjaan Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/95 p-1 flex items-center justify-center shadow-sm">
            <img 
              src={logo} 
              alt="Logo Resmi BPJS Ketenagakerjaan" 
              className="w-full h-full object-contain" 
            />
          </div>
          <div className="flex flex-col text-left">
            <span 
              className="text-white text-sm sm:text-[15px] font-bold tracking-[-0.03em] leading-tight"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              BPJS Ketenagakerjaan
            </span>
            <span className="text-[9px] font-medium text-white/80 tracking-wider uppercase">
              Republik Indonesia
            </span>
          </div>
        </div>

        {/* Center: Program Pillars (Desktop Only) */}
        <div className="hidden lg:flex items-center gap-6 text-[11px] font-normal text-white/80">
          <span className="hover:text-white transition-opacity cursor-default">Jaminan Kecelakaan Kerja</span>
          <span className="hover:text-white transition-opacity cursor-default">Jaminan Hari Tua</span>
          <span className="hover:text-white transition-opacity cursor-default">Jaminan Pensiun</span>
          <span className="hover:text-white transition-opacity cursor-default">Bukan Penerima Upah</span>
        </div>

        {/* Right: Official Portal Badge */}
        <div>
          <div className="bg-white/15 backdrop-blur-md text-white rounded-full px-3.5 py-1.5 sm:px-4 sm:py-2 text-[10px] sm:text-[11px] font-medium border border-white/20 shadow-sm flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FCE373] animate-ping" />
            <span>Portal Layanan Resmi</span>
          </div>
        </div>
      </header>

      {/* ============================================================== */}
      {/* 06. HERO CONTENT & DIRECTLY INTEGRATED LOGIN FORM              */}
      {/* ============================================================== */}
      <main className="relative z-10 w-full max-w-2xl mx-auto px-4 pt-1 sm:pt-4 pb-12 sm:pb-24 flex-1 flex flex-col items-center justify-start text-center">
        
        {/* A. FIVE PROGRAM ICON ROW */}
        <div className="flex items-center gap-[6px] mb-2 sm:mb-3 animate-hero-icons">
          <div 
            title="Jaminan Kecelakaan Kerja (JKK)"
            className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center border border-white/40 shadow-xs hover:scale-105 transition-transform"
          >
            <HardHat className="w-3.5 h-3.5 text-[#1F5E3B]" />
          </div>
          <div 
            title="Jaminan Kematian (JKM)"
            className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center border border-white/40 shadow-xs hover:scale-105 transition-transform"
          >
            <HeartHandshake className="w-3.5 h-3.5 text-[#1F5E3B]" />
          </div>
          <div 
            title="Jaminan Hari Tua (JHT)"
            className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center border border-white/40 shadow-xs hover:scale-105 transition-transform"
          >
            <Wallet className="w-3.5 h-3.5 text-[#1F5E3B]" />
          </div>
          <div 
            title="Jaminan Pensiun (JP)"
            className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center border border-white/40 shadow-xs hover:scale-105 transition-transform"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#1F5E3B]" />
          </div>
          <div 
            title="Jaminan Kehilangan Pekerjaan (JKP)"
            className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center border border-white/40 shadow-xs hover:scale-105 transition-transform"
          >
            <Briefcase className="w-3.5 h-3.5 text-[#1F5E3B]" />
          </div>
        </div>

        {/* B. MAIN HEADLINE (TAGLINE) */}
        <h1 
          className="text-white uppercase font-extrabold tracking-[-0.045em] leading-[1.05] max-w-[760px] text-center drop-shadow-sm animate-hero-headline"
          style={{ 
            fontFamily: "var(--font-heading)",
            fontSize: 'clamp(28px, 4.8vw, 44px)'
          }}
        >
          Kerja Keras <br className="hidden sm:inline" />
          <span className="text-[#FCE373]">Bebas Cemas</span>
        </h1>

        {/* C. SUBHEADING */}
        <p className="text-white/85 text-[11px] sm:text-xs font-normal leading-[1.6] max-w-[480px] mt-2 text-center animate-hero-subheading">
          Perlindungan jaminan sosial ketenagakerjaan yang menyeluruh bagi seluruh pekerja Indonesia, baik sektor formal maupun informal.
        </p>

        {/* D. INTEGRATED LOGIN FORM (NO DEMO TEST BUTTONS) */}
        <div className="w-full max-w-[360px] mx-auto mt-3 sm:mt-4 p-4 sm:p-5 rounded-2xl bg-black/35 backdrop-blur-md border border-white/20 shadow-2xl text-left animate-hero-form">
          
          {/* Form Header Info */}
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/10">
            <span className="text-[11px] font-bold text-white tracking-wide">
              Masuk ke Akun Portal
            </span>
            {roleDetected && (
              <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border border-white/30 ${
                roleDetected === 'Administrator' ? 'bg-[#F5C6EC] text-[#121214]' :
                roleDetected === 'Koordinator' ? 'bg-[#FCE373] text-[#121214]' :
                'bg-[#BDD4F2] text-[#121214]'
              }`}>
                {roleDetected}
              </span>
            )}
          </div>

          {/* Session Alerts */}
          {reason === 'concurrent_session' && (
            <div className="mb-3 bg-[#F5C6EC]/30 border border-[#F5C6EC]/60 rounded-xl p-2.5 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-[#F5C6EC] shrink-0 mt-0.5" />
              <p className="text-[11px] text-white leading-tight">Login ganda terdeteksi. Sesi di peramban ini telah ditutup demi keamanan.</p>
            </div>
          )}

          {reason === 'idle_timeout' && (
            <div className="mb-3 bg-[#FCE373]/30 border border-[#FCE373]/60 rounded-xl p-2.5 flex items-start gap-2">
              <Clock className="w-4 h-4 text-[#FCE373] shrink-0 mt-0.5" />
              <p className="text-[11px] text-white leading-tight">Sesi berakhir karena inaktivitas &gt;15 menit. Silakan masuk kembali.</p>
            </div>
          )}

          {reason === 'session_expired' && (
            <div className="mb-3 bg-amber-500/30 border border-amber-400/60 rounded-xl p-2.5 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
              <p className="text-[11px] text-white leading-tight">Masa berlaku sesi telah kadaluwarsa. Silakan login kembali.</p>
            </div>
          )}

          {/* Error Notice */}
          {(formError || error) && (
            <div className="mb-3 bg-rose-500/30 border border-rose-400/60 text-white px-3 py-2 rounded-xl text-[11px] font-semibold">
              {formError || error}
            </div>
          )}

          {/* Login Form Fields */}
          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Unique ID */}
            <div>
              <label className="block text-[10px] font-bold text-white/90 uppercase tracking-wider mb-1">
                ID Pengguna
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-white/60">
                  <User className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  required
                  value={uniqueId}
                  onChange={handleUniqueIdChange}
                  placeholder="ID Pengguna (PES / KO / ADM)"
                  disabled={loading}
                  className="w-full pl-9 pr-3 py-2 bg-white/10 focus:bg-white/20 border border-white/25 focus:border-[#FCE373] rounded-xl text-xs font-semibold text-white placeholder-white/50 shadow-inner focus:outline-none transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-[10px] font-bold text-white/90 uppercase tracking-wider mb-1">
                Kata Sandi
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-white/60">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi"
                  disabled={loading}
                  className="w-full pl-9 pr-9 py-2 bg-white/10 focus:bg-white/20 border border-white/25 focus:border-[#FCE373] rounded-xl text-xs font-semibold text-white placeholder-white/50 shadow-inner focus:outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-white/70 hover:text-white cursor-pointer"
                  aria-label={showPassword ? 'Sembunyikan Kata Sandi' : 'Tampilkan Kata Sandi'}
                >
                  {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            {/* Signature Black Pill Submit Button */}
            <div className="pt-1">
              <button
                type="submit"
                disabled={loading}
                className="w-full group bg-[#080B09] hover:bg-neutral-900 active:scale-95 disabled:opacity-60 text-white text-xs font-semibold rounded-full py-2.5 px-5 inline-flex items-center justify-center gap-2.5 shadow-xl hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                style={{ borderRadius: '999px' }}
              >
                {loading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Memverifikasi Akun...</span>
                  </>
                ) : (
                  <>
                    <span>Masuk ke Dashboard</span>
                    <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-[#FCE373] group-hover:text-[#121214] transition-colors">
                      <ArrowRight className="w-3 h-3" />
                    </div>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Secure SSL Tag */}
          <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-[10px] text-white/70">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-300" />
              Sistem Resmi Terotentikasi
            </span>
            <span className="font-semibold text-white/90">BPJSTK</span>
          </div>
        </div>
      </main>

      {/* Invisible spacer on desktop to preserve bottom crowd headroom */}
      <div className="relative z-10 w-full h-4 sm:h-8 pointer-events-none" />
    </div>
  );
};

export default Login;
