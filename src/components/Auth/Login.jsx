import React, { useState, useContext, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { 
  User, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  ShieldCheck, 
  ShieldAlert, 
  Clock, 
  AlertTriangle,
  HardHat,
  Briefcase,
  Building2,
  Sparkles,
  Users,
  CheckCircle2
} from 'lucide-react';
import logo from '../../assets/27102023_091008_dorong_universal.png';
import PageLoader from '../Common/PageLoader';

/**
 * The 15 official worker profession segments requested by BPJS Ketenagakerjaan
 */
const WORKER_PROFESSIONS = [
  { name: 'Karyawan swasta', sector: 'Penerima Upah (PU)' },
  { name: 'Pegawai perusahaan BUMN dan BUMD', sector: 'Penerima Upah (PU)' },
  { name: 'Pegawai pabrik dan industri', sector: 'Penerima Upah (PU)' },
  { name: 'Pegawai toko, supermarket, dan restoran', sector: 'Penerima Upah (PU)' },
  { name: 'Satpam dan petugas kebersihan', sector: 'Penerima Upah (PU)' },
  { name: 'Karyawan kantor', sector: 'Penerima Upah (PU)' },
  { name: 'Pekerja kontrak maupun tetap', sector: 'Penerima Upah (PU)' },
  { name: 'Pegawai yayasan dan lembaga', sector: 'Penerima Upah (PU)' },
  { name: 'Tukang bangunan', sector: 'Jasa Konstruksi (Jakon)' },
  { name: 'Mandor proyek', sector: 'Jasa Konstruksi (Jakon)' },
  { name: 'Pekerja proyek pembangunan gedung', sector: 'Jasa Konstruksi (Jakon)' },
  { name: 'Pekerja pembangunan jalan dan jembatan', sector: 'Jasa Konstruksi (Jakon)' },
  { name: 'Teknisi konstruksi', sector: 'Jasa Konstruksi (Jakon)' },
  { name: 'Operator alat berat', sector: 'Jasa Konstruksi (Jakon)' },
  { name: 'Pekerja renovasi bangunan', sector: 'Jasa Konstruksi (Jakon)' }
];

const Login = () => {
  const [searchParams] = useSearchParams();
  const reason = searchParams.get('reason');

  const [uniqueId, setUniqueId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [roleDetected, setRoleDetected] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');

  // Active rotating profession index for dynamic headline badge
  const [activeProfessionIdx, setActiveProfessionIdx] = useState(0);

  const { user, login, error, clearError, isAuthenticated } = useContext(AuthContext);
  const navigate = useNavigate();

  // Rotate through the 15 professions every 2.4 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveProfessionIdx((prev) => (prev + 1) % WORKER_PROFESSIONS.length);
    }, 2400);
    return () => clearInterval(timer);
  }, []);

  // Redirect after authentication
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

  const handleQuickFill = (id, pass) => {
    setUniqueId(id);
    setPassword(pass);
    setRoleDetected(detectRole(id));
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

  const currentProf = WORKER_PROFESSIONS[activeProfessionIdx];

  return (
    <div className="relative min-h-screen w-full bg-[#397C50] text-[#121214] overflow-x-hidden flex flex-col justify-between select-none">
      {/* 1. BACKGROUND VIDEO (Directly embedded on the login page) */}
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none select-none z-0">
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          className="absolute inset-0 w-full h-full object-cover object-bottom"
          style={{ objectPosition: 'center bottom' }}
        >
          <source 
            src="https://res.cloudinary.com/uobghqwu/video/upload/v1793506197/Characters_waving_in_animation_f349ac66_t1.7-8_1080p.mp4" 
            type="video/mp4" 
          />
        </video>

        {/* Soft Green Gradient Overlay for High Readability */}
        <div 
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(180deg, rgba(23, 77, 47, 0.90) 0%, rgba(30, 95, 58, 0.72) 45%, rgba(15, 65, 37, 0.40) 100%)'
          }}
        />
      </div>

      {/* 2. TOP FLOATING BRAND BAR */}
      <header className="relative z-10 w-full px-5 py-4 sm:px-8 sm:py-5 lg:px-12 flex items-center justify-between">
        <div className="inline-flex items-center gap-3 bg-white/15 backdrop-blur-md border border-white/25 px-4 py-2 rounded-full shadow-sm text-white">
          <div className="w-6 h-6 rounded-lg bg-white/20 p-1 flex items-center justify-center shrink-0">
            <img src={logo} alt="BPJS Logo" className="w-full h-full object-contain brightness-0 invert" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-sm tracking-tight text-white" style={{ fontFamily: "var(--font-heading)" }}>
              BPJS Ketenagakerjaan
            </span>
            <span className="text-[9px] font-bold uppercase tracking-wider bg-white text-[#154627] px-2 py-0.5 rounded-full shadow-xs">
              Portal Resmi
            </span>
          </div>
        </div>

        {/* Live Protection Counter Pill */}
        <div className="hidden md:inline-flex items-center gap-2 bg-black/25 backdrop-blur-md border border-white/20 px-3.5 py-1.5 rounded-full text-white/90 text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          <span>Melindungi Seluruh Pekerja Indonesia</span>
        </div>
      </header>

      {/* 3. MAIN HERO CONTENT & DIRECT LOGIN FORM */}
      <main className="relative z-10 w-full max-w-7xl mx-auto px-5 py-6 sm:px-8 sm:py-8 lg:px-12 flex-1 flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* LEFT COLUMN: TAGLINE & THE 15 WORKER SECTORS */}
          <div className="lg:col-span-7 text-white space-y-5 text-center lg:text-left">
            {/* Dynamic Rotating Profession Badge */}
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md border border-white/30 px-3.5 py-1.5 rounded-full text-xs font-bold shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-[#FCE373]" />
              <span className="text-white/80">Melindungi:</span>
              <span className="text-[#FCE373] font-black underline decoration-wavy decoration-[#FCE373]/60 transition-all duration-300">
                {currentProf.name}
              </span>
            </div>

            {/* MAIN TAGLINE */}
            <h1 
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold uppercase tracking-tight text-white leading-[1.08] drop-shadow-sm"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Kerja Keras <br className="hidden sm:inline" />
              <span className="text-[#FCE373]">Bebas Cemas</span>
            </h1>

            {/* Sub-description */}
            <p className="text-sm sm:text-base text-white/90 max-w-xl font-normal leading-relaxed mx-auto lg:mx-0">
              Sistem Informasi Absensi & Penilaian Magang Terpadu. Menjamin perlindungan jaminan sosial ketenagakerjaan bagi seluruh pekerja sektor formal, informal, hingga jasa konstruksi.
            </p>

            {/* Quick Segment Showcase Badges */}
            <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <div className="bg-white/10 backdrop-blur-md border border-white/20 p-3 rounded-2xl flex items-start gap-2.5 max-w-xs text-left">
                <Briefcase className="w-4 h-4 text-[#FCE373] shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-white">Sektor Penerima Upah (PU)</p>
                  <p className="text-[11px] text-white/75 mt-0.5 leading-snug">
                    Karyawan swasta, BUMN/BUMD, pabrik, toko/restoran, satpam, dan yayasan.
                  </p>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-md border border-white/20 p-3 rounded-2xl flex items-start gap-2.5 max-w-xs text-left">
                <HardHat className="w-4 h-4 text-[#BDD4F2] shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-white">Sektor Jasa Konstruksi (Jakon)</p>
                  <p className="text-[11px] text-white/75 mt-0.5 leading-snug">
                    Tukang bangunan, mandor, proyek jalan/gedung, teknisi, dan operator alat berat.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: DIRECT LOGIN CARD (No Popup Modal Needed!) */}
          <div className="lg:col-span-5 w-full max-w-md mx-auto">
            <div className="bg-white rounded-[26px] border-2 border-[#121214] shadow-[8px_8px_0px_#121214] p-6 sm:p-7 relative overflow-hidden">
              
              {/* Subtle Decorative Pastel Glows */}
              <div className="absolute -top-10 -right-10 w-28 h-28 bg-[#FCE373]/25 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -bottom-10 -left-10 w-28 h-28 bg-[#F5C6EC]/25 rounded-full blur-2xl pointer-events-none" />

              {/* Card Header */}
              <div className="mb-5 text-left">
                <div className="inline-flex items-center gap-2 bg-[#F5F4F0] border border-[#EAE9E4] px-3 py-1 rounded-full text-[11px] font-bold text-[#121214] mb-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>Portal Masuk Sistem</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-[#121214] tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>
                  Selamat Datang
                </h2>
                <p className="text-xs text-[#6E6D6A] mt-0.5">
                  Masukkan ID Pengguna dan Kata Sandi akun Anda
                </p>
              </div>

              {/* Alert: Concurrent Session */}
              {reason === 'concurrent_session' && (
                <div className="mb-4 bg-[#F5C6EC]/40 border-2 border-[#121214] rounded-2xl p-3 flex items-start gap-2.5 shadow-[2px_2px_0px_#121214]">
                  <ShieldAlert className="w-4 h-4 text-[#121214] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-black text-[#121214]">Login Ganda Terdeteksi</p>
                    <p className="text-[11px] text-[#121214]/80">Akun Anda aktif di peramban lain. Sesi ini telah ditutup demi keamanan.</p>
                  </div>
                </div>
              )}

              {/* Alert: Idle Timeout */}
              {reason === 'idle_timeout' && (
                <div className="mb-4 bg-[#FCE373]/40 border-2 border-[#121214] rounded-2xl p-3 flex items-start gap-2.5 shadow-[2px_2px_0px_#121214]">
                  <Clock className="w-4 h-4 text-[#121214] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-black text-[#121214]">Sesi Berakhir (Inaktivitas)</p>
                    <p className="text-[11px] text-[#121214]/80">Tidak ada interaksi selama &gt;15 menit. Silakan masuk kembali.</p>
                  </div>
                </div>
              )}

              {/* Alert: Session Expired */}
              {reason === 'session_expired' && (
                <div className="mb-4 bg-amber-50 border-2 border-[#121214] rounded-2xl p-3 flex items-start gap-2.5 shadow-[2px_2px_0px_#121214]">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-black text-[#121214]">Masa Berlaku Selesai</p>
                    <p className="text-[11px] text-[#121214]/80">Sesi otentikasi telah kadaluwarsa. Silakan masuk kembali.</p>
                  </div>
                </div>
              )}

              {/* Error Notice */}
              {(formError || error) && (
                <div className="mb-4 bg-rose-50 border-2 border-rose-500 text-rose-700 px-3.5 py-2.5 rounded-xl text-xs font-bold shadow-[2px_2px_0px_#e11d48]">
                  {formError || error}
                </div>
              )}

              {/* Direct Login Form */}
              <form onSubmit={handleSubmit} className="space-y-3.5 relative z-10 text-left">
                {/* Unique ID */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-extrabold text-[#121214] uppercase tracking-wider">
                      ID Pengguna
                    </label>
                    {roleDetected && (
                      <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border border-[#121214] shadow-[1px_1px_0px_#121214] ${
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
                      onChange={handleUniqueIdChange}
                      placeholder="e.g. PES001 / KO001 / ADM001"
                      disabled={loading}
                      className="w-full pl-9 pr-3 py-2.5 bg-[#FAF9F6] border-2 border-[#121214] rounded-xl text-xs font-bold text-[#121214] placeholder-[#A09F9B] shadow-[2px_2px_0px_#121214] focus:outline-none focus:bg-white focus:shadow-[3px_3px_0px_#121214] transition-all"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-[11px] font-extrabold text-[#121214] uppercase tracking-wider mb-1">
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
                      className="w-full pl-9 pr-9 py-2.5 bg-[#FAF9F6] border-2 border-[#121214] rounded-xl text-xs font-bold text-[#121214] placeholder-[#A09F9B] shadow-[2px_2px_0px_#121214] focus:outline-none focus:bg-white focus:shadow-[3px_3px_0px_#121214] transition-all"
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

                {/* 1-Click Demo Credentials */}
                <div className="pt-1">
                  <span className="text-[10px] font-bold text-[#6E6D6A] block mb-1.5">
                    Akses Cepat Pengujian:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleQuickFill('PES001', 'password123')}
                      className="text-[10px] font-bold bg-[#BDD4F2]/50 hover:bg-[#BDD4F2] border border-[#121214] text-[#121214] px-2 py-0.5 rounded-lg cursor-pointer transition-colors shadow-xs"
                    >
                      Arthur (Peserta)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickFill('KO001', 'password123')}
                      className="text-[10px] font-bold bg-[#FCE373]/60 hover:bg-[#FCE373] border border-[#121214] text-[#121214] px-2 py-0.5 rounded-lg cursor-pointer transition-colors shadow-xs"
                    >
                      Fedro (Koordinator)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickFill('ADM001', 'password123')}
                      className="text-[10px] font-bold bg-[#F5C6EC]/60 hover:bg-[#F5C6EC] border border-[#121214] text-[#121214] px-2 py-0.5 rounded-lg cursor-pointer transition-colors shadow-xs"
                    >
                      Admin Sistem
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 bg-[#121214] hover:bg-neutral-800 active:translate-y-0.5 disabled:opacity-50 text-white font-extrabold py-3 px-4 rounded-xl border-2 border-[#121214] shadow-[4px_4px_0px_#121214] hover:shadow-[5px_5px_0px_#121214] transition-all flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Memverifikasi Akun...</span>
                    </>
                  ) : (
                    <>
                      <span>Masuk ke Dashboard</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Security Note */}
              <div className="mt-4 pt-3 border-t border-[#F0EFEA] flex items-center justify-between text-[11px] text-[#6E6D6A]">
                <span className="flex items-center gap-1 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Sistem Terotentikasi & Aman
                </span>
                <span>BPJSTK</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* 4. BOTTOM CONTINUOUS MARQUEE TICKER (SHOWCASING ALL 15 PROFESSIONS) */}
      <footer className="relative z-10 w-full bg-black/40 backdrop-blur-md border-t border-white/20 py-2.5 overflow-hidden">
        <div className="animate-marquee items-center gap-6 text-white text-xs font-semibold">
          {WORKER_PROFESSIONS.concat(WORKER_PROFESSIONS).map((item, idx) => (
            <div key={idx} className="inline-flex items-center gap-2 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FCE373]" />
              <span className="text-white/95">{item.name}</span>
              <span className="text-[10px] text-white/60 bg-white/10 px-1.5 py-0.2 rounded font-normal">
                {item.sector}
              </span>
            </div>
          ))}
        </div>
      </footer>
    </div>
  );
};

export default Login;
