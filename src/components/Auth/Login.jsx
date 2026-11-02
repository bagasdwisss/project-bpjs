import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { 
  Users, 
  Heart, 
  ShieldCheck, 
  Sparkles, 
  Globe, 
  ArrowRight, 
  X, 
  User, 
  Lock, 
  Eye, 
  EyeOff, 
  ShieldAlert, 
  Clock, 
  AlertTriangle,
  Briefcase,
  HardHat,
  BadgeCheck
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

  // Tampilkan panel login jika ada reason session logout atau jika pengguna mengeklik CTA
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(Boolean(reason));

  // Rotasi 15 segmen profesi setiap 2,4 detik
  const [activeProfIdx, setActiveProfIdx] = useState(0);

  const { user, login, error, clearError, isAuthenticated } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveProfIdx((prev) => (prev + 1) % WORKER_PROFESSIONS.length);
    }, 2400);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (reason) {
      setIsLoginModalOpen(true);
    }
  }, [reason]);

  // Redirect pengguna jika sudah terotentikasi
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

  const currentProf = WORKER_PROFESSIONS[activeProfIdx];

  return (
    <div 
      className="relative min-h-[100svh] w-full bg-[#397C50] text-white overflow-hidden flex flex-col justify-between select-none"
      style={{ fontFamily: "var(--font-body, Inter, sans-serif)" }}
    >
      {/* ============================================================== */}
      {/* 04. BACKGROUND ASSET: EXTRA SUPER HD AUTHENTIC ADULT WORKERS  */}
      {/* (Mandor, Tukang Bangunan, Satpam, Pegawai Batik, Banker, dsb)  */}
      {/* ============================================================== */}
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none select-none z-0">
        <img
          src={workersHeroHd}
          alt="Barisan Pekerja Dewasa BPJS Ketenagakerjaan Extra Super HD"
          className="absolute inset-0 w-full h-full object-cover object-bottom animate-worker-float"
          style={{ objectPosition: 'center bottom' }}
        />

        {/* Subtle Green Gradient Overlay strictly reproducing the design spec */}
        <div 
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(180deg, rgba(15, 65, 37, 0.45) 0%, rgba(25, 95, 52, 0.18) 48%, rgba(15, 65, 37, 0.25) 100%)'
          }}
        />

        {/* Soft Radial Ambient Lighting */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-emerald-400/15 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* ============================================================== */}
      {/* 05. NAVBAR (With Official BPJS Logo & Kinora Hero Structure)  */}
      {/* ============================================================== */}
      <nav className="relative z-20 w-full px-5 py-4 sm:px-8 sm:py-5 lg:px-12 flex items-center justify-between animate-kinora-nav">
        {/* Left: Brand Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-white/95 p-1 flex items-center justify-center shadow-sm">
            <img 
              src={logo} 
              alt="Logo Resmi BPJS Ketenagakerjaan" 
              className="w-full h-full object-contain" 
            />
          </div>
          <div className="flex flex-col text-left">
            <span 
              className="text-white text-sm font-bold tracking-[-0.03em] leading-tight"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              BPJS Ketenagakerjaan
            </span>
            <span className="text-[9px] font-medium text-white/75 tracking-wider uppercase">
              Portal Resmi
            </span>
          </div>
        </div>

        {/* Center: Navigation Links (Desktop) */}
        <div className="hidden md:flex items-center gap-6 text-[11px] font-normal text-white/80">
          <a href="#about" onClick={(e) => { e.preventDefault(); setIsLoginModalOpen(true); }} className="hover:text-white transition-opacity">Tentang</a>
          <a href="#solutions" onClick={(e) => { e.preventDefault(); setIsLoginModalOpen(true); }} className="hover:text-white transition-opacity">Solusi</a>
          <a href="#community" onClick={(e) => { e.preventDefault(); setIsLoginModalOpen(true); }} className="hover:text-white transition-opacity">Komunitas Pekerja</a>
          <a href="#contact" onClick={(e) => { e.preventDefault(); setIsLoginModalOpen(true); }} className="hover:text-white transition-opacity">Kontak Layanan</a>
        </div>

        {/* Right: CTA Button */}
        <div>
          <button
            type="button"
            onClick={() => setIsLoginModalOpen(true)}
            className="bg-white/90 hover:bg-white text-[#154627] rounded-full px-4 py-2 sm:px-5 sm:py-2 text-[10px] sm:text-[11px] font-semibold backdrop-blur-md shadow-sm transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95"
          >
            Masuk Portal
          </button>
        </div>
      </nav>

      {/* ============================================================== */}
      {/* 06. HERO CONTENT (Upper-Middle Centered Layout)                 */}
      {/* ============================================================== */}
      <main className="relative z-10 w-full max-w-4xl mx-auto px-4 pt-2 sm:pt-6 pb-20 flex-1 flex flex-col items-center justify-start text-center">
        
        {/* A. FEATURE ICON ROW (5 Circular Translucent Icons) */}
        <div className="flex items-center gap-[5px] mb-3 sm:mb-4 animate-kinora-icons">
          <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20 text-[#0d3b1e] hover:bg-white/30 transition-colors">
            <Users className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20 text-[#0d3b1e] hover:bg-white/30 transition-colors">
            <Heart className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20 text-[#0d3b1e] hover:bg-white/30 transition-colors">
            <ShieldCheck className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20 text-[#0d3b1e] hover:bg-white/30 transition-colors">
            <Sparkles className="w-3.5 h-3.5 text-[#FCE373]" />
          </div>
          <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20 text-[#0d3b1e] hover:bg-white/30 transition-colors">
            <Globe className="w-3.5 h-3.5 text-white" />
          </div>
        </div>

        {/* Dynamic Rotating Badge for 15 Authentic BPJS Worker Professions */}
        <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-md border border-white/25 px-3 py-1 rounded-full text-[11px] font-bold text-white mb-2 shadow-xs">
          <BadgeCheck className="w-3.5 h-3.5 text-[#FCE373] shrink-0" />
          <span className="text-white/80">Melindungi:</span>
          <span className="text-[#FCE373] font-black underline decoration-wavy decoration-[#FCE373]/60 transition-all duration-300">
            {currentProf.name}
          </span>
          <span className="hidden sm:inline text-[9px] bg-white/20 text-white/90 px-1.5 py-0.2 rounded-md font-normal">
            {currentProf.sector}
          </span>
        </div>

        {/* B. MAIN HEADLINE: "KERJA KERAS BEBAS CEMAS" */}
        <h1 
          className="text-white uppercase font-extrabold tracking-[-0.045em] leading-[1.05] max-w-[760px] text-center drop-shadow-sm animate-kinora-headline"
          style={{ 
            fontFamily: "var(--font-heading)",
            fontSize: 'clamp(28px, 5.2vw, 48px)'
          }}
        >
          Kerja Keras <br className="hidden sm:inline" />
          <span className="text-[#FCE373]">Bebas Cemas</span>
        </h1>

        {/* C. SUBHEADING */}
        <p className="text-white/85 text-[11px] sm:text-xs font-normal leading-[1.6] max-w-[500px] mt-2.5 sm:mt-3 text-center animate-kinora-subheading">
          Menghubungkan insan pekerja, membuka peluang, dan tumbuh lebih tangguh bersama sistem informasi presensi & penilaian magang BPJS Ketenagakerjaan.
        </p>

        {/* D. PRIMARY BLACK PILL CTA BUTTON (Opens the Direct Login Panel) */}
        <div className="mt-4 sm:mt-5 animate-kinora-cta">
          <button
            type="button"
            onClick={() => setIsLoginModalOpen(true)}
            className="group bg-[#080B09] hover:bg-neutral-900 active:scale-95 text-white text-xs font-semibold rounded-full px-6 py-3 inline-flex items-center gap-2.5 shadow-xl hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
          >
            <span>Masuk ke Portal</span>
            <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-[#FCE373] group-hover:text-[#121214] transition-colors">
              <ArrowRight className="w-3 h-3" />
            </div>
          </button>
        </div>

        {/* Extra HD Adults Badge Notice */}
        <div className="mt-2.5 inline-flex items-center gap-1.5 text-[10px] text-white/70 bg-black/25 backdrop-blur-sm px-2.5 py-0.5 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Extra Super HD • Khusus Pekerja Dewasa Indonesia</span>
        </div>
      </main>

      {/* ============================================================== */}
      {/* FOOTER: CONTINUOUS MARQUEE OF ALL 15 WORKER PROFESSIONS        */}
      {/* ============================================================== */}
      <footer className="relative z-10 w-full bg-[#121214]/80 backdrop-blur-md border-t border-white/20 py-2.5 overflow-hidden">
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

      {/* ============================================================== */}
      {/* DIRECT LOGIN CARD MODAL / SHEET (Clean, Responsive, No Demos)  */}
      {/* ============================================================== */}
      {isLoginModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          
          {/* Backdrop Click Closes Modal */}
          <div 
            className="absolute inset-0"
            onClick={() => setIsLoginModalOpen(false)}
          />

          <div className="relative z-10 w-full max-w-md bg-white rounded-[26px] border-2 border-[#121214] shadow-[8px_8px_0px_#121214] p-5 sm:p-7 overflow-hidden text-[#121214] animate-in zoom-in-95 duration-200">
            
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setIsLoginModalOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#F5F4F0] hover:bg-[#EAE9E4] border border-[#121214] flex items-center justify-center text-[#121214] transition-colors cursor-pointer"
              aria-label="Tutup Form Login"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Subtle Decorative Pastel Glows */}
            <div className="absolute -top-10 -right-10 w-28 h-28 bg-[#FCE373]/25 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-28 h-28 bg-[#BDD4F2]/25 rounded-full blur-2xl pointer-events-none" />

            {/* Header with Official Logo */}
            <div className="mb-4 text-left">
              <div className="flex items-center gap-3 mb-2">
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
                    <span>Portal Resmi BPJSTK</span>
                  </div>
                  <h2 
                    className="text-xl sm:text-2xl font-black text-[#121214] tracking-tight leading-tight"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    Masuk ke Sistem
                  </h2>
                </div>
              </div>
              <p className="text-xs text-[#6E6D6A]">
                Masukkan ID Pengguna dan Kata Sandi terdaftar Anda
              </p>
            </div>

            {/* Reason Alert: Concurrent Session */}
            {reason === 'concurrent_session' && (
              <div className="mb-3.5 bg-[#F5C6EC]/40 border-2 border-[#121214] rounded-2xl p-3 flex items-start gap-2.5 shadow-[2px_2px_0px_#121214]">
                <ShieldAlert className="w-4 h-4 text-[#121214] shrink-0 mt-0.5" />
                <div className="text-left">
                  <p className="text-xs font-black text-[#121214]">Login Ganda Terdeteksi</p>
                  <p className="text-[11px] text-[#121214]/80">Akun Anda aktif di peramban lain. Sesi ini telah ditutup demi keamanan.</p>
                </div>
              </div>
            )}

            {/* Reason Alert: Idle Timeout */}
            {reason === 'idle_timeout' && (
              <div className="mb-3.5 bg-[#FCE373]/40 border-2 border-[#121214] rounded-2xl p-3 flex items-start gap-2.5 shadow-[2px_2px_0px_#121214]">
                <Clock className="w-4 h-4 text-[#121214] shrink-0 mt-0.5" />
                <div className="text-left">
                  <p className="text-xs font-black text-[#121214]">Sesi Berakhir (Inaktivitas)</p>
                  <p className="text-[11px] text-[#121214]/80">Tidak ada interaksi selama &gt;15 menit. Silakan masuk kembali.</p>
                </div>
              </div>
            )}

            {/* Reason Alert: Session Expired */}
            {reason === 'session_expired' && (
              <div className="mb-3.5 bg-amber-50 border-2 border-[#121214] rounded-2xl p-3 flex items-start gap-2.5 shadow-[2px_2px_0px_#121214]">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-left">
                  <p className="text-xs font-black text-[#121214]">Masa Berlaku Selesai</p>
                  <p className="text-[11px] text-[#121214]/80">Sesi otentikasi telah kadaluwarsa. Silakan masuk kembali.</p>
                </div>
              </div>
            )}

            {/* Form Error Notice */}
            {(formError || error) && (
              <div className="mb-3.5 bg-rose-50 border-2 border-rose-500 text-rose-700 px-3.5 py-2.5 rounded-xl text-xs font-bold shadow-[2px_2px_0px_#e11d48] text-left">
                {formError || error}
              </div>
            )}

            {/* Form Fields */}
            <form onSubmit={handleSubmit} className="space-y-3.5 text-left">
              {/* ID Pengguna */}
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
                    placeholder="Masukkan ID (e.g. PES001 / KO001 / ADM001)"
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
                className="w-full mt-2 bg-[#121214] hover:bg-neutral-800 active:translate-y-0.5 disabled:opacity-50 text-white font-extrabold py-3 sm:py-3.5 px-4 rounded-xl border-2 border-[#121214] shadow-[4px_4px_0px_#121214] hover:shadow-[5px_5px_0px_#121214] transition-all flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer"
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

            {/* Security Badge */}
            <div className="mt-4 pt-3 border-t border-[#F0EFEA] flex items-center justify-between text-[11px] text-[#6E6D6A]">
              <span className="flex items-center gap-1.5 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Sistem Terotentikasi & Aman
              </span>
              <span className="font-bold text-[#154627]">BPJS Ketenagakerjaan</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
