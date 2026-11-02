import React, { useState, useContext, useEffect } from 'react';
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
  Sparkles,
  BadgeCheck,
  CheckCircle2
} from 'lucide-react';
import logo from '../../assets/27102023_091008_dorong_universal.png';
import workersHeroHd from '../../assets/bpjs_workers_hd.jpg';
import PageLoader from '../Common/PageLoader';

/**
 * 15 Segmen Profesi Resmi Pekerja Indonesia yang Dilindungi BPJS Ketenagakerjaan
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

  // Rotasi badge profesi setiap 2,4 detik
  const [activeProfessionIdx, setActiveProfessionIdx] = useState(0);

  const { user, login, error, clearError, isAuthenticated } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveProfessionIdx((prev) => (prev + 1) % WORKER_PROFESSIONS.length);
    }, 2400);
    return () => clearInterval(timer);
  }, []);

  // Redirect pengguna setelah autentikasi berhasil
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

  const currentProf = WORKER_PROFESSIONS[activeProfessionIdx];

  return (
    <div className="relative min-h-[100svh] w-full bg-[#1b5e32] text-[#121214] overflow-x-hidden flex flex-col justify-between select-none">
      
      {/* 1. BACKGROUND HERO: EXTRA SUPER HD INDONESIAN WORKERS (Adults Only, 100% Authentic BPJS Professions) */}
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none select-none z-0">
        <img
          src={workersHeroHd}
          alt="Latar Belakang Pekerja BPJS Ketenagakerjaan Extra Super HD"
          className="w-full h-full object-cover object-center lg:object-bottom transform scale-100 transition-transform duration-1000 ease-out"
        />

        {/* Soft emerald overlay for maximum typography & UI contrast */}
        <div 
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(180deg, rgba(16, 68, 36, 0.92) 0%, rgba(20, 84, 45, 0.78) 45%, rgba(10, 48, 25, 0.65) 100%)'
          }}
        />

        {/* Radial brand ambient lighting */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#FCE373]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* 2. TOP FLOATING BRAND BAR (With Official BPJS Ketenagakerjaan Logo) */}
      <header className="relative z-20 w-full px-4 py-3 sm:px-8 sm:py-5 lg:px-12 flex items-center justify-between">
        <div className="inline-flex items-center gap-3 bg-white/95 backdrop-blur-md border-2 border-[#121214] px-3.5 py-2 sm:px-4 sm:py-2 rounded-2xl shadow-[3px_3px_0px_#121214]">
          <div className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center shrink-0">
            <img 
              src={logo} 
              alt="Logo Resmi BPJS Ketenagakerjaan" 
              className="w-full h-full object-contain" 
            />
          </div>
          <div className="flex flex-col text-left">
            <span className="font-extrabold text-xs sm:text-sm tracking-tight text-[#154627] leading-none" style={{ fontFamily: "var(--font-heading)" }}>
              BPJS Ketenagakerjaan
            </span>
            <span className="text-[9px] sm:text-[10px] font-bold text-[#6E6D6A] mt-0.5 tracking-wider uppercase">
              Portal Resmi Layanan & Magang
            </span>
          </div>
        </div>

        {/* Live Protection Status Pill */}
        <div className="hidden sm:inline-flex items-center gap-2 bg-[#121214]/80 backdrop-blur-md border border-white/20 px-3.5 py-1.5 rounded-full text-white text-xs font-bold shadow-md">
          <span className="w-2 h-2 rounded-full bg-[#FCE373] animate-ping" />
          <span>Melindungi Seluruh Pekerja Indonesia</span>
        </div>
      </header>

      {/* 3. MAIN HERO CONTENT & DIRECT LOGIN FORM */}
      <main className="relative z-10 w-full max-w-7xl mx-auto px-4 py-4 sm:px-8 sm:py-6 lg:px-12 flex-1 flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center">
          
          {/* LEFT COLUMN: OFFICIAL TAGLINE & EXTRA SUPER HD WORKERS SHOWCASE */}
          <div className="lg:col-span-7 text-white space-y-4 sm:space-y-5 text-center lg:text-left">
            
            {/* Dynamic Rotating Profession Badge */}
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md border border-white/30 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs font-bold shadow-sm max-w-full">
              <Sparkles className="w-3.5 h-3.5 text-[#FCE373] shrink-0" />
              <span className="text-white/80 shrink-0">Melindungi:</span>
              <span className="text-[#FCE373] font-black underline decoration-wavy decoration-[#FCE373]/60 transition-all duration-300 truncate">
                {currentProf.name}
              </span>
            </div>

            {/* OFFICIAL BPJS TAGLINE */}
            <h1 
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black uppercase tracking-tight text-white leading-[1.08] drop-shadow-md"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Kerja Keras <br className="hidden sm:inline" />
              <span className="text-[#FCE373]">Bebas Cemas</span>
            </h1>

            {/* Supporting Description */}
            <p className="text-xs sm:text-sm md:text-base text-white/95 max-w-xl font-normal leading-relaxed mx-auto lg:mx-0 drop-shadow-sm">
              Sistem Informasi Presensi & Manajemen Magang Terpadu. Menjamin perlindungan sosial menyeluruh bagi seluruh pekerja profesional formal, informal, hingga jasa konstruksi.
            </p>

            {/* Extra Super HD Workers Spotlight Visual Card */}
            <div className="pt-1">
              <div className="bg-black/35 backdrop-blur-md border-2 border-white/30 rounded-2xl p-3 sm:p-4 text-left shadow-lg max-w-xl mx-auto lg:mx-0">
                <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/15">
                  <div className="flex items-center gap-2">
                    <BadgeCheck className="w-4 h-4 text-[#FCE373]" />
                    <span className="text-xs font-bold text-white tracking-wide">
                      Perlindungan Profesi Nyata Indonesia (Khusus Pekerja Dewasa)
                    </span>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider bg-[#FCE373] text-[#121214] px-2 py-0.5 rounded-full">
                    Extra Super HD
                  </span>
                </div>

                {/* Worker Thumbnail Showcase */}
                <div className="relative rounded-xl overflow-hidden border border-white/20 mb-2.5 aspect-[16/8] sm:aspect-[16/7]">
                  <img 
                    src={workersHeroHd} 
                    alt="Profesi Pekerja BPJS Ketenagakerjaan: Konstruksi, Satpam, Kantor, Pabrik, Kuliner" 
                    className="w-full h-full object-cover object-center transform hover:scale-105 transition-transform duration-700 ease-out"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-2.5">
                    <p className="text-[10px] sm:text-xs text-white/95 font-semibold">
                      Mandor Proyek • Satpam • Pegawai Kantor • Teknisi Industri • Layanan & Ritel
                    </p>
                  </div>
                </div>

                {/* Sektor PU & Jakon Quick Badges */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div className="bg-white/10 border border-white/15 rounded-lg p-2 flex items-center gap-2">
                    <Briefcase className="w-3.5 h-3.5 text-[#FCE373] shrink-0" />
                    <div>
                      <span className="font-bold text-white block leading-tight">Sektor Penerima Upah (PU)</span>
                      <span className="text-[10px] text-white/70">Karyawan swasta, BUMN/BUMD, pabrik, toko & satpam</span>
                    </div>
                  </div>
                  <div className="bg-white/10 border border-white/15 rounded-lg p-2 flex items-center gap-2">
                    <HardHat className="w-3.5 h-3.5 text-[#BDD4F2] shrink-0" />
                    <div>
                      <span className="font-bold text-white block leading-tight">Sektor Jasa Konstruksi (Jakon)</span>
                      <span className="text-[10px] text-white/70">Tukang, mandor proyek gedung/jalan, teknisi & operator alat</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: DIRECT LOGIN CARD (Clean, Responsive & No Demo Credentials) */}
          <div className="lg:col-span-5 w-full max-w-md mx-auto">
            <div className="bg-white rounded-[24px] sm:rounded-[28px] border-2 border-[#121214] shadow-[6px_6px_0px_#121214] sm:shadow-[8px_8px_0px_#121214] p-5 sm:p-7 relative overflow-hidden">
              
              {/* Subtle Decorative Pastel Glows */}
              <div className="absolute -top-10 -right-10 w-28 h-28 bg-[#FCE373]/25 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -bottom-10 -left-10 w-28 h-28 bg-[#BDD4F2]/25 rounded-full blur-2xl pointer-events-none" />

              {/* Card Header with Official Logo */}
              <div className="mb-4 sm:mb-5 text-left">
                <div className="flex items-center gap-3 mb-2.5">
                  <div className="w-10 h-10 rounded-xl bg-[#F0F8F3] border-2 border-[#121214] p-1.5 flex items-center justify-center shadow-[2px_2px_0px_#121214] shrink-0">
                    <img 
                      src={logo} 
                      alt="Logo BPJS Ketenagakerjaan" 
                      className="w-full h-full object-contain" 
                    />
                  </div>
                  <div>
                    <div className="inline-flex items-center gap-1.5 bg-[#E8F5E9] border border-[#2E7D32]/30 px-2 py-0.5 rounded-full text-[10px] font-bold text-[#1B5E20]">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                      <span>Portal Masuk Sistem</span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-[#121214] tracking-tight leading-tight" style={{ fontFamily: "var(--font-heading)" }}>
                      Selamat Datang
                    </h2>
                  </div>
                </div>
                <p className="text-xs text-[#6E6D6A]">
                  Masukkan ID Pengguna dan Kata Sandi terdaftar Anda
                </p>
              </div>

              {/* Alert: Concurrent Session */}
              {reason === 'concurrent_session' && (
                <div className="mb-3.5 bg-[#F5C6EC]/40 border-2 border-[#121214] rounded-2xl p-3 flex items-start gap-2.5 shadow-[2px_2px_0px_#121214]">
                  <ShieldAlert className="w-4 h-4 text-[#121214] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-black text-[#121214]">Login Ganda Terdeteksi</p>
                    <p className="text-[11px] text-[#121214]/80">Akun Anda aktif di peramban lain. Sesi ini telah ditutup demi keamanan.</p>
                  </div>
                </div>
              )}

              {/* Alert: Idle Timeout */}
              {reason === 'idle_timeout' && (
                <div className="mb-3.5 bg-[#FCE373]/40 border-2 border-[#121214] rounded-2xl p-3 flex items-start gap-2.5 shadow-[2px_2px_0px_#121214]">
                  <Clock className="w-4 h-4 text-[#121214] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-black text-[#121214]">Sesi Berakhir (Inaktivitas)</p>
                    <p className="text-[11px] text-[#121214]/80">Tidak ada interaksi selama &gt;15 menit. Silakan masuk kembali.</p>
                  </div>
                </div>
              )}

              {/* Alert: Session Expired */}
              {reason === 'session_expired' && (
                <div className="mb-3.5 bg-amber-50 border-2 border-[#121214] rounded-2xl p-3 flex items-start gap-2.5 shadow-[2px_2px_0px_#121214]">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-black text-[#121214]">Masa Berlaku Selesai</p>
                    <p className="text-[11px] text-[#121214]/80">Sesi otentikasi telah kadaluwarsa. Silakan masuk kembali.</p>
                  </div>
                </div>
              )}

              {/* Error Notice */}
              {(formError || error) && (
                <div className="mb-3.5 bg-rose-50 border-2 border-rose-500 text-rose-700 px-3.5 py-2.5 rounded-xl text-xs font-bold shadow-[2px_2px_0px_#e11d48]">
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
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#121214]">
                      <User className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={uniqueId}
                      onChange={handleUniqueIdChange}
                      placeholder="Masukkan ID Pengguna (PES / KO / ADM)"
                      disabled={loading}
                      className="w-full pl-10 pr-3.5 py-2.5 sm:py-3 bg-[#FAF9F6] border-2 border-[#121214] rounded-xl text-xs sm:text-sm font-bold text-[#121214] placeholder-[#A09F9B] shadow-[2px_2px_0px_#121214] focus:outline-none focus:bg-white focus:shadow-[3px_3px_0px_#121214] transition-all"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-[11px] font-extrabold text-[#121214] uppercase tracking-wider mb-1">
                    Kata Sandi
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#121214]">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Masukkan kata sandi akun"
                      disabled={loading}
                      className="w-full pl-10 pr-10 py-2.5 sm:py-3 bg-[#FAF9F6] border-2 border-[#121214] rounded-xl text-xs sm:text-sm font-bold text-[#121214] placeholder-[#A09F9B] shadow-[2px_2px_0px_#121214] focus:outline-none focus:bg-white focus:shadow-[3px_3px_0px_#121214] transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#121214] hover:opacity-75 cursor-pointer"
                      aria-label={showPassword ? 'Sembunyikan Kata Sandi' : 'Tampilkan Kata Sandi'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-3 bg-[#121214] hover:bg-neutral-800 active:translate-y-0.5 disabled:opacity-50 text-white font-extrabold py-3 sm:py-3.5 px-4 rounded-xl border-2 border-[#121214] shadow-[4px_4px_0px_#121214] hover:shadow-[5px_5px_0px_#121214] transition-all flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer"
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

              {/* Security Footer Note */}
              <div className="mt-4 pt-3 border-t border-[#F0EFEA] flex items-center justify-between text-[11px] text-[#6E6D6A]">
                <span className="flex items-center gap-1.5 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Sistem Terotentikasi & Aman
                </span>
                <span className="font-bold text-[#154627]">BPJS Ketenagakerjaan</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* 4. BOTTOM CONTINUOUS MARQUEE TICKER (SHOWCASING ALL 15 PROFESSIONS) */}
      <footer className="relative z-20 w-full bg-[#121214]/85 backdrop-blur-md border-t border-white/20 py-2.5 overflow-hidden">
        <div className="animate-marquee items-center gap-6 text-white text-xs font-semibold">
          {WORKER_PROFESSIONS.concat(WORKER_PROFESSIONS).map((item, idx) => (
            <div key={idx} className="inline-flex items-center gap-2 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FCE373]" />
              <span className="text-white/95">{item.name}</span>
              <span className="text-[10px] text-white/70 bg-white/10 px-2 py-0.5 rounded-md font-medium border border-white/10">
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
